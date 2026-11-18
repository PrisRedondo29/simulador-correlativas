/**
 * Registro declarativo de políticas y capacidades por plan de estudios.
 * Sigue el Principio Abierto/Cerrado (OCP): para agregar o modificar reglas de un plan,
 * solo se actualiza este catálogo sin modificar páginas, navegación ni notificaciones.
 */

export const DEFAULT_PLAN = '17.14';

const DEFAULT_FALLBACK_POLICY = {
    planNumero: null,
    label: 'Sin plan',
    statusLabel: 'Seleccionar plan',
    carrera: 'Licenciatura en Sistemas de Información',
    estimatedSubjects: 36,
    features: {
        planTransition: false,
        equivalencias: true,
        intermediateTitle: true,
    },
    transition: null,
};

export const PLAN_POLICIES = {
    '17.13': {
        planNumero: '17.13',
        label: 'Plan 17.13',
        statusLabel: 'Plan anterior',
        carrera: 'Licenciatura en Sistemas de Información',
        estimatedSubjects: 37,
        features: {
            planTransition: true,
            equivalencias: true,
            intermediateTitle: true,
        },
        transition: {
            targetPlan: '17.14',
            resolution: 'Res. HCS 89/2025',
            shortBadge: 'Res. 89/25',
            route: '/cambio-plan',
        },
    },
    '17.14': {
        planNumero: '17.14',
        label: 'Plan 17.14',
        statusLabel: 'Plan vigente',
        carrera: 'Licenciatura en Sistemas de Información',
        estimatedSubjects: 36,
        features: {
            planTransition: false,
            equivalencias: true,
            intermediateTitle: true,
        },
        transition: null,
    },
};

export function getPlanPolicy(plan) {
    if (!plan) return DEFAULT_FALLBACK_POLICY;
    return PLAN_POLICIES[plan] || {
        ...DEFAULT_FALLBACK_POLICY,
        planNumero: plan,
        label: `Plan ${plan}`,
    };
}

export function canUseFeature(plan, featureName) {
    const policy = getPlanPolicy(plan);
    return Boolean(policy.features?.[featureName]);
}

export function getPlanTransitionMeta(plan) {
    const policy = getPlanPolicy(plan);
    return policy.features?.planTransition ? policy.transition : null;
}

/**
 * Construye los ítems de navegación académica filtrados según capacidades del plan.
 * Evita que NavBar conozca reglas particulares de cada plan (ISP).
 */
export function getAcademicNavItems(plan) {
    const transition = getPlanTransitionMeta(plan);
    const items = [
        { name: 'Inicio', icon: 'fa-house', path: '/' },
        { name: 'Mi Progreso', icon: 'fa-graduation-cap', path: '/progreso' },
        { name: 'Simulador de Avance', icon: 'fa-route', path: '/simulador' },
    ];

    if (canUseFeature(plan, 'equivalencias')) {
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
