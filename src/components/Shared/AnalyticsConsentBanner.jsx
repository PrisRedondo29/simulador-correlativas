import React, { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { Link } from 'react-router-dom';
import { getAnalyticsConsent, setAnalyticsConsent } from '../../services/analyticsService';
import { subscribeStorageChanges } from '../../services/storageRepository';

/**
 * Banner discreto y no bloqueante para consentimiento opt-in de Product Analytics (PostHog Cloud EU).
 * Solo se muestra cuando la preferencia está en `'pending'`. Rechazarlo no limita ninguna funcionalidad.
 */
export default function AnalyticsConsentBanner() {
    const [consent, setConsent] = useState(() => getAnalyticsConsent());
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        return subscribeStorageChanges(() => {
            setConsent(getAnalyticsConsent());
        });
    }, []);

    if (consent !== 'pending') return null;

    const handleDecision = async (decision) => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await setAnalyticsConsent(decision);
            setConsent(decision);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <aside
            aria-label="Preferencias de métricas de uso"
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:w-[400px] z-40 rounded-2xl bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] shadow-lg p-4 flex flex-col gap-3"
        >
            <div className="flex items-start gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#6EE7B7] border border-[#A7F3D0] dark:border-[#1E4D38] flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-chart-simple text-xs" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-bold text-[#1E293B] dark:text-[#F1F5F9] leading-snug">
                        Métricas opcionales de uso (PostHog EU)
                    </p>
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                        Si aceptás, medimos uso de funciones y tiempos activos sin notas, DNI, legajo ni grabaciones de pantalla. Podés rechazar o cambiarlo luego en{' '}
                        <Link to="/legal" className="font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:underline">
                            Aviso legal y privacidad
                        </Link>
                        .
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button
                    size="sm"
                    variant="light"
                    isDisabled={isSaving}
                    onPress={() => handleDecision('rejected')}
                    className="h-8 px-3 text-xs font-medium text-[#64748B] dark:text-[#94A3B8]"
                >
                    Rechazar
                </Button>
                <Button
                    size="sm"
                    color="primary"
                    isLoading={isSaving}
                    onPress={() => handleDecision('accepted')}
                    className="h-8 px-3.5 text-xs font-semibold rounded-xl bg-[#005A36] dark:bg-[#2E8B63] text-white"
                >
                    Aceptar
                </Button>
            </div>
        </aside>
    );
}
