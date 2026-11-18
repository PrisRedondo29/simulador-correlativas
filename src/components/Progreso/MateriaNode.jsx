import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@heroui/react';

/**
 * MateriaNode: Nodo del grafo unificado con el semáforo calmo UNLu.
 */
const MateriaNode = ({ data, targetPosition = Position.Left, sourcePosition = Position.Right }) => {
    const { materia, estado, onClick } = data;

    const getBadgeInfo = () => {
        switch (estado) {
            case 'Seleccionada':
            case 'Cursando':
            case 'Cursado':
                return {
                    label: 'Cursando',
                    icon: 'fa-solid fa-play',
                    badgeClass: 'bg-[#005A36] text-white dark:bg-[#2E8B63]',
                    borderClass: 'border-2 border-[#005A36] dark:border-[#4A9D68] bg-[#F0FDF4] dark:bg-[#122D22]',
                };
            case 'Aprobado':
            case 'Aprobada':
            case 'Promocionado':
            case 'Promocionada':
                return {
                    label: 'Aprobada',
                    icon: 'fa-solid fa-circle-check',
                    badgeClass: 'bg-[#D1FAE5] text-[#166534] dark:bg-[#173A24] dark:text-[#86EFAC]',
                    borderClass: 'border border-[#A7F3D0] dark:border-[#1E4D38] bg-[#ECFDF5] dark:bg-[#102A20]',
                };
            case 'Regular':
                return {
                    label: 'Regular',
                    icon: 'fa-regular fa-clock',
                    badgeClass: 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#423115] dark:text-[#FCD34D]',
                    borderClass: 'border border-[#FDE68A] dark:border-[#5C4318] bg-[#FFFBEB] dark:bg-[#2D2210]',
                };
            case 'Proyectada':
            case 'Por Cursar':
                return {
                    label: 'Por cursar',
                    icon: 'fa-regular fa-calendar',
                    badgeClass: 'bg-[#F1F5F9] text-[#475569] dark:bg-[#1E2730] dark:text-[#94A3B8]',
                    borderClass: 'border border-dashed border-[#CBD5E1] dark:border-[#2A3540] bg-white dark:bg-[#161D24]',
                };
            case 'NoCursada':
            case 'No Cursada':
                return {
                    label: 'No cursada',
                    icon: 'fa-solid fa-xmark',
                    badgeClass: 'bg-[#F1F5F9] text-[#64748B] dark:bg-[#1E2730] dark:text-[#94A3B8]',
                    borderClass: 'border border-dashed border-[#CBD5E1] dark:border-[#2A3540] bg-[#F8FAFC] dark:bg-[#161D24] opacity-80',
                };
            case 'Bloqueado':
            case 'Bloqueada':
                return {
                    label: 'Bloqueada',
                    icon: 'fa-solid fa-lock',
                    badgeClass: 'bg-[#E2E8F0]/80 text-[#475569] dark:bg-[#2A3540] dark:text-[#94A3B8]',
                    borderClass: 'border border-[#E2E8F0] dark:border-[#2D3743] bg-[#F1F5F9] dark:bg-[#1A2129]',
                };
            case 'Disponible':
            default:
                return {
                    label: 'Disponible',
                    icon: 'fa-solid fa-lock-open',
                    badgeClass: 'bg-[#E0F2FE] text-[#075985] dark:bg-[#16384F] dark:text-[#7DD3FC]',
                    borderClass: 'border border-[#BAE6FD] dark:border-[#1E4E6E] bg-[#F0F9FF] dark:bg-[#0F2636]',
                };
        }
    };

    const { label, icon, badgeClass, borderClass } = getBadgeInfo();
    const hasCorrelativas = materia.correlativas && materia.correlativas.length > 0;

    return (
        <button
            type="button"
            className={`transition-colors duration-150 bg-transparent p-0 border-0 text-left w-[255px] sm:w-[275px] ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={() => onClick && onClick(materia.codigo)}
            aria-label={`Seleccionar ${materia.nombre}`}
        >
            <Handle type="target" position={targetPosition} style={{ background: '#478559', width: 7, height: 7, borderRadius: '50%' }} />

            <Card shadow="none" className={`w-full rounded-xl p-3.5 transition-colors duration-150 ${borderClass}`}>
                <div className="flex justify-between items-start gap-2">
                    <h4 className="text-xs sm:text-[13px] font-semibold text-[#1E293B] dark:text-[#F1F5F9] leading-snug line-clamp-2 flex-1" title={materia.nombre}>
                        {materia.nombre}
                    </h4>
                    <span className="text-[11px] font-mono font-medium text-[#64748B] dark:text-[#94A3B8] shrink-0 tabular-nums">
                        {materia.codigo}
                    </span>
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    <span>
                        {materia.anio}° Año · {materia.cuatrimestre}° Cuatri
                    </span>
                    {materia.horas_semanales && (
                        <span className="tabular-nums">{materia.horas_semanales}h/s</span>
                    )}
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-1.5 flex-wrap pt-2 border-t border-[#E2E8F0]/70 dark:border-[#2A3540]">
                    <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1.5 ${badgeClass}`}>
                        <i className={`${icon} text-[9px]`} aria-hidden="true" />
                        {label}
                    </span>

                    {hasCorrelativas && (
                        <span className="text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8] truncate max-w-[110px]" title={`Correlativas: ${materia.correlativas.join(', ')}`}>
                            Req: {materia.correlativas.join(', ')}
                        </span>
                    )}
                </div>
            </Card>

            <Handle type="source" position={sourcePosition} style={{ background: '#478559', width: 7, height: 7, borderRadius: '50%' }} />
        </button>
    );
};

export default memo(MateriaNode);
