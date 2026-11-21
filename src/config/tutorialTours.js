export const TOUR_IDS = {
    MIS_MATERIAS: 'mis_materias',
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
                target: '[data-tour="progreso-solo-incompletas"]',
                title: 'Buscá y filtrá rápido',
                description:
                    'Encontrá cualquier materia por nombre o activá "Solo incompletas" para detectar a cuáles les falta nota o fecha.',
            },
            {
                id: 'lista_materias',
                target: '[data-tour="progreso-materias-list"]',
                title: 'Tocá una materia para editarla',
                description:
                    'Desde cada tarjeta podés cambiar su estado en 1 toque, cargar notas de cursada o finales y ver qué correlativas te destraba.',
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
};
