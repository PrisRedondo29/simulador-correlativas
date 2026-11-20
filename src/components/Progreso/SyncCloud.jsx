import React, { useState } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger, Spinner, addToast } from '@heroui/react';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext';
import { trackProgresoInicial } from '../../services/analyticsService';
import planService from '../../services/planService';
import storageRepository from '../../services/storageRepository';
import { SYNC_STATUS } from '../../utils/Sync/syncStateMachine';

export default function SyncCloud({ plan }) {
    const { user, userData, syncState, saveToCloud, loadFromCloud } = useAuth();
    const [loadingAction, setLoadingAction] = useState(null);

    if (!user) return null;

    const isSyncing = syncState.status === SYNC_STATUS.SYNCING || Boolean(loadingAction);
    const isOffline = !syncState.isOnline;
    const hasPending = syncState.status === SYNC_STATUS.PENDING;

    const handleUpload = async () => {
        if (!user || !plan) return;
        setLoadingAction('Guardando...');
        try {
            const esPrimerGuardado = !userData?.progreso || !userData?.progreso[plan];
            const res = await saveToCloud();

            if (res.status === 'synced') {
                addToast({
                    title: res.hasConcurrentLocalEdits ? 'Guardado (hay cambios nuevos)' : '¡Éxito!',
                    description: res.hasConcurrentLocalEdits
                        ? 'Se guardó tu progreso previo; quedan ediciones recientes pendientes.'
                        : 'Tu progreso, cursada y simulaciones se guardaron en la nube.',
                    color: res.hasConcurrentLocalEdits ? 'warning' : 'success',
                });

                if (esPrimerGuardado) {
                    const progresoLocal = storageRepository.getProgreso(plan, {});
                    const planData = await planService.getPlanByNumber(plan);
                    const materiasPlan = planData?.materias || [];
                    const aprobadas = Object.values(progresoLocal).filter(
                        (s) => s === 'Aprobado' || s === 'Promocionado',
                    ).length;

                    trackProgresoInicial({
                        plan,
                        aprobadas,
                        total: materiasPlan.length,
                    });
                }
            } else if (res.status === 'error' && res.message) {
                addToast({
                    title: res.code === 'sync/offline' ? 'Sin conexión' : 'Error',
                    description: res.message,
                    color: res.code === 'sync/offline' ? 'warning' : 'danger',
                });
            }
        } finally {
            setLoadingAction(null);
        }
    };

    const handleDownload = async () => {
        if (!user) return;
        setLoadingAction('Cargando...');
        try {
            const res = await loadFromCloud();
            if (res.requiresResolution) return;
            if (res.ok) {
                addToast({
                    title: res.alreadySynced ? 'Al día' : '¡Éxito!',
                    description: res.alreadySynced
                        ? 'Este dispositivo ya coincide con tu respaldo en la nube.'
                        : 'Se cargó tu progreso desde la nube con respaldo previo automático.',
                    color: 'success',
                });
            } else if (res.message) {
                addToast({
                    title: res.empty ? 'Aviso' : 'Error',
                    description: res.message,
                    color: res.empty || res.code === 'sync/offline' ? 'warning' : 'danger',
                });
            }
        } finally {
            setLoadingAction(null);
        }
    };

    if (isSyncing) {
        return (
            <div className="flex items-center gap-2 px-2">
                <Spinner size="sm" color="primary" />
                <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                    {loadingAction || 'Sincronizando...'}
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 rounded-xl bg-white dark:bg-[#161D24] p-1 border border-[#E2E8F0] dark:border-[#2A3540]">
            <Popover placement="bottom" showArrow>
                <PopoverTrigger>
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        aria-label="Información sobre sincronización"
                        className="text-[#64748B] h-7 w-7 min-w-7"
                    >
                        <i className="fa-solid fa-circle-info text-xs" aria-hidden="true" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540]">
                    <div className="px-1 py-2 max-w-xs">
                        <div className="text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                            Sincronización Segura Unificada
                        </div>
                        <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                            Guardar respalda todos tus planes, notas, Mi Cursada y simulaciones en una sola operación verificada por versión.
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            <Button
                size="sm"
                variant="light"
                isDisabled={isOffline}
                onPress={handleUpload}
                startContent={
                    <span className="relative inline-flex items-center">
                        <i
                            className="fa-solid fa-cloud-arrow-up text-xs text-[#005A36] dark:text-[#6EE7B7]"
                            aria-hidden="true"
                        />
                        {hasPending && (
                            <span
                                aria-hidden="true"
                                className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[#F59E0B]"
                            />
                        )}
                    </span>
                }
                className="font-medium text-xs h-7 px-2.5 text-[#334155] dark:text-[#E2E8F0]"
            >
                Guardar
            </Button>
            <Button
                size="sm"
                variant="light"
                isDisabled={isOffline}
                onPress={handleDownload}
                startContent={
                    <i
                        className="fa-solid fa-cloud-arrow-down text-xs text-[#475569] dark:text-[#94A3B8]"
                        aria-hidden="true"
                    />
                }
                className="font-medium text-xs h-7 px-2.5 text-[#334155] dark:text-[#E2E8F0]"
            >
                Cargar
            </Button>
        </div>
    );
}

SyncCloud.propTypes = {
    plan: PropTypes.string,
};
