export const TOUR_IDS = {
    MIS_MATERIAS: 'mis_materias',
    MI_AGENDA: 'mi_agenda',
};

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
};
