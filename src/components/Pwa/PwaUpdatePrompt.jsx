import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@heroui/react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useAuth } from '../../context/AuthContext';
import {
    evaluatePwaUpdateReadiness,
    isUserActivelyEditing,
    shouldCheckForSwUpdate,
} from '../../utils/Pwa/pwaUpdatePolicy';

function detectOpenDialog() {
    if (typeof document === 'undefined') return false;
    return Boolean(document.querySelector('[role="dialog"], dialog[open]'));
}

/**
 * Aviso discreto y no bloqueante para actualizaciones del Service Worker (PWA).
 * Usa actualización diferida segura (`registerType: 'prompt'`):
 *  - Jamás recarga automáticamente mientras el usuario edita o sincroniza.
 *  - Oculta el aviso mientras haya una subida en curso, un modal abierto o un campo de texto en foco.
 */
export default function PwaUpdatePrompt() {
    const { syncState, showSyncModal } = useAuth();
    const [dismissed, setDismissed] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [hasOpenDialog, setHasOpenDialog] = useState(false);
    const [isApplying, setIsApplying] = useState(false);

    const registrationRef = useRef(null);
    const lastCheckAtRef = useRef(Date.now());

    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(_swUrl, registration) {
            registrationRef.current = registration || null;
        },
        onRegisterError(error) {
            if (import.meta.env.DEV) console.error('Error registrando Service Worker:', error);
        },
    });

    // Verificación periódica silenciosa al volver a la pestaña (máx. cada 30 min y solo online)
    useEffect(() => {
        if (typeof document === 'undefined') return undefined;

        const handleVisibilityChange = () => {
            const registration = registrationRef.current;
            if (!registration) return;

            const isOnline = typeof navigator === 'undefined' ? true : Boolean(navigator.onLine);
            const isVisible = document.visibilityState === 'visible';
            if (
                shouldCheckForSwUpdate({
                    isOnline,
                    isVisible,
                    lastCheckAt: lastCheckAtRef.current,
                })
            ) {
                lastCheckAtRef.current = Date.now();
                registration.update().catch(() => {});
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Monitorear foco en inputs/formularios y diálogos abiertos solo cuando hay actualización esperando
    useEffect(() => {
        if (!needRefresh || typeof document === 'undefined') return undefined;

        const refreshUiActivity = () => {
            setIsEditing(isUserActivelyEditing(document.activeElement));
            setHasOpenDialog(detectOpenDialog());
        };

        refreshUiActivity();
        document.addEventListener('focusin', refreshUiActivity);
        document.addEventListener('focusout', refreshUiActivity);

        return () => {
            document.removeEventListener('focusin', refreshUiActivity);
            document.removeEventListener('focusout', refreshUiActivity);
        };
    }, [needRefresh]);

    const readiness = evaluatePwaUpdateReadiness({
        needRefresh,
        dismissed,
        syncStatus: syncState.status,
        isEditing,
        hasActiveModal: showSyncModal || hasOpenDialog,
    });

    if (!readiness.canPrompt) return null;

    const handleApplyUpdate = async () => {
        if (!readiness.canApplyNow || isApplying) return;
        setIsApplying(true);
        try {
            await updateServiceWorker(true);
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <aside
            aria-label="Actualización disponible"
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:w-[360px] z-50 rounded-2xl bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] shadow-lg p-3.5 flex flex-col gap-2.5"
        >
            <div className="flex items-start gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#6EE7B7] border border-[#A7F3D0] dark:border-[#1E4D38] flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-sparkles text-xs" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#1E293B] dark:text-[#F1F5F9] leading-snug">
                        Nueva versión disponible
                    </p>
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed mt-0.5">
                        {readiness.hasPendingCloudChanges
                            ? 'Actualizá cuando quieras. Tus cambios locales pendientes seguirán guardados en este dispositivo.'
                            : 'Hay mejoras listas para aplicar sin perder tu progreso guardado.'}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button
                    size="sm"
                    variant="light"
                    isDisabled={isApplying}
                    onPress={() => setDismissed(true)}
                    className="h-8 px-3 text-xs font-medium text-[#64748B] dark:text-[#94A3B8]"
                >
                    Más tarde
                </Button>
                <Button
                    size="sm"
                    color="primary"
                    isLoading={isApplying}
                    onPress={handleApplyUpdate}
                    className="h-8 px-3.5 text-xs font-semibold rounded-xl bg-[#005A36] dark:bg-[#2E8B63] text-white"
                >
                    Actualizar ahora
                </Button>
            </div>
        </aside>
    );
}
