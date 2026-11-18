import { useDisclosure } from '@heroui/react';
import React, { useEffect, useState } from 'react';
import FiltroMateriasModal from './modals/FiltroMateriasModal';

function MateriasProgreso({ progreso, materias }) {
    const [seleccionada, setSeleccionada] = useState();
    const materiasTotales = materias.length;

    const stats = [
        {
            label: 'Disponibles',
            estado: 'Disponible',
            count: materias.filter(m => progreso[m.codigo] === 'Disponible').length,
            icon: 'fa-solid fa-lock-open',
            cardClass: 'bg-[#F0F9FF] dark:bg-[#0F2636]/70 border-[#BAE6FD] dark:border-[#1E4E6E] hover:border-[#7DD3FC]',
            iconClass: 'text-[#075985] dark:text-[#7DD3FC]',
            valueClass: 'text-[#075985] dark:text-[#7DD3FC]',
        },
        {
            label: 'Regulares',
            estado: 'Regular',
            count: materias.filter(m => progreso[m.codigo] === 'Regular').length,
            icon: 'fa-regular fa-clock',
            cardClass: 'bg-[#FFFBEB] dark:bg-[#2D2210]/70 border-[#FDE68A] dark:border-[#5C4318] hover:border-[#FCD34D]',
            iconClass: 'text-[#92400E] dark:text-[#FCD34D]',
            valueClass: 'text-[#92400E] dark:text-[#FCD34D]',
        },
        {
            label: 'Aprobadas',
            estado: 'Aprobado',
            count: materias.filter(m => progreso[m.codigo] === 'Aprobado').length,
            icon: 'fa-regular fa-circle-check',
            cardClass: 'bg-[#ECFDF5] dark:bg-[#102A20]/80 border-[#A7F3D0] dark:border-[#1E4D38] hover:border-[#478559]',
            iconClass: 'text-[#166534] dark:text-[#86EFAC]',
            valueClass: 'text-[#166534] dark:text-[#86EFAC]',
        },
        {
            label: 'Promocionadas',
            estado: 'Promocionado',
            count: materias.filter(m => progreso[m.codigo] === 'Promocionado').length,
            icon: 'fa-solid fa-award',
            cardClass: 'bg-[#ECFDF5] dark:bg-[#112E22] border-[#478559]/50 dark:border-[#2E8B63] hover:border-[#005A36]',
            iconClass: 'text-[#005A36] dark:text-[#A7F3D0]',
            valueClass: 'text-[#005A36] dark:text-[#A7F3D0]',
        },
        {
            label: 'Bloqueadas',
            estado: 'Bloqueado',
            count: materias.filter(m => progreso[m.codigo] === 'Bloqueado').length,
            icon: 'fa-solid fa-lock',
            cardClass: 'bg-[#F1F5F9] dark:bg-[#1A2129] border-[#E2E8F0] dark:border-[#2D3743] hover:border-[#CBD5E1]',
            iconClass: 'text-[#64748B] dark:text-[#94A3B8]',
            valueClass: 'text-[#475569] dark:text-[#CBD5E1]',
        },
    ];

    const calcularPorcentaje = (cant) => (materiasTotales > 0 ? Math.round((cant * 100) / materiasTotales) : 0);

    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const {
        isOpen: isDetailOpen,
        onOpen: onDetailOpen,
        onOpenChange: onDetailOpenChange,
        onClose: onDetailClose,
    } = useDisclosure();
    const [titulo, setTitulo] = useState();

    const handleClick = (estado, tituloModal) => {
        setSeleccionada(estado);
        setTitulo(tituloModal);
        onOpen();
        window.history.pushState({ modalOpen: true }, '');
    };

    useEffect(() => {
        const handlePopState = () => {
            if (!isDetailOpen) {
                onOpenChange(false);
            }
        };
        if (isOpen) {
            window.addEventListener('popstate', handlePopState);
        }
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isOpen, onOpenChange, isDetailOpen]);

    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {stats.map((stat) => {
                    const porcentaje = calcularPorcentaje(stat.count);
                    return (
                        <button
                            key={stat.estado}
                            type="button"
                            onClick={() => handleClick(stat.estado, stat.label)}
                            className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl border transition-colors cursor-pointer text-left ${stat.cardClass}`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <i className={`${stat.icon} text-xs shrink-0 ${stat.iconClass}`} aria-hidden="true" />
                                <div className="min-w-0">
                                    <span className="text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9] block truncate">
                                        {stat.label}
                                    </span>
                                    <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] tabular-nums block">
                                        {stat.count} {stat.count === 1 ? 'materia' : 'materias'}
                                    </span>
                                </div>
                            </div>
                            <span className={`text-sm font-bold tabular-nums shrink-0 ${stat.valueClass}`}>
                                {porcentaje}%
                            </span>
                        </button>
                    );
                })}
            </div>

            <FiltroMateriasModal
                estado={seleccionada}
                materias={materias}
                progreso={progreso}
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                titulo={titulo}
                isDetailOpen={isDetailOpen}
                onDetailOpen={onDetailOpen}
                onDetailOpenChange={onDetailOpenChange}
                onDetailClose={onDetailClose}
            />
        </>
    );
}

export default MateriasProgreso;
