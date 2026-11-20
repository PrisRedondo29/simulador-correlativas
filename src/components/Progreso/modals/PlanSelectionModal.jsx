import React, { useState } from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    Card,
    CardBody,
    Chip,
} from '@heroui/react';
import PropTypes from 'prop-types';
import { getAvailableCareers, getCatalogCareers } from '../../../config/careersRegistry';
import { trackSeleccionCarrera } from '../../../services/analyticsService';

export default function PlanSelectionModal({ isOpen, onSelect }) {
    const availableCareers = getAvailableCareers();
    const catalogCareers = getCatalogCareers();
    const [selectedCareerId, setSelectedCareerId] = useState(() => availableCareers[0]?.id || null);

    const activeCareer =
        availableCareers.find((c) => c.id === selectedCareerId) || availableCareers[0] || null;
    const plans = activeCareer?.plans || [];

    const handleSelect = (planNumero) => {
        onSelect(planNumero);
        trackSeleccionCarrera({ plan: planNumero, origen_plan: 'welcome_modal' });
    };

    return (
        <Modal
            isOpen={isOpen}
            hideCloseButton
            isDismissable={false}
            backdrop="opaque"
            placement="center"
            size="2xl"
            className="m-4"
            classNames={{
                backdrop: 'bg-black/50',
            }}
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1 items-center pt-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                        <i className="fa-solid fa-graduation-cap text-primary text-3xl" />
                    </div>
                    <h2 className="text-2xl font-black text-center">¡Bienvenido al Simulador!</h2>
                    <p className="text-sm font-normal text-foreground/60 text-center px-4">
                        {availableCareers.length > 1
                            ? 'Elegí tu carrera y el plan de estudios que estás cursando.'
                            : `Para comenzar, elegí tu plan de estudios de ${activeCareer?.name || 'tu carrera'}.`}
                    </p>
                </ModalHeader>
                <ModalBody className="pb-8 px-6">
                    {catalogCareers.length > 1 && (
                        <div className="space-y-1.5 mb-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] block text-center">
                                1. Carrera
                            </span>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                {catalogCareers.map((career) => {
                                    const isAvailable =
                                        career.available &&
                                        Array.isArray(career.plans) &&
                                        career.plans.length > 0;
                                    const isSelected = career.id === activeCareer?.id;
                                    return (
                                        <button
                                            key={career.id}
                                            type="button"
                                            disabled={!isAvailable}
                                            onClick={() => {
                                                if (isAvailable) setSelectedCareerId(career.id);
                                            }}
                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 ${
                                                isSelected
                                                    ? 'border-[#005A36] dark:border-[#4A9D68] bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] cursor-pointer'
                                                    : isAvailable
                                                        ? 'border-[#E2E8F0] dark:border-[#2A3540] bg-[#F8FAFC] dark:bg-[#1E2730] text-[#475569] dark:text-[#CBD5E1] cursor-pointer'
                                                        : 'border-[#E2E8F0] dark:border-[#2A3540] bg-[#F8FAFC]/60 dark:bg-[#1E2730]/40 text-[#94A3B8] dark:text-[#64748B] cursor-not-allowed'
                                            }`}
                                        >
                                            <span>{career.name}</span>
                                            {!isAvailable && (
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#E2E8F0]/70 dark:bg-[#24303C] text-[#64748B] dark:text-[#94A3B8]">
                                                    Próximamente
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className={`grid grid-cols-1 ${plans.length > 1 ? 'md:grid-cols-2' : ''} gap-4 mt-2`}>
                        {plans.map((planItem) => (
                            <Card
                                key={planItem.planNumero}
                                isPressable
                                className="border-2 border-transparent hover:border-primary transition-all shadow-sm"
                                onPress={() => handleSelect(planItem.planNumero)}
                            >
                                <CardBody className="p-6 flex flex-col items-center text-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="px-3.5 py-2 rounded-xl bg-default-100">
                                            <span className="font-black text-xl">{planItem.planNumero}</span>
                                        </div>
                                        {planItem.isDefault && planItem.statusLabel && (
                                            <Chip size="sm" variant="flat" color="primary" className="text-[10px] font-semibold">
                                                {planItem.statusLabel}
                                            </Chip>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold">{planItem.shortTitle || planItem.label}</p>
                                        <p className="text-xs text-foreground/50 leading-relaxed mt-1">
                                            {planItem.description}
                                        </p>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>

                    <div className="mt-8 p-4 bg-default-50 rounded-2xl border border-default-200 flex items-start gap-3">
                        <i className="fa-solid fa-circle-info text-primary mt-1" />
                        <p className="text-xs text-foreground/70 leading-relaxed">
                            <span className="font-bold block mb-1 text-foreground">¿No estás seguro?</span>
                            No te preocupes, podés cambiar tu plan en cualquier momento desde la sección de
                            <span className="font-bold text-primary"> Configuración</span> en el menú lateral.
                        </p>
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}

PlanSelectionModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onSelect: PropTypes.func.isRequired,
};
