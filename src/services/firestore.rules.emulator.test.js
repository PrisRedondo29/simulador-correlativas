/**
 * Tests de seguridad y contrato para firestore.rules en Firebase Emulator
 * (ejecutados junto a firestore.emulator.test.js mediante `npm run test:emulator`).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { commitAcademicBundleTransaction } from './dbService';
import { LOG_LEVEL, persistAppLogToFirestore } from './logService';

const rulesPath = resolve(process.cwd(), process.env.FIRESTORE_RULES_PATH ?? 'firestore.rules');
const [host, portString] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
let env;
let student;
let anotherStudent;
let admin;
let anonymous;
const studentId = 'student-a';
const adminId = 'admin-a';

function baseProfile() {
  return {
    uid: studentId,
    email: 'alumna@example.org',
    schemaVersion: 1,
    syncRevision: 0,
    createdAt: serverTimestamp(),
  };
}

function logPayload(extra = {}) {
  return {
    level: 'error',
    errorCode: 'CLIENT_ERROR',
    errorMessage: 'Error al visualizar la pantalla',
    route: '/plan',
    createdAt: serverTimestamp(),
    ...extra,
  };
}

function planPayload(extra = {}) {
  return {
    plan_numero: '17.13',
    version: 1,
    materias: [{ codigo: '11002', nombre: 'Análisis Matemático I' }],
    updatedAt: serverTimestamp(),
    ...extra,
  };
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-unlu-simulador',
    firestore: { host, port: Number(portString), rules: readFileSync(rulesPath, 'utf8') },
  });
  student = env.authenticatedContext(studentId).firestore();
  anotherStudent = env.authenticatedContext('student-b').firestore();
  admin = env.authenticatedContext(adminId).firestore();
  anonymous = env.unauthenticatedContext().firestore();
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'roles', adminId), { role: 'admin' });
  });
});

describe('users: propietario y contrato de sincronización', () => {
  it('permite crear el perfil inicial con serverTimestamp', async () => {
    await assertSucceeds(setDoc(doc(student, 'users', studentId), baseProfile()));
  });

  it('rechaza crear el perfil de otra persona', async () => {
    await assertFails(setDoc(doc(student, 'users', 'student-b'), baseProfile()));
  });

  it('rechaza insertar campos inesperados', async () => {
    await assertFails(setDoc(doc(student, 'users', studentId), { ...baseProfile(), isAdmin: true }));
  });

  it('rechaza modificar uid y createdAt, permite al propietario eliminar su documento y bloquea el borrado por terceros o anónimos', async () => {
    await assertSucceeds(setDoc(doc(student, 'users', studentId), baseProfile()));
    await assertFails(updateDoc(doc(student, 'users', studentId), { uid: 'student-b' }));
    await assertFails(updateDoc(doc(student, 'users', studentId), { createdAt: serverTimestamp() }));

    // Terceros, admin y anónimos NO pueden eliminar la cuenta/datos de studentId
    await assertFails(deleteDoc(doc(anotherStudent, 'users', studentId)));
    await assertFails(deleteDoc(doc(admin, 'users', studentId)));
    await assertFails(deleteDoc(doc(anonymous, 'users', studentId)));

    // El propietario SÍ puede eliminar su propio documento en `/users/{uid}` (Ley 25.326)
    await assertSucceeds(deleteDoc(doc(student, 'users', studentId)));
    const afterDeleteSnap = await assertSucceeds(getDoc(doc(student, 'users', studentId)));
    expect(afterDeleteSnap.exists()).toBe(false);
  });

  it('permite editar configuración con su timestamp actualizado', async () => {
    await assertSucceeds(setDoc(doc(student, 'users', studentId), baseProfile()));
    await assertSucceeds(updateDoc(doc(student, 'users', studentId), {
      config: { alias: 'Prueba', tema: 'system', planActivo: '17.13' },
      configUpdatedAt: serverTimestamp(),
    }));
  });

  it('rechaza modificar configuración sin timestamp', async () => {
    await assertSucceeds(setDoc(doc(student, 'users', studentId), baseProfile()));
    await assertFails(updateDoc(doc(student, 'users', studentId), { config: { tema: 'dark' } }));
  });

  it('rechaza incrementar syncRevision sin editar datos académicos', async () => {
    await assertSucceeds(setDoc(doc(student, 'users', studentId), baseProfile()));
    await assertFails(updateDoc(doc(student, 'users', studentId), { syncRevision: 1 }));
  });

  it('permite una edición académica transaccional coherente', async () => {
    await assertSucceeds(setDoc(doc(student, 'users', studentId), baseProfile()));
    await assertSucceeds(updateDoc(doc(student, 'users', studentId), {
      progreso: { '17.13': { '11002': 'aprobada' } },
      academicHash: 'v1:abcd1234',
      academicUpdatedAt: serverTimestamp(),
      syncRevision: 1,
    }));
  });

  it('rechaza editar progreso sin revisión o timestamp', async () => {
    await assertSucceeds(setDoc(doc(student, 'users', studentId), baseProfile()));
    await assertFails(updateDoc(doc(student, 'users', studentId), {
      progreso: { '17.13': { '11002': 'aprobada' } },
      syncRevision: 1,
    }));
    await assertFails(updateDoc(doc(student, 'users', studentId), {
      progreso: { '17.13': { '11002': 'aprobada' } },
      academicUpdatedAt: serverTimestamp(),
    }));
  });

  it('admite migración de documento legacy con uid y sin revisión', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', studentId), {
        uid: studentId,
        schemaVersion: 1,
        'progreso.17.13': { 11002: 'pendiente' },
      });
    });
    await assertSucceeds(updateDoc(doc(student, 'users', studentId), {
      progreso: { '17.13': { '11002': 'aprobada' } },
      academicHash: 'v1:abcd1234',
      academicUpdatedAt: serverTimestamp(),
      syncRevision: 1,
    }));
  });

  it('documento legacy sin uid requiere migración especial, no pasa automáticamente', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', studentId), { schemaVersion: 1 });
    });
    await assertFails(updateDoc(doc(student, 'users', studentId), {
      config: { tema: 'light' },
      configUpdatedAt: serverTimestamp(),
    }));
  });

  it('rechaza lecturas de otros perfiles y los listados de users', async () => {
    await assertSucceeds(setDoc(doc(student, 'users', studentId), baseProfile()));
    await assertFails(getDoc(doc(anotherStudent, 'users', studentId)));
    await assertFails(getDocs(collection(student, 'users')));
  });
});

describe('logs: atribución, integridad y lectura', () => {
  it('conserva reportes anónimos válidos', async () => {
    await assertSucceeds(setDoc(doc(anonymous, 'app_logs', 'anon'), logPayload()));
  });

  it('rechaza suplante de UID, campos extra y timestamp inventado', async () => {
    await assertFails(setDoc(doc(student, 'app_logs', 'spoof'), logPayload({ uid: 'otra-persona' })));
    await assertFails(setDoc(doc(anonymous, 'app_logs', 'extra'), logPayload({ rawDump: 'x' })));
    await assertFails(setDoc(doc(anonymous, 'app_logs', 'fake-time'), logPayload({ createdAt: new Date('2020-01-01') })));
  });

  it('permite a admin leer/borrar logs, pero no editarlos', async () => {
    await assertSucceeds(setDoc(doc(student, 'app_logs', 'one'), logPayload({ uid: studentId })));
    await assertSucceeds(getDoc(doc(admin, 'app_logs', 'one')));
    await assertFails(getDoc(doc(student, 'app_logs', 'one')));
    await assertFails(updateDoc(doc(admin, 'app_logs', 'one'), { errorCode: 'CHANGED' }));
    await assertSucceeds(deleteDoc(doc(admin, 'app_logs', 'one')));
  });
});

describe('catalog: permisos y versionado', () => {
  it('permite catálogo público y bloquea escritura no admin', async () => {
    await assertSucceeds(setDoc(doc(admin, 'catalog_plans', '17.13'), planPayload()));
    await assertSucceeds(getDoc(doc(anonymous, 'catalog_plans', '17.13')));
    await assertFails(setDoc(doc(student, 'catalog_plans', '17.13'), planPayload()));
    await assertFails(getDocs(collection(anonymous, 'catalog_plans')));
  });

  it('rechaza plan_numero distinto de su ID y versión no creciente', async () => {
    await assertFails(setDoc(doc(admin, 'catalog_plans', '17.13'), planPayload({ plan_numero: '99.01' })));
    await assertSucceeds(setDoc(doc(admin, 'catalog_plans', '17.13'), planPayload()));
    await assertFails(updateDoc(doc(admin, 'catalog_plans', '17.13'), { version: 1, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(admin, 'catalog_plans', '17.13'), { version: 0, updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(admin, 'catalog_plans', '17.13'), { version: 2, updatedAt: serverTimestamp() }));
  });

  it('deniega eliminar planes e índice publicados desde el cliente', async () => {
    await assertSucceeds(setDoc(doc(admin, 'catalog_plans', '17.13'), planPayload()));
    await assertSucceeds(setDoc(doc(admin, 'catalog_meta', 'index'), {
      plans: { '17.13': { version: 1 } }, updatedAt: serverTimestamp(),
    }));
    await assertFails(deleteDoc(doc(admin, 'catalog_plans', '17.13')));
    await assertFails(deleteDoc(doc(admin, 'catalog_meta', 'index')));
  });
});

describe('roles y auditoría institucional', () => {
  it('no permite modificar roles y solo permite leer el propio', async () => {
    await assertFails(setDoc(doc(student, 'roles', studentId), { role: 'admin' }));
    await assertSucceeds(getDoc(doc(admin, 'roles', adminId)));
    await assertFails(getDoc(doc(student, 'roles', adminId)));
  });

  it('no permite fabricar eventos de auditoría desde el navegador', async () => {
    await assertFails(setDoc(doc(admin, 'audit_logs', 'evt1'), {
      actorUid: adminId, createdAt: serverTimestamp(), action: 'PUBLISH',
    }));
  });
});

describe('fase 4: cobertura negativa ampliada y flujos reales de cliente', () => {
  it('permite sincronización académica real mediante commitAcademicBundleTransaction y preserva campos legacy', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', studentId), {
        uid: studentId,
        email: 'alumna@example.org',
        displayName: 'Alumna Legacy',
        schemaVersion: 1,
        materiasAprobadas: [],
        progresoUpdatedAt: serverTimestamp(),
        config: { alias: 'Alumna', planActivo: '17.14', tema: 'light' },
        configUpdatedAt: serverTimestamp(),
        'progreso.17.13': { '11071': 'Regular' },
      });
    });

    const deps = {
      runTransactionFn: runTransaction,
      docFn: doc,
      getDocFn: getDoc,
      firestoreDb: student,
      serverTimestampFn: serverTimestamp,
      getCurrentUserEmail: () => 'alumna@example.org',
    };

    const res1 = await commitAcademicBundleTransaction(
      studentId,
      {
        progreso: { '17.14': { '11071': 'Aprobado' } },
        progresoDetalles: {},
        cursada: {},
        simulaciones: {},
      },
      { expectedRevision: 0, deps },
    );
    expect(res1.status).toBe('synced');
    expect(res1.syncRevision).toBe(1);

    const res2 = await commitAcademicBundleTransaction(
      studentId,
      {
        progreso: { '17.14': { '11071': 'Aprobado', '11072': 'Cursando' } },
        progresoDetalles: {},
        cursada: {},
        simulaciones: {},
      },
      { expectedRevision: 1, deps },
    );
    expect(res2.status).toBe('synced');
    expect(res2.syncRevision).toBe(2);

    const stored = (await getDoc(doc(student, 'users', studentId))).data();
    expect(stored.syncRevision).toBe(2);
    expect(stored.config).toEqual({ alias: 'Alumna', planActivo: '17.14', tema: 'light' });
    expect(stored.materiasAprobadas).toEqual([]);
  });

  it('rechaza saltos o retrocesos de syncRevision, cambios en syncRevision durante update de config y timestamps aislados/falsificados/eliminados', async () => {
    await assertSucceeds(setDoc(doc(student, 'users', studentId), baseProfile()));

    // Primera escritura académica v0 -> v1
    await assertSucceeds(updateDoc(doc(student, 'users', studentId), {
      progreso: { '17.14': { '11071': 'Aprobado' } },
      academicHash: 'v1:11111111',
      academicUpdatedAt: serverTimestamp(),
      syncRevision: 1,
    }));

    // Salto de revisión (1 -> 3) y retroceso (1 -> 0) -> denegados
    await assertFails(updateDoc(doc(student, 'users', studentId), {
      progreso: { '17.14': { '11071': 'Aprobado', '11072': 'Regular' } },
      academicHash: 'v1:22222222',
      academicUpdatedAt: serverTimestamp(),
      syncRevision: 3,
    }));
    await assertFails(updateDoc(doc(student, 'users', studentId), {
      progreso: { '17.14': { '11071': 'Aprobado', '11072': 'Regular' } },
      academicHash: 'v1:22222222',
      academicUpdatedAt: serverTimestamp(),
      syncRevision: 0,
    }));

    // Update aislado de academicUpdatedAt sin syncRevision + 1 -> denegado
    await assertFails(updateDoc(doc(student, 'users', studentId), {
      academicUpdatedAt: serverTimestamp(),
    }));

    // Timestamps falsificados y deleteField() sobre metadatos/timestamps -> denegados
    const fakePast = Timestamp.fromDate(new Date('2020-01-01T00:00:00Z'));
    await assertFails(updateDoc(doc(student, 'users', studentId), {
      progreso: { '17.14': { '11071': 'Regular' } },
      academicUpdatedAt: fakePast,
      syncRevision: 2,
    }));
    await assertFails(updateDoc(doc(student, 'users', studentId), {
      config: { tema: 'dark' },
      configUpdatedAt: fakePast,
    }));
    await assertFails(updateDoc(doc(student, 'users', studentId), {
      academicUpdatedAt: deleteField(),
    }));
    await assertFails(updateDoc(doc(student, 'users', studentId), {
      schemaVersion: deleteField(),
    }));
    await assertFails(updateDoc(doc(student, 'users', studentId), {
      createdAt: deleteField(),
    }));

    // Editar config e incrementar syncRevision simultáneamente sin editar datos académicos -> denegado
    await assertFails(updateDoc(doc(student, 'users', studentId), {
      config: { tema: 'dark' },
      configUpdatedAt: serverTimestamp(),
      syncRevision: 2,
    }));

    // Escritura independiente de config válida sin tocar progreso ni syncRevision -> permitida
    await assertSucceeds(updateDoc(doc(student, 'users', studentId), {
      config: { alias: 'Estudiante', planActivo: '17.14', tema: 'dark' },
      configUpdatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(student, 'users', studentId), {
      configUpdatedAt: deleteField(),
    }));

    const stored = (await getDoc(doc(student, 'users', studentId))).data();
    expect(stored.syncRevision).toBe(1);
    expect(stored.progreso).toEqual({ '17.14': { '11071': 'Aprobado' } });
    expect(stored.config.tema).toBe('dark');
  });

  it('rechaza escrituras de campos legacy deprecados (saveUserProgreso/saveUserCursada/saveUserSimulacion)', async () => {
    await assertSucceeds(setDoc(doc(student, 'users', studentId), baseProfile()));
    await assertFails(updateDoc(doc(student, 'users', studentId), {
      progreso: { '17.14': { '11071': 'Aprobado' } },
      progresoUpdatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(student, 'users', studentId), {
      cursada: { '17.14': { horarios: [], eventos: [], bitacora: [] } },
      cursadaUpdatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(student, 'users', studentId), {
      simulaciones: { '17.14': { anioFinal: 2029 } },
      simulacionUpdatedAt: serverTimestamp(),
    }));
  });

  it('valida telemetría real con persistAppLogToFirestore antes y después de iniciar sesión y rechaza contextos inválidos', async () => {
    // 1. Cliente real anónimo via persistAppLogToFirestore -> permitido
    const anonOk = await persistAppLogToFirestore(
      {
        level: LOG_LEVEL.ERROR,
        errorCode: 'ui/error-boundary',
        errorMessage: 'Fallo anónimo para alumna@unlu.edu.ar',
        route: '/mis-materias',
        componentStack: 'at App',
        planActivo: '17.14',
        uid: null,
        context: { scope: 'page', route: '/mis-materias', disallowedKey: 'ignored' },
      },
      {
        addDocFn: addDoc,
        collectionFn: collection,
        serverTimestampFn: serverTimestamp,
        firestoreDb: anonymous,
        authInstance: { currentUser: null },
      },
    );
    expect(anonOk).toBe(true);

    // 2. Cliente real autenticado via persistAppLogToFirestore incluso pasando payload.uid: null y scope largo
    const authOk = await persistAppLogToFirestore(
      {
        level: LOG_LEVEL.ERROR,
        errorCode: 'ui/error-boundary',
        errorMessage: 'Fallo autenticado',
        route: '/simulador',
        planActivo: '17.14',
        uid: null,
        context: {
          scope: 's'.repeat(90),
          route: '/simulador',
          retries: 3,
          offline: false,
          claveInyectada: 'debe-eliminarse',
        },
      },
      {
        addDocFn: addDoc,
        collectionFn: collection,
        serverTimestampFn: serverTimestamp,
        firestoreDb: student,
        authInstance: { currentUser: { uid: studentId }, authStateReady: async () => {} },
      },
    );
    expect(authOk).toBe(true);

    const logsSnap = await getDocs(collection(admin, 'app_logs'));
    expect(logsSnap.size).toBe(2);
    const authLog = logsSnap.docs.map((d) => d.data()).find((d) => d.route === '/simulador');
    expect(authLog.uid).toBe(studentId);
    expect(authLog.context.scope).toHaveLength(40);
    expect(authLog.context.claveInyectada).toBeUndefined();

    // 3. Contexto completo válido con las 7 claves permitidas -> permitido
    await assertSucceeds(setDoc(doc(student, 'app_logs', 'full-ctx'), logPayload({
      uid: studentId,
      context: {
        scope: 'app',
        route: '/mi-agenda',
        plan: '17.14',
        source: 'ErrorBoundary',
        action: 'render',
        retries: 0,
        offline: true,
      },
    })));

    // 4. Contextos inválidos y atribución directa errónea por SDK -> denegados
    await assertFails(setDoc(doc(student, 'app_logs', 'bad-auth-null'), logPayload({ uid: null })));
    await assertFails(setDoc(doc(anonymous, 'app_logs', 'bad-anon-uid'), logPayload({ uid: studentId })));
    await assertFails(setDoc(doc(anonymous, 'app_logs', 'bad-ctx-key'), logPayload({
      context: { unknownKey: 'x' },
    })));
    await assertFails(setDoc(doc(anonymous, 'app_logs', 'bad-ctx-scope'), logPayload({
      context: { scope: 'x'.repeat(41) },
    })));
    await assertFails(setDoc(doc(anonymous, 'app_logs', 'bad-ctx-retries-neg'), logPayload({
      context: { retries: -1 },
    })));
    await assertFails(setDoc(doc(anonymous, 'app_logs', 'bad-ctx-retries-high'), logPayload({
      context: { retries: 101 },
    })));
    await assertFails(setDoc(doc(anonymous, 'app_logs', 'bad-ctx-retries-float'), logPayload({
      context: { retries: 1.5 },
    })));
    await assertFails(setDoc(doc(anonymous, 'app_logs', 'bad-ctx-offline-str'), logPayload({
      context: { offline: 'true' },
    })));
  });

  it('rechaza saltos de versión en catálogo, docs catalog_meta != index y modificaciones de no-admins', async () => {
    await assertSucceeds(setDoc(doc(admin, 'catalog_plans', '17.13'), planPayload()));
    await assertSucceeds(setDoc(doc(admin, 'catalog_meta', 'index'), {
      plans: { '17.13': { version: 1 } },
      updatedAt: serverTimestamp(),
      updatedBy: adminId,
    }));

    // Salto v1 -> v3 en catalog_plans -> denegado
    await assertFails(updateDoc(doc(admin, 'catalog_plans', '17.13'), {
      version: 3,
      updatedAt: serverTimestamp(),
    }));

    // Documento distinto de 'index' en catalog_meta -> denegado incluso para admin
    await assertFails(setDoc(doc(admin, 'catalog_meta', 'backup'), {
      plans: {},
      updatedAt: serverTimestamp(),
    }));
    await assertFails(getDoc(doc(anonymous, 'catalog_meta', 'backup')));

    // No-admin no puede crear/actualizar/borrar catálogo ni índice
    await assertFails(setDoc(doc(student, 'catalog_meta', 'index'), {
      plans: { '17.13': { version: 2 } },
      updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(student, 'catalog_plans', '17.13'), {
      version: 2,
      updatedAt: serverTimestamp(),
    }));
    await assertFails(deleteDoc(doc(student, 'catalog_plans', '17.13')));
    await assertFails(deleteDoc(doc(student, 'catalog_meta', 'index')));
  });

  it('audit_logs permite solo lectura a admin y bloquea lectura a terceros y toda escritura/edición/borrado cliente', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'audit_logs', 'evt-seeded'), {
        actorUid: adminId,
        action: 'PUBLISH',
        planNumero: '17.14',
        createdAt: serverTimestamp(),
      });
    });

    await assertSucceeds(getDoc(doc(admin, 'audit_logs', 'evt-seeded')));
    await assertSucceeds(getDocs(collection(admin, 'audit_logs')));

    await assertFails(getDoc(doc(student, 'audit_logs', 'evt-seeded')));
    await assertFails(getDocs(collection(student, 'audit_logs')));
    await assertFails(getDoc(doc(anonymous, 'audit_logs', 'evt-seeded')));

    await assertFails(updateDoc(doc(admin, 'audit_logs', 'evt-seeded'), { action: 'TAMPER' }));
    await assertFails(deleteDoc(doc(admin, 'audit_logs', 'evt-seeded')));
    await assertFails(updateDoc(doc(student, 'audit_logs', 'evt-seeded'), { action: 'TAMPER' }));
    await assertFails(deleteDoc(doc(student, 'audit_logs', 'evt-seeded')));
  });
});
