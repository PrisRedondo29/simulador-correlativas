/**
 * Fuente declarativa única de novedades por versión (consumida por WhatsNewModal y /novedades).
 */

export const CURRENT_RELEASE_VERSION = '2.0.0';

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   badge: string,
 *   description: string,
 *   route: string,
 *   ctaLabel: string,
 *   icon: string,
 *   highlight?: boolean,
 * }} ReleaseFeatureItem
 *
 * @typedef {{
 *   group: string,
 *   items: ReleaseFeatureItem[],
 * }} ReleaseSection
 *
 * @typedef {{
 *   version: string,
 *   date: string,
 *   title: string,
 *   summary: string,
 *   sections: ReleaseSection[],
 * }} ReleaseEntry
 */

/** @type {ReleaseEntry[]} */
export const RELEASES = [
    {
        version: '2.0.0',
        date: '2026-11-23',
        title: 'Mi Avance Académico UNLu 2.0.0',
        summary:
            'Renovación integral de planificación, seguimiento académico, análisis de datos, sincronización transaccional, PWA instalable y privacidad.',
        sections: [
            {
                group: 'Seguimiento Académico e Importación SAWeb',
                items: [
                    {
                        id: 'saweb-local',
                        title: 'Importador de Analítico SAWeb (100% local)',
                        badge: 'Nuevo',
                        highlight: true,
                        description:
                            'Cargá tu PDF o texto de SAWeb directamente en tu navegador para detectar materias aprobadas, regulares, en curso y notas sin subir archivos ni guardar DNI o legajo.',
                        route: '/mis-materias',
                        ctaLabel: 'Ir a Mis Materias',
                        icon: 'fa-file-arrow-up',
                    },
                    {
                        id: 'mis-materias-v2',
                        title: 'Control de Regularidades, Art. 32° y Notas',
                        badge: 'Mejorado',
                        description:
                            'Seguimiento de vigencia de regularidad (5 cuatrimestres según RGE), intentos de final con alertas preventivas, carga de notas y atajo inteligente para optativas.',
                        route: '/mis-materias',
                        ctaLabel: 'Ver Mis Materias',
                        icon: 'fa-list-check',
                    },
                ],
            },
            {
                group: 'Planificación, Simulador y PDF',
                items: [
                    {
                        id: 'mi-agenda',
                        title: 'Mi Agenda: Horarios, Exámenes y Bitácora',
                        badge: 'Nuevo',
                        highlight: true,
                        description:
                            'Organizá tu grilla horaria semanal con detección de superposiciones, calendario de parciales/finales con alertas en el header y bitácora por materia.',
                        route: '/mi-agenda',
                        ctaLabel: 'Abrir Mi Agenda',
                        icon: 'fa-calendar-days',
                    },
                    {
                        id: 'simulador-v2',
                        title: 'Simulador de Avance v2 (Cursando + Transición)',
                        badge: 'Mejorado',
                        highlight: true,
                        description:
                            'Importá tu progreso real incluyendo materias actualmente en estado Cursando, alterná entre vista de grafo/malla y proyectá un eventual cambio del Plan 17.13 al 17.14.',
                        route: '/simulador',
                        ctaLabel: 'Abrir Simulador',
                        icon: 'fa-diagram-project',
                    },
                    {
                        id: 'pdf-vectoriales',
                        title: 'Planillas PDF vectoriales e Hitos de Títulos',
                        badge: 'Mejorado',
                        description:
                            'Descargá planillas A4 imprimibles en blanco, con tu avance real o con tu simulación completa, incluyendo hitos de Analista Programador/a y resumen de Diplomaturas.',
                        route: '/mis-materias',
                        ctaLabel: 'Exportar Planilla',
                        icon: 'fa-file-pdf',
                    },
                ],
            },
            {
                group: 'Estadísticas, Equivalencias y Planes',
                items: [
                    {
                        id: 'estadisticas',
                        title: 'Estadísticas Académicas y Promedio',
                        badge: 'Nuevo',
                        highlight: true,
                        description:
                            'Visualizá tu promedio con y sin aplazos, histograma de notas, rendimiento por cuatrimestre, efectividad en finales y tabla desagregada materia por materia.',
                        route: '/estadisticas',
                        ctaLabel: 'Ver Estadísticas',
                        icon: 'fa-chart-column',
                    },
                    {
                        id: 'equivalencias-motor',
                        title: 'Motor de Equivalencias AND/OR y Cambio de Plan',
                        badge: 'Mejorado',
                        description:
                            'Reglas alineadas a Res. HCS 260/24 y 836/24 con señalización transparente de equivalencias orientativas y evaluación por año del Plan de Transición 2025–2029.',
                        route: '/equivalencias',
                        ctaLabel: 'Ver Equivalencias',
                        icon: 'fa-arrows-rotate',
                    },
                ],
            },
            {
                group: 'Sincronización, App Offline y Privacidad',
                items: [
                    {
                        id: 'sync-respaldos',
                        title: 'Sincronización Transaccional y Respaldos JSON',
                        badge: 'Mejorado',
                        description:
                            'Sincronización manual en la nube con detección de conflictos entre dispositivos, copias de recuperación automáticas y exportación/importación portable en JSON.',
                        route: '/configuracion',
                        ctaLabel: 'Ver Configuración',
                        icon: 'fa-cloud-arrow-up',
                    },
                    {
                        id: 'pwa-offline',
                        title: 'App Instalable (PWA) y Uso Offline',
                        badge: 'Nuevo',
                        highlight: true,
                        description:
                            'Instalá el portal en tu computadora o celular para abrirlo como aplicación independiente y consultar tu avance sin conexión tras la carga inicial.',
                        route: '/configuracion',
                        ctaLabel: 'Opciones de App',
                        icon: 'fa-mobile-screen-button',
                    },
                    {
                        id: 'privacidad-legal',
                        title: 'Aviso Legal (Ley 25.326), Borrado de Cuenta y Opt-in',
                        badge: 'Nuevo',
                        description:
                            'Nueva página /legal con detalle transparente de datos, eliminación integral de cuenta en Firebase y métricas opcionales en PostHog EU solo bajo consentimiento explícito.',
                        route: '/legal',
                        ctaLabel: 'Leer Aviso Legal',
                        icon: 'fa-scale-balanced',
                    },
                ],
            },
        ],
    },
];

/**
 * Devuelve la entrada de release vigente (o la más reciente).
 * @returns {ReleaseEntry}
 */
export function getCurrentRelease() {
    return (
        RELEASES.find((r) => r.version === CURRENT_RELEASE_VERSION) ||
        RELEASES[0]
    );
}

/**
 * Devuelve hasta `limit` novedades destacadas para mostrar en el modal inicial sin saturar.
 * @param {number} [limit]
 * @returns {ReleaseFeatureItem[]}
 */
export function getReleaseHighlights(limit = 6) {
    const current = getCurrentRelease();
    const all = current.sections.flatMap((s) => s.items);
    const highlighted = all.filter((item) => item.highlight);
    const rest = all.filter((item) => !item.highlight);
    return [...highlighted, ...rest].slice(0, limit);
}
