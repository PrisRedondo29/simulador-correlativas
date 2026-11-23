/**
 * analyticsActiveTime.js
 * Medición pura y deduplicada de tiempo activo estimado por pantalla/funcionalidad.
 * Descuenta pestañas ocultas, pausas por inactividad (>30 s sin interacción) e intervalos breves (<2 s).
 */

export const DEFAULT_IDLE_TIMEOUT_MS = 30_000;
export const DEFAULT_MIN_ACTIVE_SECONDS = 2;
export const DEFAULT_MAX_ACTIVE_SECONDS = 1800;

const ROUTE_TO_FEATURE = {
    '/': 'inicio',
    '/mis-materias': 'mis_materias',
    '/mi-agenda': 'mi_agenda',
    '/simulador': 'simulador',
    '/estadisticas': 'estadisticas',
    '/equivalencias': 'equivalencias',
    '/cambio-plan': 'cambio_plan',
    '/como-usar': 'como_usar',
    '/configuracion': 'configuracion',
    '/contacto': 'contacto',
    '/legal': 'legal',
    '/novedades': 'novedades',
};

/**
 * @param {string | null | undefined} pathname
 * @returns {string}
 */
export function getFeatureNameForRoute(pathname) {
    if (!pathname) return 'inicio';
    const normalized = pathname === '/' ? '/' : pathname.replace(/\/+$/, '') || '/';
    return ROUTE_TO_FEATURE[normalized] || 'not_found';
}

/**
 * Crea un tracker de tiempo activo sin duplicación entre `visibilitychange`, cambio de ruta y `pagehide`.
 *
 * @param {{
 *   onFlush: (payload: { route: string, feature: string, activeSeconds: number }) => void,
 *   idleTimeoutMs?: number,
 *   minSeconds?: number,
 *   maxSeconds?: number,
 *   now?: () => number,
 *   initialVisible?: boolean,
 * }} options
 */
export function createActiveTimeTracker({
    onFlush,
    idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
    minSeconds = DEFAULT_MIN_ACTIVE_SECONDS,
    maxSeconds = DEFAULT_MAX_ACTIVE_SECONDS,
    now = () => Date.now(),
    initialVisible = true,
}) {
    /** @type {string | null} */
    let currentRoute = null;
    /** @type {number | null} */
    let activeSinceMs = null;
    let accumulatedMs = 0;
    let lastInteractionMs = now();
    let isVisible = Boolean(initialVisible);

    function collectPendingElapsedMs(currentNow) {
        if (activeSinceMs === null || !isVisible) return 0;
        const activeDeadline = lastInteractionMs + idleTimeoutMs;
        const effectiveEnd = Math.min(currentNow, activeDeadline);
        return Math.max(0, effectiveEnd - activeSinceMs);
    }

    function flush() {
        if (!currentRoute) {
            accumulatedMs = 0;
            activeSinceMs = null;
            return;
        }
        const currentNow = now();
        const totalMs = accumulatedMs + collectPendingElapsedMs(currentNow);
        // Reset inmediato antes de emitir para evitar doble flush entre visibilitychange/pagehide/unmount
        accumulatedMs = 0;
        activeSinceMs = null;

        const activeSeconds = Math.min(maxSeconds, Math.round(totalMs / 1000));
        if (activeSeconds >= minSeconds) {
            onFlush({
                route: currentRoute,
                feature: getFeatureNameForRoute(currentRoute),
                activeSeconds,
            });
        }
    }

    /**
     * @param {string} route
     */
    function startRoute(route) {
        if (currentRoute && currentRoute !== route) {
            flush();
        } else if (currentRoute === route) {
            return;
        }
        const currentNow = now();
        currentRoute = route;
        accumulatedMs = 0;
        lastInteractionMs = currentNow;
        activeSinceMs = isVisible ? currentNow : null;
    }

    function recordInteraction() {
        if (!currentRoute || !isVisible) return;
        const currentNow = now();
        accumulatedMs += collectPendingElapsedMs(currentNow);
        lastInteractionMs = currentNow;
        activeSinceMs = currentNow;
    }

    /**
     * @param {boolean} visible
     */
    function setVisible(visible) {
        const nextVisible = Boolean(visible);
        if (nextVisible === isVisible) return;
        const currentNow = now();

        if (!nextVisible) {
            flush();
            isVisible = false;
        } else {
            isVisible = true;
            lastInteractionMs = currentNow;
            activeSinceMs = currentRoute ? currentNow : null;
        }
    }

    return {
        startRoute,
        recordInteraction,
        setVisible,
        flush,
    };
}
