/**
 * @fileoverview Servicio de telemetría de errores propietario con control de entorno,
 * throttling y sanitización de PII.
 *
 * Contratos de seguridad (Etapa 6B):
 *  - NUNCA lanza excepciones (fire-and-forget garantizado).
 *  - En DEV: imprime por consola de desarrollo.
 *  - En PROD: reporta errores y advertencias exclusivamente a Google Analytics 4 (`trackErrorGA`),
 *    sin intentar escrituras a `app_logs` en Firestore (que están bloqueadas por `firestore.rules`).
 *  - Throttling: máx. 5 reportes por ventana de 60 s (evita inundación por bucles).
 *  - PII: elimina emails, teléfonos, tokens y campos sensibles del contexto y mensaje.
 */

import { trackErrorGA } from './analyticsService';

// ─── Entorno ──────────────────────────────────────────────────────────────────
const IS_DEV = import.meta.env.DEV === true;

// ─── Niveles de log ───────────────────────────────────────────────────────────
export const LOG_LEVEL = Object.freeze({
    ERROR: /** @type {'error'} */ ('error'),
    WARNING: /** @type {'warning'} */ ('warning'),
    INFO: /** @type {'info'} */ ('info'),
});

/** @typedef {'error' | 'warning' | 'info'} LogLevel */

// ─── Throttle (máx. 5 reportes por 60 segundos) ───────────────────────────────
const THROTTLE_LIMIT = 5;
const THROTTLE_WINDOW = 60_000; // ms

const _throttle = {
    count: 0,
    windowStart: Date.now(),
};

/**
 * Resetea la ventana de throttle (utilidad para tests unitarios).
 */
export const resetLogThrottle = () => {
    _throttle.count = 0;
    _throttle.windowStart = Date.now();
};

/**
 * Devuelve true si el log puede reportarse dentro del límite de la ventana actual.
 * @returns {boolean}
 */
const canLog = () => {
    const now = Date.now();
    if (now - _throttle.windowStart >= THROTTLE_WINDOW) {
        _throttle.count = 0;
        _throttle.windowStart = now;
    }
    if (_throttle.count >= THROTTLE_LIMIT) return false;
    _throttle.count++;
    return true;
};

// ─── Sanitización de PII ──────────────────────────────────────────────────────

const PII_FIELDS = new Set([
    'email', 'phoneNumber', 'photoURL', 'displayName',
    'providerData', 'refreshToken', 'stsTokenManager',
    'accessToken', 'idToken', 'password', 'token', 'secret',
    'ip', 'ipAddress', 'creditCard', 'ssn',
]);

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const PHONE_RE = /(\+?\d[\d\s\-().]{7,}\d)/g;

/**
 * Sanitiza un string: reemplaza emails y teléfonos por placeholders.
 * @param {string} str
 * @returns {string}
 */
export const sanitizeLogString = (str) =>
    String(str)
        .replace(EMAIL_RE, '[EMAIL]')
        .replace(PHONE_RE, '[PHONE]');

/**
 * Sanitiza un objeto de contexto:
 *  - Elimina campos PII por nombre
 *  - Mantiene solo primitivos (string, number, boolean)
 *  - Sanitiza strings con regex y trunca strings largos
 *
 * @param {Record<string, unknown>} ctx
 * @returns {Record<string, string | number | boolean>}
 */
export const sanitizeLogContext = (ctx) => {
    /** @type {Record<string, string | number | boolean>} */
    const clean = {};

    for (const [key, value] of Object.entries(ctx || {})) {
        if (PII_FIELDS.has(key)) continue;
        if (typeof value === 'string') {
            clean[key] = sanitizeLogString(value).slice(0, 200);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            clean[key] = value;
        }
    }

    return clean;
};

/**
 * Sanitiza el mensaje de error: quita emails/teléfonos y trunca el stack.
 * @param {string} msg
 * @returns {string}
 */
const sanitizeMessage = (msg) =>
    sanitizeLogString(String(msg))
        .replace(/\s+at\s+.+/g, '')
        .trim()
        .slice(0, 500);

/**
 * Extrae propiedades seguras de un error `unknown`.
 * @param {unknown} err
 * @returns {{ code: string, message: string }}
 */
const extractErrorInfo = (err) => {
    if (err && typeof err === 'object') {
        const record = /** @type {{ code?: unknown, message?: unknown }} */ (err);
        return {
            code: typeof record.code === 'string' ? record.code : 'js/unhandled',
            message: typeof record.message === 'string' ? record.message : String(err),
        };
    }
    return { code: 'js/unhandled', message: String(err) };
};

// ─── Escritura interna ────────────────────────────────────────────────────────

/**
 * Imprime en consola de desarrollo con nivel correcto.
 * SOLO se ejecuta en DEV.
 * @param {LogLevel} level
 * @param {string} errorCode
 * @param {string} errorMessage
 * @param {Record<string, string | number | boolean>} context
 */
const devLog = (level, errorCode, errorMessage, context) => {
    const prefix = `[LogService:${level.toUpperCase()}] ${errorCode}`;
    if (level === LOG_LEVEL.ERROR) { console.error(prefix, errorMessage, context); return; }
    if (level === LOG_LEVEL.WARNING) { console.warn(prefix, errorMessage, context); return; }
    console.info(prefix, errorMessage, context);
};

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Registra un evento de telemetría de error o advertencia en GA4 (y consola en DEV).
 * Fire-and-forget garantizado: nunca lanza, nunca escribe en Firestore.
 *
 * @param {{
 *   level?:        LogLevel,
 *   errorCode?:    string,
 *   errorMessage?: string,
 *   route?:        string,
 *   userId?:       string | null,
 *   context?:      Record<string, unknown>,
 * }} params
 * @returns {void}
 */
export const writeLog = ({
    level = LOG_LEVEL.ERROR,
    errorCode = 'unknown',
    errorMessage = 'Sin detalle',
    route = typeof window !== 'undefined' ? (window.location?.pathname ?? '/') : '/',
    context = {},
}) => {
    if (!canLog()) return;

    const cleanMessage = sanitizeMessage(errorMessage);
    const cleanContext = sanitizeLogContext({ ...context, route });

    if (level !== LOG_LEVEL.INFO) {
        try {
            trackErrorGA({
                code: errorCode,
                message: cleanMessage,
                fatal: level === LOG_LEVEL.ERROR,
            });
        } catch {
            // Silencio garantizado: el log nunca debe romper la UX.
        }
    }

    if (IS_DEV) {
        devLog(level, errorCode, cleanMessage, cleanContext);
    }
};

/**
 * Shorthand para loguear errores desde bloques `catch`.
 * Extrae solo `code` y `message` del error — nunca el objeto completo.
 *
 * @param {unknown} err
 * @param {{ route?: string, userId?: string | null, context?: Record<string, unknown> }} [opts]
 * @returns {void}
 */
export const logError = (err, opts = {}) => {
    const { code, message } = extractErrorInfo(err);
    writeLog({
        level: LOG_LEVEL.ERROR,
        errorCode: code,
        errorMessage: message,
        ...opts,
    });
};

/**
 * Shorthand para advertencias no críticas.
 *
 * @param {string} message
 * @param {{ route?: string, userId?: string | null, context?: Record<string, unknown> }} [opts]
 * @returns {void}
 */
export const logWarning = (message, opts = {}) => {
    writeLog({
        level: LOG_LEVEL.WARNING,
        errorCode: 'app/warning',
        errorMessage: message,
        ...opts,
    });
};
