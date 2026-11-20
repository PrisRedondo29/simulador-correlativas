import React, { useMemo } from 'react';
import { Accordion, AccordionItem, Chip } from '@heroui/react';
import { ArrowRight, Info, Repeat } from 'lucide-react';
import MateriaCard from '../Equivalencias/MateriaCard';

function ListaMaterias({ sourcePlan, targetPlan, materiasFiltradas, progreso }) {
    const origenLabel = sourcePlan ? `Plan ${sourcePlan}` : 'Plan origen';
    const destinoLabel = targetPlan ? `Plan ${targetPlan}` : 'Plan destino';
    const materiasPorAnio = useMemo(() => {
        const grupos = {};
        materiasFiltradas.forEach(grupo => {
            const anio = grupo.anio || '6';
            if (!grupos[anio]) grupos[anio] = [];
            grupos[anio].push(grupo);
        });
        return Object.entries(grupos).sort(([a], [b]) => parseInt(a) - parseInt(b));
    }, [materiasFiltradas]);

    if (materiasFiltradas.length === 0) {
        return (
            <div className="py-16 flex flex-col items-center justify-center text-[#64748B] bg-white dark:bg-[#161D24] rounded-2xl border border-dashed border-[#CBD5E1] dark:border-[#2A3540]">
                <Info size={36} strokeWidth={1.5} className="mb-3 opacity-60" />
                <p className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]">No se encontraron resultados</p>
                <p className="text-xs mt-1">Probá ajustando los filtros o la búsqueda</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
            {/* Encabezados de Columna */}
            <div className="grid grid-cols-[1fr_20px_1fr] sm:grid-cols-11 gap-1.5 sm:gap-4 px-3 sm:px-5 py-2 items-center bg-[#F1F5F9] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540] rounded-xl">
                <div className="sm:col-span-5 text-[11px] sm:text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] text-center flex items-center justify-center gap-1.5 truncate">
                    <Repeat size={12} className="shrink-0" />
                    <span className="truncate">{origenLabel} <span className="hidden sm:inline">(Origen)</span></span>
                </div>
                <div className="sm:col-span-1 flex justify-center">
                    <ArrowRight size={14} className="text-[#64748B]" />
                </div>
                <div className="sm:col-span-5 text-[11px] sm:text-xs font-semibold text-[#005A36] dark:text-[#86EFAC] text-center flex items-center justify-center gap-1.5 truncate">
                    <span className="truncate">{destinoLabel} <span className="hidden sm:inline">(Destino)</span></span>
                </div>
            </div>

            {/* Acordeón por Años */}
            <Accordion
                variant="light"
                className="px-0"
                selectionMode="multiple"
                defaultExpandedKeys={['1']}
                itemClasses={{
                    base: 'py-0 w-full mb-3',
                    title: 'font-semibold text-[#1E293B] dark:text-[#F1F5F9] text-sm',
                    trigger: 'px-4 py-3 bg-white dark:bg-[#161D24] hover:bg-[#F8FAFC] dark:hover:bg-[#1E2730] rounded-xl transition-colors border border-[#E2E8F0] dark:border-[#2A3540]',
                    content: 'pt-3 px-0 sm:px-1',
                    indicator: 'text-[#005A36] dark:text-[#6EE7B7]',
                }}
            >
                {materiasPorAnio.map(([anio, materias]) => (
                    <AccordionItem
                        key={anio}
                        aria-label={`Materias de ${anio}º Año`}
                        startContent={
                            <div className="w-7 h-7 rounded-lg bg-[#ECFDF5] dark:bg-[#102A20] border border-[#A7F3D0] dark:border-[#1E4D38] flex items-center justify-center text-[#005A36] dark:text-[#86EFAC] shrink-0">
                                <span className="font-bold text-xs">{anio}º</span>
                            </div>
                        }
                        title={`${anio}º Año`}
                        subtitle={
                            <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                                {materias.length} {materias.length === 1 ? 'equivalencia' : 'equivalencias'}
                            </span>
                        }
                    >
                        <div className="flex flex-col gap-6 py-1">
                            {[1, 2].map((cuatri) => {
                                const gruposCuatri = materias.filter(
                                    (grupo) => (Number(grupo.cuatrimestre) % 2 === 0 ? 2 : 1) === cuatri
                                );

                                if (gruposCuatri.length === 0) return null;

                                return (
                                    <div key={cuatri} className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between bg-[#F1F5F9] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540] rounded-xl px-3.5 py-2">
                                            <h3 className="text-xs sm:text-sm font-semibold text-[#334155] dark:text-[#E2E8F0]">
                                                {cuatri}° Cuatrimestre
                                            </h3>
                                            <Chip
                                                size="sm"
                                                variant="flat"
                                                className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-[#475569] dark:text-[#CBD5E1] font-medium text-[11px] h-5"
                                            >
                                                {gruposCuatri.length} {gruposCuatri.length === 1 ? 'grupo' : 'grupos'}
                                            </Chip>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                            {gruposCuatri.map((grupo) => {
                                                const todasAprobadas = grupo.materiasViejas.length > 0 &&
                                                    grupo.materiasViejas.every(
                                                        (m) => progreso[m.codigo] === 'Aprobado' || progreso[m.codigo] === 'Promocionado',
                                                    );

                                                const estadoNuevo = grupo.esEquivalente
                                                    ? (todasAprobadas ? 'Aprobado' : 'Disponible')
                                                    : 'Sin equivalencia';

                                                return (
                                                    <div
                                                        key={grupo.id}
                                                        className="grid grid-cols-[1fr_20px_1fr] sm:grid-cols-11 gap-1.5 sm:gap-4 items-center w-full p-2 rounded-2xl bg-white/60 dark:bg-[#161D24]/40 border border-[#E2E8F0]/60 dark:border-[#2A3540]/60"
                                                    >
                                                        <div className="sm:col-span-5 flex flex-col gap-2 min-w-0">
                                                            {grupo.materiasViejas.map((mVieja) => (
                                                                <MateriaCard
                                                                    key={mVieja.codigo}
                                                                    materia={mVieja}
                                                                    estado={progreso[mVieja.codigo]}
                                                                />
                                                            ))}
                                                            {grupo.materiasViejas.length === 0 && (
                                                                <div className="p-3 sm:p-5 rounded-xl border border-dashed border-[#CBD5E1] dark:border-[#2A3540] flex items-center justify-center text-[#64748B] text-xs font-medium bg-[#F8FAFC] dark:bg-[#161D24] text-center">
                                                                    Materia nueva
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="sm:col-span-1 flex justify-center items-center">
                                                            <ArrowRight className="text-[#64748B] dark:text-[#94A3B8]" size={15} />
                                                        </div>

                                                        <div className="sm:col-span-5 min-w-0">
                                                            <MateriaCard
                                                                isNewPlan
                                                                materia={grupo.materiaNueva}
                                                                estado={estadoNuevo}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}

export default ListaMaterias;
