import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from "@heroui/react";

/**
 * MateriaNode: Componente personalizado para renderizar cada materia como un nodo en el grafo de React Flow.
 * Estilo visual alineado con las tarjetas de materia del Portal Estudiantil (Imagen 5).
 */
const MateriaNode = ({ data, targetPosition = Position.Left, sourcePosition = Position.Right }) => {
    const { materia, estado, onClick } = data;

    // Estados y badges
    const getBadgeInfo = () => {
        switch (estado) {
            case 'Seleccionada':
            case 'Cursando':
            case 'Cursado':
                return { label: '• Cursando', badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800', borderClass: 'border-2 border-blue-500 bg-blue-50/20 shadow-md shadow-blue-500/10 ring-2 ring-blue-400/20' };
            case 'Aprobado':
            case 'Aprobada':
            case 'Promocionado':
            case 'Promocionada':
                return { label: '• Aprobada', badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800', borderClass: 'border-emerald-500/60 bg-emerald-50/10 shadow-xs' };
            case 'Regular':
                return { label: '• Regular', badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800', borderClass: 'border-amber-400/60 bg-amber-50/10 shadow-xs' };
            case 'Proyectada':
            case 'Por Cursar':
                return { label: '• Por Cursar', badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800', borderClass: 'border-purple-300/60 bg-purple-50/10 shadow-xs' };
            case 'NoCursada':
            case 'No Cursada':
                return { label: '• No Cursada', badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800', borderClass: 'border-rose-300/60 bg-rose-50/10 shadow-xs' };
            case 'Bloqueado':
            case 'Bloqueada':
                return { label: '• Bloqueada', badgeClass: 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-500', borderClass: 'border-slate-200 dark:border-zinc-800 opacity-60' };
            case 'Disponible':
            default:
                return { label: '• Pendiente', badgeClass: 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400', borderClass: 'border-slate-200/90 dark:border-zinc-800 hover:border-slate-300' };
        }
    };

    const { label, badgeClass, borderClass } = getBadgeInfo();

    return (
        <button 
            type="button"
            className={`transition-all duration-200 hover:scale-[1.02] bg-transparent p-0 border-0 text-left ${onClick ? 'cursor-pointer active:scale-98' : 'cursor-default'}`}
            onClick={() => onClick && onClick(materia.codigo)}
            aria-label={`Ver detalle de ${materia.nombre}`}
        >
            <Handle type="target" position={targetPosition} style={{ background: '#94a3b8', width: 6, height: 6 }} />

            {/* Tarjeta visual de la materia (Imagen 5) */}
            <Card className={`w-[240px] bg-white dark:bg-zinc-900 rounded-xl p-3.5 shadow-xs transition-all duration-200 ${borderClass}`}>
                {/* Fila Superior: Nombre a la izquierda, Código + Ojo a la derecha */}
                <div className="flex justify-between items-start gap-2">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100 leading-snug line-clamp-2 flex-1" title={materia.nombre}>
                        {materia.nombre}
                    </h4>
                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 dark:text-zinc-500 shrink-0">
                        <span>{materia.codigo}</span>
                        <i className="fa-regular fa-eye text-[10px] opacity-70" />
                    </div>
                </div>

                {/* Fila Media: Año y Cuatrimestre */}
                <div className="mt-1">
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-normal">
                        {materia.anio}° Año · C{materia.cuatrimestre}
                    </span>
                </div>

                {/* Fila Inferior: Pill Badge de Estado */}
                <div className="mt-2.5 flex items-center">
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1 ${badgeClass}`}>
                        {label}
                    </span>
                </div>
            </Card>

            <Handle type="source" position={sourcePosition} style={{ background: '#94a3b8', width: 6, height: 6 }} />
        </button>
    );
};

// Se usa memo para evitar re-renderizados innecesarios de los nodos si sus datos no cambian
export default memo(MateriaNode);

