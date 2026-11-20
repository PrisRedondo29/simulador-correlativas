import { describe, it, expect } from 'vitest';
import {
    SW_UPDATE_CHECK_COOLDOWN_MS,
    evaluatePwaUpdateReadiness,
    isUserActivelyEditing,
    shouldCheckForSwUpdate,
} from './pwaUpdatePolicy';

describe('pwaUpdatePolicy - Política de actualización diferida segura', () => {
    it('no muestra aviso cuando no hay nueva versión disponible', () => {
        const res = evaluatePwaUpdateReadiness({ needRefresh: false, syncStatus: 'synced' });
        expect(res).toEqual({
            canPrompt: false,
            canApplyNow: false,
            hasPendingCloudChanges: false,
            deferReason: null,
        });
    });

    it('difiere la actualización mientras hay una subida a Firestore en vuelo (syncing)', () => {
        const res = evaluatePwaUpdateReadiness({ needRefresh: true, syncStatus: 'syncing' });
        expect(res.canPrompt).toBe(false);
        expect(res.canApplyNow).toBe(false);
        expect(res.deferReason).toBe('syncing');
    });

    it('difiere la actualización mientras hay conflicto o cambio de cuenta sin resolver', () => {
        expect(
            evaluatePwaUpdateReadiness({ needRefresh: true, syncStatus: 'conflict' }),
        ).toMatchObject({ canPrompt: false, deferReason: 'unresolved_conflict' });

        expect(
            evaluatePwaUpdateReadiness({ needRefresh: true, syncStatus: 'account_mismatch' }),
        ).toMatchObject({ canPrompt: false, deferReason: 'unresolved_conflict' });
    });

    it('difiere la actualización mientras el usuario edita un campo o tiene un modal abierto', () => {
        expect(
            evaluatePwaUpdateReadiness({ needRefresh: true, syncStatus: 'synced', isEditing: true }),
        ).toMatchObject({ canPrompt: false, deferReason: 'user_editing' });

        expect(
            evaluatePwaUpdateReadiness({
                needRefresh: true,
                syncStatus: 'synced',
                hasActiveModal: true,
            }),
        ).toMatchObject({ canPrompt: false, deferReason: 'user_editing' });
    });

    it('habilita el aviso cuando es seguro e informa si hay cambios locales pendientes', () => {
        const pendingRes = evaluatePwaUpdateReadiness({
            needRefresh: true,
            syncStatus: 'pending',
        });
        expect(pendingRes).toEqual({
            canPrompt: true,
            canApplyNow: true,
            hasPendingCloudChanges: true,
            deferReason: null,
        });

        const dismissedRes = evaluatePwaUpdateReadiness({
            needRefresh: true,
            dismissed: true,
            syncStatus: 'synced',
        });
        expect(dismissedRes.canPrompt).toBe(false);
        expect(dismissedRes.deferReason).toBe('dismissed');
    });

    it('detecta correctamente campos editables activos e ignora botones/inputs readonly', () => {
        expect(isUserActivelyEditing(null)).toBe(false);
        expect(isUserActivelyEditing(/** @type {any} */ ({ tagName: 'INPUT', type: 'text' }))).toBe(true);
        expect(isUserActivelyEditing(/** @type {any} */ ({ tagName: 'TEXTAREA' }))).toBe(true);
        expect(isUserActivelyEditing(/** @type {any} */ ({ tagName: 'SELECT' }))).toBe(true);
        expect(
            isUserActivelyEditing(/** @type {any} */ ({ tagName: 'DIV', isContentEditable: true })),
        ).toBe(true);
        expect(
            isUserActivelyEditing(/** @type {any} */ ({ tagName: 'INPUT', type: 'text', readOnly: true })),
        ).toBe(false);
        expect(isUserActivelyEditing(/** @type {any} */ ({ tagName: 'INPUT', type: 'checkbox' }))).toBe(
            false,
        );
        expect(isUserActivelyEditing(/** @type {any} */ ({ tagName: 'BUTTON' }))).toBe(false);
    });

    it('respeta conectividad, visibilidad y cooldown antes de verificar actualizaciones del SW', () => {
        const base = 1_700_000_000_000;
        expect(
            shouldCheckForSwUpdate({
                isOnline: false,
                isVisible: true,
                lastCheckAt: base - SW_UPDATE_CHECK_COOLDOWN_MS - 1000,
                now: base,
            }),
        ).toBe(false);
        expect(
            shouldCheckForSwUpdate({
                isOnline: true,
                isVisible: false,
                lastCheckAt: base - SW_UPDATE_CHECK_COOLDOWN_MS - 1000,
                now: base,
            }),
        ).toBe(false);
        expect(
            shouldCheckForSwUpdate({
                isOnline: true,
                isVisible: true,
                lastCheckAt: base - 60_000,
                now: base,
            }),
        ).toBe(false);
        expect(
            shouldCheckForSwUpdate({
                isOnline: true,
                isVisible: true,
                lastCheckAt: base - SW_UPDATE_CHECK_COOLDOWN_MS,
                now: base,
            }),
        ).toBe(true);
    });
});
