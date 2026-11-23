/**
 * Utilidades puras de atribución de tráfico y control multi-dominio para GA4.
 * Sin dependencias de Firebase para evitar ciclos de importación entre `firebase.js` y `analyticsService.js`.
 */

export const DEFAULT_ALLOWED_ANALYTICS_HOSTS = Object.freeze(['mi-avance-academico.vercel.app']);
export const ATTRIBUTION_STORAGE_KEY = 'unlu_traffic_attribution:v1';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const MAX_PARAM_LENGTH = 100;

/**
 * @typedef {{
 *   app_hostname?: string,
 *   referrer_host?: string,
 *   utm_source?: string,
 *   utm_medium?: string,
 *   utm_campaign?: string,
 *   utm_content?: string,
 *   utm_term?: string,
 * }} TrafficAttribution
 */

/**
 * Parsea una lista separada por comas de hostnames permitidos para GA4.
 * @param {string | null | undefined} rawEnv
 * @returns {string[]}
 */
export function parseAllowedAnalyticsHosts(rawEnv) {
    if (typeof rawEnv !== 'string' || !rawEnv.trim()) {
        return [...DEFAULT_ALLOWED_ANALYTICS_HOSTS];
    }
    const parsed = rawEnv
        .split(',')
        .map((host) => host.trim().toLowerCase())
        .filter(Boolean);
    return parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_ANALYTICS_HOSTS];
}

/**
 * Verifica si el hostname actual está autorizado para enviar métricas de Analytics.
 * Bloquea estrictamente entornos de test (`VITEST` / `MODE === 'test'`).
 *
 * @param {string | null | undefined} hostname
 * @param {{ isDev?: boolean, isTestEnv?: boolean, allowedHostsEnv?: string | null | undefined }} [options]
 * @returns {boolean}
 */
export function isAnalyticsHostAllowed(hostname, options = {}) {
    const isTestEnv =
        options.isTestEnv !== undefined
            ? options.isTestEnv
            : import.meta.env.MODE === 'test' || Boolean(import.meta.env.VITEST);
    if (isTestEnv) return false;

    const isDev = options.isDev !== undefined ? options.isDev : import.meta.env.DEV === true;
    if (isDev) return true;

    const normalizedHost = String(hostname || '').trim().toLowerCase();
    if (!normalizedHost) return false;

    const allowedHosts = parseAllowedAnalyticsHosts(
        options.allowedHostsEnv !== undefined
            ? options.allowedHostsEnv
            : import.meta.env.VITE_ANALYTICS_ALLOWED_HOSTS,
    );
    return allowedHosts.includes(normalizedHost);
}

/**
 * Sanitiza una URL conservando origen, pathname y únicamente parámetros UTM permitidos.
 * Elimina tokens, fragmentos hash u otros query params potencialmente sensibles.
 *
 * @param {string | null | undefined} rawUrl
 * @returns {string | null}
 */
export function sanitizeAnalyticsUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    try {
        const parsed = new URL(rawUrl, 'https://mi-avance-academico.vercel.app');
        const safeParams = new URLSearchParams();
        for (const key of UTM_KEYS) {
            const val = parsed.searchParams.get(key);
            if (typeof val === 'string' && val.trim()) {
                safeParams.set(key, val.trim().slice(0, MAX_PARAM_LENGTH));
            }
        }
        const query = safeParams.toString();
        return `${parsed.origin}${parsed.pathname}${query ? `?${query}` : ''}`;
    } catch {
        return null;
    }
}

/**
 * Extrae el hostname externo de `document.referrer`, ignorando referencias vacías, inválidas o del mismo dominio.
 * @param {string | null | undefined} referrer
 * @param {string | null | undefined} [currentHostname]
 * @returns {string | null}
 */
export function extractReferrerHost(referrer, currentHostname = '') {
    if (!referrer || typeof referrer !== 'string') return null;
    try {
        const parsed = new URL(referrer);
        const refHost = parsed.hostname.trim().toLowerCase();
        const ownHost = String(currentHostname || '').trim().toLowerCase();
        if (!refHost || (ownHost && refHost === ownHost)) return null;
        return refHost.slice(0, MAX_PARAM_LENGTH);
    } catch {
        return null;
    }
}

/**
 * @param {string} search
 * @returns {Partial<TrafficAttribution>}
 */
function parseUtmParams(search) {
    /** @type {Partial<TrafficAttribution>} */
    const found = {};
    if (!search || typeof search !== 'string') return found;
    const params = new URLSearchParams(search);
    for (const key of UTM_KEYS) {
        const raw = params.get(key);
        if (typeof raw === 'string' && raw.trim()) {
            found[key] = raw.trim().slice(0, MAX_PARAM_LENGTH);
        }
    }
    return found;
}

/**
 * @param {Storage | null | undefined} storage
 * @returns {TrafficAttribution | null}
 */
function readStoredAttribution(storage) {
    if (!storage) return null;
    try {
        const raw = storage.getItem(ATTRIBUTION_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * @param {Storage | null | undefined} storage
 * @param {TrafficAttribution} data
 */
function writeStoredAttribution(storage, data) {
    if (!storage) return;
    try {
        storage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(data));
    } catch {
        // Ignorar errores de cuota o sessionStorage bloqueado
    }
}

/**
 * Captura y persiste los parámetros UTM y el referrer externo en `sessionStorage` para no perderlos
 * al navegar entre rutas internas de la SPA.
 *
 * @param {{
 *   search?: string,
 *   referrer?: string,
 *   hostname?: string,
 *   storage?: Storage | null,
 * }} [options]
 * @returns {TrafficAttribution}
 */
export function captureTrafficAttribution(options = {}) {
    const hasWindow = typeof window !== 'undefined';
    const search =
        options.search !== undefined
            ? options.search
            : hasWindow
              ? window.location?.search ?? ''
              : '';
    const referrer =
        options.referrer !== undefined
            ? options.referrer
            : typeof document !== 'undefined'
              ? document.referrer ?? ''
              : '';
    const rawHost =
        options.hostname !== undefined
            ? options.hostname
            : hasWindow
              ? window.location?.hostname ?? ''
              : '';
    const appHostname = String(rawHost || '').trim().toLowerCase().slice(0, MAX_PARAM_LENGTH);

    /** @type {Storage | null} */
    let storage = options.storage !== undefined ? options.storage : null;
    if (options.storage === undefined && hasWindow) {
        try {
            storage = window.sessionStorage ?? null;
        } catch {
            storage = null;
        }
    }

    const utmParams = parseUtmParams(search);
    const hasUtms = Object.keys(utmParams).length > 0;
    const referrerHost = extractReferrerHost(referrer, appHostname);
    const existing = readStoredAttribution(storage);

    /** @type {TrafficAttribution} */
    let resolved;
    if (hasUtms) {
        resolved = {
            ...(appHostname ? { app_hostname: appHostname } : {}),
            ...(referrerHost
                ? { referrer_host: referrerHost }
                : existing?.referrer_host
                  ? { referrer_host: existing.referrer_host }
                  : {}),
            ...utmParams,
        };
        writeStoredAttribution(storage, resolved);
    } else if (existing) {
        resolved = {
            ...existing,
            ...(appHostname ? { app_hostname: appHostname } : {}),
        };
    } else {
        resolved = {
            ...(appHostname ? { app_hostname: appHostname } : {}),
            ...(referrerHost ? { referrer_host: referrerHost } : {}),
        };
        writeStoredAttribution(storage, resolved);
    }

    return resolved;
}

/**
 * Devuelve un objeto compacto con los parámetros de origen y hostname listos para enviar en eventos GA4.
 * @param {Parameters<typeof captureTrafficAttribution>[0]} [options]
 * @returns {Record<string, string>}
 */
export function getTrafficAttributionParams(options = {}) {
    const attribution = captureTrafficAttribution(options);
    /** @type {Record<string, string>} */
    const compact = {};
    for (const [key, val] of Object.entries(attribution)) {
        if (typeof val === 'string' && val.trim()) {
            compact[key] = val.trim();
        }
    }
    return compact;
}
