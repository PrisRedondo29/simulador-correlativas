import React, { useState } from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    addToast,
} from '@heroui/react';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext';

function SummaryCard({ title, subtitle, icon, summary, tone = 'neutral' }) {
    const borderClass =
        tone === 'brand'
            ? 'border-[#005A36]/30 dark:border-[#4A9D68]/40 bg-[#ECFDF5]/50 dark:bg-[#102A20]/40'
            : 'border-[#E2E8F0] dark:border-[#2A3540] bg-[#F8FAFC] dark:bg-[#1E2730]/60';

    const cursadaCount =
        (summary?.eventosCursada ?? 0) +
        (summary?.horariosCursada ?? 0) +
        (summary?.entradasBitacora ?? 0);

    return (
        <div className={`rounded-xl border p-3.5 flex flex-col gap-2.5 ${borderClass}`}>
            <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] flex items-center justify-center text-xs text-[#005A36] dark:text-[#6EE7B7] shrink-0">
                    <i className={`fa-solid ${icon}`} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <h3 className="text-xs font-bold text-[#1E293B] dark:text-[#F1F5F9] leading-tight">
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {!summary || summary.isEmpty ? (
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] italic">
                    Sin datos académicos guardados.
                </p>
            ) : (
                <ul className="space-y-1 text-xs text-[#334155] dark:text-[#CBD5E1]">
                    <li className="flex justify-between gap-2">
                        <span className="text-[#64748B] dark:text-[#94A3B8]">Planes</span>
                        <span className="font-semibold tabular-nums">
                            {summary.planes.join(', ') || '—'}
                        </span>
                    </li>
                    <li className="flex justify-between gap-2">
                        <span className="text-[#64748B] dark:text-[#94A3B8]">Aprobadas</span>
                        <span className="font-semibold tabular-nums">{summary.materiasAprobadas}</span>
                    </li>
                    <li className="flex justify-between gap-2">
                        <span className="text-[#64748B] dark:text-[#94A3B8]">Cursando / Regulares</span>
                        <span className="font-semibold tabular-nums">{summary.materiasActivas}</span>
                    </li>
                    {summary.materiasLibres > 0 && (
                        <li className="flex justify-between gap-2">
                            <span className="text-[#64748B] dark:text-[#94A3B8]">Libres</span>
                            <span className="font-semibold tabular-nums">{summary.materiasLibres}</span>
                        </li>
                    )}
                    <li className="flex justify-between gap-2">
                        <span className="text-[#64748B] dark:text-[#94A3B8]">Mi Cursada (ítems)</span>
                        <span className="font-semibold tabular-nums">{cursadaCount}</span>
                    </li>
                    <li className="flex justify-between gap-2">
                        <span className="text-[#64748B] dark:text-[#94A3B8]">Simulaciones</span>
                        <span className="font-semibold tabular-nums">{summary.simulaciones}</span>
                    </li>
                </ul>
            )}
        </div>
    );
}

SummaryCard.propTypes = {
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    icon: PropTypes.string.isRequired,
    summary: PropTypes.object,
    tone: PropTypes.oneOf(['neutral', 'brand']),
};

export default function SyncModal() {
    const { showSyncModal, syncState, resolveSync, user } = useAuth();
    const [busyAction, setBusyAction] = useState(null);
    const [actionError, setActionError] = useState(null);

    const conflict = syncState.conflict;
    const isAccountMismatch = conflict?.reason === 'account_mismatch';
    const isRevisionConflict = conflict?.reason === 'revision_conflict';
    const hasRemoteData = Boolean(conflict?.remoteSummary && !conflict.remoteSummary.isEmpty);
    const isOffline = !syncState.isOnline;

    const getHeaderCopy = () => {
        if (isAccountMismatch) {
            return {
                icon: 'fa-user-shield',
                title: 'Datos de otra cuenta en este dispositivo',
                description: `Este navegador conserva progreso académico vinculado previamente a otra cuenta. Para evitar mezclar datos sin tu permiso, elegí cómo querés continuar con ${user?.email || 'esta cuenta'}.`,
            };
        }
        if (isRevisionConflict) {
            return {
                icon: 'fa-code-branch',
                title: 'Hay una versión más reciente en la nube',
                description: `Otro dispositivo guardó cambios nuevos${conflict?.remoteRevision ? ` (revisión v${conflict.remoteRevision})` : ''} antes de tu subida. Elegí qué versión conservar para no sobrescribir nada por error.`,
            };
        }
        return {
            icon: 'fa-cloud-arrow-up',
            title: 'Diferencias entre este dispositivo y la nube',
            description:
                'Encontramos datos distintos entre este dispositivo y tu respaldo en la nube. Elegí con cuál versión querés trabajar.',
        };
    };

    const copy = getHeaderCopy();

    const handleChoice = async (choice) => {
        setBusyAction(choice);
        setActionError(null);
        try {
            const res = await resolveSync(choice);
            if (!res?.ok) {
                setActionError(
                    res?.message ||
                        'No se pudo completar la acción. Tus datos locales siguen intactos.',
                );
                return;
            }

            if (choice === 'use_remote') {
                addToast({
                    title: 'Datos de la nube cargados',
                    description: res.backedUp
                        ? 'Guardamos una copia de recuperación de tu estado local previo.'
                        : 'Tu dispositivo quedó sincronizado con la nube.',
                    color: 'success',
                });
            } else if (choice === 'upload_local') {
                addToast({
                    title: 'Datos locales guardados en la nube',
                    description: 'Se actualizó tu respaldo en la nube correctamente.',
                    color: 'success',
                });
            } else {
                addToast({
                    title: 'Datos locales conservados',
                    description: 'Quedaron pendientes de subir para cuando decidas respaldarlos.',
                    color: 'warning',
                });
            }
        } catch {
            setActionError('Ocurrió un error inesperado. Tus datos locales siguen intactos.');
        } finally {
            setBusyAction(null);
        }
    };

    return (
        <Modal
            isOpen={showSyncModal}
            backdrop="blur"
            hideCloseButton
            isDismissable={false}
            size="lg"
            classNames={{
                base: 'bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl',
            }}
        >
            <ModalContent>
                <ModalHeader className="flex items-center gap-2.5 text-[#1E293B] dark:text-[#F1F5F9] border-b border-[#E2E8F0] dark:border-[#2A3540] pb-3">
                    <span className="w-8 h-8 rounded-xl bg-[#FEF3C7] dark:bg-[#2D2210] text-[#B45309] dark:text-[#FCD34D] flex items-center justify-center shrink-0">
                        <i className={`fa-solid ${copy.icon} text-sm`} aria-hidden="true" />
                    </span>
                    <span className="text-base font-bold leading-snug">{copy.title}</span>
                </ModalHeader>

                <ModalBody className="py-4 space-y-4">
                    <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                        {copy.description}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <SummaryCard
                            title="En este dispositivo"
                            subtitle={isAccountMismatch ? 'Datos de sesión anterior' : 'Cambios locales actuales'}
                            icon="fa-laptop"
                            summary={conflict?.localSummary}
                        />
                        <SummaryCard
                            title="En la nube"
                            subtitle={
                                conflict?.remoteRevision
                                    ? `Revisión v${conflict.remoteRevision}`
                                    : user?.email || 'Cuenta actual'
                            }
                            icon="fa-cloud"
                            summary={conflict?.remoteSummary}
                            tone="brand"
                        />
                    </div>

                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] flex items-start gap-2 bg-[#F8FAFC] dark:bg-[#11171D] rounded-xl px-3 py-2 border border-[#E2E8F0] dark:border-[#2A3540]">
                        <i className="fa-solid fa-shield-halved text-[#005A36] dark:text-[#6EE7B7] mt-0.5 shrink-0" aria-hidden="true" />
                        <span>
                            Antes de reemplazar los datos de este dispositivo con la nube, guardamos automáticamente una copia de recuperación local que podrás restaurar desde el indicador de nube.
                        </span>
                    </p>

                    {actionError && (
                        <div
                            role="alert"
                            className="text-xs rounded-xl px-3 py-2 bg-[#FEE2E2]/80 dark:bg-[#2D1619] text-[#991B1B] dark:text-[#FCA5A5] border border-[#FECACA] dark:border-[#7F1D1D]/60"
                        >
                            {actionError}
                        </div>
                    )}
                </ModalBody>

                <ModalFooter className="flex-col gap-2 border-t border-[#E2E8F0] dark:border-[#2A3540] pt-3">
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:justify-end">
                        {hasRemoteData && (
                            <Button
                                variant="flat"
                                isDisabled={Boolean(busyAction)}
                                isLoading={busyAction === 'use_remote'}
                                onPress={() => handleChoice('use_remote')}
                                className="w-full sm:w-auto font-semibold text-xs h-10 rounded-xl bg-[#F1F5F9] dark:bg-[#1E2730] text-[#1E293B] dark:text-[#F1F5F9]"
                                startContent={
                                    busyAction !== 'use_remote' ? (
                                        <i className="fa-solid fa-cloud-arrow-down text-xs" aria-hidden="true" />
                                    ) : null
                                }
                            >
                                Usar datos de la nube
                            </Button>
                        )}

                        <Button
                            color="primary"
                            isDisabled={Boolean(busyAction) || isOffline}
                            isLoading={busyAction === 'upload_local'}
                            onPress={() => handleChoice('upload_local')}
                            className="w-full sm:w-auto font-semibold text-xs h-10 rounded-xl bg-[#005A36] dark:bg-[#2E8B63] text-white"
                            startContent={
                                busyAction !== 'upload_local' ? (
                                    <i className="fa-solid fa-cloud-arrow-up text-xs" aria-hidden="true" />
                                ) : null
                            }
                        >
                            Conservar este dispositivo y subir
                        </Button>
                    </div>

                    <button
                        type="button"
                        disabled={Boolean(busyAction)}
                        onClick={() => handleChoice('keep_local')}
                        className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-white self-center sm:self-end py-1 cursor-pointer disabled:opacity-50"
                    >
                        Conservar este dispositivo y subir más tarde
                    </button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
