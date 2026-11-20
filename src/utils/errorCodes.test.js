import { describe, it, expect } from 'vitest';
import { AppError, isIntentionalAuthCancel, mapFirebaseError } from './errorCodes';

describe('errorCodes - Mapeo seguro de errores Firebase a mensajes humanos', () => {
    it('devuelve null para cancelaciones intencionales del usuario (sin alertas innecesarias)', () => {
        expect(mapFirebaseError({ code: 'auth/popup-closed-by-user' })).toBeNull();
        expect(mapFirebaseError({ code: 'auth/cancelled-popup-request' })).toBeNull();
        expect(isIntentionalAuthCancel({ code: 'auth/popup-closed-by-user' })).toBe(true);
        expect(isIntentionalAuthCancel({ code: 'permission-denied' })).toBe(false);
    });

    it('traduce códigos conocidos de Auth y Firestore a AppError sin exponer mensajes técnicos crudos', () => {
        const permErr = mapFirebaseError({
            code: 'permission-denied',
            message: 'FirebaseError: Missing or insufficient permissions.',
        });
        expect(permErr).toBeInstanceOf(AppError);
        expect(permErr?.code).toBe('permission-denied');
        expect(permErr?.message).toBe('No tenés permisos para realizar esta acción.');

        const popupErr = mapFirebaseError({ code: 'auth/popup-blocked' });
        expect(popupErr?.message).toContain('popup fue bloqueado');
    });

    it('usa fallback amigable ante errores desconocidos o nulos sin lanzar excepciones', () => {
        const unknown = mapFirebaseError(new Error('raw stack'));
        expect(unknown).toBeInstanceOf(AppError);
        expect(unknown?.code).toBe('unknown');
        expect(unknown?.message).toContain('error inesperado');

        expect(mapFirebaseError(null)?.code).toBe('unknown');
    });
});
