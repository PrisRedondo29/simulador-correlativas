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
            route: '/progreso',
            retries: 2,
            offline: true,
            nested: { ignored: true },
        });

        expect(clean).toEqual({
            route: '/progreso',
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
                route: '/progreso',
                componentStack: 'in MateriaCard (created by alumno@unlu.edu.ar)',
                planActivo: '17.14',
                uid: null,
                context: { scope: 'page', route: '/progreso' },
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
            route: '/progreso',
            componentStack: 'in MateriaCard (created by [EMAIL])',
            planActivo: '17.14',
            uid: null,
            context: { scope: 'page', route: '/progreso' },
            createdAt: 'SERVER_TS',
        });

        expect(sanitizeComponentStack('in Component tel +54 11 4444-5555')).toBe(
            'in Component tel [PHONE]',
        );
    });
});
