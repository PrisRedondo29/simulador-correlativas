import { describe, it, expect } from 'vitest';
import {
    SYNC_STATUS,
    buildExportBackupPayload,
    canonicalizeAcademicBundle,
    computeBundleHash,
    createInitialSyncState,
    estimatePayloadBytes,
    evaluarConciliacionSync,
    extractAcademicBundleFromCloudDoc,
    isAcademicBundleEmpty,
    parseImportBackupPayload,
    serializeCanonicalBundle,
    summarizeAcademicBundle,
    transitionSyncState,
} from './syncStateMachine';

const bundleA = {
    progreso: {
        '17.14': {
            '11072': 'Regular',
            '11071': 'Aprobado',
        },
    },
    progresoDetalles: {
        '17.14': {
            '11071': {
                notaFinal: 9,
                fechaAprobacion: '2026-07-10',
            },
        },
    },
    cursada: {
        '17.14': {
            horarios: [
                {
                    id: 'h1',
                    codigoMateria: '11072',
                    dia: 1,
                    horaInicio: '18:00',
                    horaFin: '20:00',
                },
            ],
            eventos: [],
            bitacora: [],
        },
    },
    simulaciones: {
        '17.14': { anioFinal: 2029, historial: [] },
    },
};

describe('syncStateMachine - Serialización canónica y hashing determinista', () => {
    it('genera exactamente el mismo hash ante distinto orden de propiedades y excluye campos volátiles', () => {
        const reorderedWithVolatile = {
            simulaciones: {
                '17.14': {
                    historial: [],
                    anioFinal: 2029,
                    updatedAt: '2026-11-20T12:00:00Z',
                },
            },
            cursada: {
                '17.14': {
                    bitacora: [],
                    eventos: [],
                    horarios: [
                        {
                            horaFin: '20:00',
                            horaInicio: '18:00',
                            dia: 1,
                            codigoMateria: '11072',
                            id: 'h1',
                            updatedAt: 1700000000,
                        },
                    ],
                },
            },
            progresoDetalles: {
                '17.14': {
                    '11071': {
                        fechaAprobacion: '2026-07-10',
                        notaFinal: 9,
                        syncRevision: 99,
                    },
                    '11072': {}, // detalle vacío debe ignorarse
                },
            },
            progreso: {
                '17.14': {
                    '11071': 'Aprobado',
                    '11072': 'Regular',
                },
                // Plan únicamente inicializado por defecto (sin materias cursadas/aprobadas)
                '17.13': {
                    '11071': 'Disponible',
                    '11072': 'Bloqueado',
                },
            },
        };

        expect(serializeCanonicalBundle(bundleA)).toBe(
            serializeCanonicalBundle(reorderedWithVolatile),
        );
        expect(computeBundleHash(bundleA)).toBe(computeBundleHash(reorderedWithVolatile));
        expect(computeBundleHash(bundleA)).toMatch(/^v1:[0-9a-f]{16}$/);
    });

    it('detecta cambios reales en cualquier campo académico produciendo un hash distinto', () => {
        const modified = structuredClone(bundleA);
        modified.progreso['17.14']['11072'] = 'Aprobado';

        expect(computeBundleHash(bundleA)).not.toBe(computeBundleHash(modified));
    });

    it('considera vacío un bundle solo inicializado con Bloqueado/Disponible o listas vacías', () => {
        const defaultOnly = {
            progreso: {
                '17.14': { '11071': 'Disponible', '11072': 'Bloqueado' },
            },
            progresoDetalles: { '17.14': { '11071': {} } },
            cursada: { '17.14': { horarios: [], eventos: [], bitacora: [] } },
            simulaciones: { '17.14': {} },
        };

        expect(isAcademicBundleEmpty(defaultOnly)).toBe(true);
        expect(summarizeAcademicBundle(defaultOnly).isEmpty).toBe(true);
        expect(summarizeAcademicBundle(bundleA)).toMatchObject({
            planes: ['17.14'],
            materiasAprobadas: 1,
            materiasActivas: 1,
            horariosCursada: 1,
            simulaciones: 1,
            isEmpty: false,
        });
    });

    it('extrae correctamente documentos legacy de Firestore con claves anidadas y claves con punto literal', () => {
        const legacyDoc = {
            uid: 'u1',
            displayName: 'Alumno Legacy',
            progreso: {
                '17': {
                    '14': { '11071': 'Aprobado' },
                },
            },
            'progreso.17.13': { '11071': 'Promocionado' },
            'progresoDetalles.17.14': { '11071': { notaFinal: 10 } },
            'cursada.17.14': {
                horarios: [],
                eventos: [{ id: 'ev1', titulo: 'Parcial', tipo: 'parcial', fecha: '2026-11-25' }],
                bitacora: [],
            },
        };

        const extracted = extractAcademicBundleFromCloudDoc(legacyDoc);
        expect(extracted.progreso['17.14']).toEqual({ '11071': 'Aprobado' });
        expect(extracted.progreso['17.13']).toEqual({ '11071': 'Promocionado' });
        expect(extracted.progresoDetalles['17.14']?.['11071']).toEqual({ notaFinal: 10 });
        expect(extracted.cursada['17.14']?.eventos).toHaveLength(1);
    });

    it('calcula el tamaño real UTF-8 en bytes incluyendo caracteres multibyte', () => {
        const asciiBytes = estimatePayloadBytes({ text: 'hola' });
        const utf8Bytes = estimatePayloadBytes({ text: 'áéíóú' });
        expect(utf8Bytes).toBeGreaterThan(asciiBytes);
    });
});

describe('syncStateMachine - Conciliación y separación account_mismatch vs conflict', () => {
    it('detecta account_mismatch cuando el dispositivo tiene datos sincronizados de otra cuenta Google', () => {
        const res = evaluarConciliacionSync({
            localBundle: bundleA,
            remoteBundle: {},
            currentUid: 'uid-cuenta-B',
            lastSyncedUid: 'uid-cuenta-A',
            remoteSyncRevision: 0,
        });

        expect(res.outcome).toBe('account_mismatch');
        expect(res.previousUid).toBe('uid-cuenta-A');
        expect(res.currentUid).toBe('uid-cuenta-B');
    });

    it('permite adoptar remoto si cambia la cuenta pero el dispositivo no tiene progreso real', () => {
        const res = evaluarConciliacionSync({
            localBundle: { progreso: { '17.14': { '11071': 'Disponible' } } },
            remoteBundle: bundleA,
            currentUid: 'uid-cuenta-B',
            lastSyncedUid: 'uid-cuenta-A',
            remoteSyncRevision: 4,
        });

        expect(res.outcome).toBe('adopt_remote');
    });

    it('detecta conflict cuando local y remoto pertenecen a la misma cuenta pero divergen', () => {
        const remote = structuredClone(bundleA);
        remote.progreso['17.14']['11073'] = 'Aprobado';

        const res = evaluarConciliacionSync({
            localBundle: bundleA,
            remoteBundle: remote,
            currentUid: 'uid-1',
            lastSyncedUid: 'uid-1',
            remoteSyncRevision: 5,
        });

        expect(res.outcome).toBe('conflict');
        expect(res.localHash).not.toBe(res.remoteHash);
    });

    it('devuelve in_sync cuando los contenidos canónicos son iguales aunque difiera el orden de claves', () => {
        const reordered = {
            simulaciones: { '17.14': { historial: [], anioFinal: 2029 } },
            progreso: { '17.14': { '11071': 'Aprobado', '11072': 'Regular' } },
            progresoDetalles: { '17.14': { '11071': { fechaAprobacion: '2026-07-10', notaFinal: 9 } } },
            cursada: {
                '17.14': {
                    bitacora: [],
                    eventos: [],
                    horarios: [
                        { horaFin: '20:00', horaInicio: '18:00', dia: 1, codigoMateria: '11072', id: 'h1' },
                    ],
                },
            },
        };

        const res = evaluarConciliacionSync({
            localBundle: bundleA,
            remoteBundle: reordered,
            currentUid: 'uid-1',
            lastSyncedUid: 'uid-1',
            remoteSyncRevision: 3,
        });

        expect(res.outcome).toBe('in_sync');
    });

    it('devuelve keep_local_pending cuando hay progreso local y la nube está vacía', () => {
        const res = evaluarConciliacionSync({
            localBundle: bundleA,
            remoteBundle: {},
            currentUid: 'uid-1',
            lastSyncedUid: null,
            remoteSyncRevision: 0,
        });

        expect(res.outcome).toBe('keep_local_pending');
    });
});

describe('syncStateMachine - Máquina de estados pura', () => {
    it('modela isOnline como condición ortogonal: perder conexión mantiene pending intacto', () => {
        const hash1 = computeBundleHash(bundleA);
        let state = createInitialSyncState({
            isOnline: true,
            currentUid: 'uid-1',
            localBundle: bundleA,
            meta: { syncRevision: 2, lastSyncedHash: 'v1:oldhash000000000', lastSyncedUid: 'uid-1', lastSyncedAt: null },
        });

        expect(state.status).toBe(SYNC_STATUS.PENDING);
        expect(state.isOnline).toBe(true);

        state = transitionSyncState(state, { type: 'CONNECTIVITY_CHANGED', isOnline: false });
        expect(state.status).toBe(SYNC_STATUS.PENDING);
        expect(state.isOnline).toBe(false);

        state = transitionSyncState(state, { type: 'LOCAL_MUTATED', localHash: hash1, isAuthenticated: true });
        expect(state.status).toBe(SYNC_STATUS.PENDING);
        expect(state.isOnline).toBe(false);

        state = transitionSyncState(state, { type: 'CONNECTIVITY_CHANGED', isOnline: true });
        expect(state.status).toBe(SYNC_STATUS.PENDING);
        expect(state.isOnline).toBe(true);
    });

    it('cambios locales durante una subida mantienen estado pending tras confirmar el snapshot previo', () => {
        const hashV1 = computeBundleHash(bundleA);
        const modifiedDuringUpload = structuredClone(bundleA);
        modifiedDuringUpload.progreso['17.14']['11073'] = 'Cursando';
        const hashV2 = computeBundleHash(modifiedDuringUpload);

        let state = createInitialSyncState({
            isOnline: true,
            currentUid: 'uid-1',
            localBundle: bundleA,
            meta: { syncRevision: 10, lastSyncedHash: 'v1:0000000000000000', lastSyncedUid: 'uid-1', lastSyncedAt: null },
        });

        // 1. Arranca la subida de V1
        state = transitionSyncState(state, { type: 'UPLOAD_STARTED', uploadingHash: hashV1 });
        expect(state.status).toBe(SYNC_STATUS.SYNCING);

        // 2. El estudiante edita una materia mientras la transacción sigue en curso
        state = transitionSyncState(state, {
            type: 'LOCAL_MUTATED',
            localHash: hashV2,
            isAuthenticated: true,
        });
        expect(state.status).toBe(SYNC_STATUS.SYNCING);

        // 3. Firestore confirma V1 (revisión 11), pero el contenido local actual es V2
        state = transitionSyncState(state, {
            type: 'UPLOAD_SUCCEEDED',
            uploadedHash: hashV1,
            currentLocalHash: hashV2,
            newRevision: 11,
            syncedAt: '2026-11-20T15:00:00Z',
            uid: 'uid-1',
        });

        expect(state.status).toBe(SYNC_STATUS.PENDING);
        expect(state.syncRevision).toBe(11);
        expect(state.lastSyncedHash).toBe(hashV1);
    });

    it('preserva cambios pendientes tras recargar la pestaña y coordina cambios entre múltiples pestañas', () => {
        const syncedHash = computeBundleHash(bundleA);
        const editedBundle = structuredClone(bundleA);
        editedBundle.progreso['17.14']['11072'] = 'Aprobado';
        const editedHash = computeBundleHash(editedBundle);

        // Escenario A: recarga de pestaña con cambios locales sin subir
        const reloadedState = createInitialSyncState({
            isOnline: true,
            currentUid: 'uid-1',
            localBundle: editedBundle,
            meta: {
                syncRevision: 10,
                lastSyncedHash: syncedHash,
                lastSyncedUid: 'uid-1',
                lastSyncedAt: '2026-11-20T14:00:00Z',
            },
        });
        expect(reloadedState.status).toBe(SYNC_STATUS.PENDING);
        expect(reloadedState.syncRevision).toBe(10);

        // Escenario B: Pestaña 2 guarda en la nube (v11) y Pestaña 1 recibe REHYDRATED_FROM_STORAGE
        const tab1AfterTab2Saved = transitionSyncState(reloadedState, {
            type: 'REHYDRATED_FROM_STORAGE',
            currentUid: 'uid-1',
            localBundle: editedBundle,
            meta: {
                syncRevision: 11,
                lastSyncedHash: editedHash,
                lastSyncedUid: 'uid-1',
                lastSyncedAt: '2026-11-20T14:05:00Z',
            },
        });

        expect(tab1AfterTab2Saved.status).toBe(SYNC_STATUS.SYNCED);
        expect(tab1AfterTab2Saved.syncRevision).toBe(11);
        expect(tab1AfterTab2Saved.lastSyncedHash).toBe(editedHash);
    });

    it('al cerrar sesión conserva lastSyncedUid para detectar cambio de cuenta al volver a ingresar', () => {
        const hashA = computeBundleHash(bundleA);
        let state = createInitialSyncState({
            isOnline: true,
            currentUid: 'uid-A',
            localBundle: bundleA,
            meta: { syncRevision: 3, lastSyncedHash: hashA, lastSyncedUid: 'uid-A', lastSyncedAt: '2026-11-20T10:00:00Z' },
        });
        expect(state.status).toBe(SYNC_STATUS.SYNCED);

        state = transitionSyncState(state, { type: 'SIGNED_OUT' });
        expect(state.status).toBe(SYNC_STATUS.LOCAL);
        expect(state.lastSyncedUid).toBe('uid-A');

        // Ingresa otro usuario (uid-B) en el mismo navegador
        const conciliation = evaluarConciliacionSync({
            localBundle: bundleA,
            remoteBundle: {},
            currentUid: 'uid-B',
            lastSyncedUid: state.lastSyncedUid,
            remoteSyncRevision: 0,
        });
        state = transitionSyncState(state, { type: 'CONCILIATION_EVALUATED', conciliation });
        expect(state.status).toBe(SYNC_STATUS.ACCOUNT_MISMATCH);
        expect(state.conflict?.reason).toBe('account_mismatch');
    });

    it('soporta exportación e importación portable en JSON rechazando archivos corruptos', () => {
        const exported = buildExportBackupPayload(bundleA, {
            planActivo: '17.14',
            sourceUid: 'uid-1',
            exportedAt: '2026-11-20T15:00:00Z',
        });

        const parsedOk = parseImportBackupPayload(JSON.stringify(exported));
        expect(parsedOk.ok).toBe(true);
        expect(parsedOk.planActivo).toBe('17.14');
        expect(computeBundleHash(parsedOk.bundle)).toBe(computeBundleHash(bundleA));

        expect(parseImportBackupPayload('{json_corrupto').ok).toBe(false);
        expect(parseImportBackupPayload(JSON.stringify({ sinBundle: true })).ok).toBe(false);
        expect(canonicalizeAcademicBundle(parsedOk.bundle)).toEqual(canonicalizeAcademicBundle(bundleA));
    });
});
