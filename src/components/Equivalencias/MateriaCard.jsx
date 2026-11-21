import React from 'react';
import { Clock, Calendar, CheckCircle2, AlertCircle, Circle, HelpCircle, Unlock } from 'lucide-react';

const MateriaCard = ({ materia, estado, isNewPlan = false, onClick }) => {
    const getStatusConfig = () => {
        switch (estado) {
            case 'Aprobado':
            case 'Promocionado':
                return {
                    border: 'border-[#A7F3D0] dark:border-[#1E4D38]',
                    sideBar: 'bg-[#478559]',
                    bg: 'bg-[#ECFDF5] dark:bg-[#102A20]/80',
                    accent: 'text-[#166534] dark:text-[#86EFAC]',
                    badgeClass: 'bg-[#D1FAE5] text-[#166534] dark:bg-[#173A24] dark:text-[#86EFAC]',
                    icon: <CheckCircle2 size={11} strokeWidth={2.5} />,
                    label: 'Aprobada',
                };
            case 'Cursando':
                return {
                    border: 'border-[#C084FC] dark:border-[#7E22CE]',
                    sideBar: 'bg-[#7E22CE] dark:bg-[#A855F7]',
                    bg: 'bg-[#FAF5FF] dark:bg-[#2E1065]/75',
                    accent: 'text-[#6B21A8] dark:text-[#E9D5FF]',
                    badgeClass: 'bg-[#7E22CE] text-white dark:bg-[#9333EA] dark:text-white',
                    icon: <Clock size={11} strokeWidth={2.5} />,
                    label: 'Cursando',
                };
            case 'Regular':
                return {
                    border: 'border-[#FDE68A] dark:border-[#5C4318]',
                    sideBar: 'bg-[#D97706]',
                    bg: 'bg-[#FFFBEB] dark:bg-[#2D2210]/70',
                    accent: 'text-[#92400E] dark:text-[#FCD34D]',
                    badgeClass: 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#423115] dark:text-[#FCD34D]',
                    icon: <AlertCircle size={11} strokeWidth={2.5} />,
                    label: 'Regular',
                };
            case 'Sin equivalencia':
                return {
                    border: 'border-[#CBD5E1] dark:border-[#2A3540] border-dashed',
                    sideBar: 'bg-[#94A3B8]/40',
                    bg: 'bg-[#F8FAFC] dark:bg-[#161D24] opacity-75',
                    accent: 'text-[#64748B] dark:text-[#94A3B8]',
                    badgeClass: 'bg-[#F1F5F9] text-[#64748B] dark:bg-[#1E2730] dark:text-[#94A3B8]',
                    icon: <HelpCircle size={11} />,
                    label: 'Sin equiv.',
                };
            case 'Disponible':
            default:
                return isNewPlan
                    ? {
                        border: 'border-[#BAE6FD] dark:border-[#1E4E6E]',
                        sideBar: 'bg-[#075985] dark:bg-[#38BDF8]',
                        bg: 'bg-[#F0F9FF] dark:bg-[#0F2636]/70',
                        accent: 'text-[#075985] dark:text-[#7DD3FC]',
                        badgeClass: 'bg-[#E0F2FE] text-[#075985] dark:bg-[#16384F] dark:text-[#7DD3FC]',
                        icon: <Unlock size={11} strokeWidth={2.5} />,
                        label: 'Disponible',
                    }
                    : {
                        border: 'border-[#E2E8F0] dark:border-[#2A3540]',
                        sideBar: 'bg-[#94A3B8]',
                        bg: 'bg-white dark:bg-[#161D24]',
                        accent: 'text-[#64748B] dark:text-[#94A3B8]',
                        badgeClass: 'bg-[#F1F5F9] text-[#475569] dark:bg-[#1E2730] dark:text-[#CBD5E1]',
                        icon: <Circle size={10} />,
                        label: 'Pendiente',
                    };
        }
    };

    const config = getStatusConfig();

    return (
        <div
            onClick={onClick}
            className={`group relative flex items-stretch overflow-hidden rounded-xl border transition-colors duration-150 ${config.border} ${config.bg} ${
                onClick ? 'cursor-pointer hover:border-[#005A36]/50' : ''
            }`}
        >
            <div className={`w-1 shrink-0 ${config.sideBar}`} />

            <div className="flex flex-col grow p-2.5 sm:p-3.5 gap-1.5 min-w-0">
                <div className="flex items-center justify-between gap-1.5 w-full">
                    <span className={`text-[10px] sm:text-xs font-mono font-semibold tracking-wide ${config.accent}`}>
                        {materia.mostrarCodigo === false ? '---' : materia.codigo}
                    </span>

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${config.badgeClass}`}>
                        {config.icon}
                        <span>{config.label}</span>
                    </span>
                </div>

                <h4 className="text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] leading-snug line-clamp-3 sm:line-clamp-2">
                    {materia.nombre}
                </h4>

                <div className="flex items-center gap-2 mt-auto pt-1.5 border-t border-[#E2E8F0]/60 dark:border-[#2A3540] text-[10px] sm:text-xs text-[#64748B] dark:text-[#94A3B8] font-medium tabular-nums">
                    <span className="inline-flex items-center gap-1">
                        <Clock size={11} />
                        {materia.horas_totales}h
                    </span>
                    {materia.horas_semanales && (
                        <span className="inline-flex items-center gap-1">
                            <Calendar size={11} />
                            {materia.horas_semanales}h/s
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MateriaCard;
