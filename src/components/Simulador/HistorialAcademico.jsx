import React from 'react'
import { Button, Accordion, AccordionItem, Card, CardBody, Chip } from '@heroui/react'
import tituloIntermedioUtils from '../../utils/Progreso/tituloIntermedioUtils'
import { getPlanPolicy } from '../../config/planPolicies'

/**
 * Muestra el historial de semestres completados como una línea de tiempo con acordeones.
 */
function HistorialAcademico({ historialSemestres, openedAccordions, setOpenedAccordions, descargandoPDF, plan, materias }) {
    if (historialSemestres.length === 0) return null

    const planPolicy = getPlanPolicy(plan);
    const tituloIntermedioNombre = tituloIntermedioUtils.getTituloIntermedioNombre(plan);
    const materiasIntermedio = tituloIntermedioUtils.getMateriasIntermedio(plan, materias);

    // Encontrar en qué índice de historial se alcanza el título intermedio
    let indiceIntermedio = -1;
    if (materiasIntermedio.length > 0) {
        for (let i = 0; i < historialSemestres.length; i++) {
            const snap = historialSemestres[i].progresoSnapshot;
            // Convertimos el progreso del simulador (Cursado/No Cursado) al formato esperado por la utilidad (Aprobado/Promocionado)
            // O adaptamos la utilidad para que acepte un mapeo de estados.
            // En el simulador usamos 'Cursado'.
            const mappedProgreso = {};
            Object.keys(snap).forEach(key => {
                if (snap[key] === 'Cursado') mappedProgreso[key] = 'Aprobado';
            });

            const { completadas, totales } = tituloIntermedioUtils.calcularProgresoIntermedio(materiasIntermedio, mappedProgreso);
            if (completadas === totales) {
                indiceIntermedio = i;
                break;
            }
        }
    }

    return (
        <div
            id="historial-container"
            className={`flex flex-col mb-4 relative px-5 md:px-8 py-5 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl m-0 ${descargandoPDF ? 'w-[800px] max-w-none mx-0' : 'w-full'}`}
        >
            {/* Encabezado del PDF (solo visible al capturar) */}
            {descargandoPDF && (
                <div className="w-full text-center py-6 mb-4 border-b-2 border-[#005A36]/20">
                    <h1 className="text-3xl font-bold text-[#1E293B] tracking-tight">Registro de Avance Universitario</h1>
                    <h2 className="text-base font-medium text-[#005A36] mt-1 uppercase tracking-wider">
                        {planPolicy.carrera} — Plan {plan}
                    </h2>
                </div>
            )}

            {/* Línea vertical de la timeline */}
            <div
                className={`absolute top-6 bottom-6 left-[19px] md:left-[31px] w-[2px] bg-[#E2E8F0] dark:bg-[#2A3540] ${descargandoPDF ? 'top-[150px]' : ''}`}
                data-html2canvas-ignore
            />

            {/* Barra de acciones */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3 pl-5" data-html2canvas-ignore>
                <h3 className="text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wider flex items-center gap-2">
                    <i className="fa-regular fa-clock text-[#005A36] dark:text-[#6EE7B7]" /> Historial Académico ({historialSemestres.length})
                </h3>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                        size="sm" variant="flat"
                        onPress={() => setOpenedAccordions(new Set(historialSemestres.map((_, i) => String(i))))}
                        className="font-medium text-xs flex-1 sm:flex-none bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0]"
                    >
                        Mostrar todos
                    </Button>
                    <Button
                        size="sm" variant="light"
                        onPress={() => setOpenedAccordions(new Set())}
                        className="font-medium text-xs flex-1 sm:flex-none text-[#64748B] dark:text-[#94A3B8]"
                    >
                        Ocultar todos
                    </Button>
                </div>
            </div>

            {/* Lista de semestres */}
            <div className="flex flex-col gap-4 pl-5">
                {historialSemestres.map((item, idx) => {
                    const materiasCursadasReales = item.materiasDelSemestre.filter(
                        m => item.progresoSnapshot[m.codigo] === 'Cursado' && item.progresoBaseSnapshot[m.codigo] !== 'Cursado'
                    )
                    const totalSemestre = item.materiasDelSemestre.length
                    let horasTotales = 0, horasSemanales = 0
                    materiasCursadasReales.forEach(m => {
                        horasTotales += Number(m.horas_totales) || 0
                        horasSemanales += Number(m.horas_semanales) || 0
                    })

                    return (
                        <div key={`${item.anioActual}-${item.cuatri}-${idx}`} className="relative">
                            {/* Nodo de la timeline */}
                            <div
                                className={`absolute -left-[31px] top-4 ${idx === indiceIntermedio ? 'bg-[#005A36]' : 'bg-[#478559]'} text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] ring-4 ring-white dark:ring-[#161D24] z-10`}
                                data-html2canvas-ignore
                            >
                                <i className={`fa-solid ${idx === indiceIntermedio ? 'fa-graduation-cap' : 'fa-check'}`} />
                            </div>

                            {/* Aviso de Título Intermedio */}
                            {idx === indiceIntermedio && (
                                <div className="mb-2 inline-flex items-center gap-1.5 bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38] text-xs font-semibold px-3 py-1 rounded-lg">
                                    <i className="fa-solid fa-graduation-cap" />
                                    <span>Alcanzás el {tituloIntermedioNombre}</span>
                                </div>
                            )}

                            <Accordion
                                selectionMode="multiple"
                                selectedKeys={openedAccordions.has(String(idx)) ? [String(idx)] : []}
                                onSelectionChange={(keys) => {
                                    setOpenedAccordions(prev => {
                                        const next = new Set(prev)
                                        if (keys.has(String(idx))) next.add(String(idx))
                                        else next.delete(String(idx))
                                        return next
                                    })
                                }}
                                className="bg-[#F8FAFC] dark:bg-[#1E2730] rounded-xl border border-[#E2E8F0] dark:border-[#2A3540] shadow-none w-full"
                            >
                                <AccordionItem
                                    key={String(idx)}
                                    aria-label={`Completado ${item.cuatri}º Cuatrimestre`}
                                    title={
                                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mr-2 py-0.5 w-full">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-[#1E293B] dark:text-[#F1F5F9] text-sm sm:text-base tracking-tight">
                                                    {item.cuatri}º Cuatrimestre <span className="text-[#94A3B8] mx-1">·</span> {item.anioActual}
                                                </span>
                                                {item.esImportado && (
                                                    <Chip 
                                                        size="sm" 
                                                        variant="flat" 
                                                        color="primary" 
                                                        className="h-5 text-[10px] font-medium"
                                                        startContent={<i className="fa-solid fa-cloud-arrow-down mr-1" />}
                                                    >
                                                        Importado
                                                    </Chip>
                                                )}
                                            </div>
                                            <span className="text-xs text-[#475569] dark:text-[#CBD5E1] font-medium bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] px-2.5 py-0.5 rounded-lg whitespace-nowrap tabular-nums">
                                                {materiasCursadasReales.length} de {totalSemestre}
                                            </span>
                                            {(horasTotales > 0 || horasSemanales > 0) && (
                                                <div className="w-full flex gap-3 text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                                                    {horasTotales > 0 && (
                                                        <span className="flex items-center gap-1 whitespace-nowrap">
                                                            <i data-html2canvas-ignore className="fa-regular fa-clock" /> {horasTotales}h totales
                                                        </span>
                                                    )}
                                                    {horasSemanales > 0 && (
                                                        <span className="flex items-center gap-1 whitespace-nowrap">
                                                            <i data-html2canvas-ignore className="fa-solid fa-calendar-week" /> {horasSemanales}h/sem
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    }
                                >
                                    <div className={`grid ${descargandoPDF ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'} gap-2.5 px-1 pb-4`}>
                                        {item.materiasDelSemestre.map(materia => {
                                            const isCursado = item.progresoSnapshot[materia.codigo] === 'Cursado';
                                            return (
                                                <Card
                                                    key={materia.codigo}
                                                    shadow="none"
                                                    className={`relative overflow-hidden border transition-colors ${isCursado ? 'bg-[#ECFDF5] dark:bg-[#102A20] border-[#A7F3D0] dark:border-[#1E4D38]' : 'bg-[#FFFBEB] dark:bg-[#2D2210] border-[#FDE68A] dark:border-[#5C4318]'}`}
                                                >
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isCursado ? 'bg-[#478559]' : 'bg-[#D97706]'}`} />

                                                    <CardBody className="p-2.5 pl-4 flex flex-row items-center gap-3 overflow-hidden">
                                                        <div className={`hidden sm:flex w-8 h-8 rounded-lg items-center justify-center shrink-0 ${isCursado ? 'bg-[#D1FAE5] dark:bg-[#173A24] text-[#166534] dark:text-[#86EFAC]' : 'bg-[#FEF3C7] dark:bg-[#423115] text-[#92400E] dark:text-[#FCD34D]'}`} data-html2canvas-ignore>
                                                            <i className={`fa-regular ${isCursado ? 'fa-circle-check' : 'fa-clock'} text-sm`} />
                                                        </div>

                                                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                                                            <div className="flex justify-between items-center w-full">
                                                                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-foreground/40 leading-none whitespace-nowrap">
                                                                    {materia.mostrarCodigo === false ? '---' : materia.codigo}
                                                                </span>
                                                                <div className='sm:hidden' data-html2canvas-ignore>
                                                                    <i className={`fa-regular ${isCursado ? 'fa-circle-check text-success' : 'fa-clock text-warning'} text-[10px]`} />
                                                                </div>
                                                            </div>
                                                            <h4 className="text-xs sm:text-sm font-bold text-foreground/80 leading-tight">
                                                                {materia.nombre}
                                                            </h4>
                                                            <div className="flex gap-3 mt-0.5 text-[9px] sm:text-[10px] font-medium text-foreground/50">
                                                                {materia.horas_totales > 0 && (
                                                                    <span className="flex items-center gap-1">
                                                                        <i data-html2canvas-ignore className="fa-regular fa-clock" /> {materia.horas_totales}h tot.
                                                                    </span>
                                                                )}
                                                                {materia.horas_semanales > 0 && (
                                                                    <span className="flex items-center gap-1">
                                                                        <i data-html2canvas-ignore className="fa-solid fa-calendar-week" /> {materia.horas_semanales}h/sem
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardBody>
                                                </Card>
                                            );
                                        })}
                                        {item.materiasDelSemestre.length === 0 && (
                                            <div className="col-span-full text-sm text-foreground/60 p-2">No hubo materias disponibles.</div>
                                        )}
                                    </div>
                                </AccordionItem>
                            </Accordion>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default HistorialAcademico
