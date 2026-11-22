import { doc, getDoc, setDoc, deleteDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { mapFirebaseError } from '../utils/errorCodes';
import {
    MAX_SAFE_FIRESTORE_BYTES,
    canonicalizeAcademicBundle,
    computeBundleHash,
    estimatePayloadBytes,
    extractAcademicBundleFromCloudDoc,
    getSafeSyncRevision,
    isAcademicBundleEmpty,
} from '../utils/Sync/syncStateMachine';

/** @typedef {import('../types/domain').UserCloudConfig} UserCloudConfig */
/** @typedef {import('../types/domain').AcademicSyncBundle} AcademicSyncBundle */
/** @typedef {import('../types/domain').CommitSyncTransactionResult} CommitSyncTransactionResult */
/** @typedef {import('../types/domain').SyncUnitId} SyncUnitId */

const SCHEMA_VERSION = 1;

/**
 * Campos del bloque académico que se reemplazan atómicamente en cada commit de sincronización.
 * Usar `mergeFields` garantiza dos propiedades simultáneas:
 *  1. Preserva intactos campos ajenos al bloque académico (`displayName`, `photoURL`, `createdAt`, `config`).
 *  2. Evita que el deep-merge de Firestore conserve claves eliminadas dentro de `progreso`, `progresoDetalles`, `cursada` o `simulaciones`.
 */
export const ACADEMIC_SYNC_MERGE_FIELDS = [
    'uid',
    'email',
    'schemaVersion',
    'syncRevision',
    'academicHash',
    'academicUpdatedAt',
    'progreso',
    'progresoDetalles',
    'cursada',
    'simulaciones',
];

/**
 * Consulta el rol de un usuario en la colección 'roles'.
 * @param {string | null | undefined} uid
 * @returns {Promise<string>} 'admin' | 'user'
 */
export const getUserRole = async (uid) => {
    if (!uid) return 'user';
    try {
        const roleRef = doc(db, 'roles', uid);
        const roleSnap = await getDoc(roleRef);
        if (roleSnap.exists()) {
            return String(roleSnap.data().role || 'user');
        }
    } catch (error) {
        if (import.meta.env.DEV) console.error('Error al obtener rol:', error);
    }
    return 'user';
};

/**
 * Recupera todo el documento del usuario actual.
 * @param {string | null | undefined} uid
 * @returns {Promise<Record<string, any> | null>}
 */
export const getUserData = async (uid) => {
    if (!uid) return null;

    const userRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        if (import.meta.env.DEV) console.log('☁️ Datos recuperados de Firestore:', data);
        return data;
    }

    if (import.meta.env.DEV) console.warn('⚠️ No existe el documento del usuario en Firestore.');
    return null;
};

/**
 * Guarda alias, plan activo y tema en la configuración del usuario.
 * @param {string} uid
 * @param {UserCloudConfig} config
 * @returns {Promise<void>}
 */
export const updateUserConfig = async (uid, config) => {
    if (!uid || !config) return;

    const userRef = doc(db, 'users', uid);
    const currentUser = auth.currentUser;
    const { alias, planActivo, tema } = config;

    /** @type {UserCloudConfig} */
    const configData = {};
    if (alias !== undefined) configData.alias = alias;
    if (planActivo !== undefined) configData.planActivo = planActivo;
    if (tema !== undefined) configData.tema = tema;

    const updates = {
        uid,
        email: currentUser?.email || '',
        schemaVersion: SCHEMA_VERSION,
        configUpdatedAt: serverTimestamp(),
        config: configData,
    };

    await setDoc(userRef, updates, { merge: true });
};

/**
 * Sube el bloque académico completo de un usuario mediante una transacción optimista
 * de Firestore (`runTransaction`) verificando atómicamente `syncRevision`.
 *
 * Garantías:
 *  - Valida antes de abrir la transacción que el payload no exceda `MAX_SAFE_FIRESTORE_BYTES` (< 1 MiB).
 *  - Lee `syncRevision` actual dentro de la transacción y la compara con `expectedRevision`.
 *  - Si otro dispositivo publicó una revisión más nueva (o si el dispositivo no conocía la revisión
 *    y ya existen datos remotos no vacíos), aborta la escritura y devuelve `{ status: 'conflict' }`.
 *  - Si coincide (o si `forceOverwrite` es `true`), escribe únicamente el bloque académico mediante
 *    `mergeFields: ACADEMIC_SYNC_MERGE_FIELDS` (preservando perfil/config) e incrementa `syncRevision`.
 *  - Captura errores de permisos, red u offline sin reportar jamás `synced`.
 *
 * @param {string} uid
 * @param {Partial<AcademicSyncBundle>} bundle
 * @param {{
 *   expectedRevision?: number | null,
 *   forceOverwrite?: boolean,
 *   syncUnit?: SyncUnitId,
 *   email?: string | null,
 *   deps?: {
 *     runTransactionFn?: typeof runTransaction,
 *     docFn?: typeof doc,
 *     getDocFn?: typeof getDoc,
 *     firestoreDb?: typeof db,
 *     serverTimestampFn?: typeof serverTimestamp,
 *     getCurrentUserEmail?: () => string,
 *   },
 * }} [options]
 * @returns {Promise<CommitSyncTransactionResult>}
 */
export const commitAcademicBundleTransaction = async (uid, bundle, options = {}) => {
    if (!uid) {
        return {
            status: 'error',
            code: 'sync/invalid-uid',
            message: 'Necesitás iniciar sesión para guardar tus datos en la nube.',
        };
    }

    const {
        expectedRevision = null,
        forceOverwrite = false,
        email = null,
        deps = {},
    } = options;

    const runTransactionFn = deps.runTransactionFn ?? runTransaction;
    const docFn = deps.docFn ?? doc;
    const getDocFn = deps.getDocFn ?? (deps.runTransactionFn ? null : getDoc);
    const firestoreDb = deps.firestoreDb ?? db;
    const serverTimestampFn = deps.serverTimestampFn ?? serverTimestamp;
    const resolvedEmail =
        email ?? (deps.getCurrentUserEmail ? deps.getCurrentUserEmail() : auth.currentUser?.email || '');

    const canonicalBundle = canonicalizeAcademicBundle(bundle);
    const uploadedHash = computeBundleHash(canonicalBundle);

    const payloadBase = {
        uid,
        email: resolvedEmail || '',
        schemaVersion: SCHEMA_VERSION,
        academicHash: uploadedHash,
        progreso: canonicalBundle.progreso,
        progresoDetalles: canonicalBundle.progresoDetalles,
        cursada: canonicalBundle.cursada,
        simulaciones: canonicalBundle.simulaciones,
    };

    const payloadBytes = estimatePayloadBytes({
        ...payloadBase,
        syncRevision: (typeof expectedRevision === 'number' ? expectedRevision : 0) + 1,
    });

    if (payloadBytes > MAX_SAFE_FIRESTORE_BYTES) {
        return {
            status: 'error',
            code: 'sync/payload-too-large',
            message:
                'Tus datos académicos superan el tamaño seguro de almacenamiento en la nube (límite 1 MiB). Exportá un respaldo manual en JSON.',
            payloadBytes,
        };
    }

    const userRef = docFn(firestoreDb, 'users', uid);
    const hasKnownRevision =
        typeof expectedRevision === 'number' &&
        Number.isInteger(expectedRevision) &&
        expectedRevision >= 0;

    try {
        /** @type {CommitSyncTransactionResult} */
        const txOutcome = await runTransactionFn(firestoreDb, async (transaction) => {
            const docSnap = await transaction.get(userRef);
            const remoteData = docSnap.exists() ? docSnap.data() : null;
            const remoteRevision = getSafeSyncRevision(remoteData);
            const remoteBundle = extractAcademicBundleFromCloudDoc(remoteData);
            const remoteEmpty = isAcademicBundleEmpty(remoteBundle);

            if (!forceOverwrite) {
                const isStaleRevision = hasKnownRevision
                    ? remoteRevision !== expectedRevision
                    : remoteRevision > 0 || !remoteEmpty;

                if (isStaleRevision) {
                    return {
                        status: 'conflict',
                        reason: 'revision_conflict',
                        remoteRevision,
                        remoteBundle,
                        remoteHash: computeBundleHash(remoteBundle),
                    };
                }
            }

            const nextRevision = remoteRevision + 1;
            const payloadToWrite = {
                ...payloadBase,
                syncRevision: nextRevision,
                academicUpdatedAt: serverTimestampFn(),
            };

            transaction.set(userRef, payloadToWrite, {
                mergeFields: ACADEMIC_SYNC_MERGE_FIELDS,
            });

            return {
                status: 'synced',
                syncRevision: nextRevision,
                uploadedHash,
                syncedAt: new Date().toISOString(),
                payloadBytes,
            };
        });

        return txOutcome;
    } catch (error) {
        const rawCode =
            error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
                ? error.code
                : 'sync/transaction-failed';

        // En Firestore real, las Security Rules (`syncRevision == prevRev + 1`) se evalúan antes del
        // chequeo MVCC de la transacción. Si dos dispositivos leen v10 simultáneamente y el primero
        // commitea v11, el segundo recibe `permission-denied` o `aborted` al intentar escribir v11.
        // Verificamos con una lectura fresca si la revisión remota avanzó para devolver `conflict`
        // (conservando `error` ante fallos genuinos de permisos).
        if (
            !forceOverwrite &&
            getDocFn &&
            (rawCode === 'permission-denied' ||
                rawCode === 'aborted' ||
                rawCode === 'failed-precondition')
        ) {
            try {
                const freshSnap = await getDocFn(userRef);
                if (freshSnap.exists()) {
                    const freshData = freshSnap.data();
                    const remoteRevision = getSafeSyncRevision(freshData);
                    const remoteBundle = extractAcademicBundleFromCloudDoc(freshData);
                    const remoteEmpty = isAcademicBundleEmpty(remoteBundle);
                    const isStaleRevision = hasKnownRevision
                        ? remoteRevision !== expectedRevision
                        : remoteRevision > 0 || !remoteEmpty;

                    if (isStaleRevision) {
                        return {
                            status: 'conflict',
                            reason: 'revision_conflict',
                            remoteRevision,
                            remoteBundle,
                            remoteHash: computeBundleHash(remoteBundle),
                        };
                    }
                }
            } catch {
                // Si tampoco podemos leer (ej: error genuino de permisos u offline), caemos a `error`.
            }
        }

        if (import.meta.env.DEV) console.error('Error en transacción de sincronización:', error);
        const mapped = mapFirebaseError(error);
        return {
            status: 'error',
            code: mapped?.code && mapped.code !== 'unknown' ? mapped.code : rawCode,
            message:
                mapped?.message ??
                'No se pudo completar la sincronización con la nube. Tus datos locales siguen intactos.',
            originalError: error,
        };
    }
};

/**
 * Elimina el documento del usuario en `/users/{uid}` (única colección con datos académicos del usuario).
 *
 * @param {string} uid
 * @param {{
 *   deleteDocFn?: typeof deleteDoc,
 *   docFn?: typeof doc,
 *   firestoreDb?: typeof db,
 * }} [deps]
 * @returns {Promise<void>}
 */
export const deleteUserCloudData = async (uid, deps = {}) => {
    if (!uid) {
        throw new Error('Se requiere un UID válido para eliminar los datos en la nube.');
    }
    const deleteDocFn = deps.deleteDocFn ?? deleteDoc;
    const docFn = deps.docFn ?? doc;
    const firestoreDb = deps.firestoreDb ?? db;
    await deleteDocFn(docFn(firestoreDb, 'users', uid));
};
