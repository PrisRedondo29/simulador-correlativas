/**
 * Servicio para gestionar los planes de estudio, materias y equivalencias
 * con carga dinámica real (code-splitting por carrera) y caché en memoria,
 * guiado declarativamente por careersRegistry.js.
 */

import {
    CAREERS_REGISTRY,
    getCareerByPlan,
    getCareerPrefix,
    getPlanEntry,
    normalizePlanNumber,
} from '../config/careersRegistry';

/** @typedef {import('../types/domain').CareerConfig} CareerConfig */
/** @typedef {import('../types/domain').PlanData} PlanData */
/** @typedef {import('../types/domain').Materia} Materia */
/** @typedef {import('../types/domain').EquivalenciasMap} EquivalenciasMap */

/**
 * @param {CareerConfig[]} [registry]
 */
export function createPlanService(registry = CAREERS_REGISTRY) {
    /** @type {Map<string, PlanData[]>} */
    const careerCache = new Map();
    /** @type {Map<string, EquivalenciasMap>} */
    const equivalenciasCache = new Map();

    /**
     * @param {CareerConfig | null} career
     * @returns {Promise<PlanData[]>}
     */
    async function loadCareerPlans(career) {
        if (!career || typeof career.loadPlans !== 'function') return [];

        const cacheKey = career.id || career.planPrefix;
        const cached = careerCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const mod = await career.loadPlans();
        /** @type {PlanData[]} */
        const rawPlans = Array.isArray(mod) ? mod : (mod?.default || []);
        const plans = career.name
            ? rawPlans.map((p) => (p.carrera ? p : { ...p, carrera: career.name }))
            : rawPlans;
        careerCache.set(cacheKey, plans);
        return plans;
    }

    return {
        /**
         * Obtiene un plan completo (con materias) de forma asíncrona,
         * cargando únicamente el JSON de la carrera correspondiente y cacheándolo en memoria.
         * @param {string | null | undefined} planNumber - Número del plan (ej: "17.14")
         * @returns {Promise<PlanData | null>}
         */
        async getPlanByNumber(planNumber) {
            const normalized = normalizePlanNumber(planNumber);
            if (!normalized) return null;

            const career = getCareerByPlan(normalized, registry);
            if (!career) return null;

            const plans = await loadCareerPlans(career);
            return plans.find((p) => p.plan_numero === normalized) ?? null;
        },

        /**
         * Obtiene el listado de materias de un plan específico de forma asíncrona.
         * @param {string} planNumber - Número del plan
         * @returns {Promise<Materia[]>}
         */
        async getMateriasByPlan(planNumber) {
            const planData = await this.getPlanByNumber(planNumber);
            if (!planData) {
                throw new Error(`El plan "${planNumber}" no existe o no pudo ser cargado.`);
            }
            return planData.materias;
        },

        /**
         * Carga dinámicamente el mapa de equivalencias configurado para un plan (si existe).
         * @param {string | null | undefined} planNumber
         * @returns {Promise<EquivalenciasMap>}
         */
        async getEquivalenciasByPlan(planNumber) {
            const normalized = normalizePlanNumber(planNumber);
            if (!normalized) return {};

            const planEntry = getPlanEntry(normalized, registry);
            const loader =
                planEntry?.equivalencias?.loadData ||
                planEntry?.transition?.loadEquivalencias ||
                null;

            if (typeof loader !== 'function') return {};

            const sourcePlan = planEntry?.equivalencias?.sourcePlan || planEntry?.transition?.sourcePlan || normalized;
            const targetPlan = planEntry?.equivalencias?.targetPlan || planEntry?.transition?.targetPlan || normalized;
            const cacheKey = `${planEntry?.careerId || getCareerPrefix(normalized) || 'plan'}:${sourcePlan}->${targetPlan}`;

            const cached = equivalenciasCache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const mod = await loader();
            /** @type {EquivalenciasMap} */
            const data =
                mod && typeof mod === 'object' && 'default' in mod && mod.default
                    ? /** @type {EquivalenciasMap} */ (mod.default)
                    : /** @type {EquivalenciasMap} */ (mod || {});
            equivalenciasCache.set(cacheKey, data);
            return data;
        },

        /**
         * Devuelve todos los planes registrados cargando dinámicamente cada carrera.
         * @returns {Promise<PlanData[]>}
         */
        async getAllPlans() {
            const results = await Promise.all(
                registry
                    .filter((career) => typeof career.loadPlans === 'function')
                    .map((career) => loadCareerPlans(career)),
            );
            return results.flat();
        },

        /**
         * Limpia los cachés en memoria (útil en tests).
         * @returns {void}
         */
        clearCache() {
            careerCache.clear();
            equivalenciasCache.clear();
        },
    };
}

const planService = createPlanService(CAREERS_REGISTRY);

export default planService;
