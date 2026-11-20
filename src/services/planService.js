/**
 * Servicio para gestionar los planes de estudio y materias con carga dinámica real
 * (code-splitting por carrera) y caché en memoria.
 */

const careerCache = new Map();

const CAREER_LOADERS = {
    '17': () => import('../data/sistemas.json'),
    '20': () => import('../data/civil.json'),
};

function getCareerPrefix(planNumber) {
    if (typeof planNumber !== 'string') return null;
    const match = planNumber.match(/^(\d+)/);
    return match ? match[1] : null;
}

async function loadCareerPlans(prefix) {
    if (!prefix || !CAREER_LOADERS[prefix]) return [];

    if (careerCache.has(prefix)) {
        return careerCache.get(prefix);
    }

    const mod = await CAREER_LOADERS[prefix]();
    const plans = mod.default || [];
    careerCache.set(prefix, plans);
    return plans;
}

const planService = {
    /**
     * Obtiene un plan completo (con materias) de forma asíncrona,
     * cargando únicamente el JSON de la carrera correspondiente y cacheándolo en memoria.
     * @param {string} planNumber - Número del plan (ej: "17.14")
     * @returns {Promise<{ plan_numero: string, materias: Array }|null>}
     */
    async getPlanByNumber(planNumber) {
        const prefix = getCareerPrefix(planNumber);
        const plans = await loadCareerPlans(prefix);
        return plans.find((p) => p.plan_numero === planNumber) ?? null;
    },

    /**
     * Obtiene el listado de materias de un plan específico de forma asíncrona.
     * @param {string} planNumber - Número del plan
     * @returns {Promise<Array>}
     */
    async getMateriasByPlan(planNumber) {
        const planData = await this.getPlanByNumber(planNumber);
        if (!planData) {
            throw new Error(`El plan "${planNumber}" no existe o no pudo ser cargado.`);
        }
        return planData.materias;
    },

    /**
     * Devuelve todos los planes registrados cargando dinámicamente cada carrera.
     * @returns {Promise<Array>}
     */
    async getAllPlans() {
        const prefixes = Object.keys(CAREER_LOADERS);
        const results = await Promise.all(prefixes.map((prefix) => loadCareerPlans(prefix)));
        return results.flat();
    },

    /**
     * Limpia el caché en memoria (útil en tests).
     */
    clearCache() {
        careerCache.clear();
    },
};

export default planService;
