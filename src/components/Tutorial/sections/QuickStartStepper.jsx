import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@heroui/react';

const steps = [
    {
        number: 'Paso 01',
        icon: 'fa-graduation-cap',
        title: 'Marcá tus materias',
        description: 'Registrá qué materias aprobaste, regularizaste o estás cursando. El sistema calcula tus promedios y vencimientos.',
        path: '/progreso',
        cta: 'Ir a Mis Materias',
    },
    {
        number: 'Paso 02',
        icon: 'fa-calendar-days',
        title: 'Armá tu agenda',
        description: 'Anotá tus fechas de parciales, finales, horarios semanales de cursada y apuntes de cada clase.',
        path: '/cursada',
        cta: 'Ir a Mi Agenda',
    },
    {
        number: 'Paso 03',
        icon: 'fa-route',
        title: 'Simulá tus cuatrimestres',
        description: 'Proyectá cuántos cuatrimestres te faltan y organizá tus cursadas futuras sin modificar tu avance real.',
        path: '/simulador',
        cta: 'Ir al Simulador',
    },
];

export default function QuickStartStepper() {
    const navigate = useNavigate();

    return (
        <section className="py-6">
            <div className="text-center mb-6 space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                    3 pasos para empezar
                </h2>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-lg mx-auto">
                    Seguí este recorrido simple para aprovechar la plataforma.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {steps.map((step) => (
                    <div
                        key={step.number}
                        className="rounded-2xl p-5 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] hover:border-[#005A36]/50 transition-colors flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38]">
                                    {step.number}
                                </span>
                                <div className="w-9 h-9 rounded-xl bg-[#F1F5F9] dark:bg-[#1E2730] text-[#005A36] dark:text-[#6EE7B7] flex items-center justify-center">
                                    <i className={`fa-solid ${step.icon} text-sm`} aria-hidden="true" />
                                </div>
                            </div>

                            <h3 className="text-base font-bold text-[#1E293B] dark:text-[#F1F5F9] mb-1.5">
                                {step.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed mb-5">
                                {step.description}
                            </p>
                        </div>

                        <Button
                            size="sm"
                            onPress={() => navigate(step.path)}
                            className="font-semibold text-xs w-full h-9 rounded-xl bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] text-white"
                            endContent={<i className="fa-solid fa-arrow-right text-[10px]" />}
                        >
                            {step.cta}
                        </Button>
                    </div>
                ))}
            </div>
        </section>
    );
}
