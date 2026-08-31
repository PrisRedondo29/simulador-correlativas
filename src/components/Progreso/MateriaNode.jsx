import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from "@heroui/react";

/**
 * MateriaNode: Componente para renderizar cada materia en el grafo.
 * Rediseñado con enfoque Mobile-First para alta legibilidad y contraste.
 */
const MateriaNode = ({ data, targetPosition = Position.Left, sourcePosition = Position.Right }) => {
    const { materia, estado, onClick } = data;

    // Estados, colores y badges de contraste elevado
    const getBadgeInfo = () => {
        switch (estado) {
            case 'Seleccionada':
            case 'Cursando':
            case 'Cursado':
                return {
                    label: 'Cursando',
                    icon: 'fa-solid fa-play',
                    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-300 dark:border-blue-700',
                    borderClass: 'border-2 border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 shadow-md shadow-blue-500/15 ring-2 ring-blue-400/20'
                };
            case 'Aprobado':
            case 'Aprobada':
            case 'Promocionado':
            case 'Promocionada':
                return {
                    label: 'Aprobada',
                    icon: 'fa-solid fa-circle-check',
                    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700',
                    borderClass: 'border-2 border-emerald-500/80 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs'
                };
            case 'Regular':
                return {
                    label: 'Regular',
                    icon: 'fa-solid fa-clock',
                    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700',
                    borderClass: 'border-2 border-amber-400/80 bg-amber-50/30 dark:bg-amber-950/20 shadow-xs'
                };
            case 'Proyectada':
            case 'Por Cursar':
                return {
                    label: 'Por Cursar',
                    icon: 'fa-solid fa-calendar-plus',
                    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border border-purple-300 dark:border-purple-700',
                    borderClass: 'border-2 border-purple-400/70 bg-purple-50/30 dark:bg-purple-950/20 shadow-xs'
                };
            case 'NoCursada':
            case 'No Cursada':
                return {
                    label: 'No Cursada',
                    icon: 'fa-solid fa-xmark',
                    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300 dark:border-rose-700',
                    borderClass: 'border-2 border-rose-300/70 bg-rose-50/30 dark:bg-rose-950/20 shadow-xs'
                };
            case 'Bloqueado':
            case 'Bloqueada':
                return {
                    label: 'Bloqueada',
                    icon: 'fa-solid fa-lock',
                    badgeClass: 'bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700',
                    borderClass: 'border-2 border-slate-300/80 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-900/60 opacity-75'
                };
            case 'Disponible':
            default:
                return {
                    label: 'Disponible',
                    icon: 'fa-solid fa-unlock',
                    badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 border border-teal-300 dark:border-teal-700',
                    borderClass: 'border-2 border-teal-400/70 dark:border-teal-600/70 bg-teal-50/20 dark:bg-teal-950/10 hover:border-teal-500 shadow-xs'
                };
        }
    };

    const { label, icon, badgeClass, borderClass } = getBadgeInfo();
    const hasCorrelativas = materia.correlativas && materia.correlativas.length > 0;

    return (
        <button 
            type="button"
            className={`transition-all duration-200 hover:scale-[1.02] bg-transparent p-0 border-0 text-left w-[260px] sm:w-[280px] ${onClick ? 'cursor-pointer active:scale-98' : 'cursor-default'}`}
            onClick={() => onClick && onClick(materia.codigo)}
            aria-label={`Ver detalle de ${materia.nombre}`}
        >
            <Handle type="target" position={targetPosition} style={{ background: '#3b82f6', width: 8, height: 8, borderRadius: '50%' }} />

            {/* Tarjeta visual de la materia amplia y legible */}
            <Card className={`w-full bg-white dark:bg-zinc-900 rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all duration-200 ${borderClass}`}>
                {/* Fila Superior: Nombre + Código */}
                <div className="flex justify-between items-start gap-2">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-zinc-100 leading-snug line-clamp-2 flex-1 tracking-tight" title={materia.nombre}>
                        {materia.nombre}
                    </h4>
                    <div className="flex items-center gap-1 text-[11px] sm:text-xs font-mono font-bold text-slate-500 dark:text-zinc-400 shrink-0 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-zinc-700">
                        <span>{materia.codigo}</span>
                    </div>
                </div>

                {/* Fila Media: Año y Cuatrimestre */}
                <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-semibold">
                        {materia.anio}° Año · {materia.cuatrimestre}° Cuatrimestre
                    </span>
                    {materia.horas_semanales && (
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                            {materia.horas_semanales}h/sem
                        </span>
                    )}
                </div>

                {/* Fila Inferior: Pill Badge de Estado + Correlativas si existen */}
                <div className="mt-3 flex items-center justify-between gap-1 flex-wrap pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                    <span className={`text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1.5 ${badgeClass}`}>
                        <i className={`${icon} text-[10px]`} />
                        {label}
                    </span>

                    {hasCorrelativas && (
                        <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 truncate max-w-[120px]" title={`Correlativas: ${materia.correlativas.join(', ')}`}>
                            Req: {materia.correlativas.join(', ')}
                        </span>
                    )}
                </div>
            </Card>

            <Handle type="source" position={sourcePosition} style={{ background: '#3b82f6', width: 8, height: 8, borderRadius: '50%' }} />
        </button>
    );
};

export default memo(MateriaNode);

