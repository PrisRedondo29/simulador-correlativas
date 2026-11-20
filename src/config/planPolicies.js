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

export { DEFAULT_PLAN };

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
        features: {
            planTransition: false,
            equivalencias: Boolean(defaultPlan?.features?.equivalencias),
            intermediateTitle: Boolean(defaultPlan?.features?.intermediateTitle),
        },
        equivalencias: defaultPlan?.equivalencias || null,
        transition: null,
    };
}

export const PLAN_POLICIES = Object.fromEntries(
    getAvailablePlans(CAREERS_REGISTRY).map((plan) => [plan.planNumero, plan]),
);

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
        features: {
            planTransition: false,
            equivalencias: false,
            intermediateTitle: false,
        },
        equivalencias: null,
        transition: null,
    };
}

export function canUseFeature(plan, featureName, registry = CAREERS_REGISTRY) {
    const policy = getPlanPolicy(plan, registry);
    return Boolean(policy.features?.[featureName]);
}

export function getPlanTransitionMeta(plan, registry = CAREERS_REGISTRY) {
    const policy = getPlanPolicy(plan, registry);
    return policy.features?.planTransition ? policy.transition : null;
}

export function getPlanEquivalenciasMeta(plan, registry = CAREERS_REGISTRY) {
    const policy = getPlanPolicy(plan, registry);
    return policy.features?.equivalencias ? policy.equivalencias : null;
}

export function getIntermediateTitleConfig(plan, registry = CAREERS_REGISTRY) {
    const policy = getPlanPolicy(plan, registry);
    return policy.features?.intermediateTitle ? policy.intermediateTitle : null;
}

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
 */
export function getAcademicNavItems(plan, registry = CAREERS_REGISTRY) {
    const transition = getPlanTransitionMeta(plan, registry);
    const items = [
        { name: 'Inicio', icon: 'fa-house', path: '/' },
        { name: 'Mi Progreso', icon: 'fa-graduation-cap', path: '/progreso' },
        { name: 'Simulador de Avance', icon: 'fa-route', path: '/simulador' },
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
