import { saveUserProgreso, saveUserCursada, getUserData } from './dbService';
import storageRepository from './storageRepository';

/**
 * Aplana mapas anidados que Firestore pudo generar cuando un ID de plan contiene punto
 * (ej: { "17": { "14": { "11071": "Aprobado" } } } -> { "17.14": { "11071": "Aprobado" } }).
 * Funciona de forma genérica para cualquier prefijo de carrera (17.14, 20.08, etc.).
 * @param {Record<string, any>} [rawMap]
 * @returns {Record<string, any>}
 */
export function normalizeNestedPlanMap(rawMap = {}) {
    if (!rawMap || typeof rawMap !== 'object') return {};

    /** @type {Record<string, any>} */
    const normalized = { ...rawMap };

    for (const [key, value] of Object.entries(rawMap)) {
        if (!/^\d+$/.test(key) || !value || typeof value !== 'object' || Array.isArray(value)) {
            continue;
        }

        const nestedNumericEntries = Object.entries(value).filter(
            ([subKey, subVal]) => /^\d+$/.test(subKey) && subVal && typeof subVal === 'object',
        );

        if (nestedNumericEntries.length > 0) {
            for (const [subKey, subVal] of nestedNumericEntries) {
                const flatPlanKey = `${key}.${subKey}`;
                if (!normalized[flatPlanKey]) {
                    normalized[flatPlanKey] = subVal;
                }
            }
            delete normalized[key];
        }
    }

    return normalized;
}

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
