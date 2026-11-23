/**
 * Configuración centralizada de SEO técnico y metadatos por ruta.
 * Actualiza `<title>`, `<meta name="description">`, etiquetas Open Graph / Twitter y `<link rel="canonical">`.
 */

export const CANONICAL_ORIGIN = 'https://mi-avance-academico.vercel.app';
export const DEFAULT_SEO_TITLE = 'Simulador de Correlativas UNLu - Planificá tu carrera';
export const DEFAULT_SEO_DESCRIPTION =
    'Herramienta para alumnos de la UNLu. Simulá tus finales, gestioná tus correlativas y proyectá tu fecha de graduación.';

/**
 * @typedef {{
 *   title: string,
 *   documentTitle: string,
 *   description: string,
 *   canonicalPath: string,
 * }} RouteSeoMeta
 */

/** @type {Record<string, RouteSeoMeta>} */
export const ROUTE_SEO = {
    '/': {
        title: 'Inicio',
        documentTitle: DEFAULT_SEO_TITLE,
        description: DEFAULT_SEO_DESCRIPTION,
        canonicalPath: '/',
    },
    '/mis-materias': {
        title: 'Mis Materias',
        documentTitle: 'Mis Materias | Simulador de Correlativas UNLu',
        description:
            'Seguí el estado real de tus materias, cargá notas de cursada y finales, controlá regularidades e importá tu analítico SAWeb.',
        canonicalPath: '/mis-materias',
    },
    '/mi-agenda': {
        title: 'Mi Agenda',
        documentTitle: 'Mi Agenda | Simulador de Correlativas UNLu',
        description:
            'Organizá parciales, entregas y finales en el calendario, detectá superposiciones horarias y llevá tu bitácora semanal.',
        canonicalPath: '/mi-agenda',
    },
    '/simulador': {
        title: 'Simulador de Avance',
        documentTitle: 'Simulador de Avance | Simulador de Correlativas UNLu',
        description:
            'Proyectá tu avance cuatrimestre a cuatrimestre, explorá cadenas de correlatividades en el grafo interactivo y estimá tu fecha de egreso.',
        canonicalPath: '/simulador',
    },
    '/estadisticas': {
        title: 'Estadísticas Académicas',
        documentTitle: 'Estadísticas Académicas | Simulador de Correlativas UNLu',
        description:
            'Visualizá tu histograma de notas, materias y evolución de promedio por cuatrimestre, efectividad en finales y avance por año del plan.',
        canonicalPath: '/estadisticas',
    },
    '/equivalencias': {
        title: 'Equivalencias entre Planes',
        documentTitle: 'Equivalencias entre Planes | Simulador de Correlativas UNLu',
        description:
            'Compará materia a materia y carga horaria las equivalencias oficiales entre planes de estudio de tu carrera en la UNLu.',
        canonicalPath: '/equivalencias',
    },
    '/cambio-plan': {
        title: 'Cambio de Plan',
        documentTitle: 'Cambio de Plan | Simulador de Correlativas UNLu',
        description:
            'Evaluá tu elegibilidad para pasar al Plan 17.14 según la Resolución HCS 89/2025 y descubrí qué materias te habilita.',
        canonicalPath: '/cambio-plan',
    },
    '/como-usar': {
        title: 'Cómo Usar',
        documentTitle: 'Guía de Uso | Simulador de Correlativas UNLu',
        description:
            'Aprendé paso a paso a cargar tu historia académica, interpretar el semáforo de correlativas y aprovechar todas las herramientas.',
        canonicalPath: '/como-usar',
    },
    '/configuracion': {
        title: 'Configuración',
        documentTitle: 'Configuración | Simulador de Correlativas UNLu',
        description:
            'Elegí tu carrera y plan de estudios activo, personalizá la apariencia, respaldá tus datos en JSON y administrá las guías interactivas.',
        canonicalPath: '/configuracion',
    },
    '/contacto': {
        title: 'Contacto',
        documentTitle: 'Contacto | Simulador de Correlativas UNLu',
        description:
            'Comunicate con el equipo desarrollador para reportar errores, sugerir mejoras o consultar sobre planes de estudio.',
        canonicalPath: '/contacto',
    },
    '/legal': {
        title: 'Aviso Legal y Privacidad',
        documentTitle: 'Aviso Legal y Privacidad | Simulador de Correlativas UNLu',
        description:
            'Política de privacidad (Ley 25.326), descargo de proyecto estudiantil no oficial UNLu, detalle de datos tratados y derechos del titular.',
        canonicalPath: '/legal',
    },
};

/**
 * Normaliza un pathname eliminando barras finales innecesarias (excepto `/`).
 * @param {string | null | undefined} pathname
 * @returns {string}
 */
function normalizePathname(pathname) {
    if (!pathname || pathname === '/') return '/';
    return pathname.replace(/\/+$/, '') || '/';
}

const LEGACY_REDIRECT_MAP = {
    '/progreso': '/mis-materias',
    '/cursada': '/mi-agenda',
    '/transicion': '/cambio-plan',
    '/config': '/configuracion',
    '/privacidad': '/legal',
};

const NOT_FOUND_SEO = {
    title: 'Página no encontrada',
    documentTitle: 'Página no encontrada | Simulador de Correlativas UNLu',
    description: 'La ruta solicitada no existe dentro del Simulador de Correlativas UNLu.',
    canonicalPath: '/',
    robots: 'noindex, nofollow',
};

/**
 * Obtiene los metadatos SEO correspondientes a una ruta.
 * Para rutas desconocidas devuelve metadatos de 404 con `robots: 'noindex, nofollow'`.
 * @param {string | null | undefined} pathname
 * @returns {RouteSeoMeta & { canonicalUrl: string, robots: string }}
 */
export function getRouteSeo(pathname) {
    const normalized = normalizePathname(pathname);
    const resolvedPath = LEGACY_REDIRECT_MAP[normalized] ?? normalized;
    const known = ROUTE_SEO[resolvedPath];
    const meta = known ?? NOT_FOUND_SEO;
    const canonicalUrl = `${CANONICAL_ORIGIN}${meta.canonicalPath}`;
    return {
        ...meta,
        robots: known ? 'index, follow' : NOT_FOUND_SEO.robots,
        canonicalUrl,
    };
}

/**
 * Crea o actualiza una etiqueta `<meta>` en `<head>`.
 * @param {Document} doc
 * @param {'name' | 'property'} attrName
 * @param {string} attrValue
 * @param {string} content
 */
function upsertMetaTag(doc, attrName, attrValue, content) {
    let tag = doc.querySelector(`meta[${attrName}="${attrValue}"]`);
    if (!tag && doc.head) {
        tag = doc.createElement('meta');
        tag.setAttribute(attrName, attrValue);
        doc.head.appendChild(tag);
    }
    if (tag) {
        tag.setAttribute('content', content);
    }
}

/**
 * Crea o actualiza `<link rel="canonical">` en `<head>`.
 * @param {Document} doc
 * @param {string} href
 */
function upsertCanonicalLink(doc, href) {
    let link = doc.querySelector('link[rel="canonical"]');
    if (!link && doc.head) {
        link = doc.createElement('link');
        link.setAttribute('rel', 'canonical');
        doc.head.appendChild(link);
    }
    if (link) {
        link.setAttribute('href', href);
    }
}

/**
 * Aplica los metadatos SEO dinámicos al documento actual al navegar entre rutas SPA.
 * @param {string | null | undefined} pathname
 * @param {Document | null} [doc]
 * @returns {RouteSeoMeta & { canonicalUrl: string }}
 */
export function applyRouteSeo(pathname, doc = typeof document !== 'undefined' ? document : null) {
    const seo = getRouteSeo(pathname);
    if (!doc) return seo;

    doc.title = seo.documentTitle;
    upsertMetaTag(doc, 'name', 'title', seo.documentTitle);
    upsertMetaTag(doc, 'name', 'description', seo.description);
    upsertMetaTag(doc, 'name', 'robots', seo.robots);
    upsertMetaTag(doc, 'property', 'og:title', seo.documentTitle);
    upsertMetaTag(doc, 'property', 'og:description', seo.description);
    upsertMetaTag(doc, 'property', 'og:url', seo.canonicalUrl);
    upsertMetaTag(doc, 'property', 'twitter:title', seo.documentTitle);
    upsertMetaTag(doc, 'property', 'twitter:description', seo.description);
    upsertMetaTag(doc, 'property', 'twitter:url', seo.canonicalUrl);
    upsertCanonicalLink(doc, seo.canonicalUrl);

    return seo;
}
