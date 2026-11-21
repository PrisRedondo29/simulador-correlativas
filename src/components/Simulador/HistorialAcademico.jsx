import React from 'react';
import { Accordion, AccordionItem, Button } from '@heroui/react';
import {
    CalendarRange,
    CheckCircle2,
    ChevronsUpDown,
    Clock,
    CloudDownload,
    GraduationCap,
} from 'lucide-react';
import tituloIntermedioUtils from '../../utils/Progreso/tituloIntermedioUtils';

/**
 * Muestra el historial de cuatrimestres simulados alineado al sistema visual UNLu.
 */
function HistorialAcademico({
    historialSemestres,
    openedAccordions,
    setOpenedAccordions,
    plan,
    materias,
    embedded = false,
}) {
    if (!historialSemestres || historialSemestres.length === 0) return null;

    const tituloIntermedioNombre = tituloIntermedioUtils.getTituloIntermedioNombre(plan);
    const materiasIntermedio = tituloIntermedioUtils.getMateriasIntermedio(plan, materias);

    // Determinar en qué cuatrimestre del historial se alcanza el título intermedio
    let indiceIntermedio = -1;
    if (materiasIntermedio.length > 0) {
        for (let i = 0; i < historialSemestres.length; i++) {
            const snap = historialSemestres[i].progresoSnapshot;
            const mappedProgreso = {};
            Object.keys(snap).forEach((key) => {
                if (snap[key] === 'Cursado') mappedProgreso[key] = 'Aprobado';
            });

            const { completadas, totales } = tituloIntermedioUtils.calcularProgresoIntermedio(
                materiasIntermedio,
                mappedProgreso,
            );
            if (totales > 0 && completadas === totales) {
                indiceIntermedio = i;
                break;
            }
        }
    }

    const materiasCursadasTotal = historialSemestres.reduce((acc, item) => {
        const count = item.materiasDelSemestre.filter(
            (m) =>
                item.progresoSnapshot[m.codigo] === 'Cursado' &&
                item.progresoBaseSnapshot[m.codigo] !== 'Cursado',
        ).length;
        return acc + count;
    }, 0);

    const allOpened = openedAccordions.size >= historialSemestres.length;

    const handleToggleAll = () => {
        if (allOpened) {
            setOpenedAccordions(new Set());
        } else {
            setOpenedAccordions(new Set(historialSemestres.map((_, i) => String(i))));
        }
    };

    const containerClass = embedded
        ? 'flex flex-col gap-3 w-full'
        : 'flex flex-col gap-4 relative p-4 sm:p-5 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C] rounded-2xl w-full mb-4';

    return (
        <div id="historial-container" className={containerClass}>
            {/* Barra de Resumen y Control */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    {!embedded && (
                        <h3 className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] mr-1">
                            Historial Académico
                        </h3>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F1F5F9] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540] text-xs font-medium text-[#334155] dark:text-[#E2E8F0] tabular-nums">
                        <CalendarRange size={13} className="text-[#005A36] dark:text-[#6EE7B7]" aria-hidden="true" />
                        {historialSemestres.length}{' '}
                        {historialSemestres.length === 1 ? 'cuatrimestre' : 'cuatrimestres'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ECFDF5] dark:bg-[#102A20] border border-[#A7F3D0] dark:border-[#1E4D38] text-xs font-semibold text-[#005A36] dark:text-[#86EFAC] tabular-nums">
                        <CheckCircle2 size={13} aria-hidden="true" />
                        {materiasCursadasTotal} {materiasCursadasTotal === 1 ? 'materia simulada' : 'materias simuladas'}
                    </span>
                </div>

                <Button
                    size="sm"
                    variant="flat"
                    onPress={handleToggleAll}
                    startContent={<ChevronsUpDown size={14} />}
                    className="font-medium text-xs h-8 rounded-xl bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0]"
                >
                    {allOpened ? 'Contraer todos' : 'Expandir todos'}
                </Button>
            </div>

            {/* Lista Moderna de Cuatrimestres */}
            <Accordion
                variant="splitted"
                selectionMode="multiple"
                selectedKeys={openedAccordions}
                onSelectionChange={(keys) => {
                    if (keys === 'all') {
                        setOpenedAccordions(new Set(historialSemestres.map((_, i) => String(i))));
                    } else {
                        setOpenedAccordions(new Set(Array.from(keys).map(String)));
                    }
                }}
                className="px-0 gap-2.5"
                itemClasses={{
                    base: 'bg-[#F8FAFC] dark:bg-[#0F1419] border border-[#E2E8F0] dark:border-[#2A3540] shadow-none rounded-xl px-3.5 sm:px-4',
                    trigger: 'py-3 cursor-pointer',
                    title: 'w-full',
                    indicator: 'text-[#64748B] dark:text-[#94A3B8]',
                    content: 'pb-3.5 pt-2.5 border-t border-[#E2E8F0]/70 dark:border-[#24303C]',
                }}
            >
                {historialSemestres.map((item, idx) => {
                    const cursadas = item.materiasDelSemestre.filter(
                        (m) => item.progresoSnapshot[m.codigo] === 'Cursado',
                    );
                    const noCursadas = item.materiasDelSemestre.filter(
                        (m) => item.progresoSnapshot[m.codigo] !== 'Cursado',
                    );
                    const materiasCursadasReales = item.materiasDelSemestre.filter(
                        (m) =>
                            item.progresoSnapshot[m.codigo] === 'Cursado' &&
                            item.progresoBaseSnapshot[m.codigo] !== 'Cursado',
                    );

                    let horasTotales = 0;
                    let horasSemanales = 0;
                    materiasCursadasReales.forEach((m) => {
                        horasTotales += Number(m.horas_totales) || 0;
                        horasSemanales += Number(m.horas_semanales) || 0;
                    });

                    const isMilestone = idx === indiceIntermedio;

                    return (
                        <AccordionItem
                            key={String(idx)}
                            aria-label={`Completado ${item.cuatri}° Cuatrimestre ${item.anioActual}`}
                            title={
                                <div className="flex flex-wrap items-center justify-between gap-2 pr-1">
                                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                                        {isMilestone ? (
                                            <span className="w-6 h-6 rounded-lg bg-[#005A36] dark:bg-[#2E8B63] text-white flex items-center justify-center shrink-0">
                                                <GraduationCap size={14} aria-hidden="true" />
                                            </span>
                                        ) : (
                                            <span className="w-6 h-6 rounded-lg bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-[#475569] dark:text-[#CBD5E1] text-[11px] font-bold flex items-center justify-center tabular-nums shrink-0">
                                                #{idx + 1}
                                            </span>
                                        )}

                                        <span className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                                            {item.cuatri}° Cuatrimestre · {item.anioActual}
                                        </span>

                                        {item.esImportado && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E0F2FE] dark:bg-[#16384F] text-[#075985] dark:text-[#7DD3FC] text-[10px] font-semibold">
                                                <CloudDownload size={11} aria-hidden="true" />
                                                Importado
                                            </span>
                                        )}

                                        {isMilestone && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ECFDF5] dark:bg-[#102A20] border border-[#A7F3D0] dark:border-[#1E4D38] text-[#005A36] dark:text-[#86EFAC] text-[10px] font-semibold">
                                                <GraduationCap size={11} aria-hidden="true" />
                                                Alcanzás {tituloIntermedioNombre}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] tabular-nums shrink-0">
                                        <span
                                            className={`px-2 py-0.5 rounded-md font-semibold ${
                                                materiasCursadasReales.length > 0
                                                    ? 'bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38]'
                                                    : 'bg-white dark:bg-[#161D24] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#2A3540]'
                                            }`}
                                        >
                                            {materiasCursadasReales.length} cursadas
                                        </span>

                                        {horasSemanales > 0 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-[#475569] dark:text-[#CBD5E1] font-medium">
                                                <Clock size={11} className="text-[#64748B] dark:text-[#94A3B8]" aria-hidden="true" />
                                                {horasSemanales}h/sem
                                            </span>
                                        )}

                                        {horasTotales > 0 && (
                                            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-[#64748B] dark:text-[#94A3B8] font-medium">
                                                {horasTotales}h tot.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            }
                        >
                            {item.materiasDelSemestre.length === 0 ? (
                                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                                    No hubo materias disponibles en este cuatrimestre.
                                </p>
                            ) : (
                                <>
                                    {cursadas.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {cursadas.map((materia) => (
                                                <div
                                                    key={materia.codigo}
                                                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-[#161D24] border border-[#A7F3D0] dark:border-[#1E4D38]"
                                                >
                                                    <CheckCircle2
                                                        size={15}
                                                        className="text-[#005A36] dark:text-[#6EE7B7] mt-0.5 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    <div className="min-w-0 flex-1 space-y-1">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <h4 className="text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9] leading-snug">
                                                                {materia.nombre}
                                                            </h4>
                                                            <span className="font-mono text-[10px] text-[#64748B] dark:text-[#94A3B8] shrink-0">
                                                                {materia.mostrarCodigo === false ? '---' : materia.codigo}
                                                            </span>
                                                        </div>
                                                        {(materia.horas_semanales > 0 || materia.horas_totales > 0) && (
                                                            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                                                                {[
                                                                    materia.horas_semanales > 0 && `${materia.horas_semanales}h/sem`,
                                                                    materia.horas_totales > 0 && `${materia.horas_totales}h tot.`,
                                                                ]
                                                                    .filter(Boolean)
                                                                    .join(' · ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                                            No marcaste materias para cursar en este cuatrimestre.
                                        </p>
                                    )}

                                    {noCursadas.length > 0 && (
                                        <div className="mt-3 pt-2.5 border-t border-dashed border-[#E2E8F0] dark:border-[#24303C]">
                                            <p className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1.5">
                                                Disponibles sin cursar ({noCursadas.length})
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {noCursadas.map((materia) => (
                                                    <span
                                                        key={materia.codigo}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 dark:bg-[#161D24]/70 border border-[#E2E8F0] dark:border-[#2A3540] text-[11px] text-[#64748B] dark:text-[#94A3B8]"
                                                    >
                                                        <span>{materia.nombre}</span>
                                                        <span className="font-mono text-[10px] opacity-75">
                                                            {materia.mostrarCodigo === false ? '---' : materia.codigo}
                                                        </span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </div>
    );
}

export default HistorialAcademico;
