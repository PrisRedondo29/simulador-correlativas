/**
 * storageRepository.js
 * Repositorio centralizado (Patrón Repository) para el almacenamiento local.
 * Unifica todas las claves, el parseo seguro de JSON, el versionado de esquema
 * y las notificaciones reactivas dentro de la misma pestaña.
 */

/** @typedef {import('../types/domain').StorageLike} StorageLike */
/** @typedef {import('../types/domain').StorageWriteOptions} StorageWriteOptions */
/** @typedef {import('../types/domain').ProgresoMap} ProgresoMap */
/** @typedef {import('../types/domain').ProgresoDetallesMap} ProgresoDetallesMap */

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
    /** @param {string} plan */
    progreso: (plan) => `progreso+${plan}`,
    /** @param {string} plan */
    progresoDetalles: (plan) => `detalles_progreso+${plan}`,
    /** @param {string} plan */
    simulacion: (plan) => `simulacion+${plan}`,
};

/**
 * @returns {StorageLike | null}
 */
function getBrowserStorage() {
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

/**
 * @param {string} key
 */
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
 * @param {EventListener} callback
 * @returns {() => void}
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
 * @param {StorageLike | null} [storage]
 */
export function createStorageRepository(storage = getBrowserStorage()) {
    /**
     * @template [T=string | null]
     * @param {string} key
     * @param {T} [fallback]
     * @returns {string | T}
     */
    const getRaw = (key, fallback = /** @type {any} */ (null)) => {
        if (!storage) return fallback;
        try {
            const val = storage.getItem(key);
            return val === null || val === undefined ? fallback : val;
        } catch {
            return fallback;
        }
    };

    /**
     * @param {string} key
     * @param {string | number | boolean} value
     * @param {StorageWriteOptions} [options]
     * @returns {boolean}
     */
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

    /**
     * @param {string} key
     * @param {StorageWriteOptions} [options]
     * @returns {boolean}
     */
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

    /**
     * @template [T=any]
     * @param {string} key
     * @param {T} [fallback]
     * @returns {T}
     */
    const getJSON = (key, fallback = /** @type {any} */ (null)) => {
        const raw = getRaw(key, null);
        if (raw === null) return fallback;
        try {
            return JSON.parse(raw);
        } catch {
            return fallback;
        }
    };

    /**
     * @param {string} key
     * @param {unknown} value
     * @param {StorageWriteOptions} [options]
     * @returns {boolean}
     */
    const setJSON = (key, value, options) => {
        try {
            return setRaw(key, JSON.stringify(value), options);
        } catch {
            return false;
        }
    };

    /**
     * @returns {number}
     */
    const ensureSchemaVersion = () => {
        const saved = Number(getRaw(STORAGE_KEYS.SCHEMA_VERSION, '0'));
        if (saved < STORAGE_SCHEMA_VERSION) {
            setRaw(STORAGE_KEYS.SCHEMA_VERSION, STORAGE_SCHEMA_VERSION, { silent: true });
        }
        return STORAGE_SCHEMA_VERSION;
    };

    /**
     * @returns {void}
     */
    const clearAcademicCache = () => {
        if (!storage) return;
        /** @type {string[]} */
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
        /** @returns {string | null} */
        getPlanActivo: () => getRaw(STORAGE_KEYS.PLAN_ACTIVO, null),
        /**
         * @param {string | null | undefined} plan
         * @param {StorageWriteOptions} [options]
         */
        setPlanActivo: (plan, options) =>
            plan
                ? setRaw(STORAGE_KEYS.PLAN_ACTIVO, plan, options)
                : remove(STORAGE_KEYS.PLAN_ACTIVO, options),

        /**
         * @template [T=ProgresoMap | null]
         * @param {string | null | undefined} plan
         * @param {T} [fallback]
         * @returns {T}
         */
        getProgreso: (plan, fallback = /** @type {any} */ (null)) =>
            plan ? getJSON(STORAGE_KEYS.progreso(plan), fallback) : fallback,
        /**
         * @param {string | null | undefined} plan
         * @param {ProgresoMap | Record<string, unknown>} data
         * @param {StorageWriteOptions} [options]
         */
        setProgreso: (plan, data, options) =>
            plan ? setJSON(STORAGE_KEYS.progreso(plan), data, options) : false,

        /**
         * @template [T=ProgresoDetallesMap | null]
         * @param {string | null | undefined} plan
         * @param {T} [fallback]
         * @returns {T}
         */
        getProgresoDetalles: (plan, fallback = /** @type {any} */ (null)) =>
            plan ? getJSON(STORAGE_KEYS.progresoDetalles(plan), fallback) : fallback,
        /**
         * @param {string | null | undefined} plan
         * @param {ProgresoDetallesMap | Record<string, unknown>} data
         * @param {StorageWriteOptions} [options]
         */
        setProgresoDetalles: (plan, data, options) =>
            plan ? setJSON(STORAGE_KEYS.progresoDetalles(plan), data, options) : false,

        /**
         * @template [T=any]
         * @param {string | null | undefined} plan
         * @param {T} [fallback]
         * @returns {T}
         */
        getSimulacion: (plan, fallback = /** @type {any} */ (null)) =>
            plan ? getJSON(STORAGE_KEYS.simulacion(plan), fallback) : fallback,
        /**
         * @param {string | null | undefined} plan
         * @param {unknown} data
         * @param {StorageWriteOptions} [options]
         */
        setSimulacion: (plan, data, options) =>
            plan ? setJSON(STORAGE_KEYS.simulacion(plan), data, options) : false,

        // --- Preferencias y notificaciones ---
        /** @returns {string[]} */
        getNotificationReadIds: () => {
            const parsed = getJSON(STORAGE_KEYS.NOTIFICACIONES_LEIDAS, /** @type {string[]} */ ([]));
            return Array.isArray(parsed) ? parsed : [];
        },
        /** @param {string[]} ids */
        setNotificationReadIds: (ids) =>
            setJSON(STORAGE_KEYS.NOTIFICACIONES_LEIDAS, ids, { silent: true }),

        /** @returns {string | null} */
        getTheme: () => getRaw(STORAGE_KEYS.THEME, null),
        /**
         * @param {string} theme
         * @param {StorageWriteOptions} [options]
         */
        setTheme: (theme, options) => setRaw(STORAGE_KEYS.THEME, theme, options),
    };
}

const storageRepository = createStorageRepository();
storageRepository.ensureSchemaVersion();

export default storageRepository;
