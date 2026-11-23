/**
 * analyticsService.js
 * Fachada centralizada para Product Analytics 2.0 (PostHog Cloud EU).
 * Ningún componente debe importar `posthog-js` directamente.
 *
 * Garantías:
 *  - Opt-in explícito (`unlu_analytics_consent:v1`): cero captura e cero persistencia antes de aceptar.
 *  - Exclusión estricta de Vitest / `MODE === 'test'` y hosts no autorizados.
 *  - Autocapture, Session Replay, Heatmaps y Web Vitals previos desactivados.
 *  - Zero-PII: sanitización de propiedades, URLs y parámetros UTM.
 *  - Resiliencia total: si PostHog falla o es bloqueado, la app continúa intacta.
 */

import storageRepository from './storageRepository';
import {
    getTrafficAttributionParams,
    isAnalyticsHostAllowed,
    sanitizeAnalyticsUrl,
} from '../utils/analyticsAttribution';

export const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com';

const MAX_PROP_STRING_LENGTH = 100;
const FORBIDDEN_PII_KEYS = new Set([
    'uid',
    'email',
    'correo',
    'dni',
    'legajo',
    'nombre',
    'apellido',
    'displayname',
    'nota',
    'notas',
    'calificacion',
    'password',
    'search_term',
    'materias_codigos',
    'raw_text',
    'file_name',
]);

/** @type {any} */
let posthogClient = null;
/** @type {Promise<any> | null} */
let posthogInitPromise = null;
/** @type {string | null} */
let currentAuthUid = null;
/** @type {string | null} */
let lastIdentifiedUid = null;
/** @type {string | null} */
let currentRoutePath = null;
/** @type {string | null} */
let currentRouteTitle = null;
/** @type {string | null} */
let lastPageviewPath = null;
/** @type {boolean} */
let firstValueEmittedInSession = false;

/** @type {{ loadPostHog?: () => Promise<any>, getEnv?: () => Record<string, any> } | null} */
let testOverrides = null;

/**
 * Permite inyectar dependencias en tests unitarios sin depender de red ni SDK real.
 * @param {{ loadPostHog?: () => Promise<any>, getEnv?: () => Record<string, any> } | null} overrides
 */
export function __setAnalyticsTestOverrides(overrides) {
    testOverrides = overrides;
}

/**
 * Reinicia el estado en memoria de la fachada (solo para tests unitarios).
 */
export function __resetAnalyticsStateForTests() {
    posthogClient = null;
    posthogInitPromise = null;
    currentAuthUid = null;
    lastIdentifiedUid = null;
    currentRoutePath = null;
    currentRouteTitle = null;
    lastPageviewPath = null;
    firstValueEmittedInSession = false;
}

function getEnvValues() {
    if (testOverrides?.getEnv) {
        return testOverrides.getEnv();
    }
    return {
        posthogKey: import.meta.env.VITE_POSTHOG_KEY || '',
        posthogHost: import.meta.env.VITE_POSTHOG_HOST || DEFAULT_POSTHOG_HOST,
        isTestEnv: import.meta.env.MODE === 'test' || Boolean(import.meta.env.VITEST),
        isDev: import.meta.env.DEV === true,
        allowedHostsEnv: import.meta.env.VITE_ANALYTICS_ALLOWED_HOSTS,
    };
}

function canRunAnalytics() {
    if (typeof window === 'undefined') return false;
    if (storageRepository.getAnalyticsConsent() !== 'accepted') return false;

    const env = getEnvValues();
    if (!env.posthogKey) return false;

    return isAnalyticsHostAllowed(window.location?.hostname, {
        isTestEnv: env.isTestEnv,
        isDev: env.isDev,
        allowedHostsEnv: env.allowedHostsEnv,
    });
}

/**
 * Sanitiza propiedades de eventos y propiedades automáticas de PostHog para impedir filtración de PII.
 * @param {Record<string, any>} props
 * @returns {Record<string, any>}
 */
export function sanitizeEventProperties(props = {}) {
    if (!props || typeof props !== 'object') return {};
    /** @type {Record<string, any>} */
    const clean = {};

    for (const [key, value] of Object.entries(props)) {
        if (value === undefined) continue;
        if (FORBIDDEN_PII_KEYS.has(key.toLowerCase())) continue;

        if (key === '$current_url' || key === '$referrer' || key === 'referrer_url') {
            const safeUrl = sanitizeAnalyticsUrl(typeof value === 'string' ? value : null);
            if (safeUrl) clean[key] = safeUrl;
            continue;
        }

        if (typeof value === 'string') {
            clean[key] = value.slice(0, MAX_PROP_STRING_LENGTH);
        } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
            clean[key] = value;
        }
    }

    return clean;
}

function clearPostHogPersistence() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        const keysToRemove = [];
        for (let i = 0; i < window.localStorage.length; i += 1) {
            const key = window.localStorage.key(i);
            if (key && key.startsWith('ph_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    } catch {
        // Ignorar errores de storage restringido
    }
    storageRepository.clearAnalyticsFirstSeen();
}

/**
 * Resuelve la antigüedad del usuario distinguiendo uso histórico previo a PostHog.
 * @returns {{ userTenure: 'new_to_app' | 'returning_pre_analytics' | 'returning_posthog' | 'unknown', isFirstAnalyticsSession: boolean, firstSeenAt: string }}
 */
function resolveAndPersistFirstSeen() {
    const existing = storageRepository.getAnalyticsFirstSeen();
    if (existing) {
        return {
            userTenure: 'returning_posthog',
            isFirstAnalyticsSession: false,
            firstSeenAt: existing.firstSeenAt,
        };
    }

    const hadHistoricalUsage = storageRepository.hasHistoricalAppUsage();
    /** @type {'new_to_app' | 'returning_pre_analytics' | 'unknown'} */
    let userTenure = 'unknown';
    if (hadHistoricalUsage === true) {
        userTenure = 'returning_pre_analytics';
    } else if (hadHistoricalUsage === false) {
        userTenure = 'new_to_app';
    }

    const nowIso = new Date().toISOString();
    storageRepository.setAnalyticsFirstSeen({
        firstSeenAt: nowIso,
        userTenure,
    });

    return {
        userTenure,
        isFirstAnalyticsSession: true,
        firstSeenAt: nowIso,
    };
}

function applyIdentityOnClient(client) {
    if (!client) return;
    try {
        if (currentAuthUid) {
            if (lastIdentifiedUid && lastIdentifiedUid !== currentAuthUid) {
                client.reset?.();
            }
            if (lastIdentifiedUid !== currentAuthUid) {
                client.identify?.(currentAuthUid, {
                    auth_state: 'authenticated',
                    has_google_account: true,
                });
                lastIdentifiedUid = currentAuthUid;
            }
        } else if (lastIdentifiedUid) {
            client.reset?.();
            lastIdentifiedUid = null;
        }
    } catch {
        // Ignorar fallos del proveedor
    }
}

async function ensurePostHogInitialized() {
    if (!canRunAnalytics()) return null;
    if (posthogClient) return posthogClient;
    if (posthogInitPromise) return posthogInitPromise;

    const env = getEnvValues();
    posthogInitPromise = (async () => {
        try {
            const mod = testOverrides?.loadPostHog
                ? await testOverrides.loadPostHog()
                : await import('posthog-js');
            const client = mod?.default ?? mod;
            if (!client || typeof client.init !== 'function') return null;

            client.init(env.posthogKey, {
                api_host: env.posthogHost || DEFAULT_POSTHOG_HOST,
                autocapture: false,
                disable_session_recording: true,
                enable_heatmaps: false,
                capture_pageview: false,
                capture_pageleave: false,
                capture_dead_clicks: false,
                capture_performance: false,
                persistence: 'localStorage',
                person_profiles: 'identified_only',
                sanitize_properties: (props) => sanitizeEventProperties(props),
            });

            if (storageRepository.getAnalyticsConsent() !== 'accepted') {
                client.opt_out_capturing?.();
                client.reset?.();
                return null;
            }

            posthogClient = client;

            const { userTenure, isFirstAnalyticsSession } = resolveAndPersistFirstSeen();
            client.register?.({
                user_tenure: userTenure,
                auth_state: currentAuthUid ? 'authenticated' : 'anonymous',
            });

            applyIdentityOnClient(client);

            if (isFirstAnalyticsSession) {
                client.capture?.(
                    'first_visit_recorded',
                    sanitizeEventProperties({
                        user_tenure: userTenure,
                        ...getTrafficAttributionParams(),
                    }),
                );
            }

            return client;
        } catch {
            return null;
        } finally {
            posthogInitPromise = null;
        }
    })();

    return posthogInitPromise;
}

/**
 * Devuelve la preferencia de consentimiento vigente.
 * @returns {'pending' | 'accepted' | 'rejected'}
 */
export function getAnalyticsConsent() {
    return storageRepository.getAnalyticsConsent();
}

/**
 * Actualiza el consentimiento de analítica (opt-in explícito).
 * Independiente de `posthog.reset()`.
 *
 * @param {'accepted' | 'rejected'} status
 * @returns {Promise<void>}
 */
export async function setAnalyticsConsent(status) {
    if (status !== 'accepted' && status !== 'rejected') return;
    storageRepository.setAnalyticsConsent(status);

    if (status === 'rejected') {
        try {
            if (posthogClient) {
                posthogClient.opt_out_capturing?.();
                posthogClient.reset?.();
            }
        } catch {
            // Ignorar fallos de opt-out
        } finally {
            posthogClient = null;
            lastIdentifiedUid = null;
            lastPageviewPath = null;
            clearPostHogPersistence();
        }
        return;
    }

    const client = await ensurePostHogInitialized();
    if (client && currentRoutePath && lastPageviewPath !== currentRoutePath) {
        emitPageview(client, currentRoutePath, currentRouteTitle || '');
    }
}

/**
 * Reconcilia el estado de sesión de Firebase Auth con PostHog.
 * Funciona tanto si Auth se restaura antes de inicializar PostHog como después.
 *
 * @param {string | null | undefined} uid
 */
export function syncAnalyticsAuthUser(uid) {
    currentAuthUid = uid || null;
    if (!posthogClient || storageRepository.getAnalyticsConsent() !== 'accepted') {
        return;
    }
    posthogClient.register?.({
        auth_state: currentAuthUid ? 'authenticated' : 'anonymous',
    });
    applyIdentityOnClient(posthogClient);
}

function emitPageview(client, path, title) {
    if (!client || !path) return;
    if (lastPageviewPath === path) return;
    lastPageviewPath = path;

    const attribution = getTrafficAttributionParams();
    client.capture?.(
        '$pageview',
        sanitizeEventProperties({
            page_path: path,
            page_title: title,
            $current_url:
                typeof window !== 'undefined' && window.location?.href
                    ? sanitizeAnalyticsUrl(window.location.href)
                    : path,
            ...attribution,
        }),
    );
}

/**
 * Emite un evento deliberado en PostHog respetando consentimiento y Zero-PII.
 * @param {string} eventName
 * @param {Record<string, any>} [params]
 */
export const track = async (eventName, params = {}) => {
    try {
        if (!canRunAnalytics()) return;
        const client = await ensurePostHogInitialized();
        if (!client) return;

        client.capture?.(eventName, sanitizeEventProperties(params));
    } catch {
        // Silencioso si el navegador o ad-blocker bloquea el envío
    }
};

/**
 * Registra vista de página controlada desde React Router sin duplicados.
 * @param {{ path: string, title?: string }} params
 */
export const trackPageView = async ({ path, title = '' }) => {
    currentRoutePath = path;
    currentRouteTitle = title;
    try {
        if (!canRunAnalytics()) return;
        const client = await ensurePostHogInitialized();
        if (!client) return;
        emitPageview(client, path, title);
    } catch {
        // Silencioso
    }
};

/**
 * Registra la primera acción útil del usuario una única vez por navegador/sesión.
 * @param {string} actionName
 */
export const trackFirstUsefulAction = async (actionName) => {
    if (firstValueEmittedInSession) return;
    if (!canRunAnalytics()) return;
    const firstSeen = storageRepository.getAnalyticsFirstSeen();
    if (firstSeen?.firstActionAt) {
        firstValueEmittedInSession = true;
        return;
    }

    firstValueEmittedInSession = true;
    let elapsedSec = 0;
    if (firstSeen?.firstSeenAt) {
        const diffMs = Date.now() - Date.parse(firstSeen.firstSeenAt);
        if (Number.isFinite(diffMs) && diffMs >= 0) {
            elapsedSec = Math.round(diffMs / 1000);
        }
        storageRepository.setAnalyticsFirstSeen({
            ...firstSeen,
            firstActionAt: new Date().toISOString(),
        });
    }
    await track('first_action_completed', {
        action_name: actionName,
        time_to_first_action_sec: elapsedSec,
    });
};

// ─── Helpers del contrato de eventos ─────────────────────────────────────────

export const trackLogin = ({ userId }) => {
    syncAnalyticsAuthUser(userId);
    return track('auth_session_changed', { action: 'login' });
};

export const trackLogout = () => {
    syncAnalyticsAuthUser(null);
    return track('auth_session_changed', { action: 'logout' });
};

export const trackAccountDeleted = () => {
    syncAnalyticsAuthUser(null);
    return track('auth_session_changed', { action: 'account_deleted' });
};

export const trackCambioMateria = ({ plan, estadoNuevo }) =>
    track('subject_progress_updated', {
        plan,
        action_type: 'manual_toggle',
        state_bucket: estadoNuevo,
    });

export const trackAvanceSemestre = ({ plan, anio, cuatri }) =>
    track('simulator_progressed', { plan, anio, cuatri });

export const trackTutorial = ({ action, stepIndex, stepTitle }) =>
    track('tutorial_interaction', {
        action,
        step_index: stepIndex,
        step_title: stepTitle,
    });

export const trackErrorGA = ({ code, message, fatal = false, route = null, scope = null }) =>
    track('app_error_reported', {
        code: String(code || 'unknown').slice(0, 60),
        fatal: Boolean(fatal),
        ...(route ? { route } : {}),
        ...(scope ? { scope } : {}),
        ...(message && !code ? { summary: String(message).slice(0, 60) } : {}),
    });

export const trackCambioTema = ({ tema }) =>
    track('theme_changed', { tema });

export const trackDescargaPDF = ({ plan, pdfType = 'planilla_progreso', includeProgress = false }) =>
    track('pdf_exported', {
        plan,
        pdf_type: pdfType,
        include_progress: Boolean(includeProgress),
    });

export const trackSeleccionCarrera = ({ plan, origen_plan, carrera = '' }) =>
    track('career_plan_selected', {
        plan,
        origin: origen_plan,
        ...(carrera ? { career: carrera } : {}),
    });

export const trackOnboardingComplete = ({ plan, method, totalMarked, carrera = '' }) => {
    trackFirstUsefulAction('onboarding_completed');
    return track('onboarding_completed', {
        plan,
        method,
        marked_count: totalMarked,
        ...(carrera ? { career: carrera } : {}),
    });
};

export const trackOnboardingStarted = ({ version }) =>
    track('onboarding_started', { version });

export const trackProgresoInicial = () => Promise.resolve();

export const trackRecursada = ({ plan }) =>
    track('subject_progress_updated', {
        plan,
        action_type: 'retake_marked',
    });

export const trackProyeccionEgreso = ({ plan, semestres_totales, anio_proyeccion, isTransition = false }) => {
    trackFirstUsefulAction('simulator_completed');
    return track('simulator_completed', {
        plan,
        semesters_total: semestres_totales,
        projected_year: anio_proyeccion,
        is_transition: Boolean(isTransition),
    });
};

export const trackIntencionCursada = () => Promise.resolve();

export const trackAlertaDesercion = ({ plan, semestres_proyectados }) =>
    track('simulator_stagnation_alert', {
        plan,
        semesters_projected: semestres_proyectados,
    });

export const trackCambioVista = ({ tipo, valor }) =>
    track('view_mode_changed', { view_group: tipo, view_value: valor });

export const trackImportarSaweb = ({
    plan,
    detectedPlan = null,
    totalImported,
    usedAnalitico,
    usedCursadas,
    origin = 'mis_materias',
}) => {
    trackFirstUsefulAction('saweb_import_completed');
    return track('saweb_import_completed', {
        plan,
        origin,
        ...(detectedPlan ? { detected_plan: detectedPlan } : {}),
        imported_count: totalImported,
        has_analitico: Boolean(usedAnalitico),
        has_cursadas: Boolean(usedCursadas),
    });
};

export const trackSawebImportFailed = ({ origin = 'mis_materias', errorCategory = 'parse_error' }) =>
    track('saweb_import_failed', {
        origin,
        error_category: errorCategory,
    });

export const trackSearch = () => Promise.resolve();

export const trackAgendaAction = ({ action, plan }) => {
    trackFirstUsefulAction('agenda_action_completed');
    return track('agenda_action_completed', { action, plan });
};

export const trackStatsViewed = ({ plan, hasGrades = false }) =>
    track('stats_viewed', { plan, has_grades: Boolean(hasGrades) });

export const trackEquivalenciasChecked = ({ planSource, planTarget }) =>
    track('equivalencias_checked', {
        plan_source: planSource,
        plan_target: planTarget,
    });

export const trackPlanTransitionEvaluated = ({ planSource, planTarget, action }) =>
    track('plan_transition_evaluated', {
        plan_source: planSource,
        plan_target: planTarget,
        action,
    });

export const trackCloudSyncResult = ({ result, resolution = null, origin = 'manual' }) =>
    track('cloud_sync_result', {
        result,
        origin,
        ...(resolution ? { resolution } : {}),
    });

export const trackPwaStatusChanged = ({ state }) =>
    track('pwa_status_changed', { state });

export const trackActiveFeatureTime = ({ route, feature, activeSeconds }) =>
    track('feature_active_time', {
        route,
        feature,
        active_seconds: activeSeconds,
    });
