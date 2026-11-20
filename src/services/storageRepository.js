/**
 * storageRepository.js
 * Repositorio centralizado (Patrón Repository) para el almacenamiento local.
 * Unifica todas las claves, el parseo seguro de JSON, el versionado de esquema
 * y las notificaciones reactivas dentro de la misma pestaña.
 */

export const STORAGE_SCHEMA_VERSION = 1;
export const STORAGE_CHANGE_EVENT = 'unlu-storage-updated';

export const STORAGE_KEYS = {
    SCHEMA_VERSION: 'unlu_storage_schema_version',
    PLAN_ACTIVO: 'plan_activo',
    THEME: 'theme',
    SIDEBAR_COLLAPSED: 'sidebar_collapsed:v1',
    NOTIFICACIONES_LEIDAS: 'notificaciones_leidas:v1',
    PROGRESO_VISTA: 'materias_vista_preferida',
    PROGRESO_EXPANDED_YEARS: 'progreso_expanded_years:v2',
    SIMULADOR_VISTA: 'simulador_vista_preferida',
    progreso: (plan) => `progreso+${plan}`,
    progresoDetalles: (plan) => `detalles_progreso+${plan}`,
    simulacion: (plan) => `simulacion+${plan}`,
};

function getBrowserStorage() {
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

function emitStorageUpdated(key) {
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key } }));
    } catch {
        // entorno sin CustomEvent
    }
}

/**
 * Suscribe un callback a cambios locales (misma pestaña), entre pestañas (`storage`)
 * y de hidratación desde Firebase (`progress-hydrated`).
 */
export function subscribeStorageChanges(callback) {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(STORAGE_CHANGE_EVENT, callback);
    window.addEventListener('storage', callback);
    window.addEventListener('progress-hydrated', callback);

    return () => {
        window.removeEventListener(STORAGE_CHANGE_EVENT, callback);
        window.removeEventListener('storage', callback);
        window.removeEventListener('progress-hydrated', callback);
    };
}

/**
 * Factory testeable: permite inyectar un storage en memoria para tests unitarios.
 */
export function createStorageRepository(storage = getBrowserStorage()) {
    const getRaw = (key, fallback = null) => {
        if (!storage) return fallback;
        try {
            const val = storage.getItem(key);
            return val === null || val === undefined ? fallback : val;
        } catch {
            return fallback;
        }
    };

    const setRaw = (key, value, { silent = false } = {}) => {
        if (!storage) return false;
        try {
            storage.setItem(key, String(value));
            if (!silent) emitStorageUpdated(key);
            return true;
        } catch {
            return false;
        }
    };

    const remove = (key, { silent = false } = {}) => {
        if (!storage) return false;
        try {
            storage.removeItem(key);
            if (!silent) emitStorageUpdated(key);
            return true;
        } catch {
            return false;
        }
    };

    const getJSON = (key, fallback = null) => {
        const raw = getRaw(key, null);
        if (raw === null) return fallback;
        try {
            return JSON.parse(raw);
        } catch {
            return fallback;
        }
    };

    const setJSON = (key, value, options) => {
        try {
            return setRaw(key, JSON.stringify(value), options);
        } catch {
            return false;
        }
    };

    const ensureSchemaVersion = () => {
        const saved = Number(getRaw(STORAGE_KEYS.SCHEMA_VERSION, 0));
        if (saved < STORAGE_SCHEMA_VERSION) {
            setRaw(STORAGE_KEYS.SCHEMA_VERSION, STORAGE_SCHEMA_VERSION, { silent: true });
        }
        return STORAGE_SCHEMA_VERSION;
    };

    const clearAcademicCache = () => {
        if (!storage) return;
        const keysToDelete = [];
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (
                key &&
                (key.startsWith('progreso+') ||
                    key.startsWith('detalles_progreso+') ||
                    key.startsWith('simulacion+'))
            ) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach((k) => remove(k, { silent: true }));
    };

    return {
        getRaw,
        setRaw,
        remove,
        getJSON,
        setJSON,
        ensureSchemaVersion,
        clearAcademicCache,

        // --- Dominio académico ---
        getPlanActivo: () => getRaw(STORAGE_KEYS.PLAN_ACTIVO, null),
        setPlanActivo: (plan, options) =>
            plan
                ? setRaw(STORAGE_KEYS.PLAN_ACTIVO, plan, options)
                : remove(STORAGE_KEYS.PLAN_ACTIVO, options),

        getProgreso: (plan, fallback = null) =>
            plan ? getJSON(STORAGE_KEYS.progreso(plan), fallback) : fallback,
        setProgreso: (plan, data, options) =>
            plan ? setJSON(STORAGE_KEYS.progreso(plan), data, options) : false,

        getProgresoDetalles: (plan, fallback = null) =>
            plan ? getJSON(STORAGE_KEYS.progresoDetalles(plan), fallback) : fallback,
        setProgresoDetalles: (plan, data, options) =>
            plan ? setJSON(STORAGE_KEYS.progresoDetalles(plan), data, options) : false,

        getSimulacion: (plan, fallback = null) =>
            plan ? getJSON(STORAGE_KEYS.simulacion(plan), fallback) : fallback,
        setSimulacion: (plan, data, options) =>
            plan ? setJSON(STORAGE_KEYS.simulacion(plan), data, options) : false,

        // --- Preferencias y notificaciones ---
        getNotificationReadIds: () => {
            const parsed = getJSON(STORAGE_KEYS.NOTIFICACIONES_LEIDAS, []);
            return Array.isArray(parsed) ? parsed : [];
        },
        setNotificationReadIds: (ids) =>
            setJSON(STORAGE_KEYS.NOTIFICACIONES_LEIDAS, ids, { silent: true }),

        getTheme: () => getRaw(STORAGE_KEYS.THEME, null),
        setTheme: (theme, options) => setRaw(STORAGE_KEYS.THEME, theme, options),
    };
}

const storageRepository = createStorageRepository();
storageRepository.ensureSchemaVersion();

export default storageRepository;
