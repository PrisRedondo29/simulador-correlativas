/**
 * Registro declarativo de políticas y capacidades por plan de estudios.
 * Delega el catálogo de carreras y planes en careersRegistry.js (Patrón Registry + OCP):
 * para agregar o modificar reglas de una carrera o plan, basta actualizar careersRegistry.js
 * sin modificar páginas, navegación ni notificaciones.
 */

import {
    CAREERS_REGISTRY,
    DEFAULT_CAREER_ID,
    DEFAULT_PLAN,
    getAvailableCareers,
    getAvailablePlans,
    getCareerById,
    getCareerByPlan,
    getPlanEntry,
} from './careersRegistry';

/** @typedef {import('../types/domain').CareerConfig} CareerConfig */
/** @typedef {import('../types/domain').EnrichedPlanConfig} EnrichedPlanConfig */
/** @typedef {import('../types/domain').PlanFeatureFlags} PlanFeatureFlags */
/** @typedef {import('../types/domain').TransitionConfig} TransitionConfig */
/** @typedef {import('../types/domain').EquivalenciasConfig} EquivalenciasConfig */
/** @typedef {import('../types/domain').IntermediateTitleConfig} IntermediateTitleConfig */
/** @typedef {import('../types/domain').DiplomaturaConfig} DiplomaturaConfig */
/** @typedef {import('../types/domain').AcademicNavItem} AcademicNavItem */

export { DEFAULT_PLAN };

/**
 * @param {CareerConfig[]} [registry]
 * @returns {EnrichedPlanConfig}
 */
function buildUnselectedFallback(registry = CAREERS_REGISTRY) {
    const defaultCareer =
        getCareerById(DEFAULT_CAREER_ID, registry) ||
        getAvailableCareers(registry)[0] ||
        null;
    const defaultPlan = defaultCareer?.defaultPlan
        ? getPlanEntry(defaultCareer.defaultPlan, registry)
        : null;

    return {
        planNumero: null,
        label: 'Sin plan',
        statusLabel: 'Seleccionar plan',
        careerId: defaultCareer?.id || null,
        carrera: defaultCareer?.name || 'Universidad Nacional de Luján',
        careerShortName: defaultCareer?.shortName || 'UNLu',
        planPrefix: defaultCareer?.planPrefix || null,
        estimatedSubjects: defaultPlan?.estimatedSubjects || 36,
        intermediateTitle: defaultPlan?.intermediateTitle || null,
        diplomaturas: defaultPlan?.diplomaturas || [],
        features: {
            planTransition: false,
            equivalencias: Boolean(defaultPlan?.features?.equivalencias),
            intermediateTitle: Boolean(defaultPlan?.features?.intermediateTitle),
            diplomaturas: Boolean(defaultPlan?.features?.diplomaturas),
        },
        equivalencias: defaultPlan?.equivalencias || null,
        transition: null,
    };
}

/** @type {Record<string, EnrichedPlanConfig>} */
export const PLAN_POLICIES = Object.fromEntries(
    getAvailablePlans(CAREERS_REGISTRY)
        .filter((plan) => Boolean(plan.planNumero))
        .map((plan) => [/** @type {string} */ (plan.planNumero), plan]),
);

/**
 * @param {string | null | undefined} plan
 * @param {CareerConfig[]} [registry]
 * @returns {EnrichedPlanConfig}
 */
export function getPlanPolicy(plan, registry = CAREERS_REGISTRY) {
    if (!plan) return buildUnselectedFallback(registry);

    const entry = getPlanEntry(plan, registry);
    if (entry) return entry;

    const career = getCareerByPlan(plan, registry);
    return {
        planNumero: plan,
        label: `Plan ${plan}`,
        statusLabel: 'Plan personalizado',
        careerId: career?.id || null,
        carrera: career?.name || 'Universidad Nacional de Luján',
        careerShortName: career?.shortName || 'UNLu',
        planPrefix: career?.planPrefix || null,
        estimatedSubjects: 36,
        intermediateTitle: null,
        diplomaturas: [],
        features: {
            planTransition: false,
            equivalencias: false,
            intermediateTitle: false,
            diplomaturas: false,
        },
        equivalencias: null,
        transition: null,
    };
}

/**
 * @param {string | null | undefined} plan
 * @param {keyof PlanFeatureFlags} featureName
 * @param {CareerConfig[]} [registry]
 * @returns {boolean}
 */
export function canUseFeature(plan, featureName, registry = CAREERS_REGISTRY) {
    const policy = getPlanPolicy(plan, registry);
    return Boolean(policy.features?.[featureName]);
}

/**
 * @param {string | null | undefined} plan
 * @param {CareerConfig[]} [registry]
 * @returns {TransitionConfig | null}
 */
export function getPlanTransitionMeta(plan, registry = CAREERS_REGISTRY) {
    const policy = getPlanPolicy(plan, registry);
    return policy.features?.planTransition ? (policy.transition ?? null) : null;
}

/**
 * @param {string | null | undefined} plan
 * @param {CareerConfig[]} [registry]
 * @returns {EquivalenciasConfig | null}
 */
export function getPlanEquivalenciasMeta(plan, registry = CAREERS_REGISTRY) {
    const policy = getPlanPolicy(plan, registry);
    return policy.features?.equivalencias ? (policy.equivalencias ?? null) : null;
}

/**
 * @param {string | null | undefined} plan
 * @param {CareerConfig[]} [registry]
 * @returns {IntermediateTitleConfig | null}
 */
export function getIntermediateTitleConfig(plan, registry = CAREERS_REGISTRY) {
    const policy = getPlanPolicy(plan, registry);
    return policy.features?.intermediateTitle ? (policy.intermediateTitle ?? null) : null;
}

/**
 * Devuelve la configuración declarativa de Diplomaturas Intracurriculares para un plan.
 * @param {string | null | undefined} plan
 * @param {CareerConfig[]} [registry]
 * @returns {DiplomaturaConfig[]}
 */
export function getPlanDiplomaturasConfig(plan, registry = CAREERS_REGISTRY) {
    const policy = getPlanPolicy(plan, registry);
    if (!policy.features?.diplomaturas || !Array.isArray(policy.diplomaturas)) {
        return [];
    }
    return policy.diplomaturas;
}

/**
 * @param {string | null | undefined} plan
 * @param {CareerConfig[]} [registry]
 * @returns {CareerConfig | null}
 */
export function getCareerMeta(plan, registry = CAREERS_REGISTRY) {
    const matched = getCareerByPlan(plan, registry);
    if (matched) return matched;

    return (
        getCareerById(DEFAULT_CAREER_ID, registry) ||
        getAvailableCareers(registry)[0] ||
        null
    );
}

/**
 * Construye los ítems de navegación académica filtrados según capacidades del plan.
 * Evita que NavBar conozca reglas particulares de cada carrera o plan (ISP).
 * @param {string | null | undefined} plan
 * @param {CareerConfig[]} [registry]
 * @returns {AcademicNavItem[]}
 */
export function getAcademicNavItems(plan, registry = CAREERS_REGISTRY) {
    const transition = getPlanTransitionMeta(plan, registry);
    /** @type {AcademicNavItem[]} */
    const items = [
        { name: 'Inicio', icon: 'fa-house', path: '/' },
        { name: 'Mis Materias', icon: 'fa-graduation-cap', path: '/mis-materias' },
        { name: 'Mi Agenda', icon: 'fa-calendar-days', path: '/mi-agenda' },
        { name: 'Simulador de Avance', icon: 'fa-route', path: '/simulador' },
        { name: 'Estadísticas', icon: 'fa-chart-column', path: '/estadisticas' },
    ];

    if (canUseFeature(plan, 'equivalencias', registry)) {
        items.push({ name: 'Equivalencias', icon: 'fa-right-left', path: '/equivalencias' });
    }

    if (transition) {
        items.push({
            name: 'Cambio de Plan',
            icon: 'fa-arrows-rotate',
            path: transition.route,
            badge: transition.shortBadge,
        });
    }

    return items;
}
