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
/** @typedef {import('../types/domain').CatalogMetaEntry} CatalogMetaEntry */

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
                estimatedSubjects: 43,
                isDefault: true,
                intermediateTitle: {
                    name: 'Analista Programador/a Universitario/a',
                    codigos: [
                        '19054',
                        '39553',
                        '14026',
                        '11271',
                        '13014',
                        '21256',
                        '11256',
                        '11274',
                        '41407',
                        '13021',
                        '11275',
                        '11258',
                        '13022',
                        '41426',
                        '11276',
                        '13923',
                        '11259',
                        '11410',
                        '11083',
                        '14027',
                        '11286',
                        '11277',
                        '21279',
                        '11287',
                    ],
                },
                features: {
                    planTransition: false,
                    equivalencias: true,
                    intermediateTitle: true,
                    diplomaturas: true,
                },
                diplomaturas: [
                    {
                        id: 'informatica',
                        shortCode: 'INF',
                        name: 'Diplomado/a Universitario/a en Informática',
                        shortName: 'Informática',
                        resolution: 'Res. HCS 726/24',
                        horasTotales: 448,
                        codigosObligatorios: ['19054', '11271', '41407', '21256', '41426', '11274'],
                        color: {
                            bg: /** @type {[number, number, number]} */ ([239, 246, 255]),
                            border: /** @type {[number, number, number]} */ ([147, 197, 253]),
                            text: /** @type {[number, number, number]} */ ([29, 78, 216]),
                            hexBg: '#EFF6FF',
                            hexBorder: '#93C5FD',
                            hexText: '#1D4ED8',
                        },
                    },
                    {
                        id: 'analisis-diseno',
                        shortCode: 'ADS',
                        name: 'Diplomado/a Universitario/a en Análisis y Diseño de Sistemas',
                        shortName: 'Análisis y Diseño',
                        resolution: 'Res. HCS 726/24',
                        horasTotales: 384,
                        codigosObligatorios: ['21256', '11256', '11258', '11259', '11260'],
                        color: {
                            bg: /** @type {[number, number, number]} */ ([245, 243, 255]),
                            border: /** @type {[number, number, number]} */ ([196, 181, 253]),
                            text: /** @type {[number, number, number]} */ ([109, 40, 217]),
                            hexBg: '#F5F3FF',
                            hexBorder: '#C4B5FD',
                            hexText: '#6D28D9',
                        },
                    },
                    {
                        id: 'desarrollo-software',
                        shortCode: 'DSW',
                        name: 'Diplomado/a Universitario/a en Desarrollo de Software',
                        shortName: 'Desarrollo de Software',
                        resolution: 'Res. HCS 726/24',
                        horasTotales: 704,
                        codigosObligatorios: [
                            '11271',
                            '11274',
                            '11258',
                            '11275',
                            '11276',
                            '11259',
                            '11286',
                            '11277',
                            '14032',
                        ],
                        color: {
                            bg: /** @type {[number, number, number]} */ ([236, 253, 245]),
                            border: /** @type {[number, number, number]} */ ([110, 231, 183]),
                            text: /** @type {[number, number, number]} */ ([4, 120, 87]),
                            hexBg: '#ECFDF5',
                            hexBorder: '#6EE7B7',
                            hexText: '#047857',
                        },
                    },
                    {
                        id: 'hardware-redes',
                        shortCode: 'HRD',
                        name: 'Diplomado/a Universitario/a en Hardware y Redes de Datos',
                        shortName: 'Hardware y Redes',
                        resolution: 'Res. HCS 726/24',
                        horasTotales: 544,
                        codigosObligatorios: ['41407', '41426', '11410', '14027', '14029', '11292', '41429'],
                        color: {
                            bg: /** @type {[number, number, number]} */ ([255, 247, 237]),
                            border: /** @type {[number, number, number]} */ ([253, 186, 116]),
                            text: /** @type {[number, number, number]} */ ([194, 65, 12]),
                            hexBg: '#FFF7ED',
                            hexBorder: '#FDBA74',
                            hexText: '#C2410C',
                        },
                    },
                    {
                        id: 'ciencia-datos',
                        shortCode: 'CDD',
                        name: 'Diplomado/a Universitario/a en Ciencia de Datos',
                        shortName: 'Ciencia de Datos',
                        resolution: 'Res. HCS 726/24',
                        horasTotales: 576,
                        codigosObligatorios: ['11083', '11277', '11278', '11288', '14033', '11289', '21258'],
                        color: {
                            bg: /** @type {[number, number, number]} */ ([236, 254, 255]),
                            border: /** @type {[number, number, number]} */ ([103, 232, 249]),
                            text: /** @type {[number, number, number]} */ ([14, 116, 144]),
                            hexBg: '#ECFEFF',
                            hexBorder: '#67E8F9',
                            hexText: '#0E7490',
                        },
                    },
                    {
                        id: 'teoria-computacion',
                        shortCode: 'TDC',
                        name: 'Diplomado/a Universitario/a en Teoría de la Computación',
                        shortName: 'Teoría de la Comp.',
                        resolution: 'Res. HCS 726/24',
                        horasTotales: 224,
                        codigosObligatorios: ['14031'],
                        codigosOptativasSlot: ['AO-1714'],
                        optativasRequeridas: [
                            { codigo: '11809', nombre: 'Compiladores' },
                            { codigo: null, nombre: 'Computabilidad y Complejidad Computacional' },
                        ],
                        notaNormativa:
                            'Requiere 14031 + 2 optativas específicas (Compiladores 11809 y Computabilidad y Complejidad Computacional).',
                        color: {
                            bg: /** @type {[number, number, number]} */ ([255, 241, 242]),
                            border: /** @type {[number, number, number]} */ ([253, 164, 175]),
                            text: /** @type {[number, number, number]} */ ([190, 18, 60]),
                            hexBg: '#FFF1F2',
                            hexBorder: '#FDA4AF',
                            hexText: '#BE123C',
                        },
                    },
                ],
                equivalencias: {
                    sourcePlan: '17.13',
                    targetPlan: '17.14',
                    resolution: 'Res. HCS 260/24 (Anexo VI) y Res. HCS 836/24',
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
                estimatedSubjects: 42,
                isDefault: false,
                intermediateTitle: {
                    name: 'Título Intermedio (Analista)',
                    maxCuatrimestre: 7,
                },
                features: {
                    planTransition: true,
                    equivalencias: true,
                    intermediateTitle: true,
                    diplomaturas: false,
                },
                diplomaturas: [],
                equivalencias: {
                    sourcePlan: '17.13',
                    targetPlan: '17.14',
                    resolution: 'Res. HCS 260/24 (Anexo VI) y Res. HCS 836/24',
                    loadData: () => import('../data/equivalencias.json'),
                },
                transition: {
                    sourcePlan: '17.13',
                    targetPlan: '17.14',
                    resolution: 'Plan de Transición 2025 (Res. HCS 89/2025)',
                    shortBadge: 'Res. 89/25',
                    route: '/cambio-plan',
                    savedHours: 218,
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
 * Devuelve todas las carreras del registro (tanto las activas como las catalogadas
 * "Próximamente"), útil para selectores institucionales de Carrera -> Plan.
 * @param {CareerConfig[]} [registry]
 * @returns {CareerConfig[]}
 */
export function getCatalogCareers(registry = CAREERS_REGISTRY) {
    return [...registry];
}

/**
 * Fusiona dinámicamente planes o carreras nuevos publicados desde el Panel Admin
 * en `catalog_meta/index` sobre el registro estático base, sin requerir recompilar el frontend.
 *
 * @param {Record<string, CatalogMetaEntry> | null | undefined} remotePlansMeta
 * @param {CareerConfig[]} [baseRegistry]
 * @returns {CareerConfig[]}
 */
export function mergeDynamicCatalogCareers(remotePlansMeta, baseRegistry = CAREERS_REGISTRY) {
    if (!remotePlansMeta || typeof remotePlansMeta !== 'object') {
        return baseRegistry;
    }

    /** @type {CareerConfig[]} */
    const cloned = baseRegistry.map((c) => ({
        ...c,
        plans: Array.isArray(c.plans) ? [...c.plans] : [],
    }));

    Object.entries(remotePlansMeta).forEach(([rawPlanNum, meta]) => {
        const planNumero = normalizePlanNumber(rawPlanNum);
        if (!planNumero || !meta || typeof meta !== 'object') return;

        const alreadyExists = cloned.some((c) =>
            c.plans.some((p) => p.planNumero === planNumero),
        );
        if (alreadyExists) return;

        const prefix = getCareerPrefix(planNumero) || planNumero;
        let targetCareer =
            (meta.careerId && cloned.find((c) => c.id === meta.careerId)) ||
            cloned.find((c) => c.planPrefix === prefix) ||
            null;

        const newPlanEntry = {
            planNumero,
            label: meta.label || `Plan ${planNumero}`,
            shortTitle: meta.shortTitle || 'Plan Vigente',
            statusLabel: 'Publicado',
            description: 'Plan de estudios publicado desde el catálogo institucional.',
            estimatedSubjects: Number(meta.estimatedSubjects) || 36,
            isDefault: true,
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

        if (targetCareer) {
            targetCareer.available = true;
            if (!targetCareer.defaultPlan) {
                targetCareer.defaultPlan = planNumero;
            }
            if (meta.carrera) {
                targetCareer.name = meta.carrera;
            }
            if (meta.careerShortName) {
                targetCareer.shortName = meta.careerShortName;
            }
            targetCareer.plans.push(newPlanEntry);
        } else {
            const newCareerId = meta.careerId || `career-${prefix}`;
            cloned.push({
                id: newCareerId,
                planPrefix: prefix,
                name: meta.carrera || `Carrera (${planNumero})`,
                shortName: meta.careerShortName || `Plan ${planNumero}`,
                defaultPlan: planNumero,
                available: true,
                plans: [newPlanEntry],
            });
        }
    });

    return cloned;
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
