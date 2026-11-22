/**
 * storageRepository.js
 * Repositorio centralizado (Patrón Repository) para el almacenamiento local.
 * Unifica todas las claves, el parseo seguro de JSON, el versionado de esquema
 * y las notificaciones reactivas dentro de la misma pestaña.
 */

import {
    canonicalizeAcademicBundle,
    computeBundleHash,
    createEmptyAcademicBundle,
    isAcademicBundleEmpty,
    summarizeAcademicBundle,
} from '../utils/Sync/syncStateMachine';

/** @typedef {import('../types/domain').StorageLike} StorageLike */
/** @typedef {import('../types/domain').StorageWriteOptions} StorageWriteOptions */
/** @typedef {import('../types/domain').ProgresoMap} ProgresoMap */
/** @typedef {import('../types/domain').ProgresoDetallesMap} ProgresoDetallesMap */
/** @typedef {import('../types/domain').CursadaPlanData} CursadaPlanData */
/** @typedef {import('../types/domain').AcademicSyncBundle} AcademicSyncBundle */
/** @typedef {import('../types/domain').SyncMeta} SyncMeta */
/** @typedef {import('../types/domain').RecoveryBackup} RecoveryBackup */
/** @typedef {import('../types/domain').RecoveryBackupResult} RecoveryBackupResult */
/** @typedef {import('../types/domain').ApplyRemoteBundleResult} ApplyRemoteBundleResult */
/** @typedef {import('../types/domain').RestoreRecoveryBackupResult} RestoreRecoveryBackupResult */
/** @typedef {import('../types/domain').UserCloudConfig} UserCloudConfig */
/** @typedef {import('../types/domain').CatalogMetaCache} CatalogMetaCache */
/** @typedef {import('../types/domain').PublishedPlanSnapshot} PublishedPlanSnapshot */
/** @typedef {import('../types/domain').PlanUpdateNotice} PlanUpdateNotice */
/** @typedef {import('../types/domain').PendingAccountDeletionState} PendingAccountDeletionState */

export const STORAGE_SCHEMA_VERSION = 3;
export const CURRENT_ONBOARDING_VERSION = 1;
export const STORAGE_CHANGE_EVENT = 'unlu-storage-updated';
const RECOVERY_BACKUP_VERSION = 1;

export const STORAGE_KEYS = {
    SCHEMA_VERSION: 'unlu_storage_schema_version',
    ONBOARDING_VERSION: 'unlu_onboarding_version:v1',
    PLAN_ACTIVO: 'plan_activo',
    THEME: 'theme',
    SIDEBAR_COLLAPSED: 'sidebar_collapsed:v1',
    NOTIFICACIONES_LEIDAS: 'notificaciones_leidas:v1',
    PROGRESO_VISTA: 'materias_vista_preferida',
    PROGRESO_EXPANDED_YEARS: 'progreso_expanded_years:v2',
    OCULTAR_CONFIRMACION_CASCADA: 'ocultar_confirmacion_cascada:v1',
    TUTORIAL_VERSIONS: 'unlu_tutorial_versions:v1',
    TUTORIAL_PREFS: 'unlu_tutorial_prefs:v1',
    SIMULADOR_VISTA: 'simulador_vista_preferida',
    SIMULADOR_MODE_SELECTED: 'unlu_simulador_mode_selected:v1',
    SIMULADOR_DESKTOP_LAYOUT: 'unlu_simulador_desktop_layout:v1',
    SYNC_META: 'unlu_sync_meta:v1',
    SYNC_RECOVERY_BACKUP: 'unlu_sync_recovery_backup:v1',
    PENDING_ACCOUNT_DELETION: 'unlu_pending_account_deletion:v1',
    CATALOG_META_CACHE: 'unlu_catalog_meta:v1',
    /** @param {string} plan */
    catalogPlanCache: (plan) => `unlu_catalog_plan+${plan}`,
    /** @param {string} plan */
    planUpdateNotice: (plan) => `unlu_plan_update_notice+${plan}`,
    /** @param {string} plan */
    progreso: (plan) => `progreso+${plan}`,
    /** @param {string} plan */
    progresoDetalles: (plan) => `detalles_progreso+${plan}`,
    /** @param {string} plan */
    simulacion: (plan) => `simulacion+${plan}`,
    /** @param {string} plan */
    cursada: (plan) => `cursada+${plan}`,
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
    const emitHydrationEvents = () => {
        if (typeof window === 'undefined') return;
        try {
            window.dispatchEvent(new Event('progress-hydrated'));
            emitStorageUpdated('academic_bundle');
        } catch {
            // entorno sin window/Event
        }
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
                    key.startsWith('simulacion+') ||
                    key.startsWith('cursada+'))
            ) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach((k) => remove(k, { silent: true }));
    };

    /**
     * Lee todo el bloque académico local (`progreso`, `progresoDetalles`, `cursada`, `simulaciones`).
     * @returns {AcademicSyncBundle}
     */
    const readAcademicBundle = () => {
        const bundle = createEmptyAcademicBundle();
        if (!storage) return bundle;

        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (!key) continue;

            if (key.startsWith('progreso+')) {
                const plan = key.substring('progreso+'.length);
                const parsed = getJSON(key, null);
                if (plan && parsed && typeof parsed === 'object') {
                    bundle.progreso[plan] = parsed;
                }
            } else if (key.startsWith('detalles_progreso+')) {
                const plan = key.substring('detalles_progreso+'.length);
                const parsed = getJSON(key, null);
                if (plan && parsed && typeof parsed === 'object') {
                    bundle.progresoDetalles[plan] = parsed;
                }
            } else if (key.startsWith('cursada+')) {
                const plan = key.substring('cursada+'.length);
                const parsed = getJSON(key, null);
                if (plan && parsed && typeof parsed === 'object') {
                    bundle.cursada[plan] = parsed;
                }
            } else if (key.startsWith('simulacion+')) {
                const plan = key.substring('simulacion+'.length);
                const parsed = getJSON(key, null);
                if (plan && parsed != null) {
                    bundle.simulaciones[plan] = parsed;
                }
            }
        }

        return bundle;
    };

    /**
     * Escribe un bloque académico completo en almacenamiento local.
     * @param {Partial<AcademicSyncBundle>} bundle
     * @param {{ silent?: boolean, clearFirst?: boolean }} [options]
     * @returns {boolean}
     */
    const writeAcademicBundle = (bundle, { silent = true, clearFirst = false } = {}) => {
        if (!storage || !bundle || typeof bundle !== 'object') return false;
        if (clearFirst) {
            clearAcademicCache();
        }

        let allOk = true;

        if (bundle.progreso && typeof bundle.progreso === 'object') {
            for (const [plan, data] of Object.entries(bundle.progreso)) {
                if (data && typeof data === 'object') {
                    allOk = setJSON(STORAGE_KEYS.progreso(plan), data, { silent: true }) && allOk;
                }
            }
        }

        if (bundle.progresoDetalles && typeof bundle.progresoDetalles === 'object') {
            for (const [plan, data] of Object.entries(bundle.progresoDetalles)) {
                if (data && typeof data === 'object') {
                    allOk =
                        setJSON(STORAGE_KEYS.progresoDetalles(plan), data, { silent: true }) &&
                        allOk;
                }
            }
        }

        if (bundle.cursada && typeof bundle.cursada === 'object') {
            for (const [plan, data] of Object.entries(bundle.cursada)) {
                if (data && typeof data === 'object') {
                    allOk = setJSON(STORAGE_KEYS.cursada(plan), data, { silent: true }) && allOk;
                }
            }
        }

        if (bundle.simulaciones && typeof bundle.simulaciones === 'object') {
            for (const [plan, data] of Object.entries(bundle.simulaciones)) {
                if (data != null) {
                    allOk = setJSON(STORAGE_KEYS.simulacion(plan), data, { silent: true }) && allOk;
                }
            }
        }

        if (!silent && allOk) {
            emitStorageUpdated('academic_bundle');
        }
        return allOk;
    };

    /**
     * @returns {SyncMeta | null}
     */
    const getSyncMeta = () => {
        /** @type {Record<string, any> | null} */
        const parsed = getJSON(STORAGE_KEYS.SYNC_META, /** @type {any} */ (null));
        if (!parsed || typeof parsed !== 'object') return null;
        return {
            syncRevision:
                typeof parsed.syncRevision === 'number' && Number.isInteger(parsed.syncRevision)
                    ? parsed.syncRevision
                    : null,
            lastSyncedHash: typeof parsed.lastSyncedHash === 'string' ? parsed.lastSyncedHash : null,
            lastSyncedUid: typeof parsed.lastSyncedUid === 'string' ? parsed.lastSyncedUid : null,
            lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
            unit: parsed.unit === 'academic' ? 'academic' : 'academic',
        };
    };

    /**
     * @param {SyncMeta} meta
     * @param {StorageWriteOptions} [options]
     * @returns {boolean}
     */
    const setSyncMeta = (meta, options) => setJSON(STORAGE_KEYS.SYNC_META, meta, options);

    /**
     * @param {StorageWriteOptions} [options]
     * @returns {boolean}
     */
    const clearSyncMeta = (options) => remove(STORAGE_KEYS.SYNC_META, options);

    /**
     * @returns {RecoveryBackup | null}
     */
    const getRecoveryBackup = () => {
        /** @type {Record<string, any> | null} */
        const parsed = getJSON(STORAGE_KEYS.SYNC_RECOVERY_BACKUP, /** @type {any} */ (null));
        if (!parsed || typeof parsed !== 'object' || !parsed.bundle || typeof parsed.bundle !== 'object') {
            return null;
        }
        return /** @type {RecoveryBackup} */ (parsed);
    };

    /**
     * @param {StorageWriteOptions} [options]
     * @returns {boolean}
     */
    const clearRecoveryBackup = (options) => remove(STORAGE_KEYS.SYNC_RECOVERY_BACKUP, options);

    /**
     * Guarda una copia de recuperación previa a una operación potencialmente destructiva.
     * Política de integridad:
     *  - Nunca reemplaza un respaldo válido con una instantánea vacía.
     *  - Devuelve `{ ok: false, error: 'backup_failed' }` si `localStorage` rechaza la escritura
     *    (ej: QuotaExceededError), permitiendo bloquear cualquier sobrescritura destructiva.
     *
     * @param {Partial<AcademicSyncBundle>} bundle
     * @param {{ reason?: string, sourceUid?: string | null, savedAt?: string }} [options]
     * @returns {RecoveryBackupResult}
     */
    const saveRecoveryBackup = (
        bundle,
        { reason = 'pre_overwrite', sourceUid = null, savedAt = new Date().toISOString() } = {},
    ) => {
        const existing = getRecoveryBackup();
        if (isAcademicBundleEmpty(bundle)) {
            return {
                ok: true,
                skippedEmpty: true,
                preservedExisting: Boolean(existing),
                backup: existing,
            };
        }

        const canonical = canonicalizeAcademicBundle(bundle);
        /** @type {RecoveryBackup} */
        const backup = {
            version: RECOVERY_BACKUP_VERSION,
            savedAt,
            reason,
            sourceUid,
            hash: computeBundleHash(canonical),
            summary: summarizeAcademicBundle(canonical),
            bundle: canonical,
        };

        const saved = setJSON(STORAGE_KEYS.SYNC_RECOVERY_BACKUP, backup, { silent: true });
        if (!saved) {
            return {
                ok: false,
                error: 'backup_failed',
                message:
                    'No se pudo guardar una copia de recuperación local. Operación cancelada para proteger tus datos.',
            };
        }

        return {
            ok: true,
            skippedEmpty: false,
            preservedExisting: false,
            backup,
        };
    };

    /**
     * Reemplaza los datos académicos locales con un bundle remoto de forma segura:
     *  1. Si hay datos locales no vacíos, exige crear primero un respaldo de recuperación.
     *  2. Si el respaldo falla (ej: cuota llena), ABORTA sin modificar el estado local.
     *  3. Si falla la escritura del bundle remoto, realiza rollback al estado local previo.
     *
     * @param {Partial<AcademicSyncBundle>} remoteBundle
     * @param {{
     *   reason?: string,
     *   sourceUid?: string | null,
     *   config?: UserCloudConfig | null,
     *   silent?: boolean,
     * }} [options]
     * @returns {ApplyRemoteBundleResult}
     */
    const applyRemoteBundleSafely = (
        remoteBundle,
        { reason = 'remote_sync', sourceUid = null, config = null, silent = false } = {},
    ) => {
        if (!storage) {
            return {
                ok: false,
                backedUp: false,
                error: 'storage_unavailable',
                message: 'El almacenamiento local no está disponible.',
            };
        }

        const currentLocal = readAcademicBundle();
        let backedUp = false;

        if (!isAcademicBundleEmpty(currentLocal)) {
            const backupResult = saveRecoveryBackup(currentLocal, { reason, sourceUid });
            if (!backupResult.ok) {
                return {
                    ok: false,
                    backedUp: false,
                    error: backupResult.error || 'backup_failed',
                    message:
                        backupResult.message ||
                        'No se pudo respaldar tu estado local antes de cargar los datos remotos.',
                };
            }
            backedUp = !backupResult.skippedEmpty;
        }

        const canonicalRemote = canonicalizeAcademicBundle(remoteBundle);
        clearAcademicCache();
        const writeOk = writeAcademicBundle(canonicalRemote, { silent: true, clearFirst: false });

        if (!writeOk) {
            // Rollback defensivo: restauramos el estado local en memoria antes de abortar
            clearAcademicCache();
            writeAcademicBundle(currentLocal, { silent: true, clearFirst: false });
            return {
                ok: false,
                backedUp,
                error: 'write_failed',
                message:
                    'No se pudieron guardar los datos descargados en este dispositivo. Se conservó tu progreso anterior.',
            };
        }

        if (config?.tema) {
            setRaw(STORAGE_KEYS.THEME, config.tema, { silent: true });
        }
        if (config?.planActivo) {
            setRaw(STORAGE_KEYS.PLAN_ACTIVO, config.planActivo, { silent: true });
        }

        if (!silent) {
            emitHydrationEvents();
        }

        return {
            ok: true,
            backedUp,
            hash: computeBundleHash(canonicalRemote),
        };
    };

    /**
     * Restaura la última copia de recuperación guardada en el dispositivo.
     * @param {{ silent?: boolean }} [options]
     * @returns {RestoreRecoveryBackupResult}
     */
    const restoreRecoveryBackup = ({ silent = false } = {}) => {
        const backup = getRecoveryBackup();
        if (!backup) {
            return {
                ok: false,
                error: 'no_backup',
                message: 'No hay ninguna copia de recuperación disponible en este dispositivo.',
            };
        }

        const writeOk = writeAcademicBundle(backup.bundle, { silent: true, clearFirst: true });
        if (!writeOk) {
            return {
                ok: false,
                error: 'restore_failed',
                message: 'No se pudo restaurar la copia de recuperación local.',
            };
        }

        if (!silent) {
            emitHydrationEvents();
        }

        return {
            ok: true,
            bundle: backup.bundle,
            backup,
        };
    };

    return {
        getRaw,
        setRaw,
        remove,
        getJSON,
        setJSON,
        ensureSchemaVersion,
        clearAcademicCache,
        readAcademicBundle,
        writeAcademicBundle,
        getSyncMeta,
        setSyncMeta,
        clearSyncMeta,
        saveRecoveryBackup,
        getRecoveryBackup,
        clearRecoveryBackup,
        applyRemoteBundleSafely,
        restoreRecoveryBackup,

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

        /**
         * @template [T=CursadaPlanData | null]
         * @param {string | null | undefined} plan
         * @param {T} [fallback]
         * @returns {T}
         */
        getCursada: (plan, fallback = /** @type {any} */ (null)) =>
            plan ? getJSON(STORAGE_KEYS.cursada(plan), fallback) : fallback,
        /**
         * @param {string | null | undefined} plan
         * @param {CursadaPlanData} data
         * @param {StorageWriteOptions} [options]
         */
        setCursada: (plan, data, options) =>
            plan ? setJSON(STORAGE_KEYS.cursada(plan), data, options) : false,

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

        /**
         * Devuelve si se debe mostrar la advertencia de actualización en cascada (default: true).
         * @returns {boolean}
         */
        getMostrarConfirmacionCascada: () =>
            getRaw(STORAGE_KEYS.OCULTAR_CONFIRMACION_CASCADA, 'false') !== 'true',

        /**
         * Persiste la preferencia de mostrar/ocultar la advertencia de actualización en cascada.
         * @param {boolean} mostrar
         * @returns {boolean}
         */
        setMostrarConfirmacionCascada: (mostrar) =>
            setRaw(STORAGE_KEYS.OCULTAR_CONFIRMACION_CASCADA, mostrar ? 'false' : 'true', {
                silent: true,
            }),

        // --- Onboarding inicial versionado ---
        /**
         * Devuelve la última versión del onboarding inicial completada o saltada (0 si nunca se completó).
         * @returns {number}
         */
        getOnboardingVersionCompleted: () => {
            const parsed = Number.parseInt(String(getRaw(STORAGE_KEYS.ONBOARDING_VERSION, '0')), 10);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
        },

        /**
         * Marca como completada (u omitida) una versión del onboarding inicial.
         * @param {number} [version]
         * @param {StorageWriteOptions} [options]
         * @returns {boolean}
         */
        setOnboardingVersionCompleted: (version = CURRENT_ONBOARDING_VERSION, options = {}) =>
            setRaw(STORAGE_KEYS.ONBOARDING_VERSION, version, options),

        /**
         * Reinicia el flag de onboarding para volver a abrir el asistente inicial a demanda.
         * @param {StorageWriteOptions} [options]
         * @returns {boolean}
         */
        resetOnboardingVersion: (options = {}) => remove(STORAGE_KEYS.ONBOARDING_VERSION, options),

        /**
         * Indica si existen datos académicos reales guardados localmente (progreso activo, notas, Agenda o simulaciones).
         * @returns {boolean}
         */
        hasExistingAcademicData: () => !isAcademicBundleEmpty(readAcademicBundle()),

        // --- Catálogo remoto versionado (Stale-While-Revalidate) y avisos de migración ---
        /** @returns {CatalogMetaCache | null} */
        getCatalogMetaCache: () => {
            /** @type {CatalogMetaCache | null} */
            const parsed = getJSON(STORAGE_KEYS.CATALOG_META_CACHE, /** @type {any} */ (null));
            if (!parsed || typeof parsed !== 'object' || typeof parsed.plans !== 'object') {
                return null;
            }
            return parsed;
        },

        /**
         * @param {CatalogMetaCache} meta
         * @param {StorageWriteOptions} [options]
         */
        setCatalogMetaCache: (meta, options = { silent: true }) =>
            setJSON(STORAGE_KEYS.CATALOG_META_CACHE, meta, options),

        /**
         * @param {string | null | undefined} plan
         * @returns {PublishedPlanSnapshot | null}
         */
        getCachedPublishedPlan: (plan) => {
            if (!plan) return null;
            /** @type {PublishedPlanSnapshot | null} */
            const parsed = getJSON(
                STORAGE_KEYS.catalogPlanCache(plan),
                /** @type {any} */ (null),
            );
            if (
                !parsed ||
                typeof parsed !== 'object' ||
                typeof parsed.version !== 'number' ||
                !Array.isArray(parsed.materias)
            ) {
                return null;
            }
            return parsed;
        },

        /**
         * @param {string | null | undefined} plan
         * @param {PublishedPlanSnapshot} snapshot
         * @param {StorageWriteOptions} [options]
         */
        setCachedPublishedPlan: (plan, snapshot, options = { silent: true }) =>
            plan ? setJSON(STORAGE_KEYS.catalogPlanCache(plan), snapshot, options) : false,

        /**
         * @param {string | null | undefined} plan
         * @returns {PlanUpdateNotice | null}
         */
        getPlanUpdateNotice: (plan) => {
            if (!plan) return null;
            /** @type {PlanUpdateNotice | null} */
            const parsed = getJSON(
                STORAGE_KEYS.planUpdateNotice(plan),
                /** @type {any} */ (null),
            );
            if (!parsed || typeof parsed !== 'object' || typeof parsed.version !== 'number') {
                return null;
            }
            return parsed;
        },

        /**
         * @param {string | null | undefined} plan
         * @param {PlanUpdateNotice | null} notice
         * @param {StorageWriteOptions} [options]
         */
        setPlanUpdateNotice: (plan, notice, options = {}) => {
            if (!plan) return false;
            if (!notice) return remove(STORAGE_KEYS.planUpdateNotice(plan), options);
            return setJSON(STORAGE_KEYS.planUpdateNotice(plan), notice, options);
        },

        /**
         * @param {string} tourId
         * @returns {number}
         */
        getTutorialVersionSeen: (tourId) => {
            if (!tourId) return 0;
            const map = getJSON(STORAGE_KEYS.TUTORIAL_VERSIONS, /** @type {Record<string, number>} */ ({}));
            const val = Number(map?.[tourId] ?? 0);
            return Number.isFinite(val) && val > 0 ? val : 0;
        },

        /**
         * @param {string} tourId
         * @param {number} version
         */
        setTutorialVersionSeen: (tourId, version) => {
            if (!tourId) return false;
            const map = getJSON(STORAGE_KEYS.TUTORIAL_VERSIONS, /** @type {Record<string, number>} */ ({}));
            return setJSON(STORAGE_KEYS.TUTORIAL_VERSIONS, {
                ...map,
                [tourId]: Number(version) || 1,
            });
        },

        /**
         * @returns {{ autoDisabled: boolean, pillHidden: boolean }}
         */
        getTutorialPrefs: () => {
            const prefs = getJSON(STORAGE_KEYS.TUTORIAL_PREFS, /** @type {{ autoDisabled?: boolean, pillHidden?: boolean }} */ ({}));
            return {
                autoDisabled: Boolean(prefs?.autoDisabled),
                pillHidden: Boolean(prefs?.pillHidden),
            };
        },

        /**
         * @param {{ autoDisabled?: boolean, pillHidden?: boolean }} nextPrefs
         */
        setTutorialPrefs: (nextPrefs) => {
            const current = getJSON(STORAGE_KEYS.TUTORIAL_PREFS, /** @type {{ autoDisabled?: boolean, pillHidden?: boolean }} */ ({}));
            return setJSON(STORAGE_KEYS.TUTORIAL_PREFS, {
                ...current,
                ...nextPrefs,
            });
        },

        resetAllTutorials: () => {
            remove(STORAGE_KEYS.TUTORIAL_VERSIONS);
            return remove(STORAGE_KEYS.TUTORIAL_PREFS);
        },

        /**
         * @returns {'planificar' | 'explorar' | null}
         */
        getSimuladorModeSelected: () => {
            const val = getRaw(STORAGE_KEYS.SIMULADOR_MODE_SELECTED, null);
            return val === 'planificar' || val === 'explorar' ? val : null;
        },

        /**
         * @param {'planificar' | 'explorar'} mode
         */
        setSimuladorModeSelected: (mode) =>
            setRaw(STORAGE_KEYS.SIMULADOR_MODE_SELECTED, mode),

        /**
         * @returns {'panel' | 'hud'}
         */
        getSimuladorDesktopLayout: () => {
            const val = getRaw(STORAGE_KEYS.SIMULADOR_DESKTOP_LAYOUT, null);
            return val === 'hud' ? 'hud' : 'panel';
        },

        /**
         * @param {'panel' | 'hud'} layout
         */
        setSimuladorDesktopLayout: (layout) =>
            setRaw(STORAGE_KEYS.SIMULADOR_DESKTOP_LAYOUT, layout),

        /**
         * Recupera un estado persistido de eliminación parcial (`Firestore` borrado, `Auth` pendiente).
         * @returns {PendingAccountDeletionState | null}
         */
        getPendingAccountDeletion: () => {
            /** @type {PendingAccountDeletionState | null} */
            const parsed = getJSON(
                STORAGE_KEYS.PENDING_ACCOUNT_DELETION,
                /** @type {any} */ (null),
            );
            if (
                !parsed ||
                typeof parsed !== 'object' ||
                typeof parsed.uid !== 'string' ||
                !parsed.uid ||
                parsed.stage !== 'firestore_deleted_auth_pending'
            ) {
                return null;
            }
            return parsed;
        },

        /**
         * @param {PendingAccountDeletionState | null} state
         * @param {StorageWriteOptions} [options]
         */
        setPendingAccountDeletion: (state, options = { silent: true }) => {
            if (!state) {
                return remove(STORAGE_KEYS.PENDING_ACCOUNT_DELETION, options);
            }
            return setJSON(STORAGE_KEYS.PENDING_ACCOUNT_DELETION, state, options);
        },

        clearPendingAccountDeletion: () =>
            remove(STORAGE_KEYS.PENDING_ACCOUNT_DELETION, { silent: true }),

        clearCloudSyncMetadata: () => remove(STORAGE_KEYS.SYNC_META, { silent: true }),

        clearLocalUserData: () => {
            clearAcademicCache();
            remove(STORAGE_KEYS.SYNC_META, { silent: true });
            remove(STORAGE_KEYS.SYNC_RECOVERY_BACKUP, { silent: true });
            remove(STORAGE_KEYS.NOTIFICACIONES_LEIDAS, { silent: true });
            emitHydrationEvents();
        },
    };
}

const storageRepository = createStorageRepository();
storageRepository.ensureSchemaVersion();

export default storageRepository;
