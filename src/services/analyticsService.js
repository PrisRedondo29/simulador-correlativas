/**
 * @fileoverview Servicio centralizado de Firebase Analytics.
 *
 * Todos los trackeos pasan por este módulo. Los componentes no importan
 * `logEvent` directamente para que sea fácil mockear en tests o cambiar
 * el proveedor de analytics en el futuro.
 *
 * Convención de nombres de eventos: snake_case, máx 40 caracteres (límite GA4).
 */

import { analytics, app } from './firebase';
import {
    getTrafficAttributionParams,
    isAnalyticsHostAllowed,
} from '../utils/analyticsAttribution';

if (import.meta.env.DEV) console.log('[Analytics] Módulo cargado correctamente');

/**
 * @returns {boolean}
 */
const isCurrentHostAuthorized = () =>
    isAnalyticsHostAllowed(typeof window !== 'undefined' ? window.location?.hostname : undefined);

/**
 * Función auxiliar para obtener analytics de forma segura.
 * @returns {Promise<import('firebase/analytics').Analytics | null>}
 */
const getAnalyticsInstance = async () => {
    if (!isCurrentHostAuthorized()) return null;
    if (analytics) return analytics;
    if (typeof window === 'undefined') return null;

    try {
        const { getAnalytics } = await import('firebase/analytics');
        return getAnalytics(app);
    } catch {
        return null;
    }
};

/**
 * Guard: en entornos donde analytics no está disponible o el dominio no está autorizado, no falla.
 * @param {string} eventName
 * @param {Record<string, unknown>} [params]
 * @returns {Promise<void>}
 */
const track = async (eventName, params = {}) => {
    if (!isCurrentHostAuthorized()) return;
    if (import.meta.env.DEV) console.log(`[Analytics] Intentando trackear evento: ${eventName}`, params);
    try {
        const instance = await getAnalyticsInstance();
        if (!instance) {
            if (import.meta.env.DEV) console.warn(`[Analytics] No se pudo obtener la instancia para: ${eventName}. Revisa si el SDK cargó correctamente.`);
            return;
        }

        const payload = import.meta.env.DEV
            ? { ...params, debug_mode: true }
            : params;

        if (import.meta.env.DEV) {
            console.log(`[Analytics] ✅ Enviando a GA4: ${eventName}`, payload);
        }

        const { logEvent } = await import('firebase/analytics');
        logEvent(instance, eventName, payload);
    } catch (err) {
        if (import.meta.env.DEV) console.error(`[Analytics] Error en track (${eventName}):`, err);
    }
};

/**
 * Asocia los eventos de la sesión con un ID de usuario único.
 * @param {string | null} userId
 */
export const setAnalyticsUser = async (userId) => {
    try {
        if (!isCurrentHostAuthorized() || !analytics) return;
        const { setUserId } = await import('firebase/analytics');
        setUserId(analytics, userId);
    } catch {
        // Silencio
    }
};

// ─── Eventos de Autenticación ─────────────────────────────────────────────────

/**
 * Trackea un login exitoso con Google.
 * @param {{ userId: string }} params
 */
export const trackLogin = ({ userId }) => {
    setAnalyticsUser(userId);
    track('login', { method: 'google', uid: userId, ...getTrafficAttributionParams() });
};

/**
 * Trackea el cierre de sesión.
 */
export const trackLogout = () => {
    setAnalyticsUser(null);
    track('logout');
};

// ─── Eventos de Navegación ────────────────────────────────────────────────────

/**
 * Trackea una vista de página (page_view) al cambiar de ruta, adjuntando origen de tráfico y hostname.
 * @param {{ path: string, title?: string }} params
 */
export const trackPageView = ({ path, title = typeof document !== 'undefined' ? document.title : '' }) =>
    track('page_view', {
        page_path: path,
        page_title: title,
        ...getTrafficAttributionParams(),
    });

// ─── Eventos de Progreso ──────────────────────────────────────────────────────

/**
 * Trackea cuando el usuario cambia el estado de una materia en /progreso.
 * @param {{ plan: string, codigoMateria: string, estadoNuevo: string, origenMateria?: string | null }} params
 */
export const trackCambioMateria = ({ plan, codigoMateria, estadoNuevo, origenMateria = null }) =>
    track('cambio_materia', {
        plan,
        materia_codigo: codigoMateria,
        estado_materia: estadoNuevo,
        ...(origenMateria && { origen_materia: origenMateria }),
    });

/**
 * Trackea cuando el usuario avanza al siguiente semestre en el simulador.
 * @param {{ plan: string, anio: number, cuatri: string }} params
 */
export const trackAvanceSemestre = ({ plan, anio, cuatri }) =>
    track('avance_semestre', { plan, anio, cuatri });

// ─── Eventos de UI y Feedback ─────────────────────────────────────────────────

/**
 * Trackea una búsqueda de materia.
 * Útil para detectar si los usuarios buscan cosas que no existen.
 * @param {{ term: string, resultsCount: number, search_origen: string }} params
 */
export const trackSearch = ({ term, resultsCount, search_origen }) => {
    if (!term || term.length < 3) return;
    track('search_materia', {
        search_term: term.toLowerCase(),
        result_count: resultsCount,
        search_origen,
    });
};

/**
 * Trackea la interacción con el tutorial.
 * @param {{ action: 'start' | 'step_view' | 'complete' | 'skip', stepIndex?: number, stepTitle?: string }} params
 */
export const trackTutorial = ({ action, stepIndex, stepTitle }) =>
    track('tutorial_progreso', {
        action,
        step_index: stepIndex,
        step_title: stepTitle,
    });

/**
 * Trackea un error capturado por la app en GA4.
 * @param {{ code: string, message: string, fatal?: boolean }} params
 */
export const trackErrorGA = ({ code, message, fatal = false }) =>
    track('exception', {
        description: `${code}: ${message}`,
        fatal,
    });

/**
 * Trackea cuando el usuario cambia el tema visual.
 * @param {{ tema: string }} params
 */
export const trackCambioTema = ({ tema }) =>
    track('cambio_tema', { ui_tema: tema });

/**
 * Trackea la descarga del PDF del historial.
 * @param {{ plan: string }} params
 */
export const trackDescargaPDF = ({ plan }) =>
    track('descarga_pdf', { plan });

// ─── Nuevos Eventos Estratégicos (Insights Académicos) ────────────────────────

/**
 * Trackea cuando el usuario elige o cambia de plan o carrera.
 * @param {{ plan: string, origen_plan: 'settings' | 'settings_career' | 'welcome_modal' | 'saweb_import_onboarding', carrera?: string }} params
 */
export const trackSeleccionCarrera = ({ plan, origen_plan, carrera = 'Licenciatura en Sistemas de Información' }) =>
    track('seleccion_carrera', {
        plan,
        origen_plan,
        carrera,
        ...getTrafficAttributionParams(),
    });

/**
 * Trackea la finalización del onboarding inicial (carga manual o Analítico SAWeb).
 * @param {{ plan: string, method: 'manual' | 'saweb_pdf', totalMarked: number, carrera?: string }} params
 */
export const trackOnboardingComplete = ({
    plan,
    method,
    totalMarked,
    carrera = 'Licenciatura en Sistemas de Información',
}) =>
    track('onboarding_complete', {
        plan,
        method,
        total_marked: totalMarked,
        carrera,
        ...getTrafficAttributionParams(),
    });

/**
 * Trackea el estado inicial del usuario al guardar por primera vez.
 * @param {{ plan: string, aprobadas: number, total: number }} params
 */
export const trackProgresoInicial = ({ plan, aprobadas, total }) =>
    track('progreso_inicial', {
        plan,
        cant_aprobadas: aprobadas,
        porcentaje_inicial: total > 0 ? Math.round((aprobadas / total) * 100) : 0,
    });

/**
 * Trackea clics en materias bloqueadas para identificar trabas.
 * @param {{ plan: string, materia_codigo: string, materia_nombre: string, impacto?: number }} params
 */
export const trackFriccionCorrelativa = ({ plan, materia_codigo, materia_nombre, impacto = 0 }) =>
    track('friccion_correlativa', { plan, materia_codigo, materia_nombre, materias_bloqueadas: impacto });

/**
 * Trackea cuando un alumno pasa de un estado avanzado a uno inicial (recursada).
 * @param {{ plan: string, materia_codigo: string, materia_nombre?: string, estado_anterior: string }} params
 */
export const trackRecursada = ({ plan, materia_codigo, materia_nombre, estado_anterior }) =>
    track('recursada_materia', { plan, materia_codigo, materia_nombre, estado_anterior });

/**
 * Trackea la cantidad de semestres proyectados para recibirse al terminar una simulación.
 * @param {{ plan: string, semestres_totales: number, anio_proyeccion: number }} params
 */
export const trackProyeccionEgreso = ({ plan, semestres_totales, anio_proyeccion }) =>
    track('proyeccion_egreso', { plan, cuatrimestres_totales: semestres_totales, anio_proyeccion });

/**
 * Trackea la intención de cursada de materias futuras.
 * @param {{ plan: string, materias: string[], periodo: string }} params
 */
export const trackIntencionCursada = ({ plan, materias, periodo }) =>
    track('intencion_planificacion', {
        plan,
        cant_materias: materias.length,
        periodo,
        materias_codigos: materias.join(','),
    });

/**
 * Trackea una alerta de posible deserción o estancamiento crítico.
 * @param {{ plan: string, semestres_proyectados: number, exceso_porcentaje: number }} params
 */
export const trackAlertaDesercion = ({ plan, semestres_proyectados, exceso_porcentaje }) =>
    track('alerta_estancamiento_critico', { plan, semestres_proyectados, exceso_porcentaje });

/**
 * Trackea cuando el usuario cambia entre vista de lista/cuadrícula (Progreso) o grafo/lista (Simulador).
 * @param {{ tipo: 'tipo_progreso' | 'tipo_simulacion', valor: string }} params
 */
export const trackCambioVista = ({ tipo, valor }) =>
    track('cambio_vista', { [tipo]: valor });

/**
 * Trackea una importación exitosa desde SAWeb (solo conteos agregados, sin PII).
 * @param {{ plan: string, detectedPlan?: string | null, totalImported: number, usedAnalitico: boolean, usedCursadas: boolean }} params
 */
export const trackImportarSaweb = ({
    plan,
    detectedPlan = null,
    totalImported,
    usedAnalitico,
    usedCursadas,
}) =>
    track('importar_saweb', {
        plan,
        ...(detectedPlan && { plan_detectado: detectedPlan }),
        materias_importadas: totalImported,
        incluye_analitico: usedAnalitico,
        incluye_cursadas: usedCursadas,
    });
