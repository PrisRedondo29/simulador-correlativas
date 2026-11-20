/**
 * pwaUpdatePolicy.js
 * Política pura de actualización diferida segura para la PWA (Etapa 5B).
 *
 * Garantías:
 *  - Nunca interrumpe una subida a Firestore en vuelo (`syncStatus === 'syncing'`).
 *  - Nunca compite con el modal de resolución de conflictos (`conflict` / `account_mismatch`).
 *  - Difiere el aviso mientras el usuario edita un campo de formulario o tiene un diálogo abierto.
 *  - Respeta la prioridad local-first: recargar nunca pierde cambios locales guardados en `localStorage`,
 *    pero informa de forma tranquila cuando hay cambios pendientes de subir a la nube.
 */

/** @typedef {import('../../types/domain').SyncStatus} SyncStatus */

export const SW_UPDATE_CHECK_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutos

const NON_TEXT_INPUT_TYPES = new Set([
    'button',
    'checkbox',
    'color',
    'file',
    'hidden',
    'image',
    'radio',
    'range',
    'reset',
    'submit',
]);

/**
 * Determina si el elemento enfocado actualmente indica que el usuario está escribiendo
 * o editando activamente un formulario.
 *
 * @param {Element | null | undefined} activeElement
 * @returns {boolean}
 */
export function isUserActivelyEditing(activeElement) {
    if (!activeElement || typeof activeElement !== 'object') return false;

    const tag = String(activeElement.tagName || '').toUpperCase();
    if (tag === 'TEXTAREA' || tag === 'SELECT') {
        return !('readOnly' in activeElement && activeElement.readOnly);
    }

    if (tag === 'INPUT') {
        const input = /** @type {HTMLInputElement} */ (activeElement);
        if (input.readOnly || input.disabled) return false;
        const type = String(input.type || 'text').toLowerCase();
        return !NON_TEXT_INPUT_TYPES.has(type);
    }

    if ('isContentEditable' in activeElement && /** @type {HTMLElement} */ (activeElement).isContentEditable) {
        return true;
    }

    return false;
}

/**
 * Determina si conviene mostrar el aviso discreto de actualización PWA o diferirlo.
 *
 * @param {{
 *   needRefresh: boolean,
 *   dismissed?: boolean,
 *   syncStatus?: SyncStatus | null,
 *   isEditing?: boolean,
 *   hasActiveModal?: boolean,
 * }} params
 * @returns {{
 *   canPrompt: boolean,
 *   canApplyNow: boolean,
 *   hasPendingCloudChanges: boolean,
 *   deferReason: 'syncing' | 'unresolved_conflict' | 'user_editing' | 'dismissed' | null,
 * }}
 */
export function evaluatePwaUpdateReadiness({
    needRefresh,
    dismissed = false,
    syncStatus = null,
    isEditing = false,
    hasActiveModal = false,
}) {
    const hasPendingCloudChanges = syncStatus === 'pending';

    if (!needRefresh) {
        return {
            canPrompt: false,
            canApplyNow: false,
            hasPendingCloudChanges,
            deferReason: null,
        };
    }

    if (syncStatus === 'syncing') {
        return {
            canPrompt: false,
            canApplyNow: false,
            hasPendingCloudChanges,
            deferReason: 'syncing',
        };
    }

    if (syncStatus === 'conflict' || syncStatus === 'account_mismatch') {
        return {
            canPrompt: false,
            canApplyNow: false,
            hasPendingCloudChanges,
            deferReason: 'unresolved_conflict',
        };
    }

    if (hasActiveModal || isEditing) {
        return {
            canPrompt: false,
            canApplyNow: false,
            hasPendingCloudChanges,
            deferReason: 'user_editing',
        };
    }

    if (dismissed) {
        return {
            canPrompt: false,
            canApplyNow: true,
            hasPendingCloudChanges,
            deferReason: 'dismissed',
        };
    }

    return {
        canPrompt: true,
        canApplyNow: true,
        hasPendingCloudChanges,
        deferReason: null,
    };
}

/**
 * Evalúa si corresponde consultar al servidor por una nueva versión del Service Worker
 * respetando conectividad y ventana de enfriamiento.
 *
 * @param {{
 *   isOnline: boolean,
 *   isVisible: boolean,
 *   lastCheckAt: number,
 *   now?: number,
 *   cooldownMs?: number,
 * }} params
 * @returns {boolean}
 */
export function shouldCheckForSwUpdate({
    isOnline,
    isVisible,
    lastCheckAt,
    now = Date.now(),
    cooldownMs = SW_UPDATE_CHECK_COOLDOWN_MS,
}) {
    if (!isOnline || !isVisible) return false;
    return now - lastCheckAt >= cooldownMs;
}
