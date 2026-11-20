import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
    initializeTestEnvironment,
    assertFails,
    assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    runTransaction,
    serverTimestamp,
    setDoc,
    updateDoc,
    addDoc,
} from 'firebase/firestore';
import { commitAcademicBundleTransaction } from './dbService';
import { fetchCloudBundle } from './syncService';
import { computeBundleHash } from '../utils/Sync/syncStateMachine';

const PROJECT_ID = 'demo-unlu-simulador';
const RULES_PATH = fileURLToPath(new URL('../../firestore.rules', import.meta.url));

/** @type {import('@firebase/rules-unit-testing').RulesTestEnvironment} */
let testEnv;

function makeRealFirestoreDeps(firestoreDb, email = 'estudiante@unlu.edu.ar') {
    return {
        runTransactionFn: runTransaction,
        docFn: doc,
        getDocFn: getDoc,
        firestoreDb,
        serverTimestampFn: serverTimestamp,
        getCurrentUserEmail: () => email,
    };
}

describe('Firestore Emulator - Reglas de seguridad (firestore.rules) y transacciones SDK reales', () => {
    beforeAll(async () => {
        testEnv = await initializeTestEnvironment({
            projectId: PROJECT_ID,
            firestore: {
                host: '127.0.0.1',
                port: 8080,
                rules: fs.readFileSync(RULES_PATH, 'utf8'),
            },
        });
    });

    beforeEach(async () => {
        await testEnv.clearFirestore();
    });

    afterAll(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    it('bloquea accesos no autenticados, lectura/escritura cruzada, listados, borrados, roles y app_logs', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const adminDb = ctx.firestore();
            await setDoc(doc(adminDb, 'users', 'uid-A'), {
                uid: 'uid-A',
                email: 'a@unlu.edu.ar',
                displayName: 'Alumno A',
                photoURL: null,
                createdAt: serverTimestamp(),
                schemaVersion: 1,
                syncRevision: 0,
            });
            await setDoc(doc(adminDb, 'roles', 'uid-A'), { role: 'user' });
        });

        const unauthDb = testEnv.unauthenticatedContext().firestore();
        const dbA = testEnv.authenticatedContext('uid-A', { email: 'a@unlu.edu.ar' }).firestore();
        const dbB = testEnv.authenticatedContext('uid-B', { email: 'b@unlu.edu.ar' }).firestore();

        // No autenticado bloqueado en todo
        await assertFails(getDoc(doc(unauthDb, 'users', 'uid-A')));
        await assertFails(getDoc(doc(unauthDb, 'roles', 'uid-A')));
        await assertFails(addDoc(collection(unauthDb, 'app_logs'), { level: 'error' }));

        // Cross-user bloqueado
        await assertFails(getDoc(doc(dbB, 'users', 'uid-A')));
        await assertFails(
            updateDoc(doc(dbB, 'users', 'uid-A'), { displayName: 'Hackeado' }),
        );
        await assertFails(getDoc(doc(dbB, 'roles', 'uid-A')));

        // Listado de colecciones y borrado bloqueados incluso autenticado
        await assertFails(getDocs(collection(dbA, 'users')));
        await assertFails(getDocs(collection(dbA, 'roles')));
        await assertFails(deleteDoc(doc(dbA, 'users', 'uid-A')));

        // roles/{uid}: lectura propia permitida, escritura prohibida (anti escalación de privilegios)
        await assertSucceeds(getDoc(doc(dbA, 'roles', 'uid-A')));
        await assertFails(setDoc(doc(dbA, 'roles', 'uid-A'), { role: 'admin' }));

        // app_logs: rechaza payloads malformados o con spoofing de uid, acepta el esquema válido de ErrorBoundary,
        // y solo permite lectura/listado/borrado a usuarios con roles/{uid}.role == 'admin'
        await assertFails(addDoc(collection(dbA, 'app_logs'), { level: 'error', msg: 'test' }));
        await assertFails(
            addDoc(collection(dbA, 'app_logs'), {
                level: 'error',
                errorCode: 'ui/error-boundary',
                errorMessage: 'Intento de spoofing de uid',
                route: '/progreso',
                uid: 'uid-B', // Spoofing! dbA es uid-A
                createdAt: serverTimestamp(),
            }),
        );

        const createdLogRef = await assertSucceeds(
            addDoc(collection(unauthDb, 'app_logs'), {
                level: 'error',
                errorCode: 'ui/error-boundary',
                errorMessage: 'Fallo capturado en producción (sesión anónima)',
                route: '/progreso',
                componentStack: 'in Progreso',
                planActivo: '17.14',
                uid: null,
                context: { scope: 'page' },
                createdAt: serverTimestamp(),
            }),
        );

        // Usuario normal y anónimo NO pueden leer ni listar app_logs
        await assertFails(getDoc(doc(unauthDb, 'app_logs', createdLogRef.id)));
        await assertFails(getDoc(doc(dbA, 'app_logs', createdLogRef.id)));
        await assertFails(getDocs(collection(dbA, 'app_logs')));

        // Usuario con rol admin SÍ puede leer, listar y eliminar logs desde el Panel Admin
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), 'roles', 'uid-admin'), { role: 'admin' });
        });
        const dbAdmin = testEnv
            .authenticatedContext('uid-admin', { email: 'admin@unlu.edu.ar' })
            .firestore();
        await assertSucceeds(getDoc(doc(dbAdmin, 'app_logs', createdLogRef.id)));
        await assertSucceeds(getDocs(collection(dbAdmin, 'app_logs')));
        await assertSucceeds(deleteDoc(doc(dbAdmin, 'app_logs', createdLogRef.id)));
    });

    it('rechaza inyección de campos no permitidos, mutación de uid/createdAt, config inválida y salto de syncRevision', async () => {
        const dbA = testEnv.authenticatedContext('uid-A', { email: 'a@unlu.edu.ar' }).firestore();
        const userRef = doc(dbA, 'users', 'uid-A');

        // 1. Create con campo prohibido (isAdmin/role) -> denegado
        await assertFails(
            setDoc(userRef, {
                uid: 'uid-A',
                email: 'a@unlu.edu.ar',
                isAdmin: true,
                createdAt: serverTimestamp(),
                schemaVersion: 1,
                syncRevision: 0,
            }),
        );

        // 2. Create legítimo de perfil inicial -> permitido
        await assertSucceeds(
            setDoc(userRef, {
                uid: 'uid-A',
                email: 'a@unlu.edu.ar',
                displayName: 'Alumno A',
                photoURL: null,
                createdAt: serverTimestamp(),
                schemaVersion: 1,
                syncRevision: 0,
            }),
        );

        // 3. Update intentando inyectar rol o mutar createdAt / uid -> denegado
        await assertFails(updateDoc(userRef, { role: 'admin' }));
        await assertFails(updateDoc(userRef, { uid: 'uid-B' }));
        await assertFails(updateDoc(userRef, { createdAt: serverTimestamp() }));

        // 4. Config con tema inválido o alias demasiado largo -> denegado
        await assertFails(
            setDoc(
                userRef,
                {
                    uid: 'uid-A',
                    email: 'a@unlu.edu.ar',
                    schemaVersion: 1,
                    configUpdatedAt: serverTimestamp(),
                    config: { alias: 'Ok', tema: 'rainbow' },
                },
                { merge: true },
            ),
        );
        await assertFails(
            setDoc(
                userRef,
                {
                    uid: 'uid-A',
                    email: 'a@unlu.edu.ar',
                    schemaVersion: 1,
                    configUpdatedAt: serverTimestamp(),
                    config: { alias: 'x'.repeat(100), tema: 'dark' },
                },
                { merge: true },
            ),
        );

        // 5. Config válida -> permitida sin tocar syncRevision
        await assertSucceeds(
            setDoc(
                userRef,
                {
                    uid: 'uid-A',
                    email: 'a@unlu.edu.ar',
                    schemaVersion: 1,
                    configUpdatedAt: serverTimestamp(),
                    config: { alias: 'Priscila', planActivo: '17.14', tema: 'dark' },
                },
                { merge: true },
            ),
        );

        // 6. Intento de escribir datos académicos saltando syncRevision (0 -> 5) o sin incrementarla (0 -> 0) -> denegado por rules
        await assertFails(
            setDoc(
                userRef,
                {
                    uid: 'uid-A',
                    email: 'a@unlu.edu.ar',
                    schemaVersion: 1,
                    syncRevision: 5,
                    academicHash: 'v1:0123456789abcdef',
                    academicUpdatedAt: serverTimestamp(),
                    progreso: { '17.14': { '11071': 'Aprobado' } },
                    progresoDetalles: {},
                    cursada: {},
                    simulaciones: {},
                },
                { merge: true },
            ),
        );
        await assertFails(
            setDoc(
                userRef,
                {
                    uid: 'uid-A',
                    email: 'a@unlu.edu.ar',
                    schemaVersion: 1,
                    syncRevision: 0,
                    academicHash: 'v1:0123456789abcdef',
                    academicUpdatedAt: serverTimestamp(),
                    progreso: { '17.14': { '11071': 'Aprobado' } },
                    progresoDetalles: {},
                    cursada: {},
                    simulaciones: {},
                },
                { merge: true },
            ),
        );
    });

    it('SDK real: mergeFields guarda planes con punto ("17.14", "20.08") como mapas planos, borra claves eliminadas y preserva perfil/legacy', async () => {
        // Sembramos un documento legacy con `materiasAprobadas`, `displayName`, `config` y clave raíz `"progreso.17.13"`
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const adminDb = ctx.firestore();
            await setDoc(doc(adminDb, 'users', 'uid-legacy'), {
                uid: 'uid-legacy',
                email: 'legacy@unlu.edu.ar',
                displayName: 'Alumno Legacy',
                photoURL: 'https://example.com/p.png',
                materiasAprobadas: [],
                createdAt: serverTimestamp(),
                schemaVersion: 1,
                config: { alias: 'Legacy', planActivo: '17.14', tema: 'light' },
                'progreso.17.13': { '11071': 'Regular' },
            });
        });

        const dbLegacy = testEnv
            .authenticatedContext('uid-legacy', { email: 'legacy@unlu.edu.ar' })
            .firestore();
        const deps = makeRealFirestoreDeps(dbLegacy, 'legacy@unlu.edu.ar');

        // 1. Lectura inicial legacy (syncRevision === 0) extrae 17.13 sin efectos secundarios
        const initialCloud = await fetchCloudBundle('uid-legacy', {
            fetchUserDoc: async (uid) => {
                const snap = await getDoc(doc(dbLegacy, 'users', uid));
                return snap.exists() ? snap.data() : null;
            },
        });
        expect(initialCloud.syncRevision).toBe(0);
        expect(initialCloud.bundle.progreso['17.13']).toEqual({ '11071': 'Regular' });

        // 2. Commit real v0 -> v1 con claves con punto "17.14" y "20.08" en múltiples módulos
        const bundleV1 = {
            progreso: {
                '17.14': { '11071': 'Aprobado', '11072': 'Regular' },
                '20.08': { '20001': 'Cursando' },
            },
            progresoDetalles: {
                '17.14': { '11071': { notaFinal: 9 } },
            },
            cursada: {
                '17.14': {
                    horarios: [],
                    eventos: [{ id: 'ev-1', titulo: 'Parcial', tipo: 'parcial', fecha: '2026-11-28' }],
                    bitacora: [],
                },
            },
            simulaciones: { '17.14': { anioFinal: 2029 } },
        };

        const tx1 = await commitAcademicBundleTransaction('uid-legacy', bundleV1, {
            expectedRevision: 0,
            deps,
        });
        expect(tx1.status).toBe('synced');
        expect(tx1.syncRevision).toBe(1);

        // Inspeccionamos el documento CRUDO en Firestore real:
        const rawV1 = (await getDoc(doc(dbLegacy, 'users', 'uid-legacy'))).data();
        expect(rawV1.displayName).toBe('Alumno Legacy');
        expect(rawV1.config).toEqual({ alias: 'Legacy', planActivo: '17.14', tema: 'light' });
        // Claves con punto almacenadas como llaves planas literales (NO anidadas bajo '17'/'20')
        expect(rawV1.progreso['17.14']).toEqual({ '11071': 'Aprobado', '11072': 'Regular' });
        expect(rawV1.progreso['20.08']).toEqual({ '20001': 'Cursando' });
        expect(rawV1.progreso['17']).toBeUndefined();
        expect(rawV1.progreso['20']).toBeUndefined();

        // 3. Borramos 11072, plan 20.08 y el evento de cursada -> commit v1 -> v2
        const bundleV2 = {
            progreso: { '17.14': { '11071': 'Aprobado' } },
            progresoDetalles: { '17.14': { '11071': { notaFinal: 9 } } },
            cursada: {},
            simulaciones: {},
        };
        const tx2 = await commitAcademicBundleTransaction('uid-legacy', bundleV2, {
            expectedRevision: 1,
            deps,
        });
        expect(tx2.status).toBe('synced');
        expect(tx2.syncRevision).toBe(2);

        const rawV2 = (await getDoc(doc(dbLegacy, 'users', 'uid-legacy'))).data();
        expect(rawV2.progreso['17.14']).toEqual({ '11071': 'Aprobado' });
        expect(rawV2.progreso['20.08']).toBeUndefined();
        expect(rawV2.cursada).toEqual({});
        expect(rawV2.simulaciones).toEqual({});
        expect(rawV2.displayName).toBe('Alumno Legacy');

        // Y fetchCloudBundle v2 NO resucita la clave raíz legacy "progreso.17.13"
        const fetchedV2 = await fetchCloudBundle('uid-legacy', {
            fetchUserDoc: async (uid) => (await getDoc(doc(dbLegacy, 'users', uid))).data() ?? null,
        });
        expect(fetchedV2.bundle.progreso['17.13']).toBeUndefined();
        expect(fetchedV2.hash).toBe(computeBundleHash(bundleV2));
    });

    it('SDK real: carrera simultánea Promise.all de 2 dispositivos desde v10 contra Firestore real -> uno gana v11 y el otro recibe conflicto', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), 'users', 'uid-race'), {
                uid: 'uid-race',
                email: 'race@unlu.edu.ar',
                displayName: 'Carrera Real',
                photoURL: null,
                createdAt: serverTimestamp(),
                schemaVersion: 1,
                syncRevision: 10,
                progreso: { '17.14': { '11071': 'Aprobado' } },
                progresoDetalles: {},
                cursada: {},
                simulaciones: {},
            });
        });

        const dbClient1 = testEnv
            .authenticatedContext('uid-race', { email: 'race@unlu.edu.ar' })
            .firestore();
        const dbClient2 = testEnv
            .authenticatedContext('uid-race', { email: 'race@unlu.edu.ar' })
            .firestore();

        const [resPC, resMobile] = await Promise.all([
            commitAcademicBundleTransaction(
                'uid-race',
                {
                    progreso: { '17.14': { '11071': 'Aprobado', '11073': 'Aprobado' } },
                    progresoDetalles: {},
                    cursada: {},
                    simulaciones: {},
                },
                { expectedRevision: 10, deps: makeRealFirestoreDeps(dbClient1, 'race@unlu.edu.ar') },
            ),
            commitAcademicBundleTransaction(
                'uid-race',
                {
                    progreso: { '17.14': { '11071': 'Aprobado', '11074': 'Aprobado' } },
                    progresoDetalles: {},
                    cursada: {},
                    simulaciones: {},
                },
                { expectedRevision: 10, deps: makeRealFirestoreDeps(dbClient2, 'race@unlu.edu.ar') },
            ),
        ]);

        const results = [resPC, resMobile];
        const winners = results.filter((r) => r.status === 'synced');
        const conflicts = results.filter((r) => r.status === 'conflict');

        expect(winners).toHaveLength(1);
        expect(conflicts).toHaveLength(1);
        expect(winners[0].syncRevision).toBe(11);
        expect(conflicts[0].remoteRevision).toBe(11);

        // El documento real en Firestore coincide con el ganador en v11
        const stored = (await getDoc(doc(dbClient1, 'users', 'uid-race'))).data();
        expect(stored.syncRevision).toBe(11);
        expect(conflicts[0].remoteHash).toBe(winners[0].uploadedHash);
    });
});
