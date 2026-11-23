import { auth, db } from './firebase';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    reauthenticateWithPopup,
    deleteUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { mapFirebaseError } from '../utils/errorCodes';
import storageRepository from './storageRepository';

const provider = new GoogleAuthProvider();

// ─── Schema del documento de usuario ─────────────────────────────────────────
// Solo almacenamos el perfil inicial. Los datos académicos nunca se transfieren
// automáticamente al registrar una cuenta para evitar fugas entre cuentas en
// dispositivos compartidos; la conciliación segura ocurre en AuthContext.
const SCHEMA_VERSION = 1;

/**
 * Construye el documento inicial de perfil de usuario para Firestore.
 * Existe como función separada para facilitar futuras migraciones de schema.
 *
 * @param {import('firebase/auth').User} user
 * @returns {Record<string, unknown>} Documento listo para setDoc
 */
const buildUserDoc = (user) => ({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    createdAt: serverTimestamp(),
    schemaVersion: SCHEMA_VERSION,
    syncRevision: 0,
});

/**
 * @param {unknown} err
 * @returns {string | undefined}
 */
const extractErrorCode = (err) => {
    if (err && typeof err === 'object' && 'code' in err) {
        const code = /** @type {{ code?: unknown }} */ (err).code;
        return typeof code === 'string' ? code : undefined;
    }
    return undefined;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Abre el popup de Google OAuth y autentica al usuario en Firebase Auth.
 * Si es la primera vez que ingresa, crea únicamente su documento de perfil en Firestore.
 *
 * @returns {Promise<{ user: import('firebase/auth').User, firestoreWarning: string | null }>}
 * @throws {import('../utils/errorCodes').AppError} Si falla el paso de Auth
 */
export const loginConGoogle = async () => {
    let result;
    try {
        result = await signInWithPopup(auth, provider);
    } catch (authError) {
        const appError = mapFirebaseError(authError);
        throw appError ?? { code: extractErrorCode(authError), message: null, originalError: authError };
    }

    const user = result.user;

    if (!user?.uid) {
        return { user, firestoreWarning: 'No se recibió un UID válido del proveedor.' };
    }

    /** @type {string | null} */
    let firestoreWarning = null;
    try {
        const pendingDeletion = storageRepository.getPendingAccountDeletion();
        const isPendingDeletionForUser = Boolean(
            pendingDeletion &&
                pendingDeletion.uid === user.uid &&
                pendingDeletion.stage === 'firestore_deleted_auth_pending',
        );

        if (!isPendingDeletionForUser) {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, buildUserDoc(user));
            }
        }
    } catch (firestoreError) {
        const mapped = mapFirebaseError(firestoreError);
        firestoreWarning = mapped?.message ?? 'No se pudo sincronizar el perfil. Seguís conectado.';
    }

    return { user, firestoreWarning };
};

/**
 * Cierra la sesión del usuario en Firebase Auth.
 *
 * @returns {Promise<void>}
 * @throws {import('../utils/errorCodes').AppError}
 */
export const logout = async () => {
    try {
        await signOut(auth);
    } catch (err) {
        throw mapFirebaseError(err) ?? err;
    }
};

/**
 * Reautentica al usuario actual con Google OAuth antes de acciones críticas (como eliminar cuenta).
 * Respeta cancelaciones silenciosas del popup igual que `loginConGoogle`.
 *
 * @param {import('firebase/auth').User | null} [currentUser]
 * @returns {Promise<import('firebase/auth').UserCredential>}
 * @throws {import('../utils/errorCodes').AppError | { code?: string, message: null, originalError: unknown }}
 */
export const reauthenticateWithGoogle = async (currentUser = auth.currentUser) => {
    if (!currentUser) {
        throw {
            code: 'auth/unauthenticated',
            message: 'No hay una sesión activa para confirmar tu identidad.',
        };
    }

    try {
        return await reauthenticateWithPopup(currentUser, provider);
    } catch (authError) {
        const appError = mapFirebaseError(authError);
        throw (
            appError ?? {
                code: extractErrorCode(authError),
                message: null,
                originalError: authError,
            }
        );
    }
};

/**
 * Elimina definitivamente el usuario autenticado en Firebase Authentication.
 *
 * @param {import('firebase/auth').User | null} [currentUser]
 * @returns {Promise<void>}
 * @throws {import('../utils/errorCodes').AppError | unknown}
 */
export const deleteCurrentAuthUser = async (currentUser = auth.currentUser) => {
    if (!currentUser) {
        throw {
            code: 'auth/unauthenticated',
            message: 'No hay una sesión activa para eliminar.',
        };
    }

    try {
        await deleteUser(currentUser);
    } catch (authError) {
        throw mapFirebaseError(authError) ?? authError;
    }
};
