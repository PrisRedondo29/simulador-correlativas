import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

/** @typedef {import('../types/domain').ProgresoMap} ProgresoMap */
/** @typedef {import('../types/domain').ProgresoDetallesMap} ProgresoDetallesMap */
/** @typedef {import('../types/domain').CursadaPlanData} CursadaPlanData */
/** @typedef {import('../types/domain').UserCloudConfig} UserCloudConfig */

const SCHEMA_VERSION = 1;

/**
 * Guarda el progreso del usuario de forma atómica (y opcionalmente detalles y cursada).
 * Usa setDoc con merge:true para preservar claves de plan con punto (ej: "17.14").
 * @param {string} uid
 * @param {string} plan
 * @param {ProgresoMap | Record<string, unknown>} progreso
 * @param {ProgresoDetallesMap | Record<string, unknown> | null} [detalles]
 * @param {CursadaPlanData | null} [cursada]
 * @returns {Promise<void>}
 */
export const saveUserProgreso = async (uid, plan, progreso, detalles = null, cursada = null) => {
    if (!uid || !plan || !progreso) return;

    const userRef = doc(db, 'users', uid);
    const currentUser = auth.currentUser;

    /** @type {Record<string, unknown>} */
    const updates = {
        uid,
        email: currentUser?.email || '',
        schemaVersion: SCHEMA_VERSION,
        progresoUpdatedAt: serverTimestamp(),
        progreso: {
            [plan]: progreso,
        },
    };

    if (detalles) {
        updates.progresoDetalles = {
            [plan]: detalles,
        };
    }

    if (cursada) {
        updates.cursada = {
            [plan]: cursada,
        };
        updates.cursadaUpdatedAt = serverTimestamp();
    }

    await setDoc(userRef, updates, { merge: true });
};

/**
 * Guarda los datos de Mi Cursada (horarios, eventos y bitácora) de un plan en Firestore.
 * @param {string} uid
 * @param {string} plan
 * @param {CursadaPlanData} cursada
 * @returns {Promise<void>}
 */
export const saveUserCursada = async (uid, plan, cursada) => {
    if (!uid || !plan || !cursada) return;

    const userRef = doc(db, 'users', uid);
    const currentUser = auth.currentUser;

    const updates = {
        uid,
        email: currentUser?.email || '',
        schemaVersion: SCHEMA_VERSION,
        cursadaUpdatedAt: serverTimestamp(),
        cursada: {
            [plan]: cursada,
        },
    };

    await setDoc(userRef, updates, { merge: true });
};

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
 * Guarda una simulación del usuario.
 * @param {string} uid
 * @param {string} plan
 * @param {unknown} simulacion
 * @returns {Promise<void>}
 */
export const saveUserSimulacion = async (uid, plan, simulacion) => {
    if (!uid || !plan || !simulacion) return;

    const userRef = doc(db, 'users', uid);
    const currentUser = auth.currentUser;

    const updates = {
        uid,
        email: currentUser?.email || '',
        schemaVersion: SCHEMA_VERSION,
        simulacionUpdatedAt: serverTimestamp(),
        simulaciones: {
            [plan]: simulacion,
        },
    };

    await setDoc(userRef, updates, { merge: true });
};
