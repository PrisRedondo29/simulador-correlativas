/**
 * Registro declarativo de carreras y planes de estudio de la UNLu.
 * Patrón Registry (OCP): para sumar una nueva carrera o plan, basta con agregar
 * su archivo JSON en src/data/ y registrarla aquí, sin modificar páginas,
 * hooks, modales ni navegación.
 */

/** @typedef {import('../types/domain').CareerConfig} CareerConfig */
/** @typedef {import('../types/domain').PlanConfig} PlanConfig */
/** @typedef {import('../types/domain').EnrichedPlanConfig} EnrichedPlanConfig */
/** @typedef {import('../types/domain').PlanFeatureFlags} PlanFeatureFlags */

export const DEFAULT_CAREER_ID = 'sistemas';
export const DEFAULT_PLAN = '17.14';

/** @type {CareerConfig[]} */
export const CAREERS_REGISTRY = [
    {
        id: 'sistemas',
        planPrefix: '17',
        name: 'Licenciatura en Sistemas de Información',
        shortName: 'LSI',
        defaultPlan: '17.14',
        available: true,
        loadPlans: () => import('../data/sistemas.json'),
        plans: [
            {
                planNumero: '17.14',
                label: 'Plan 17.14',
                shortTitle: 'Plan Nuevo',
                statusLabel: 'Vigente',
                description: 'Recomendado para ingresantes recientes y quienes migraron al nuevo diseño curricular.',
                estimatedSubjects: 36,
                isDefault: true,
                intermediateTitle: {
                    name: 'Título Intermedio (Analista)',
                    maxCuatrimestre: 6,
                },
                features: {
                    planTransition: false,
                    equivalencias: true,
                    intermediateTitle: true,
                },
                equivalencias: {
                    sourcePlan: '17.13',
                    targetPlan: '17.14',
                    resolution: 'Res. HCS 89/2025',
                    loadData: () => import('../data/equivalencias.json'),
                },
                transition: null,
            },
            {
                planNumero: '17.13',
                label: 'Plan 17.13',
                shortTitle: 'Plan Anterior',
                statusLabel: 'Anterior',
                description: 'Plan de estudios histórico para estudiantes que mantienen su regularidad en el diseño anterior.',
                estimatedSubjects: 37,
                isDefault: false,
                intermediateTitle: {
                    name: 'Título Intermedio (Analista)',
                    maxCuatrimestre: 7,
                },
                features: {
                    planTransition: true,
                    equivalencias: true,
                    intermediateTitle: true,
                },
                equivalencias: {
                    sourcePlan: '17.13',
                    targetPlan: '17.14',
                    resolution: 'Res. HCS 89/2025',
                    loadData: () => import('../data/equivalencias.json'),
                },
                transition: {
                    sourcePlan: '17.13',
                    targetPlan: '17.14',
                    resolution: 'Res. HCS 89/2025',
                    shortBadge: 'Res. 89/25',
                    route: '/cambio-plan',
                    savedHours: 202,
                    closingYear: 2029,
                    loadEquivalencias: () => import('../data/equivalencias.json'),
                },
            },
        ],
    },
    {
        id: 'civil',
        planPrefix: '20',
        name: 'Ingeniería Civil',
        shortName: 'Ing. Civil',
        defaultPlan: null,
        available: false,
        loadPlans: () => import('../data/civil.json'),
        plans: [],
    },
];

/**
 * Normaliza un identificador de plan (ej: "Sistemas 17.14" -> "17.14", "17.13" -> "17.13").
 * @param {string | null | undefined} plan
 * @returns {string | null}
 */
export function normalizePlanNumber(plan) {
    if (typeof plan !== 'string') return null;
    const trimmed = plan.trim();
    if (!trimmed) return null;
    const dottedMatch = trimmed.match(/(\d+\.\d+)/);
    return dottedMatch ? dottedMatch[1] : trimmed;
}

/**
 * Extrae el prefijo numérico de carrera de un plan (ej: "17.14" -> "17").
 * @param {string | null | undefined} planNumber
 * @returns {string | null}
 */
export function getCareerPrefix(planNumber) {
    const normalized = normalizePlanNumber(planNumber);
    if (!normalized) return null;
    const match = normalized.match(/^(\d+)/);
    return match ? match[1] : null;
}

/**
 * @param {CareerConfig} career
 * @param {PlanConfig} plan
 * @returns {EnrichedPlanConfig}
 */
function enrichPlan(career, plan) {
    return {
        ...plan,
        careerId: career.id,
        carrera: career.name,
        careerShortName: career.shortName,
        planPrefix: career.planPrefix,
    };
}

/**
 * Devuelve únicamente las carreras habilitadas que ya tienen al menos un plan cargado.
 * @param {CareerConfig[]} [registry]
 * @returns {CareerConfig[]}
 */
export function getAvailableCareers(registry = CAREERS_REGISTRY) {
    return registry.filter(
        (career) => career.available && Array.isArray(career.plans) && career.plans.length > 0,
    );
}

/**
 * Devuelve todos los planes disponibles enriquecidos con los metadatos de su carrera.
 * @param {CareerConfig[]} [registry]
 * @returns {EnrichedPlanConfig[]}
 */
export function getAvailablePlans(registry = CAREERS_REGISTRY) {
    return getAvailableCareers(registry).flatMap((career) =>
        career.plans.map((plan) => enrichPlan(career, plan)),
    );
}

/**
 * @param {string | null | undefined} careerId
 * @param {CareerConfig[]} [registry]
 * @returns {CareerConfig | null}
 */
export function getCareerById(careerId, registry = CAREERS_REGISTRY) {
    if (!careerId) return null;
    return registry.find((career) => career.id === careerId) || null;
}

/**
 * @param {string | number | null | undefined} prefix
 * @param {CareerConfig[]} [registry]
 * @returns {CareerConfig | null}
 */
export function getCareerByPrefix(prefix, registry = CAREERS_REGISTRY) {
    if (!prefix) return null;
    return registry.find((career) => career.planPrefix === String(prefix)) || null;
}

/**
 * @param {string | null | undefined} planNumber
 * @param {CareerConfig[]} [registry]
 * @returns {CareerConfig | null}
 */
export function getCareerByPlan(planNumber, registry = CAREERS_REGISTRY) {
    const normalized = normalizePlanNumber(planNumber);
    if (!normalized) return null;

    const exact = registry.find((career) =>
        career.plans?.some((plan) => plan.planNumero === normalized),
    );
    if (exact) return exact;

    const prefix = getCareerPrefix(normalized);
    return getCareerByPrefix(prefix, registry);
}

/**
 * @param {string | null | undefined} planNumber
 * @param {CareerConfig[]} [registry]
 * @returns {EnrichedPlanConfig | null}
 */
export function getPlanEntry(planNumber, registry = CAREERS_REGISTRY) {
    const normalized = normalizePlanNumber(planNumber);
    if (!normalized) return null;

    for (const career of registry) {
        const found = career.plans?.find((plan) => plan.planNumero === normalized);
        if (found) {
            return enrichPlan(career, found);
        }
    }

    return null;
}

/**
 * Devuelve los planes disponibles que soportan una capacidad específica (ej: "planTransition").
 * Si se indica `careerId`, prioriza primero los planes de esa misma carrera.
 * @param {keyof PlanFeatureFlags} featureName
 * @param {{ careerId?: string | null, registry?: CareerConfig[] }} [options]
 * @returns {EnrichedPlanConfig[]}
 */
export function getPlansSupportingFeature(featureName, { careerId = null, registry = CAREERS_REGISTRY } = {}) {
    const matching = getAvailablePlans(registry).filter((plan) => Boolean(plan.features?.[featureName]));
    if (!careerId) return matching;

    const sameCareer = matching.filter((plan) => plan.careerId === careerId);
    const others = matching.filter((plan) => plan.careerId !== careerId);
    return [...sameCareer, ...others];
}
