import { describe, it, expect } from 'vitest';
import { createStorageRepository, STORAGE_KEYS } from './storageRepository';
import { commitAcademicBundleTransaction } from './dbService';
import {
    fetchCloudBundle,
    uploadAcademicSnapshot,
    adoptRemoteSnapshot,
    claimLocalSnapshotForAccount,
} from './syncService';
import {
    SYNC_STATUS,
    buildExportBackupPayload,
    computeBundleHash,
    createInitialSyncState,
    evaluarConciliacionSync,
    parseImportBackupPayload,
    summarizeAcademicBundle,
    transitionSyncState,
} from '../utils/Sync/syncStateMachine';

/**
 * Storage compartido en memoria (permite simular múltiples pestañas reales
 * compartiendo el mismo `localStorage`, así como fallos selectivos de cuota).
 */
function createSharedStorage({ failOnKey = null, failAfterCount = 0 } = {}) {
    const map = new Map();
    const writesByKey = new Map();

    return {
        map,
        get length() {
            return map.size;
        },
        key: (index) => Array.from(map.keys())[index] ?? null,
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, val) => {
            const count = (writesByKey.get(key) || 0) + 1;
            writesByKey.set(key, count);
            if (failOnKey && key === failOnKey && count > failAfterCount) {
                throw new Error('QuotaExceededError');
            }
            map.set(key, String(val));
        },
        removeItem: (key) => {
            map.delete(key);
        },
    };
}

/**
 * Motor OCC (Optimistic Concurrency Control) realista para simular `runTransaction` de Firestore:
 *  - Soporta transacciones verdaderamente superpuestas en vuelo (`Promise.all`).
 *  - Rastrea la versión interna del servidor leída por cada transacción en `transaction.get()`.
 *  - Si otro cliente commitea mientras la transacción está en vuelo, reintenta automáticamente
 *    el callback `updateFunction` (hasta 5 intentos, igual que el SDK real de Firestore),
 *    verificando así la idempotencia real de nuestro código transaccional.
 */
function createConcurrentFirestoreEngine(initialDocs = {}) {
    const docs = new Map();
    const internalVersions = new Map();

    for (const [id, data] of Object.entries(initialDocs)) {
        docs.set(id, structuredClone(data));
        internalVersions.set(id, 1);
    }

    const docFn = (_db, collection, id) => ({ path: `${collection}/${id}`, id });

    const runTransactionFn = async (_db, updateFunction, { beforeCommitHook = null } = {}) => {
        const MAX_ATTEMPTS = 5;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            /** @type {Map<string, number>} */
            const readVersions = new Map();
            /** @type {Array<{ ref: { id: string }, data: any, options: any }>} */
            const pendingWrites = [];

            const transaction = {
                get: async (ref) => {
                    const currentVer = internalVersions.get(ref.id) ?? 0;
                    readVersions.set(ref.id, currentVer);
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

            if (beforeCommitHook) {
                await beforeCommitHook({ attempt, pendingWrites, result });
            }

            // Si la transacción decidió no escribir (ej: detectó conflicto lógico), no hay contención
            if (pendingWrites.length === 0) {
                return result;
            }

            // Verificación atómica de contención OCC (equivalente al servidor de Firestore)
            let contentionDetected = false;
            for (const [docId, expectedVer] of readVersions.entries()) {
                if ((internalVersions.get(docId) ?? 0) !== expectedVer) {
                    contentionDetected = true;
                    break;
                }
            }

            if (contentionDetected) {
                // Reintento automático del callback de Firestore con los nuevos datos
                continue;
            }

            // Commit atómico de las escrituras pendientes
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
                internalVersions.set(write.ref.id, (internalVersions.get(write.ref.id) ?? 0) + 1);
            }

            return result;
        }

        throw { code: 'aborted', message: 'Transaction retry limit exceeded.' };
    };

    const createDeps = ({ beforeCommitHook = null, email = 'estudiante@unlu.edu.ar' } = {}) => ({
        runTransactionFn: (dbArg, fn) => runTransactionFn(dbArg, fn, { beforeCommitHook }),
        docFn,
        firestoreDb: /** @type {any} */ ({}),
        serverTimestampFn: () => /** @type {any} */ ('SERVER_TIMESTAMP'),
        getCurrentUserEmail: () => email,
    });

    return {
        docs,
        internalVersions,
        createDeps,
        fetchUserDoc: async (uid) => (docs.has(uid) ? structuredClone(docs.get(uid)) : null),
    };
}

describe('Integración completa de sincronización (storageRepository + dbService + syncService + syncStateMachine)', () => {
    it('carrera simultánea real (Promise.all + reintento OCC): dos dispositivos leen v10 al mismo tiempo; solo uno gana v11 y el otro reintenta y pasa a conflicto sin pisar v11', async () => {
        const engine = createConcurrentFirestoreEngine({
            'uid-1': {
                uid: 'uid-1',
                displayName: 'Priscila',
                config: { planActivo: '17.14', tema: 'light' },
                syncRevision: 10,
                progreso: { '17.14': { '11071': 'Aprobado' } },
                progresoDetalles: {},
                cursada: {},
                simulaciones: {},
            },
        });

        // Dos dispositivos reales con storages independientes, ambos partiendo desde v10
        const pcStorage = createStorageRepository(createSharedStorage());
        const mobileStorage = createStorageRepository(createSharedStorage());

        const baseCloud = await fetchCloudBundle('uid-1', { fetchUserDoc: engine.fetchUserDoc });
        adoptRemoteSnapshot('uid-1', {
            remoteBundle: baseCloud.bundle,
            remoteRevision: baseCloud.syncRevision,
            silent: true,
            storage: pcStorage,
        });
        adoptRemoteSnapshot('uid-1', {
            remoteBundle: baseCloud.bundle,
            remoteRevision: baseCloud.syncRevision,
            silent: true,
            storage: mobileStorage,
        });

        // PC aprueba Matemática (11073) y Celular aprueba Programación (11074)
        pcStorage.setProgreso('17.14', { '11071': 'Aprobado', '11073': 'Aprobado' });
        mobileStorage.setProgreso('17.14', { '11071': 'Aprobado', '11074': 'Aprobado' });

        // Barrera de sincronización para forzar que AMBAS transacciones lean v10 antes de que ninguna haga commit
        let arrivedCount = 0;
        /** @type {() => void} */
        let releaseBarrier = () => {};
        const bothReadV10 = new Promise((resolve) => {
            releaseBarrier = resolve;
        });
        /** @type {() => void} */
        let markMobileCommitted = () => {};
        const mobileCommitted = new Promise((resolve) => {
            markMobileCommitted = resolve;
        });

        let pcAttempts = 0;

        const mobilePromise = uploadAcademicSnapshot('uid-1', {
            expectedRevision: mobileStorage.getSyncMeta()?.syncRevision,
            storage: mobileStorage,
            commitFn: (uid, bundle, opts) =>
                commitAcademicBundleTransaction(uid, bundle, {
                    ...opts,
                    deps: engine.createDeps({
                        beforeCommitHook: async ({ attempt }) => {
                            if (attempt === 1) {
                                arrivedCount += 1;
                                if (arrivedCount === 2) releaseBarrier();
                                await bothReadV10;
                            }
                        },
                    }),
                }),
        }).then((res) => {
            markMobileCommitted();
            return res;
        });

        const pcPromise = uploadAcademicSnapshot('uid-1', {
            expectedRevision: pcStorage.getSyncMeta()?.syncRevision,
            storage: pcStorage,
            commitFn: (uid, bundle, opts) =>
                commitAcademicBundleTransaction(uid, bundle, {
                    ...opts,
                    deps: engine.createDeps({
                        beforeCommitHook: async ({ attempt }) => {
                            pcAttempts = attempt;
                            if (attempt === 1) {
                                arrivedCount += 1;
                                if (arrivedCount === 2) releaseBarrier();
                                await bothReadV10;
                                // Esperamos a que el celular commitee v11 para garantizar contención OCC real
                                await mobileCommitted;
                            }
                        },
                    }),
                }),
        });

        const [mobileResult, pcResult] = await Promise.all([mobilePromise, pcPromise]);

        // Celular gana limpiamente v11
        expect(mobileResult.status).toBe('synced');
        expect(mobileResult.syncRevision).toBe(11);
        expect(mobileStorage.getSyncMeta()?.syncRevision).toBe(11);

        // PC fue reintentada automáticamente por el motor OCC (attempt 2), leyó v11 y devolvió conflicto sin pisarla
        expect(pcAttempts).toBe(2);
        expect(pcResult.status).toBe('conflict');
        expect(pcResult.nextStatus).toBe(SYNC_STATUS.CONFLICT);
        expect(pcResult.remoteRevision).toBe(11);
        expect(pcResult.remoteBundle?.progreso['17.14']).toEqual({
            '11071': 'Aprobado',
            '11074': 'Aprobado',
        });

        // Ni Firestore ni la PC perdieron datos
        expect(engine.docs.get('uid-1').syncRevision).toBe(11);
        expect(engine.docs.get('uid-1').progreso['17.14']).toEqual({
            '11071': 'Aprobado',
            '11074': 'Aprobado',
        });
        expect(pcStorage.getProgreso('17.14')).toEqual({
            '11071': 'Aprobado',
            '11073': 'Aprobado',
        });
        expect(pcStorage.getSyncMeta()?.syncRevision).toBe(10);
    });

    it('edición real en storageRepository mientras la transacción Firestore está en vuelo: conserva estado pending incluso tras recargar', async () => {
        const engine = createConcurrentFirestoreEngine({});
        const shared = createSharedStorage();
        const repo = createStorageRepository(shared);

        repo.setProgreso('17.14', { '11071': 'Aprobado' });
        const hashSnapshot1 = computeBundleHash(repo.readAcademicBundle());

        let state = createInitialSyncState({
            isOnline: true,
            currentUid: 'uid-1',
            localBundle: repo.readAcademicBundle(),
            meta: repo.getSyncMeta(),
        });
        expect(state.status).toBe(SYNC_STATUS.PENDING);

        state = transitionSyncState(state, {
            type: 'UPLOAD_STARTED',
            uploadingHash: hashSnapshot1,
        });
        expect(state.status).toBe(SYNC_STATUS.SYNCING);

        // Ejecutamos uploadAcademicSnapshot + commitAcademicBundleTransaction REALES,
        // editando progreso Y cursada mientras la transacción está pausada antes del commit.
        const uploadRes = await uploadAcademicSnapshot('uid-1', {
            expectedRevision: null,
            storage: repo,
            commitFn: (uid, bundle, opts) =>
                commitAcademicBundleTransaction(uid, bundle, {
                    ...opts,
                    deps: engine.createDeps({
                        beforeCommitHook: async () => {
                            repo.setProgreso('17.14', { '11071': 'Aprobado', '11072': 'Cursando' });
                            repo.setCursada('17.14', {
                                horarios: [],
                                eventos: [
                                    {
                                        id: 'ev-1',
                                        titulo: 'Parcial 1',
                                        tipo: 'parcial',
                                        fecha: '2026-11-28',
                                    },
                                ],
                                bitacora: [],
                            });
                            state = transitionSyncState(state, {
                                type: 'LOCAL_MUTATED',
                                localHash: computeBundleHash(repo.readAcademicBundle()),
                                isAuthenticated: true,
                            });
                        },
                    }),
                }),
        });

        expect(uploadRes.status).toBe('synced');
        expect(uploadRes.syncRevision).toBe(1);
        expect(uploadRes.hasConcurrentLocalEdits).toBe(true);
        expect(uploadRes.nextStatus).toBe(SYNC_STATUS.PENDING);

        state = transitionSyncState(state, {
            type: 'UPLOAD_SUCCEEDED',
            uploadedHash: uploadRes.uploadedHash ?? '',
            currentLocalHash: uploadRes.currentLocalHash,
            newRevision: uploadRes.syncRevision ?? 1,
            syncedAt: uploadRes.syncedAt ?? '',
            uid: 'uid-1',
        });
        expect(state.status).toBe(SYNC_STATUS.PENDING);
        expect(state.syncRevision).toBe(1);

        // Simulamos recarga completa de la pestaña leyendo únicamente del storage real
        const reloadedRepo = createStorageRepository(shared);
        const reloadedState = createInitialSyncState({
            isOnline: true,
            currentUid: 'uid-1',
            localBundle: reloadedRepo.readAcademicBundle(),
            meta: reloadedRepo.getSyncMeta(),
        });
        expect(reloadedState.status).toBe(SYNC_STATUS.PENDING);
        expect(reloadedState.syncRevision).toBe(1);

        // Segunda subida sincroniza las ediciones concurrentes (v1 -> v2) y recién ahí llega a synced
        const secondUpload = await uploadAcademicSnapshot('uid-1', {
            expectedRevision: reloadedState.syncRevision,
            storage: reloadedRepo,
            commitFn: (uid, bundle, opts) =>
                commitAcademicBundleTransaction(uid, bundle, { ...opts, deps: engine.createDeps() }),
        });
        expect(secondUpload.status).toBe('synced');
        expect(secondUpload.syncRevision).toBe(2);
        expect(secondUpload.hasConcurrentLocalEdits).toBe(false);
        expect(secondUpload.nextStatus).toBe(SYNC_STATUS.SYNCED);
        expect(engine.docs.get('uid-1').cursada['17.14'].eventos).toHaveLength(1);
    });

    it('dos pestañas reales compartiendo el mismo storage se coordinan sin revisiones desactualizadas', async () => {
        const engine = createConcurrentFirestoreEngine({});
        const sharedBacking = createSharedStorage();

        const tab1Repo = createStorageRepository(sharedBacking);
        const tab2Repo = createStorageRepository(sharedBacking);

        // Pestaña 1 registra un cambio y sube v1
        tab1Repo.setProgreso('17.14', { '11071': 'Aprobado' });
        const up1 = await uploadAcademicSnapshot('uid-1', {
            expectedRevision: null,
            storage: tab1Repo,
            commitFn: (uid, bundle, opts) =>
                commitAcademicBundleTransaction(uid, bundle, { ...opts, deps: engine.createDeps() }),
        });
        expect(up1.syncRevision).toBe(1);

        let tab1State = createInitialSyncState({
            isOnline: true,
            currentUid: 'uid-1',
            localBundle: tab1Repo.readAcademicBundle(),
            meta: tab1Repo.getSyncMeta(),
        });
        let tab2State = createInitialSyncState({
            isOnline: true,
            currentUid: 'uid-1',
            localBundle: tab2Repo.readAcademicBundle(),
            meta: tab2Repo.getSyncMeta(),
        });
        expect(tab1State.status).toBe(SYNC_STATUS.SYNCED);
        expect(tab2State.status).toBe(SYNC_STATUS.SYNCED);

        // Pestaña 2 edita otra materia y la sube a Firestore (v1 -> v2)
        tab2Repo.setProgreso('17.14', { '11071': 'Aprobado', '11072': 'Promocionado' });
        const up2 = await uploadAcademicSnapshot('uid-1', {
            expectedRevision: tab2State.syncRevision,
            storage: tab2Repo,
            commitFn: (uid, bundle, opts) =>
                commitAcademicBundleTransaction(uid, bundle, { ...opts, deps: engine.createDeps() }),
        });
        expect(up2.status).toBe('synced');
        expect(up2.syncRevision).toBe(2);

        // Pestaña 1 recibe el evento `storage` y rehidrata desde el storage compartido real
        tab1State = transitionSyncState(tab1State, {
            type: 'REHYDRATED_FROM_STORAGE',
            currentUid: 'uid-1',
            localBundle: tab1Repo.readAcademicBundle(),
            meta: tab1Repo.getSyncMeta(),
        });

        expect(tab1State.status).toBe(SYNC_STATUS.SYNCED);
        expect(tab1State.syncRevision).toBe(2);

        // Ahora Pestaña 1 edita y sube usando su revisión actualizada (2 -> 3) sin falso conflicto
        tab1Repo.setProgreso('17.14', {
            '11071': 'Aprobado',
            '11072': 'Promocionado',
            '11073': 'Regular',
        });
        const up3 = await uploadAcademicSnapshot('uid-1', {
            expectedRevision: tab1State.syncRevision,
            storage: tab1Repo,
            commitFn: (uid, bundle, opts) =>
                commitAcademicBundleTransaction(uid, bundle, { ...opts, deps: engine.createDeps() }),
        });
        expect(up3.status).toBe('synced');
        expect(up3.syncRevision).toBe(3);
    });

    it('migración legacy + borrado efectivo: un plan legacy borrado NO resucita al volver a iniciar sesión en otro dispositivo', async () => {
        const engine = createConcurrentFirestoreEngine({
            'uid-legacy': {
                uid: 'uid-legacy',
                displayName: 'Estudiante Legacy',
                photoURL: 'https://example.com/u.png',
                config: { planActivo: '17.14', tema: 'dark' },
                // Sin syncRevision, con mapa anidado y clave raíz literal con punto
                progreso: {
                    '17': { '14': { '11071': 'Aprobado' } },
                },
                'progreso.17.13': { '11071': 'Regular' },
            },
        });

        // 1. Dispositivo A lee doc legacy y lo adopta (trae ambos planes 17.14 y 17.13)
        const deviceA = createStorageRepository(createSharedStorage());
        const cloudV0 = await fetchCloudBundle('uid-legacy', { fetchUserDoc: engine.fetchUserDoc });
        expect(cloudV0.syncRevision).toBe(0);
        expect(Object.keys(cloudV0.bundle.progreso).sort()).toEqual(['17.13', '17.14']);

        const adoptA = adoptRemoteSnapshot('uid-legacy', {
            remoteBundle: cloudV0.bundle,
            remoteRevision: cloudV0.syncRevision,
            silent: true,
            storage: deviceA,
        });
        expect(adoptA.ok).toBe(true);

        // 2. El estudiante borra completamente el plan 17.13 localmente y guarda en la nube (v0 -> v1)
        deviceA.remove(STORAGE_KEYS.progreso('17.13'), { silent: true });
        const uploadRes = await uploadAcademicSnapshot('uid-legacy', {
            expectedRevision: deviceA.getSyncMeta()?.syncRevision,
            storage: deviceA,
            commitFn: (uid, bundle, opts) =>
                commitAcademicBundleTransaction(uid, bundle, { ...opts, deps: engine.createDeps() }),
        });
        expect(uploadRes.status).toBe('synced');
        expect(uploadRes.syncRevision).toBe(1);

        // Verificamos que el campo raíz legacy sigue existiendo físicamente (mergeFields no borra campos desconocidos),
        // y que los campos de perfil se preservaron intactos
        expect(engine.docs.get('uid-legacy')['progreso.17.13']).toBeDefined();
        expect(engine.docs.get('uid-legacy').displayName).toBe('Estudiante Legacy');
        expect(engine.docs.get('uid-legacy').config).toEqual({ planActivo: '17.14', tema: 'dark' });

        // 3. Dispositivo B (o un nuevo login en Dispositivo A) lee la nube v1: 17.13 NO debe resucitar
        const cloudV1 = await fetchCloudBundle('uid-legacy', { fetchUserDoc: engine.fetchUserDoc });
        expect(cloudV1.syncRevision).toBe(1);
        expect(cloudV1.bundle.progreso['17.13']).toBeUndefined();
        expect(cloudV1.bundle.progreso['17.14']).toEqual({ '11071': 'Aprobado' });

        const conciliation = evaluarConciliacionSync({
            localBundle: deviceA.readAcademicBundle(),
            remoteBundle: cloudV1.bundle,
            currentUid: 'uid-legacy',
            lastSyncedUid: deviceA.getSyncMeta()?.lastSyncedUid,
            remoteSyncRevision: cloudV1.syncRevision,
        });
        expect(conciliation.outcome).toBe('in_sync');
    });

    it('integridad integral de los 4 módulos (progreso, detalles/intentos, cursada, simulaciones), borrado, restauración de backup a pending y JSON roundtrip', async () => {
        const engine = createConcurrentFirestoreEngine({});
        const repoA = createStorageRepository(createSharedStorage());

        // Cargamos datos ricos en los 4 módulos
        repoA.setProgreso('17.14', { '11071': 'Aprobado', '11072': 'Regular', '11073': 'Libre' });
        repoA.setProgresoDetalles('17.14', {
            '11071': {
                notaFinal: 9,
                fechaAprobacion: '2026-07-15',
                intentosFinal: [
                    { fecha: '2026-02-20', nota: 2, estado: 'reprobado' },
                    { fecha: '2026-07-15', nota: 9, estado: 'aprobado', libro: 'A1', folio: '42' },
                ],
                historial: [
                    {
                        fechaRegularidad: { anio: 2025, cuatrimestre: 1 },
                        notaRegularizacion: 7,
                        intentosFinal: [{ fecha: '2025-12-10', nota: 3, estado: 'reprobado' }],
                    },
                ],
            },
        });
        repoA.setCursada('17.14', {
            horarios: [
                {
                    id: 'h1',
                    codigoMateria: '11072',
                    dia: 2,
                    horaInicio: '14:00',
                    horaFin: '17:00',
                    aula: 'Lab 2',
                    modalidad: 'Presencial',
                },
            ],
            eventos: [
                {
                    id: 'ev1',
                    titulo: 'Final Álgebra',
                    tipo: 'final',
                    fecha: '2026-12-12',
                    hora: '09:00',
                    codigoMateria: '11072',
                },
            ],
            bitacora: [
                {
                    id: 'b1',
                    fecha: '2026-11-18',
                    codigoMateria: '11072',
                    tema: 'Grafos y árboles',
                    notas: 'Repasar BFS/DFS',
                },
            ],
        });
        repoA.setSimulacion('17.14', { anioFinal: 2028, cuatriFinal: '2do', historial: [{ anioActual: 2026 }] });

        const hashOriginal = computeBundleHash(repoA.readAcademicBundle());
        const summary = summarizeAcademicBundle(repoA.readAcademicBundle());
        expect(summary).toMatchObject({
            materiasAprobadas: 1,
            materiasActivas: 1,
            materiasLibres: 1,
            horariosCursada: 1,
            eventosCursada: 1,
            entradasBitacora: 1,
            simulaciones: 1,
        });

        // 1. Subimos y descargamos en otro dispositivo verificando que ninguno de los 4 módulos se pierda
        const up1 = await uploadAcademicSnapshot('uid-1', {
            expectedRevision: null,
            storage: repoA,
            commitFn: (uid, bundle, opts) =>
                commitAcademicBundleTransaction(uid, bundle, { ...opts, deps: engine.createDeps() }),
        });
        expect(up1.status).toBe('synced');

        const repoB = createStorageRepository(createSharedStorage());
        const cloud1 = await fetchCloudBundle('uid-1', { fetchUserDoc: engine.fetchUserDoc });
        adoptRemoteSnapshot('uid-1', {
            remoteBundle: cloud1.bundle,
            remoteRevision: cloud1.syncRevision,
            silent: true,
            storage: repoB,
        });
        expect(computeBundleHash(repoB.readAcademicBundle())).toBe(hashOriginal);
        expect(repoB.getProgresoDetalles('17.14')?.['11071']?.intentosFinal).toHaveLength(2);
        expect(repoB.getProgresoDetalles('17.14')?.['11071']?.historial).toHaveLength(1);
        expect(repoB.getCursada('17.14')?.bitacora[0]?.notas).toBe('Repasar BFS/DFS');

        // 2. Mutación profunda + borrado total de cursada y simulación en Dispositivo B -> sube v2
        repoB.setCursada('17.14', { horarios: [], eventos: [], bitacora: [] });
        repoB.remove(STORAGE_KEYS.simulacion('17.14'), { silent: true });
        repoB.setProgresoDetalles('17.14', {
            '11071': {
                notaFinal: 10,
                intentosFinal: [{ fecha: '2026-07-15', nota: 10, estado: 'aprobado' }],
            },
        });
        const up2 = await uploadAcademicSnapshot('uid-1', {
            expectedRevision: 1,
            storage: repoB,
            commitFn: (uid, bundle, opts) =>
                commitAcademicBundleTransaction(uid, bundle, { ...opts, deps: engine.createDeps() }),
        });
        expect(up2.status).toBe('synced');
        expect(up2.syncRevision).toBe(2);
        expect(engine.docs.get('uid-1').cursada).toEqual({});
        expect(engine.docs.get('uid-1').simulaciones).toEqual({});

        // 3. Dispositivo A adopta v2 (creando backup de v1) y luego el usuario RESTAURA el backup ->
        // la máquina de estados debe pasar a `pending` (no quedarse en `synced`!)
        const cloud2 = await fetchCloudBundle('uid-1', { fetchUserDoc: engine.fetchUserDoc });
        const adopt2 = adoptRemoteSnapshot('uid-1', {
            remoteBundle: cloud2.bundle,
            remoteRevision: cloud2.syncRevision,
            reason: 'manual_load_cloud',
            silent: true,
            storage: repoA,
        });
        expect(adopt2.ok).toBe(true);
        expect(adopt2.backedUp).toBe(true);

        let stateA = createInitialSyncState({
            isOnline: true,
            currentUid: 'uid-1',
            localBundle: repoA.readAcademicBundle(),
            meta: repoA.getSyncMeta(),
        });
        expect(stateA.status).toBe(SYNC_STATUS.SYNCED);

        const restoreRes = repoA.restoreRecoveryBackup({ silent: true });
        expect(restoreRes.ok).toBe(true);
        expect(computeBundleHash(repoA.readAcademicBundle())).toBe(hashOriginal);

        stateA = transitionSyncState(stateA, {
            type: 'REHYDRATED_FROM_STORAGE',
            currentUid: 'uid-1',
            localBundle: repoA.readAcademicBundle(),
            meta: repoA.getSyncMeta(),
        });
        expect(stateA.status).toBe(SYNC_STATUS.PENDING);

        // 4. Exportación e importación manual en JSON conserva exactamente los 4 módulos
        const exportedJson = JSON.stringify(
            buildExportBackupPayload(repoA.readAcademicBundle(), { planActivo: '17.14', sourceUid: 'uid-1' }),
        );
        const imported = parseImportBackupPayload(exportedJson);
        expect(imported.ok).toBe(true);

        const repoC = createStorageRepository(createSharedStorage());
        repoC.writeAcademicBundle(imported.bundle ?? {}, { clearFirst: true, silent: true });
        expect(computeBundleHash(repoC.readAcademicBundle())).toBe(hashOriginal);
    });

    it('rollback real en applyRemoteBundleSafely: si la cuota falla a mitad de escritura remota, restaura el estado previo completo sin corromper SyncMeta', () => {
        // Permite guardar el backup y progreso, pero falla al escribir `cursada+17.14` por segunda vez (durante la carga remota)
        const flakyStorage = createSharedStorage({
            failOnKey: STORAGE_KEYS.cursada('17.14'),
            failAfterCount: 1,
        });
        const repo = createStorageRepository(flakyStorage);

        // Estado local original válido
        repo.setProgreso('17.14', { '11071': 'Aprobado' });
        repo.setProgresoDetalles('17.14', { '11071': { notaFinal: 8 } });
        repo.setCursada('17.14', {
            horarios: [],
            eventos: [{ id: 'local-ev', titulo: 'Parcial Local', tipo: 'parcial', fecha: '2026-11-22' }],
            bitacora: [],
        });
        repo.setSyncMeta({
            syncRevision: 4,
            lastSyncedHash: 'v1:aaaa1111bbbb2222',
            lastSyncedUid: 'uid-1',
            lastSyncedAt: '2026-11-19T10:00:00Z',
        });

        // Permitimos que el rollback vuelva a escribir cursada+17.14 liberando el límite solo tras el primer fallo
        const originalSetItem = flakyStorage.setItem;
        let failedOnce = false;
        flakyStorage.setItem = (key, val) => {
            if (key === STORAGE_KEYS.cursada('17.14') && !failedOnce) {
                failedOnce = true;
                throw new Error('QuotaExceededError');
            }
            // Bypass para el rollback post-fallo
            flakyStorage.map.set(key, String(val));
        };
        expect(originalSetItem).toBeTypeOf('function');

        const result = adoptRemoteSnapshot('uid-1', {
            remoteBundle: {
                progreso: { '17.14': { '11071': 'Aprobado', '11072': 'Aprobado' } },
                progresoDetalles: {},
                cursada: {
                    '17.14': {
                        horarios: [],
                        eventos: [{ id: 'remote-ev', titulo: 'Final Remoto', tipo: 'final', fecha: '2026-12-01' }],
                        bitacora: [],
                    },
                },
                simulaciones: {},
            },
            remoteRevision: 5,
            silent: true,
            storage: repo,
        });

        expect(result.ok).toBe(false);
        expect(result.error).toBe('write_failed');
        // Rollback restauró íntegramente el progreso, detalles y cursada locales
        expect(repo.getProgreso('17.14')).toEqual({ '11071': 'Aprobado' });
        expect(repo.getProgresoDetalles('17.14')).toEqual({ '11071': { notaFinal: 8 } });
        expect(repo.getCursada('17.14')?.eventos[0]?.id).toBe('local-ev');
        // SyncMeta NO se corrompió con la revisión 5 fallida
        expect(repo.getSyncMeta()?.syncRevision).toBe(4);
    });

    it('cambio de cuenta (account_mismatch): elegir conservar datos locales y recargar antes de subir NO re-dispara account_mismatch y permite subir a la cuenta B sin tocar la cuenta A', async () => {
        const engine = createConcurrentFirestoreEngine({
            'uid-A': {
                uid: 'uid-A',
                syncRevision: 3,
                progreso: { '17.14': { '11071': 'Aprobado' } },
                progresoDetalles: {},
                cursada: {},
                simulaciones: {},
            },
            'uid-B': {
                uid: 'uid-B',
                syncRevision: 1,
                progreso: { '17.14': { '11072': 'Regular' } },
                progresoDetalles: {},
                cursada: {},
                simulaciones: {},
            },
        });

        const shared = createSharedStorage();
        const repo = createStorageRepository(shared);

        // 1. Cuenta A adopta sus datos (v3) y cierra sesión (sin borrar localStorage)
        const cloudA = await fetchCloudBundle('uid-A', { fetchUserDoc: engine.fetchUserDoc });
        adoptRemoteSnapshot('uid-A', {
            remoteBundle: cloudA.bundle,
            remoteRevision: cloudA.syncRevision,
            silent: true,
            storage: repo,
        });
        let state = createInitialSyncState({
            isOnline: true,
            currentUid: 'uid-A',
            localBundle: repo.readAcademicBundle(),
            meta: repo.getSyncMeta(),
        });
        state = transitionSyncState(state, { type: 'SIGNED_OUT' });
        expect(state.status).toBe(SYNC_STATUS.LOCAL);

        // 2. Inicia sesión Cuenta B en el mismo navegador -> detecta account_mismatch
        const cloudB = await fetchCloudBundle('uid-B', { fetchUserDoc: engine.fetchUserDoc });
        const conciliation = evaluarConciliacionSync({
            localBundle: repo.readAcademicBundle(),
            remoteBundle: cloudB.bundle,
            currentUid: 'uid-B',
            lastSyncedUid: repo.getSyncMeta()?.lastSyncedUid,
            remoteSyncRevision: cloudB.syncRevision,
        });
        expect(conciliation.outcome).toBe('account_mismatch');

        state = transitionSyncState(state, { type: 'CONCILIATION_EVALUATED', conciliation });
        expect(state.status).toBe(SYNC_STATUS.ACCOUNT_MISMATCH);

        // 3. Cuenta B elige explícitamente conservar los datos de este dispositivo
        claimLocalSnapshotForAccount('uid-B', {
            baseRevision: cloudB.syncRevision,
            storage: repo,
        });
        state = transitionSyncState(state, {
            type: 'CONFLICT_RESOLVED_LOCAL',
            localHash: computeBundleHash(repo.readAcademicBundle()),
            baseRevision: cloudB.syncRevision,
            currentUid: 'uid-B',
        });
        expect(state.status).toBe(SYNC_STATUS.PENDING);
        expect(state.lastSyncedUid).toBe('uid-B');
        expect(state.syncRevision).toBe(1);

        // 4. Cuenta B recarga la pestaña ANTES de subir -> debe permanecer `pending` (NO volver a `account_mismatch`!)
        const reloadedRepo = createStorageRepository(shared);
        const reloadedState = createInitialSyncState({
            isOnline: true,
            currentUid: 'uid-B',
            localBundle: reloadedRepo.readAcademicBundle(),
            meta: reloadedRepo.getSyncMeta(),
        });
        expect(reloadedState.status).toBe(SYNC_STATUS.PENDING);
        expect(reloadedState.syncRevision).toBe(1);
        expect(reloadedState.lastSyncedUid).toBe('uid-B');

        // 5. Cuenta B guarda en la nube -> sube v1 -> v2 en uid-B y la nube de uid-A sigue intacta en v3
        const uploadB = await uploadAcademicSnapshot('uid-B', {
            expectedRevision: reloadedState.syncRevision,
            storage: reloadedRepo,
            commitFn: (uid, bundle, opts) =>
                commitAcademicBundleTransaction(uid, bundle, { ...opts, deps: engine.createDeps() }),
        });
        expect(uploadB.status).toBe('synced');
        expect(uploadB.syncRevision).toBe(2);
        expect(engine.docs.get('uid-B').progreso['17.14']).toEqual({ '11071': 'Aprobado' });
        expect(engine.docs.get('uid-A').syncRevision).toBe(3);
        expect(engine.docs.get('uid-A').progreso['17.14']).toEqual({ '11071': 'Aprobado' });
    });
});
