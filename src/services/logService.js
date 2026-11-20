/**
 * @fileoverview Servicio de telemetría de errores propietario con control de entorno,
 * throttling, sanitización de PII y persistencia opcional en Firestore (`app_logs`)
 * para errores críticos capturados en producción (consumibles desde el Panel Admin).
 *
 * Contratos de seguridad:
 *  - NUNCA lanza excepciones (fire-and-forget garantizado).
 *  - En DEV: imprime por consola de desarrollo.
 *  - En PROD / incidentes críticos (`persistToDatabase: true`): reporta a GA4 (`trackErrorGA`)
 *    y guarda un registro estructurado y sanitizado en `app_logs` (validado por `firestore.rules`).
 *  - Throttling: máx. 5 reportes por ventana de 60 s (evita inundación por bucles).
 *  - PII: elimina emails, teléfonos, tokens y campos sensibles del contexto y mensaje.
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { trackErrorGA } from './analyticsService';
import storageRepository from './storageRepository';

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
 *  - Mantiene solo primitivos (string, number, boolean) y hasta 10 claves
 *  - Sanitiza strings con regex y trunca strings largos
 *
 * @param {Record<string, unknown>} ctx
 * @returns {Record<string, string | number | boolean>}
 */
export const sanitizeLogContext = (ctx) => {
    /** @type {Record<string, string | number | boolean>} */
    const clean = {};
    let keyCount = 0;

    for (const [key, value] of Object.entries(ctx || {})) {
        if (keyCount >= 10) break;
        if (PII_FIELDS.has(key)) continue;
        if (typeof value === 'string') {
            clean[key] = sanitizeLogString(value).slice(0, 200);
            keyCount++;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            clean[key] = value;
            keyCount++;
        }
    }

    return clean;
};

/**
 * Sanitiza y recorta el componentStack de React para cumplir con el límite de Firestore (<= 1000 chars).
 * @param {string | null | undefined} stack
 * @returns {string | null}
 */
export const sanitizeComponentStack = (stack) => {
    if (!stack || typeof stack !== 'string') return null;
    const cleaned = sanitizeLogString(stack).trim().slice(0, 950);
    return cleaned.length > 0 ? cleaned : null;
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
 * Persiste de forma asíncrona y segura (fire-and-forget) un registro de error en `app_logs`
 * cumpliendo estrictamente el contrato validado por `firestore.rules`.
 *
 * @param {{
 *   level: 'error' | 'warning',
 *   errorCode: string,
 *   errorMessage: string,
 *   route: string,
 *   componentStack?: string | null,
 *   planActivo?: string | null,
 *   uid?: string | null,
 *   context?: Record<string, string | number | boolean>,
 * }} payload
 * @param {{
 *   addDocFn?: typeof addDoc,
 *   collectionFn?: typeof collection,
 *   serverTimestampFn?: typeof serverTimestamp,
 *   firestoreDb?: typeof db,
 * }} [deps]
 * @returns {Promise<boolean>}
 */
export const persistAppLogToFirestore = async (payload, deps = {}) => {
    const {
        addDocFn = addDoc,
        collectionFn = collection,
        serverTimestampFn = serverTimestamp,
        firestoreDb = db,
    } = deps;

    if (!firestoreDb) return false;

    try {
        const safeCode = String(payload.errorCode || 'unknown').trim().slice(0, 100) || 'unknown';
        const safeMessage = sanitizeMessage(payload.errorMessage || 'Sin detalle') || 'Sin detalle';
        const safeRoute = String(payload.route || '/').trim().slice(0, 200) || '/';
        const safePlan =
            typeof payload.planActivo === 'string' && payload.planActivo.trim()
                ? payload.planActivo.trim().slice(0, 20)
                : null;
        const safeStack = sanitizeComponentStack(payload.componentStack);
        const safeUid =
            typeof payload.uid === 'string' && payload.uid.trim() ? payload.uid.trim() : null;

        const docData = {
            level: payload.level === LOG_LEVEL.WARNING ? LOG_LEVEL.WARNING : LOG_LEVEL.ERROR,
            errorCode: safeCode,
            errorMessage: safeMessage,
            route: safeRoute,
            componentStack: safeStack,
            planActivo: safePlan,
            uid: safeUid,
            context: payload.context || {},
            createdAt: serverTimestampFn(),
        };

        await addDocFn(collectionFn(firestoreDb, 'app_logs'), docData);
        return true;
    } catch {
        // Silencio garantizado: un fallo de red o reglas nunca debe interrumpir la aplicación.
        return false;
    }
};

/**
 * Registra un evento de telemetría de error o advertencia en GA4 (consola en DEV)
 * y opcionalmente lo persiste en Firestore (`app_logs`) para el Panel Admin.
 * Fire-and-forget garantizado: nunca lanza excepciones.
 *
 * @param {{
 *   level?:             LogLevel,
 *   errorCode?:         string,
 *   errorMessage?:      string,
 *   route?:             string,
 *   userId?:            string | null,
 *   componentStack?:    string | null,
 *   persistToDatabase?: boolean,
 *   context?:           Record<string, unknown>,
 *   firestoreDeps?:     Parameters<typeof persistAppLogToFirestore>[1],
 * }} params
 * @returns {void}
 */
export const writeLog = ({
    level = LOG_LEVEL.ERROR,
    errorCode = 'unknown',
    errorMessage = 'Sin detalle',
    route = typeof window !== 'undefined' ? (window.location?.pathname ?? '/') : '/',
    userId,
    componentStack = null,
    persistToDatabase = false,
    context = {},
    firestoreDeps,
}) => {
    if (!canLog()) return;

    const cleanMessage = sanitizeMessage(errorMessage) || 'Sin detalle';
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

        if (persistToDatabase) {
            const currentUid =
                userId !== undefined ? userId : (auth?.currentUser?.uid ?? null);
            const currentPlan = storageRepository.getPlanActivo();
            void persistAppLogToFirestore(
                {
                    level: level === LOG_LEVEL.WARNING ? LOG_LEVEL.WARNING : LOG_LEVEL.ERROR,
                    errorCode,
                    errorMessage: cleanMessage,
                    route,
                    componentStack,
                    planActivo: currentPlan,
                    uid: currentUid,
                    context: cleanContext,
                },
                firestoreDeps,
            );
        }
    }

    if (IS_DEV) {
        devLog(level, errorCode, cleanMessage, cleanContext);
    }
};

/**
 * Shorthand para loguear errores desde bloques `catch` o `ErrorBoundary`.
 * Extrae solo `code` y `message` del error — nunca el objeto completo.
 *
 * @param {unknown} err
 * @param {{
 *   route?: string,
 *   userId?: string | null,
 *   errorCode?: string,
 *   componentStack?: string | null,
 *   persistToDatabase?: boolean,
 *   context?: Record<string, unknown>,
 *   firestoreDeps?: Parameters<typeof persistAppLogToFirestore>[1],
 * }} [opts]
 * @returns {void}
 */
export const logError = (err, opts = {}) => {
    const { code, message } = extractErrorInfo(err);
    const { errorCode: overrideCode, ...restOpts } = opts;
    writeLog({
        level: LOG_LEVEL.ERROR,
        errorCode: overrideCode || code,
        errorMessage: message,
        ...restOpts,
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
