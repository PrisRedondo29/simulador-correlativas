import {
    saveUserProgreso,
    saveUserCursada,
    getUserData,
    commitAcademicBundleTransaction,
} from './dbService';
import storageRepository from './storageRepository';
import {
    SYNC_STATUS,
    SYNC_UNITS,
    canonicalizeAcademicBundle,
    computeBundleHash,
    createEmptyAcademicBundle,
    extractAcademicBundleFromCloudDoc,
    getSafeSyncRevision,
    isAcademicBundleEmpty,
    normalizeNestedPlanMap,
} from '../utils/Sync/syncStateMachine';

/** @typedef {import('../types/domain').AcademicSyncBundle} AcademicSyncBundle */
/** @typedef {import('../types/domain').FetchCloudBundleResult} FetchCloudBundleResult */
/** @typedef {import('../types/domain').UploadAcademicSnapshotResult} UploadAcademicSnapshotResult */
/** @typedef {import('../types/domain').SyncUnitId} SyncUnitId */

export { normalizeNestedPlanMap, extractAcademicBundleFromCloudDoc };

/**
 * Lee el documento remoto del usuario y devuelve su bloque académico normalizado
 * SIN ejecutar ningún efecto secundario sobre `localStorage`.
 * Compatible con documentos legacy (sin `syncRevision`, mapas anidados o claves literales con punto).
 *
 * @param {string} uid
 * @param {{ fetchUserDoc?: (uid: string) => Promise<Record<string, any> | null> }} [deps]
 * @returns {Promise<FetchCloudBundleResult>}
 */
export const fetchCloudBundle = async (uid, deps = {}) => {
    const fetchUserDoc = deps.fetchUserDoc ?? getUserData;
    const rawDoc = await fetchUserDoc(uid);

    if (!rawDoc) {
        const emptyBundle = createEmptyAcademicBundle();
        return {
            exists: false,
            syncRevision: 0,
            bundle: emptyBundle,
            hash: computeBundleHash(emptyBundle),
            isEmpty: true,
            config: null,
            rawDoc: null,
        };
    }

    const bundle = extractAcademicBundleFromCloudDoc(rawDoc);
    const syncRevision = getSafeSyncRevision(rawDoc);

    return {
        exists: true,
        syncRevision,
        bundle,
        hash: computeBundleHash(bundle),
        isEmpty: isAcademicBundleEmpty(bundle),
        config: rawDoc.config && typeof rawDoc.config === 'object' ? rawDoc.config : null,
        rawDoc,
    };
};

/**
 * Sube una instantánea completa del bloque académico local usando control optimista
 * de concurrencia (`syncRevision` dentro de `runTransaction()`).
 *
 * Garantías:
 *  - Captura el snapshot exacto al iniciar la subida y re-evalúa el hash local al finalizar:
 *    si hubo ediciones locales concurrentes durante la subida, devuelve `nextStatus: 'pending'`.
 *  - Solo actualiza `SyncMeta` cuando Firestore confirma la transacción.
 *  - Nunca modifica ni borra datos locales ante conflicto, error de permisos o exceso de tamaño.
 *
 * @param {string} uid
 * @param {{
 *   expectedRevision?: number | null,
 *   forceOverwrite?: boolean,
 *   syncUnit?: SyncUnitId,
 *   email?: string | null,
 *   storage?: typeof storageRepository,
 *   commitFn?: typeof commitAcademicBundleTransaction,
 * }} [options]
 * @returns {Promise<UploadAcademicSnapshotResult>}
 */
export const uploadAcademicSnapshot = async (uid, options = {}) => {
    const {
        expectedRevision = null,
        forceOverwrite = false,
        syncUnit = SYNC_UNITS.ACADEMIC,
        email = null,
        storage = storageRepository,
        commitFn = commitAcademicBundleTransaction,
    } = options;

    const snapshotBundle = canonicalizeAcademicBundle(storage.readAcademicBundle());
    const snapshotHash = computeBundleHash(snapshotBundle);

    const txResult = await commitFn(uid, snapshotBundle, {
        expectedRevision,
        forceOverwrite,
        syncUnit,
        email,
    });

    // Re-evaluamos el contenido local real tras el retorno de la transacción para detectar
    // modificaciones concurrentes realizadas mientras la subida estaba en vuelo.
    const currentLocalHash = computeBundleHash(storage.readAcademicBundle());
    const hasConcurrentLocalEdits = currentLocalHash !== snapshotHash;

    if (txResult.status === 'synced' && typeof txResult.syncRevision === 'number') {
        const uploadedHash = txResult.uploadedHash ?? snapshotHash;
        const syncedAt = txResult.syncedAt ?? new Date().toISOString();

        storage.setSyncMeta(
            {
                syncRevision: txResult.syncRevision,
                lastSyncedHash: uploadedHash,
                lastSyncedUid: uid,
                lastSyncedAt: syncedAt,
                unit: syncUnit,
            },
            { silent: true },
        );

        return {
            ...txResult,
            uploadedHash,
            syncedAt,
            snapshotHash,
            currentLocalHash,
            hasConcurrentLocalEdits,
            nextStatus: hasConcurrentLocalEdits ? SYNC_STATUS.PENDING : SYNC_STATUS.SYNCED,
        };
    }

    if (txResult.status === 'conflict') {
        return {
            ...txResult,
            snapshotHash,
            currentLocalHash,
            hasConcurrentLocalEdits,
            nextStatus: SYNC_STATUS.CONFLICT,
        };
    }

    return {
        ...txResult,
        snapshotHash,
        currentLocalHash,
        hasConcurrentLocalEdits,
        nextStatus: SYNC_STATUS.ERROR,
    };
};

/**
 * Sube el progreso actual de un plan a la nube de forma manual.
 * Se asegura de leer tanto el progreso (estados) como los detalles (notas, fechas)
 * desde storageRepository antes de enviarlos.
 * @param {string} uid
 * @param {string} plan
 * @returns {Promise<boolean>}
 */
export const uploadPlanProgress = async (uid, plan) => {
    try {
        const progreso = storageRepository.getProgreso(plan, null);
        const detalles = storageRepository.getProgresoDetalles(plan, {});
        const cursada = storageRepository.getCursada(plan, null);

        if (!progreso && !cursada) {
            throw new Error('No hay datos locales para este plan.');
        }

        if (progreso) {
            await saveUserProgreso(uid, plan, progreso, detalles || {}, cursada);
        } else if (cursada) {
            await saveUserCursada(uid, plan, cursada);
        }
        return true;
    } catch (error) {
        if (import.meta.env.DEV) console.error('Error al subir datos:', error);
        throw error;
    }
};

/**
 * Descarga TODO el progreso, detalles, simulaciones y cursada desde la nube y lo guarda en local.
 * Esta función es la que se llama al iniciar sesión o al presionar "Cargar".
 * @param {string} uid
 * @returns {Promise<Record<string, any> | false>}
 */
export const downloadAllProgress = async (uid) => {
    try {
        const cloudData = await getUserData(uid);
        if (!cloudData) return false;

        const progreso = normalizeNestedPlanMap(cloudData.progreso || {});
        const detalles = normalizeNestedPlanMap(cloudData.progresoDetalles || {});
        const simulaciones = normalizeNestedPlanMap(cloudData.simulaciones || {});
        const cursadas = normalizeNestedPlanMap(cloudData.cursada || {});

        // Normalización: Extraemos datos de llaves con puntos literales (ej: "progreso.17.14")
        Object.keys(cloudData).forEach((key) => {
            if (key.startsWith('progreso.')) {
                const plan = key.substring('progreso.'.length);
                if (!progreso[plan]) progreso[plan] = cloudData[key];
            }
            if (key.startsWith('progresoDetalles.')) {
                const plan = key.substring('progresoDetalles.'.length);
                if (!detalles[plan]) detalles[plan] = cloudData[key];
            }
            if (key.startsWith('simulaciones.')) {
                const plan = key.substring('simulaciones.'.length);
                if (!simulaciones[plan]) simulaciones[plan] = cloudData[key];
            }
            if (key.startsWith('cursada.')) {
                const plan = key.substring('cursada.'.length);
                if (!cursadas[plan]) cursadas[plan] = cloudData[key];
            }
        });

        if (import.meta.env.DEV) console.log('🛠️ Progreso procesado para sincronización:', { progreso, detalles, cursadas });

        const hasAnyData =
            Object.keys(progreso).length > 0 ||
            Object.keys(detalles).length > 0 ||
            Object.keys(simulaciones).length > 0 ||
            Object.keys(cursadas).length > 0 ||
            cloudData.config;

        if (!hasAnyData) {
            return false;
        }

        storageRepository.clearAcademicCache();

        for (const [plan, data] of Object.entries(progreso)) {
            if (data && typeof data === 'object') {
                storageRepository.setProgreso(plan, data, { silent: true });
            }
        }

        for (const [plan, data] of Object.entries(detalles)) {
            if (data && typeof data === 'object') {
                storageRepository.setProgresoDetalles(plan, data, { silent: true });
            }
        }

        for (const [plan, data] of Object.entries(simulaciones)) {
            if (data) {
                storageRepository.setSimulacion(plan, data, { silent: true });
            }
        }

        for (const [plan, data] of Object.entries(cursadas)) {
            if (data && typeof data === 'object') {
                storageRepository.setCursada(plan, data, { silent: true });
            }
        }

        if (cloudData.config?.tema) {
            storageRepository.setTheme(cloudData.config.tema, { silent: true });
        }

        if (cloudData.config?.planActivo) {
            storageRepository.setPlanActivo(cloudData.config.planActivo, { silent: true });
        }

        window.dispatchEvent(new Event('progress-hydrated'));
        window.dispatchEvent(new Event('storage'));

        return cloudData;
    } catch (error) {
        if (import.meta.env.DEV) console.error('Error al descargar datos:', error);
        throw error;
    }
};
