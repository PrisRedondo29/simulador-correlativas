/**
 * @typedef {{
 *   id: string,
 *   target: string,
 *   title: string,
 *   description: string,
 * }} TutorialStep
 *
 * @typedef {{
 *   id: string,
 *   version: number,
 *   route: string,
 *   title: string,
 *   requiredFeature?: string,
 *   steps: TutorialStep[],
 * }} TutorialTour
 */

export const TOUR_IDS = {
    MIS_MATERIAS: 'mis_materias',
    MI_AGENDA: 'mi_agenda',
    SIMULADOR: 'simulador',
    EQUIVALENCIAS: 'equivalencias',
    CAMBIO_PLAN: 'cambio_plan',
};

/** @type {Record<string, TutorialTour>} */
export const TUTORIAL_TOURS = {
    [TOUR_IDS.MIS_MATERIAS]: {
        id: TOUR_IDS.MIS_MATERIAS,
        version: 1,
        route: '/mis-materias',
        title: 'Mis Materias',
        steps: [
            {
                id: 'import_analitico',
                target: '[data-tour="progreso-import-analitico"]',
                title: 'Subí tu Analítico oficial',
                description:
                    'Cargá el PDF descargado de SAWeb para actualizar tus materias rendidas y finales en segundos, conservando tus notas de cursada.',
            },
            {
                id: 'solo_incompletas',
                target: '[data-tour="progreso-search-filters"]',
                title: 'Buscá y filtrá rápido',
                description:
                    'Encontrá cualquier materia en el buscador, filtrá por estado o activá "Solo incompletas" para ver a cuáles les falta nota o fecha.',
            },
            {
                id: 'lista_materias',
                target: '[data-tour="progreso-materia-card"]',
                title: 'Tocá una materia para editarla',
                description:
                    'Hacé clic en una tarjeta para cambiar su estado en 1 toque, cargar notas de cursada o finales y ver qué correlativas te destraba.',
            },
            {
                id: 'aprobar_hasta',
                target: '[data-tour="progreso-aprobar-hasta"]',
                title: 'Aprobá años completos en 1 clic',
                description:
                    'Si ya avanzaste bastante, "Aprobar hasta..." te permite marcar años enteros o hasta el título intermedio de una sola vez.',
            },
        ],
    },
    [TOUR_IDS.MI_AGENDA]: {
        id: TOUR_IDS.MI_AGENDA,
        version: 1,
        route: '/mi-agenda',
        title: 'Mi Agenda',
        steps: [
            {
                id: 'agenda_indicadores',
                target: '[data-tour="agenda-indicadores"]',
                title: 'Tu semana de un vistazo',
                description:
                    'Acá ves tus materias en curso, los exámenes o entregas de los próximos 7 días y cuántas clases anotaste en tu bitácora.',
            },
            {
                id: 'agenda_tabs',
                target: '[data-tour="agenda-tabs"]',
                title: 'Tres herramientas en un solo lugar',
                description:
                    'Alterná entre Calendario (fechas de parciales y finales), Horarios (grilla semanal con alerta de superposiciones) y Bitácora de clases.',
            },
            {
                id: 'agenda_panel',
                target: '[data-tour="agenda-add-evento"]',
                title: 'Agendá parciales, entregas o finales',
                description:
                    'Elegí el tipo de evento, la fecha y asociá la materia desde este formulario para verlo en tu calendario y alertas.',
            },
        ],
    },
    [TOUR_IDS.SIMULADOR]: {
        id: TOUR_IDS.SIMULADOR,
        version: 2,
        route: '/simulador',
        title: 'Simulador de Avance',
        steps: [
            {
                id: 'simulador_modos',
                target: '[data-tour="simulador-modos"]',
                title: 'Elegí cómo simular',
                description:
                    'Cambiá cuando quieras entre Planificar avance (cuatrimestre a cuatrimestre) y Explorar correlativas (fijar una materia y ver su cadena).',
            },
            {
                id: 'simulador_controles',
                target: '[data-tour="simulador-controles"]',
                title: 'Controlá tu simulación',
                description:
                    'Desde acá avanzás o retrocedés cuatrimestres en Planificar, o inspeccionás los requisitos previos y materias habilitadas de la materia fijada en Explorar.',
            },
            {
                id: 'simulador_importar',
                target: '[data-tour="simulador-importar"]',
                title: 'Importá tu progreso real',
                description:
                    'Traé en 1 clic tus materias aprobadas y regulares desde Mis Materias para simular a partir de tu estado actual.',
            },
            {
                id: 'simulador_opciones',
                target: '[data-tour="simulador-opciones"]',
                title: 'Configurar plan e inicio',
                description:
                    'Desde Configurar podés cambiar el plan de estudios y el año o cuatrimestre desde el que querés simular.',
            },
            {
                id: 'simulador_diseno',
                target: '[data-tour="simulador-diseno"]',
                title: 'Elegí tu diseño favorito',
                description:
                    'Probá alternar entre Panel lateral (controles a la derecha y lista de correlativas) y HUD flotante (mapa a pantalla completa) para quedarte con el que te resulte más cómodo.',
            },
        ],
    },
    [TOUR_IDS.EQUIVALENCIAS]: {
        id: TOUR_IDS.EQUIVALENCIAS,
        version: 1,
        route: '/equivalencias',
        title: 'Equivalencias',
        requiredFeature: 'equivalencias',
        steps: [
            {
                id: 'equivalencias_comparativa',
                target: '[data-tour="equivalencias-comparativa"]',
                title: 'Compará carga y avance real',
                description:
                    'Arriba ves tu porcentaje y horas restantes en el plan de origen frente al plan destino según las materias ya aprobadas.',
            },
            {
                id: 'equivalencias_filtros',
                target: '[data-tour="equivalencias-filtros"]',
                title: 'Buscá y filtrá equivalencias',
                description:
                    'Usá el buscador por código o nombre y alterná entre Todas, Aprobadas o Pendientes para revisar lo que te falta.',
            },
            {
                id: 'equivalencias_lista',
                target: '[data-tour="equivalencias-lista"]',
                title: 'Mapeo materia a materia',
                description:
                    'Cada fila te muestra qué materias del plan origen otorgan la equivalencia directa en el plan nuevo.',
            },
        ],
    },
    [TOUR_IDS.CAMBIO_PLAN]: {
        id: TOUR_IDS.CAMBIO_PLAN,
        version: 1,
        route: '/cambio-plan',
        title: 'Cambio de Plan',
        requiredFeature: 'planTransition',
        steps: [
            {
                id: 'cambio_plan_resumen',
                target: '[data-tour="cambio-plan-resumen"]',
                title: 'Partí desde tu progreso real',
                description:
                    'Acá ves el conteo de materias con final aprobado y regulares que toma el evaluador desde Mis Materias.',
            },
            {
                id: 'cambio_plan_evaluacion',
                target: '[data-tour="cambio-plan-evaluacion"]',
                title: 'Veredicto de transición',
                description:
                    'Consultá directamente si ya podés pasarte este cuatrimestre según la oferta vigente de la resolución o en qué período te habilita.',
            },
            {
                id: 'cambio_plan_faq',
                target: '[data-tour="cambio-plan-faq"]',
                title: 'Reglas de regularidades y trámite',
                description:
                    'Consultá qué pasa con las materias regularizadas sin final y cómo gestionar el pase formal ante Alumnos.',
            },
        ],
    },
};

/**
 * Devuelve los recorridos habilitados según las capacidades del plan activo.
 * @param {((featureName: string) => boolean) | null | undefined} [canFn]
 * @returns {TutorialTour[]}
 */
export function getAvailableTours(canFn) {
    return Object.values(TUTORIAL_TOURS).filter(
        (tour) =>
            !tour.requiredFeature ||
            (typeof canFn === 'function' ? canFn(tour.requiredFeature) : true),
    );
}
