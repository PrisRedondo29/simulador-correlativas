import React, { useState } from 'react';
import {
    Button,
    Chip,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from '@heroui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    CURRENT_RELEASE_VERSION,
    getCurrentRelease,
    getReleaseHighlights,
} from '../../config/releaseNotes';
import storageRepository, { CURRENT_ONBOARDING_VERSION } from '../../services/storageRepository';

function shouldShowWhatsNewInitial(pathname) {
    if (pathname === '/novedades' || pathname === '/legal') return false;
    const onboardingDone =
        storageRepository.getOnboardingVersionCompleted() >= CURRENT_ONBOARDING_VERSION ||
        storageRepository.hasExistingAcademicData();
    if (!onboardingDone) return false;
    const lastSeen = storageRepository.getLastSeenReleaseVersion();
    return lastSeen !== CURRENT_RELEASE_VERSION;
}

/**
 * Modal de bienvenida a una nueva versión para usuarios recurrentes.
 * Se muestra una sola vez por versión, nunca interrumpe el Onboarding y no bloquea el uso offline.
 */
export default function WhatsNewModal() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(() => shouldShowWhatsNewInitial(location.pathname));

    if (!isOpen) return null;

    const release = getCurrentRelease();
    const highlights = getReleaseHighlights(6);

    const markSeenAndClose = (targetRoute = null) => {
        storageRepository.setLastSeenReleaseVersion(CURRENT_RELEASE_VERSION);
        setIsOpen(false);
        if (targetRoute) {
            navigate(targetRoute);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={(open) => {
                if (!open) markSeenAndClose();
            }}
            size="2xl"
            scrollBehavior="inside"
            backdrop="blur"
            placement="center"
            className="mx-4"
        >
            <ModalContent className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540]">
                {() => (
                    <>
                        <ModalHeader className="flex flex-col gap-1.5 border-b border-[#E2E8F0] dark:border-[#2A3540]">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Chip
                                    size="sm"
                                    variant="flat"
                                    className="bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#6EE7B7] font-semibold text-xs"
                                >
                                    Versión {release.version}
                                </Chip>
                                <h2 className="text-base sm:text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                                    Novedades en {release.title}
                                </h2>
                            </div>
                            <p className="text-xs font-normal text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                                {release.summary}
                            </p>
                        </ModalHeader>

                        <ModalBody className="py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {highlights.map((item) => (
                                    <div
                                        key={item.id}
                                        className="rounded-xl border border-[#E2E8F0] dark:border-[#2A3540] bg-[#F8FAFC] dark:bg-[#1E2730]/60 p-3.5 flex flex-col justify-between gap-2.5"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                                                    <i
                                                        className={`fa-solid ${item.icon} text-[#005A36] dark:text-[#6EE7B7] text-[11px]`}
                                                        aria-hidden="true"
                                                    />
                                                    {item.title}
                                                </span>
                                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] shrink-0">
                                                    {item.badge}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                                                {item.description}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => markSeenAndClose(item.route)}
                                            className="self-start inline-flex items-center gap-1 text-[11px] font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:underline cursor-pointer"
                                        >
                                            <span>{item.ctaLabel}</span>
                                            <i className="fa-solid fa-arrow-right text-[9px]" aria-hidden="true" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </ModalBody>

                        <ModalFooter className="border-t border-[#E2E8F0] dark:border-[#2A3540] flex flex-wrap items-center justify-between gap-2">
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={() => markSeenAndClose('/novedades')}
                                className="rounded-xl text-xs font-medium bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0]"
                            >
                                Ver todas las novedades
                            </Button>
                            <Button
                                size="sm"
                                color="primary"
                                onPress={() => markSeenAndClose()}
                                className="rounded-xl text-xs font-semibold bg-[#005A36] dark:bg-[#2E8B63] text-white px-5"
                            >
                                Entendido
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
