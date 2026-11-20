import { auth, db } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { mapFirebaseError } from '../utils/errorCodes';
import storageRepository from './storageRepository';

const provider = new GoogleAuthProvider();

// ─── Schema del documento de usuario ─────────────────────────────────────────
// Solo almacenamos lo estrictamente necesario. Nunca guardamos tokens,
// contraseñas ni información sensible del objeto User de Firebase.
const SCHEMA_VERSION = 1;

/**
 * Construye el documento de usuario para Firestore.
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
    materiasAprobadas: [],
    createdAt: serverTimestamp(),
    schemaVersion: SCHEMA_VERSION,
});

/**
 * Extrae progreso local significativo del localStorage para subir a la nube
 * cuando un usuario nuevo se registra (migración de invitado a cuenta).
 * @returns {Record<string, Record<string, string>> | null}
 */
const getMeaningfulLocalProgress = () => {
    if (typeof localStorage === 'undefined') return null;

    /** @type {Record<string, Record<string, string>>} */
    const localData = {};
    let hasMeaningfulData = false;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('progreso+')) {
            const plan = key.split('+')[1];
            const raw = localStorage.getItem(key);
            if (!plan || !raw) continue;

            try {
                const data = JSON.parse(raw);
                if (!data || typeof data !== 'object') continue;
                localData[plan] = data;
                if (
                    Object.values(data).some((s) =>
                        ['Aprobado', 'Regular', 'Cursando', 'Promocionado'].includes(String(s)),
                    )
                ) {
                    hasMeaningfulData = true;
                }
            } catch {
                // Ignorar entradas corruptas en localStorage
            }
        }
    }

    return hasMeaningfulData ? localData : null;
};

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
 * Si es la primera vez que ingresa, crea su documento en Firestore.
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
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            const newUserDoc = buildUserDoc(user);

            const localProgress = getMeaningfulLocalProgress();
            if (localProgress) {
                /** @type {Record<string, unknown>} */
                const progresoMap = {};
                /** @type {Record<string, unknown>} */
                const detallesMap = {};

                for (const [plan, prog] of Object.entries(localProgress)) {
                    progresoMap[plan] = prog;
                    const detalles = storageRepository.getProgresoDetalles(plan, null);
                    if (detalles) {
                        detallesMap[plan] = detalles;
                    }
                }

                newUserDoc.progreso = progresoMap;
                newUserDoc.progresoDetalles = detallesMap;
            }

            await setDoc(userRef, newUserDoc);
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
