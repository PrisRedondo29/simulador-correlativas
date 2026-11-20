import React, { useState } from 'react';
import {
    Button,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Spinner,
    addToast,
} from '@heroui/react';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext';
import { SYNC_STATUS } from '../../utils/Sync/syncStateMachine';

function formatSyncTimestamp(iso) {
    if (!iso) return null;
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return null;
        return d.toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return null;
    }
}

/**
 * Indicador global discreto de estado de sincronización en la barra superior.
 * Mantiene el ruido visual al mínimo y concentra las acciones secundarias en un Popover bajo demanda.
 */
export default function SyncStatusMenu({ plan, variant = 'light-bar', onSignInPress = null }) {
    const {
        isAuthenticated,
        syncState,
        recoveryBackup,
        saveToCloud,
        loadFromCloud,
        restorePreviousBackup,
        exportBackupJson,
        signIn,
    } = useAuth();

    const [isOpen, setIsOpen] = useState(false);
    const [isLoadingCloud, setIsLoadingCloud] = useState(false);

    const isDarkHeader = variant === 'dark-header';
    const isSyncing = syncState.status === SYNC_STATUS.SYNCING || isLoadingCloud;
    const isOffline = !syncState.isOnline;

    const getVisualMeta = () => {
        if (!isAuthenticated) {
            return {
                icon: isOffline ? 'fa-wifi' : 'fa-hard-drive',
                label: isOffline ? 'Offline' : 'Local',
                ariaLabel: isOffline
                    ? 'Modo local sin conexión'
                    : 'Modo local (guardado en este dispositivo)',
                dotClass: isOffline ? 'bg-[#94A3B8]' : null,
                pillTone: isDarkHeader
                    ? 'text-white/85 hover:text-white hover:bg-white/15'
                    : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1E2730]',
                statusTitle: 'Guardado solo en este dispositivo',
                statusDetail:
                    'Tus datos académicos se guardan localmente. Iniciá sesión con Google cuando quieras respaldarlos en la nube.',
            };
        }

        if (isSyncing) {
            return {
                icon: 'fa-cloud',
                label: 'Sincronizando',
                ariaLabel: 'Sincronizando datos con la nube',
                dotClass: null,
                pillTone: isDarkHeader
                    ? 'text-white hover:bg-white/15'
                    : 'text-[#005A36] dark:text-[#6EE7B7] hover:bg-[#ECFDF5] dark:hover:bg-[#102A20]',
                statusTitle: 'Sincronizando con la nube…',
                statusDetail: 'Verificando versión remota y guardando tus cambios de forma segura.',
            };
        }

        if (
            syncState.status === SYNC_STATUS.CONFLICT ||
            syncState.status === SYNC_STATUS.ACCOUNT_MISMATCH
        ) {
            return {
                icon: 'fa-cloud',
                label: 'Revisar',
                ariaLabel: 'Sincronización: se requiere tu confirmación para conciliar datos',
                dotClass: 'bg-[#F59E0B]',
                pillTone: isDarkHeader
                    ? 'text-[#FDE68A] hover:bg-white/15'
                    : 'text-[#B45309] dark:text-[#FCD34D] hover:bg-[#FEF3C7]/70 dark:hover:bg-[#2D2210]',
                statusTitle:
                    syncState.status === SYNC_STATUS.ACCOUNT_MISMATCH
                        ? 'Datos de otra cuenta detectados'
                        : 'Diferencias entre dispositivo y nube',
                statusDetail:
                    'Elegí en la ventana de conciliación qué versión querés conservar. Ningún dato fue borrado.',
            };
        }

        if (syncState.status === SYNC_STATUS.ERROR) {
            return {
                icon: 'fa-cloud',
                label: 'Error',
                ariaLabel: 'Sincronización: ocurrió un error en el último intento',
                dotClass: 'bg-[#EF4444]',
                pillTone: isDarkHeader
                    ? 'text-[#FCA5A5] hover:bg-white/15'
                    : 'text-[#B91C1C] dark:text-[#FCA5A5] hover:bg-[#FEE2E2]/70 dark:hover:bg-[#2D1619]',
                statusTitle: 'No se pudo completar la última sincronización',
                statusDetail:
                    syncState.errorMessage ||
                    'Tus datos locales permanecen intactos. Podés reintentar cuando quieras.',
            };
        }

        if (syncState.status === SYNC_STATUS.PENDING) {
            return {
                icon: 'fa-cloud-arrow-up',
                label: isOffline ? 'Pendiente (offline)' : 'Sin subir',
                ariaLabel: isOffline
                    ? 'Sincronización: cambios pendientes sin conexión'
                    : 'Sincronización: tenés cambios locales pendientes de subir',
                dotClass: 'bg-[#F59E0B]',
                pillTone: isDarkHeader
                    ? 'text-white hover:bg-white/15'
                    : 'text-[#334155] dark:text-[#E2E8F0] hover:bg-[#F1F5F9] dark:hover:bg-[#1E2730]',
                statusTitle: isOffline
                    ? 'Cambios pendientes (sin conexión)'
                    : 'Cambios locales sin subir',
                statusDetail: isOffline
                    ? 'Podés seguir editando normalmente. Cuando vuelva internet, guardá en la nube.'
                    : 'Tenés progreso, cursada o simulaciones nuevas en este dispositivo listas para respaldar.',
            };
        }

        return {
            icon: 'fa-cloud',
            label: isOffline ? 'Al día (offline)' : 'En la nube',
            ariaLabel: isOffline
                ? 'Sincronización: al día, actualmente sin conexión'
                : 'Sincronización: tus datos están al día en la nube',
            dotClass: 'bg-[#10B981]',
            pillTone: isDarkHeader
                ? 'text-white/90 hover:text-white hover:bg-white/15'
                : 'text-[#475569] dark:text-[#CBD5E1] hover:text-[#1E293B] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1E2730]',
            statusTitle: 'Tus datos están sincronizados',
            statusDetail:
                'Progreso, notas, Mi Cursada y simulaciones coinciden con tu última copia en la nube.',
        };
    };

    const meta = getVisualMeta();
    const formattedLastSync = formatSyncTimestamp(syncState.lastSyncedAt);
    const formattedBackupDate = formatSyncTimestamp(recoveryBackup?.savedAt);

    const handleSave = async () => {
        const res = await saveToCloud();
        if (res.status === 'synced') {
            addToast({
                title: res.hasConcurrentLocalEdits ? 'Subido (con cambios nuevos)' : 'Guardado en la nube',
                description: res.hasConcurrentLocalEdits
                    ? 'Se guardó tu versión anterior, pero detectamos ediciones nuevas pendientes.'
                    : 'Tu progreso, cursada y simulaciones quedaron respaldados.',
                color: res.hasConcurrentLocalEdits ? 'warning' : 'success',
            });
            if (!res.hasConcurrentLocalEdits) setIsOpen(false);
        } else if (res.status === 'conflict') {
            setIsOpen(false);
        } else if (res.message) {
            addToast({
                title: res.code === 'sync/offline' ? 'Sin conexión' : 'No se pudo guardar',
                description: res.message,
                color: res.code === 'sync/offline' ? 'warning' : 'danger',
            });
        }
    };

    const handleLoad = async () => {
        setIsLoadingCloud(true);
        try {
            const res = await loadFromCloud();
            if (res.requiresResolution) {
                setIsOpen(false);
                return;
            }
            if (res.ok) {
                addToast({
                    title: res.alreadySynced ? 'Ya estás al día' : 'Datos cargados',
                    description: res.alreadySynced
                        ? 'Este dispositivo ya coincide exactamente con tu nube.'
                        : res.backedUp
                          ? 'Se cargó tu copia de la nube y se guardó un respaldo local previo.'
                          : 'Se cargaron tus datos desde la nube.',
                    color: 'success',
                });
                setIsOpen(false);
            } else if (res.message) {
                addToast({
                    title: res.empty ? 'Nube vacía' : 'Aviso',
                    description: res.message,
                    color: res.empty || res.code === 'sync/offline' ? 'warning' : 'danger',
                });
            }
        } finally {
            setIsLoadingCloud(false);
        }
    };

    const handleRestoreBackup = () => {
        const res = restorePreviousBackup();
        if (res.ok) {
            addToast({
                title: 'Copia restaurada',
                description: 'Volviste al estado guardado antes de la última sobrescritura.',
                color: 'success',
            });
            setIsOpen(false);
        } else if (res.message) {
            addToast({ title: 'Aviso', description: res.message, color: 'warning' });
        }
    };

    const handleExportJson = () => {
        exportBackupJson(plan);
        addToast({
            title: 'Respaldo descargado',
            description: 'Se exportó el archivo JSON con todos tus planes, cursada y simulaciones.',
            color: 'success',
        });
    };

    const handleSignInAction = async () => {
        setIsOpen(false);
        if (onSignInPress) {
            onSignInPress();
            return;
        }
        try {
            const logged = await signIn();
            if (logged) {
                addToast({
                    title: '¡Bienvenido!',
                    description: 'Sesión iniciada correctamente.',
                    color: 'success',
                });
            }
        } catch {
            // Manejado por AuthContext
        }
    };

    return (
        <Popover
            isOpen={isOpen}
            onOpenChange={setIsOpen}
            placement="bottom-end"
            offset={10}
            shadow="md"
        >
            <PopoverTrigger>
                <button
                    type="button"
                    aria-label={meta.ariaLabel}
                    className={`relative inline-flex items-center justify-center gap-1.5 rounded-lg transition-colors cursor-pointer min-h-9 min-w-9 ${
                        isDarkHeader ? 'px-2 h-9' : 'px-2.5 h-8 text-xs font-medium'
                    } ${meta.pillTone}`}
                >
                    {isSyncing ? (
                        <Spinner
                            size="sm"
                            color={isDarkHeader ? 'white' : 'primary'}
                            classNames={{ wrapper: 'w-3.5 h-3.5' }}
                        />
                    ) : (
                        <span className="relative inline-flex items-center justify-center">
                            <i className={`fa-solid ${meta.icon} text-sm`} aria-hidden="true" />
                            {meta.dotClass && (
                                <span
                                    aria-hidden="true"
                                    className={`absolute -top-0.5 -right-1 w-2 h-2 rounded-full ${meta.dotClass} ring-2 ${
                                        isDarkHeader
                                            ? 'ring-[#005A36] dark:ring-[#11221B]'
                                            : 'ring-white dark:ring-[#161D24]'
                                    }`}
                                />
                            )}
                        </span>
                    )}
                    {!isDarkHeader && <span className="hidden xl:inline">{meta.label}</span>}
                </button>
            </PopoverTrigger>

            <PopoverContent className="w-[min(92vw,320px)] p-0 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl overflow-hidden shadow-lg">
                <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#2A3540] flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] leading-snug">
                            {meta.statusTitle}
                        </p>
                        {isAuthenticated && (formattedLastSync || syncState.syncRevision) && (
                            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                                {formattedLastSync ? `Último guardado: ${formattedLastSync}` : 'Sin guardados aún'}
                                {typeof syncState.syncRevision === 'number' && syncState.syncRevision > 0
                                    ? ` · v${syncState.syncRevision}`
                                    : ''}
                            </p>
                        )}
                    </div>
                    {isOffline && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F1F5F9] dark:bg-[#1E2730] text-[#475569] dark:text-[#CBD5E1] shrink-0">
                            Offline
                        </span>
                    )}
                </div>

                <div className="px-4 py-3 space-y-3">
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                        {meta.statusDetail}
                    </p>

                    {syncState.status === SYNC_STATUS.ERROR && syncState.errorMessage && (
                        <div
                            role="alert"
                            className="text-xs rounded-xl px-3 py-2 bg-[#FEE2E2]/70 dark:bg-[#2D1619] text-[#991B1B] dark:text-[#FCA5A5] border border-[#FECACA] dark:border-[#7F1D1D]/60"
                        >
                            {syncState.errorMessage}
                        </div>
                    )}

                    {isAuthenticated ? (
                        <div className="flex flex-col gap-2">
                            <Button
                                size="sm"
                                color={syncState.status === SYNC_STATUS.PENDING ? 'primary' : 'default'}
                                variant={syncState.status === SYNC_STATUS.PENDING ? 'solid' : 'flat'}
                                isDisabled={isSyncing || isOffline}
                                isLoading={syncState.status === SYNC_STATUS.SYNCING}
                                onPress={handleSave}
                                startContent={
                                    syncState.status !== SYNC_STATUS.SYNCING ? (
                                        <i className="fa-solid fa-cloud-arrow-up text-xs" aria-hidden="true" />
                                    ) : null
                                }
                                className={`w-full font-semibold text-xs h-9 rounded-xl ${
                                    syncState.status === SYNC_STATUS.PENDING
                                        ? 'bg-[#005A36] dark:bg-[#2E8B63] text-white'
                                        : ''
                                }`}
                            >
                                Guardar en la nube
                            </Button>

                            <Button
                                size="sm"
                                variant="flat"
                                isDisabled={isSyncing || isOffline}
                                isLoading={isLoadingCloud}
                                onPress={handleLoad}
                                startContent={
                                    !isLoadingCloud ? (
                                        <i className="fa-solid fa-cloud-arrow-down text-xs" aria-hidden="true" />
                                    ) : null
                                }
                                className="w-full font-medium text-xs h-8 rounded-xl bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0]"
                            >
                                Cargar desde la nube
                            </Button>
                        </div>
                    ) : (
                        <Button
                            size="sm"
                            color="primary"
                            onPress={handleSignInAction}
                            startContent={<i className="fa-brands fa-google text-xs" aria-hidden="true" />}
                            className="w-full font-semibold text-xs h-9 rounded-xl bg-[#005A36] dark:bg-[#2E8B63] text-white"
                        >
                            Iniciar sesión para respaldar
                        </Button>
                    )}
                </div>

                <div className="px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#11171D] border-t border-[#E2E8F0] dark:border-[#2A3540] flex flex-col gap-1.5">
                    {recoveryBackup && (
                        <button
                            type="button"
                            onClick={handleRestoreBackup}
                            className="w-full flex items-center justify-between gap-2 text-left text-xs font-medium text-[#005A36] dark:text-[#6EE7B7] hover:underline py-1 cursor-pointer"
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <i className="fa-solid fa-rotate-left text-[11px]" aria-hidden="true" />
                                Restaurar copia anterior
                            </span>
                            {formattedBackupDate && (
                                <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-normal">
                                    {formattedBackupDate}
                                </span>
                            )}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleExportJson}
                        className="w-full flex items-center gap-1.5 text-left text-xs font-medium text-[#475569] dark:text-[#CBD5E1] hover:text-[#1E293B] dark:hover:text-white py-1 cursor-pointer"
                    >
                        <i className="fa-solid fa-download text-[11px]" aria-hidden="true" />
                        Exportar respaldo local (JSON)
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

SyncStatusMenu.propTypes = {
    plan: PropTypes.string,
    variant: PropTypes.oneOf(['light-bar', 'dark-header']),
    onSignInPress: PropTypes.func,
};
