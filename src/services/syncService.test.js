import { describe, it, expect, vi } from 'vitest';
import {
    normalizeNestedPlanMap,
    fetchCloudBundle,
    uploadAcademicSnapshot,
} from './syncService';
import { commitAcademicBundleTransaction, ACADEMIC_SYNC_MERGE_FIELDS } from './dbService';
import { createStorageRepository } from './storageRepository';
import { SYNC_STATUS, computeBundleHash } from '../utils/Sync/syncStateMachine';

function createMemoryStorage() {
    const map = new Map();
    return {
        get length() {
            return map.size;
        },
        key: (index) => Array.from(map.keys())[index] ?? null,
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, val) => {
            map.set(key, String(val));
        },
        removeItem: (key) => {
            map.delete(key);
        },
    };
}

/**
 * Simulador determinista en memoria de Firestore `runTransaction` con soporte real de `mergeFields`.
 */
function createMockFirestoreBackend(initialDocs = {}) {
    const docs = new Map(
        Object.entries(initialDocs).map(([id, data]) => [id, structuredClone(data)]),
    );

    const docFn = (_db, collection, id) => ({ path: `${collection}/${id}`, id });

    const runTransactionFn = async (_db, updateFunction) => {
        const pendingWrites = [];
        const transaction = {
            get: async (ref) => {
                const existing = docs.get(ref.id);
                return {
                    exists: () => existing !== undefined,
                    data: () => (existing !== undefined ? structuredClone(existing) : undefined),
                };
            },
            set: (ref, data, options = {}) => {
                pendingWrites.push({ ref, data: structuredClone(data), options });
            },
        };

        const result = await updateFunction(transaction);

        for (const write of pendingWrites) {
            const current = docs.get(write.ref.id) ? structuredClone(docs.get(write.ref.id)) : {};
            if (Array.isArray(write.options?.mergeFields)) {
                const next = { ...current };
                for (const field of write.options.mergeFields) {
                    if (Object.prototype.hasOwnProperty.call(write.data, field)) {
                        next[field] = write.data[field];
                    }
                }
                docs.set(write.ref.id, next);
            } else if (write.options?.merge) {
                docs.set(write.ref.id, { ...current, ...write.data });
            } else {
                docs.set(write.ref.id, write.data);
            }
        }

        return result;
    };

    return {
        docs,
        deps: {
            runTransactionFn,
            docFn,
            firestoreDb: /** @type {any} */ ({}),
            serverTimestampFn: () => /** @type {any} */ ('SERVER_TIMESTAMP'),
            getCurrentUserEmail: () => 'estudiante@unlu.edu.ar',
        },
    };
}

describe('syncService.normalizeNestedPlanMap - Aplanado genérico multi-carrera', () => {
    it('reconstruye claves con punto anidadas por Firestore para cualquier prefijo de carrera', () => {
        const raw = {
            '17': {
                '13': { '11071': 'Aprobado' },
                '14': { '11071': 'Promocionado' },
            },
            '20': {
                '08': { '20001': 'Regular' },
            },
        };

        const result = normalizeNestedPlanMap(raw);

        expect(result).toEqual({
            '17.13': { '11071': 'Aprobado' },
            '17.14': { '11071': 'Promocionado' },
            '20.08': { '20001': 'Regular' },
        });
    });

    it('preserva entradas planas existentes sin sobrescribirlas', () => {
        const raw = {
            '17.14': { '11071': 'Aprobado' },
            '17': {
                '14': { '11071': 'Regular' },
            },
        };

        const result = normalizeNestedPlanMap(raw);
        expect(result['17.14']).toEqual({ '11071': 'Aprobado' });
        expect(result['17']).toBeUndefined();
    });
});

describe('Control optimista de concurrencia (syncRevision + runTransaction)', () => {
    it('carrera entre dos dispositivos: PC y celular parten de v10; celular publica v11 y PC recibe conflicto sin pisar v11', async () => {
        const backend = createMockFirestoreBackend({
            'uid-1': {
                uid: 'uid-1',
                displayName: 'Priscila',
                photoURL: 'https://example.com/avatar.png',
                config: { planActivo: '17.14', tema: 'dark' },
                syncRevision: 10,
                progreso: { '17.14': { '11071': 'Aprobado' } },
                progresoDetalles: {},
                cursada: {},
                simulaciones: {},
            },
        });

        // 1. Celular aprueba Programación y sube desde v10 -> Firestore pasa a v11
        const mobileRes = await commitAcademicBundleTransaction(
            'uid-1',
            {
                progreso: { '17.14': { '11071': 'Aprobado', '11074': 'Aprobado' } },
                progresoDetalles: {},
                cursada: {},
                simulaciones: {},
            },
            { expectedRevision: 10, deps: backend.deps },
        );

        expect(mobileRes.status).toBe('synced');
        expect(mobileRes.syncRevision).toBe(11);

        // 2. Computadora aprueba Matemática pero todavía tiene base v10 -> debe rechazarse con conflicto
        const pcRes = await commitAcademicBundleTransaction(
            'uid-1',
            {
                progreso: { '17.14': { '11071': 'Aprobado', '11073': 'Aprobado' } },
                progresoDetalles: {},
                cursada: {},
                simulaciones: {},
            },
            { expectedRevision: 10, deps: backend.deps },
        );

        expect(pcRes.status).toBe('conflict');
        expect(pcRes.reason).toBe('revision_conflict');
        expect(pcRes.remoteRevision).toBe(11);
        expect(pcRes.remoteBundle?.progreso['17.14']).toEqual({
            '11071': 'Aprobado',
            '11074': 'Aprobado',
        });

        // Firestore conserva v11 del celular intacta y el perfil/config sin tocar
        const storedDoc = backend.docs.get('uid-1');
        expect(storedDoc.syncRevision).toBe(11);
        expect(storedDoc.progreso['17.14']['11074']).toBe('Aprobado');
        expect(storedDoc.progreso['17.14']['11073']).toBeUndefined();
        expect(storedDoc.displayName).toBe('Priscila');
        expect(storedDoc.config).toEqual({ planActivo: '17.14', tema: 'dark' });

        // 3. Si la PC resuelve explícitamente usando expectedRevision: 11, publica v12 limpiamente
        const resolvedRes = await commitAcademicBundleTransaction(
            'uid-1',
            {
                progreso: { '17.14': { '11071': 'Aprobado', '11073': 'Aprobado' } },
                progresoDetalles: {},
                cursada: {},
                simulaciones: {},
            },
            { expectedRevision: 11, deps: backend.deps },
        );

        expect(resolvedRes.status).toBe('synced');
        expect(resolvedRes.syncRevision).toBe(12);
        // Gracias a mergeFields, la clave eliminada ('11074') ya no queda como fantasma en progreso
        expect(backend.docs.get('uid-1').progreso['17.14']['11074']).toBeUndefined();
        expect(backend.docs.get('uid-1').displayName).toBe('Priscila');
        expect(ACADEMIC_SYNC_MERGE_FIELDS).not.toContain('displayName');
        expect(ACADEMIC_SYNC_MERGE_FIELDS).not.toContain('config');
    });

    it('es compatible con documentos legacy sin syncRevision y evita sobrescritura ciega si expectedRevision es null', async () => {
        const backend = createMockFirestoreBackend({
            'uid-legacy': {
                uid: 'uid-legacy',
                displayName: 'Usuario Legacy',
                progreso: {
                    '17': { '14': { '11071': 'Aprobado' } },
                },
                'progreso.17.13': { '11071': 'Regular' },
            },
        });

        // Lectura sin efectos secundarios con fetchCloudBundle
        const fetched = await fetchCloudBundle('uid-legacy', {
            fetchUserDoc: async (id) => backend.docs.get(id) ?? null,
        });

        expect(fetched.exists).toBe(true);
        expect(fetched.syncRevision).toBe(0);
        expect(fetched.bundle.progreso['17.14']).toEqual({ '11071': 'Aprobado' });
        expect(fetched.bundle.progreso['17.13']).toEqual({ '11071': 'Regular' });

        // Intento sin conocer la revisión base (expectedRevision: null) contra doc legacy con datos -> conflicto
        const blindUpload = await commitAcademicBundleTransaction(
            'uid-legacy',
            { progreso: { '17.14': { '11072': 'Aprobado' } } },
            { expectedRevision: null, deps: backend.deps },
        );
        expect(blindUpload.status).toBe('conflict');
        expect(blindUpload.remoteRevision).toBe(0);

        // Con revisión base conocida (0 tras conciliar), actualiza y pasa a syncRevision: 1
        const validUpgrade = await commitAcademicBundleTransaction(
            'uid-legacy',
            { progreso: { '17.14': { '11071': 'Aprobado', '11072': 'Aprobado' } } },
            { expectedRevision: 0, deps: backend.deps },
        );
        expect(validUpgrade.status).toBe('synced');
        expect(validUpgrade.syncRevision).toBe(1);
        expect(backend.docs.get('uid-legacy').displayName).toBe('Usuario Legacy');
    });

    it('detecta ediciones locales concurrentes durante uploadAcademicSnapshot y mantiene estado pending', async () => {
        const mem = createMemoryStorage();
        const repo = createStorageRepository(mem);
        repo.setProgreso('17.14', { '11071': 'Aprobado' });
        const hashBeforeEdit = computeBundleHash(repo.readAcademicBundle());

        const commitFn = vi.fn(async (_uid, uploadedBundle) => {
            // Simulamos que el estudiante aprueba otra materia mientras la subida está en vuelo
            repo.setProgreso('17.14', { '11071': 'Aprobado', '11072': 'Aprobado' });
            return {
                status: /** @type {'synced'} */ ('synced'),
                syncRevision: 4,
                uploadedHash: computeBundleHash(uploadedBundle),
                syncedAt: '2026-11-20T15:30:00Z',
                payloadBytes: 256,
            };
        });

        const result = await uploadAcademicSnapshot('uid-1', {
            expectedRevision: 3,
            storage: repo,
            commitFn,
        });

        expect(result.status).toBe('synced');
        expect(result.hasConcurrentLocalEdits).toBe(true);
        expect(result.nextStatus).toBe(SYNC_STATUS.PENDING);
        expect(result.uploadedHash).toBe(hashBeforeEdit);
        expect(result.currentLocalHash).not.toBe(hashBeforeEdit);
        // SyncMeta guarda el hash realmente confirmado por Firestore (no el hash más nuevo sin subir)
        expect(repo.getSyncMeta()?.lastSyncedHash).toBe(hashBeforeEdit);
        expect(repo.getSyncMeta()?.syncRevision).toBe(4);
    });

    it('ante error de permisos conserva el contenido local y nunca declara synced', async () => {
        const mem = createMemoryStorage();
        const repo = createStorageRepository(mem);
        repo.setProgreso('17.14', { '11071': 'Aprobado' });

        const failingTxDeps = {
            runTransactionFn: async () => {
                throw { code: 'permission-denied', message: 'Missing or insufficient permissions.' };
            },
            docFn: (_db, col, id) => ({ path: `${col}/${id}`, id }),
            firestoreDb: /** @type {any} */ ({}),
            serverTimestampFn: () => /** @type {any} */ ('TS'),
            getCurrentUserEmail: () => 'test@unlu.edu.ar',
        };

        const result = await uploadAcademicSnapshot('uid-1', {
            expectedRevision: 0,
            storage: repo,
            commitFn: (uid, bundle, opts) =>
                commitAcademicBundleTransaction(uid, bundle, { ...opts, deps: failingTxDeps }),
        });

        expect(result.status).toBe('error');
        expect(result.nextStatus).toBe(SYNC_STATUS.ERROR);
        expect(result.code).toBe('permission-denied');
        expect(repo.getProgreso('17.14')).toEqual({ '11071': 'Aprobado' });
        expect(repo.getSyncMeta()).toBeNull();
    });

    it('rechaza payloads que superen el margen seguro de 1 MiB antes de abrir una transacción en Firestore', async () => {
        const runTransactionSpy = vi.fn();
        const oversizedNotes = 'x'.repeat(950 * 1024);

        const res = await commitAcademicBundleTransaction(
            'uid-1',
            {
                progreso: { '17.14': { '11071': 'Aprobado' } },
                cursada: {
                    '17.14': {
                        horarios: [],
                        eventos: [],
                        bitacora: [
                            {
                                id: 'b1',
                                fecha: '2026-11-20',
                                codigoMateria: '11071',
                                tema: 'Nota gigante',
                                notas: oversizedNotes,
                            },
                        ],
                    },
                },
            },
            {
                expectedRevision: 1,
                deps: {
                    runTransactionFn: runTransactionSpy,
                    docFn: (_db, col, id) => ({ path: `${col}/${id}`, id }),
                    firestoreDb: /** @type {any} */ ({}),
                    serverTimestampFn: () => /** @type {any} */ ('TS'),
                    getCurrentUserEmail: () => 'test@unlu.edu.ar',
                },
            },
        );

        expect(res.status).toBe('error');
        expect(res.code).toBe('sync/payload-too-large');
        expect(runTransactionSpy).not.toHaveBeenCalled();
    });
});
