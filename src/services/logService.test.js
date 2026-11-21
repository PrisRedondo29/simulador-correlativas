import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTrackErrorGA = vi.fn();

vi.mock('./analyticsService', () => ({
    trackErrorGA: (...args) => mockTrackErrorGA(...args),
}));

import {
    LOG_LEVEL,
    logError,
    logWarning,
    persistAppLogToFirestore,
    resetLogThrottle,
    sanitizeComponentStack,
    sanitizeFirestoreLogContext,
    sanitizeLogContext,
    sanitizeLogString,
    writeLog,
} from './logService';

describe('logService - Telemetría solo GA4 con sanitización PII y throttling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetLogThrottle();
    });

    it('sanitiza emails, teléfonos y descarta campos PII del contexto', () => {
        expect(sanitizeLogString('Error para alumno@unlu.edu.ar tel +54 11 5555-4444')).toBe(
            'Error para [EMAIL] tel [PHONE]',
        );

        const clean = sanitizeLogContext({
            email: 'secreto@unlu.edu.ar',
            token: 'abc',
            displayName: 'Nombre',
            route: '/mis-materias',
            retries: 2,
            offline: true,
            nested: { ignored: true },
        });

        expect(clean).toEqual({
            route: '/mis-materias',
            retries: 2,
            offline: true,
        });
    });

    it('reporta errores y advertencias a GA4 sanitizando el mensaje y omite GA4 para nivel info', () => {
        logError({ code: 'sync/failed', message: 'Falló para user@unlu.edu.ar at file.js:12' });
        expect(mockTrackErrorGA).toHaveBeenCalledWith({
            code: 'sync/failed',
            message: 'Falló para [EMAIL]',
            fatal: true,
        });

        logWarning('Aviso con tel 11-4444-5555');
        expect(mockTrackErrorGA).toHaveBeenLastCalledWith({
            code: 'app/warning',
            message: 'Aviso con tel [PHONE]',
            fatal: false,
        });

        mockTrackErrorGA.mockClear();
        writeLog({ level: LOG_LEVEL.INFO, errorCode: 'info/test', errorMessage: 'Solo info' });
        expect(mockTrackErrorGA).not.toHaveBeenCalled();
    });

    it('aplica throttling (máx. 5 reportes por ventana) para evitar tormentas de errores', () => {
        for (let i = 0; i < 8; i++) {
            logError(new Error(`Error ${i}`));
        }
        expect(mockTrackErrorGA).toHaveBeenCalledTimes(5);
    });

    it('persiste en app_logs de Firestore con campos sanitizados cuando persistToDatabase=true', async () => {
        const mockAddDoc = vi.fn().mockResolvedValue({ id: 'log-1' });
        const mockCollection = vi.fn().mockReturnValue('app_logs_ref');
        const mockServerTimestamp = vi.fn().mockReturnValue('SERVER_TS');

        const ok = await persistAppLogToFirestore(
            {
                level: LOG_LEVEL.ERROR,
                errorCode: 'ui/error-boundary',
                errorMessage: 'Fallo para alumno@unlu.edu.ar en render at App.jsx:10',
                route: '/mis-materias',
                componentStack: 'in MateriaCard (created by alumno@unlu.edu.ar)',
                planActivo: '17.14',
                uid: null,
                context: { scope: 'page', route: '/mis-materias' },
            },
            {
                addDocFn: mockAddDoc,
                collectionFn: mockCollection,
                serverTimestampFn: mockServerTimestamp,
                firestoreDb: /** @type {any} */ ({}),
            },
        );

        expect(ok).toBe(true);
        expect(mockCollection).toHaveBeenCalledWith({}, 'app_logs');
        expect(mockAddDoc).toHaveBeenCalledWith('app_logs_ref', {
            level: 'error',
            errorCode: 'ui/error-boundary',
            errorMessage: 'Fallo para [EMAIL] en render',
            route: '/mis-materias',
            componentStack: 'in MateriaCard (created by [EMAIL])',
            planActivo: '17.14',
            uid: null,
            context: { scope: 'page', route: '/mis-materias' },
            createdAt: 'SERVER_TS',
        });

        expect(sanitizeComponentStack('in Component tel +54 11 4444-5555')).toBe(
            'in Component tel [PHONE]',
        );
    });

    it('sanitizeFirestoreLogContext filtra claves no permitidas y aplica límites de firestore.rules', () => {
        const clean = sanitizeFirestoreLogContext({
            scope: 'x'.repeat(80),
            route: '/simulador?user=test@unlu.edu.ar',
            plan: '17.14.plan-extra-largo-de-mas',
            source: 'client-boundary',
            action: 'render-crash',
            retries: 150.9,
            offline: false,
            extraNoPermitida: 'debe-descartarse',
            otroObjeto: { nested: true },
        });

        expect(clean).toEqual({
            scope: 'x'.repeat(40),
            route: '/simulador?user=[EMAIL]',
            plan: '17.14.plan-extra-lar',
            source: 'client-boundary',
            action: 'render-crash',
            retries: 100,
            offline: false,
        });

        expect(sanitizeFirestoreLogContext({ plan: null, retries: -5, offline: 'true' })).toEqual({
            plan: null,
            retries: 0,
        });
    });

    it('persistAppLogToFirestore resuelve uid desde authInstance (incluso tras authStateReady) evitando uid: null cuando hay sesión', async () => {
        const mockAddDoc = vi.fn().mockResolvedValue({ id: 'log-auth' });
        const mockCollection = vi.fn().mockReturnValue('app_logs_ref');
        const mockServerTimestamp = vi.fn().mockReturnValue('SERVER_TS');

        const delayedAuth = {
            currentUser: /** @type {{ uid?: string | null } | null} */ (null),
            authStateReady: async () => {
                delayedAuth.currentUser = { uid: 'uid-real-123' };
            },
        };

        const okAuth = await persistAppLogToFirestore(
            {
                level: LOG_LEVEL.ERROR,
                errorCode: 'ui/error-boundary',
                errorMessage: 'Error con usuario ya autenticado',
                route: '/mis-materias',
                uid: null,
                context: { scope: 'page', extraUnknown: 'drop' },
            },
            {
                addDocFn: mockAddDoc,
                collectionFn: mockCollection,
                serverTimestampFn: mockServerTimestamp,
                firestoreDb: /** @type {any} */ ({}),
                authInstance: delayedAuth,
            },
        );

        expect(okAuth).toBe(true);
        expect(mockAddDoc).toHaveBeenCalledWith('app_logs_ref', {
            level: 'error',
            errorCode: 'ui/error-boundary',
            errorMessage: 'Error con usuario ya autenticado',
            route: '/mis-materias',
            componentStack: null,
            planActivo: null,
            uid: 'uid-real-123',
            context: { scope: 'page' },
            createdAt: 'SERVER_TS',
        });

        mockAddDoc.mockClear();
        const anonAuth = {
            currentUser: null,
            authStateReady: async () => {},
        };

        const okAnon = await persistAppLogToFirestore(
            {
                level: LOG_LEVEL.WARNING,
                errorCode: 'app/warning',
                errorMessage: 'Advertencia anónima',
                route: '/inicio',
                uid: 'uid-spoof',
            },
            {
                addDocFn: mockAddDoc,
                collectionFn: mockCollection,
                serverTimestampFn: mockServerTimestamp,
                firestoreDb: /** @type {any} */ ({}),
                authInstance: anonAuth,
            },
        );

        expect(okAnon).toBe(true);
        expect(mockAddDoc).toHaveBeenCalledWith('app_logs_ref', {
            level: 'warning',
            errorCode: 'app/warning',
            errorMessage: 'Advertencia anónima',
            route: '/inicio',
            componentStack: null,
            planActivo: null,
            uid: null,
            context: {},
            createdAt: 'SERVER_TS',
        });
    });
});
