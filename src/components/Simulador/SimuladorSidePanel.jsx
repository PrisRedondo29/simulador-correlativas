import React from 'react';
import { Button } from '@heroui/react';
import {
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    CloudDownload,
    Compass,
    FileDown,
    GitBranch,
    GraduationCap,
    History,
    PanelRightClose,
    Pin,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PlanTransitionControl from './PlanTransitionControl';

/**
 * Alternativa 2 (Split View): Panel lateral derecho colapsable para escritorio.
 * Concentra selector de modo, controles de cuatrimestre o inspector de correlativas,
 * título intermedio, historial y acciones sin quitar altura vertical al mapa.
 */
function SimuladorSidePanel({
    plan,
    basePlan = null,
    interactionMode,
    onChangeInteractionMode,
    cuatri,
    anioActual,
    elegidasEsteCuatri,
    estadoAnterior,
    estadoSiguiente,
    onAnterior,
    onSiguiente,
    simulacionTerminada = false,
    onOpenFinishModal,
    tituloIntermedioNombre,
    progresoIntermedio,
    isIntermedioCompletado,
    historialSemestres,
    onOpenHistory,
    onDownloadPDF = null,
    descargandoPDF = false,
    planTransition = null,
    onChangePlanTransition = null,
    suggestedTransitionPeriod = null,
    transitionAppliedInfo = null,
    oferta1713Note = null,
    selectedMateria,
    selectedRelations,
    onSelectCodigo,
    onImportarProgreso,
    onOpenConfig,
    onOpenTutorial,
    onClose,
}) {
    const intermedioPct =
        progresoIntermedio?.totales > 0
            ? Math.min(100, Math.round((progresoIntermedio.completadas / progresoIntermedio.totales) * 100))
            : 0;

    return (
        <aside
            aria-label="Panel de control del simulador"
            className="w-[300px] xl:w-[320px] shrink-0 h-full bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl flex flex-col overflow-hidden shadow-2xs"
        >
            {/* Header */}
            <div className="px-3.5 py-2.5 border-b border-[#E2E8F0] dark:border-[#2A3540] flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] truncate">
                        Simulador
                    </span>
                    {plan && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38] text-[11px] font-semibold shrink-0">
                            Plan {plan}
                            {basePlan && basePlan !== plan ? ` (desde ${basePlan})` : ''}
                        </span>
                    )}
                </div>

                <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={onClose}
                    aria-label="Ocultar panel"
                    title="Ocultar panel lateral"
                    className="min-w-8 h-8 text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F1F5F9]"
                >
                    <PanelRightClose size={16} />
                </Button>
            </div>

            {/* Selector de Modo Principal + Descripción Única */}
            <div className="p-3 border-b border-[#E2E8F0] dark:border-[#2A3540] shrink-0">
                <div
                    data-tour="simulador-modos"
                    className="grid grid-cols-2 gap-1 p-1 bg-[#F1F5F9] dark:bg-[#1E2730] rounded-xl border border-[#E2E8F0] dark:border-[#2A3540]"
                >
                    <Button
                        size="sm"
                        variant="flat"
                        onPress={() => onChangeInteractionMode('planificar')}
                        className={`font-medium text-xs h-8 rounded-lg ${
                            interactionMode === 'planificar'
                                ? 'bg-[#005A36] text-white font-semibold shadow-2xs'
                                : 'bg-transparent text-[#64748B] dark:text-[#94A3B8]'
                        }`}
                        startContent={<CalendarRange size={14} />}
                    >
                        Planificar
                    </Button>
                    <Button
                        size="sm"
                        variant="flat"
                        onPress={() => onChangeInteractionMode('explorar')}
                        className={`font-medium text-xs h-8 rounded-lg ${
                            interactionMode === 'explorar'
                                ? 'bg-[#005A36] text-white font-semibold shadow-2xs'
                                : 'bg-transparent text-[#64748B] dark:text-[#94A3B8]'
                        }`}
                        startContent={<GitBranch size={14} />}
                    >
                        Explorar
                    </Button>
                </div>

                <p className="mt-2 text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                    {interactionMode === 'planificar' ? (
                        <>
                            Elegí materias por cuatrimestre para proyectar tu egreso. No modifica{' '}
                            <Link
                                to="/mis-materias"
                                className="font-medium text-[#005A36] dark:text-[#6EE7B7] hover:underline"
                            >
                                Mis Materias
                            </Link>
                            .
                        </>
                    ) : (
                        'Fijá una materia del mapa para ver sus requisitos previos (ámbar) y qué materias habilita (verde).'
                    )}
                </p>
            </div>

            {/* Cuerpo Scrolleable */}
            <div data-tour="simulador-controles" className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                {interactionMode === 'planificar' ? (
                    <>
                        {/* Tarjeta de Cuatrimestre Actual o Finalizada */}
                        <div className="bg-[#F8FAFC] dark:bg-[#0F1419] border border-[#E2E8F0] dark:border-[#2A3540] rounded-xl p-3 space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                                    {simulacionTerminada ? 'Proyección' : 'Cuatrimestre actual'}
                                </span>
                                {simulacionTerminada ? (
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#ECFDF5] dark:bg-[#102A20] border border-[#A7F3D0] dark:border-[#1E4D38] text-[#005A36] dark:text-[#86EFAC]">
                                        Finalizada
                                    </span>
                                ) : (
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-[#334155] dark:text-[#E2E8F0] tabular-nums">
                                        {elegidasEsteCuatri} {elegidasEsteCuatri === 1 ? 'elegida' : 'elegidas'}
                                    </span>
                                )}
                            </div>

                            <div className="text-base font-bold text-[#005A36] dark:text-[#6EE7B7] tabular-nums">
                                {simulacionTerminada ? `Egreso · ${anioActual}` : `${cuatri}° Cuatri · ${anioActual}`}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    size="sm"
                                    variant="flat"
                                    isDisabled={!estadoAnterior}
                                    onPress={onAnterior}
                                    title="Volver al cuatrimestre anterior"
                                    startContent={<ChevronLeft size={14} />}
                                    className="font-medium rounded-xl h-9 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-[#334155] dark:text-[#E2E8F0]"
                                >
                                    Anterior
                                </Button>
                                {simulacionTerminada ? (
                                    <Button
                                        size="sm"
                                        onPress={onOpenFinishModal}
                                        title="Ver resumen de egreso y descargar PDF"
                                        startContent={<GraduationCap size={14} />}
                                        className="font-semibold rounded-xl h-9 bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] dark:hover:bg-[#246B4E] text-white"
                                    >
                                        Resumen / PDF
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        isDisabled={!estadoSiguiente}
                                        onPress={onSiguiente}
                                        title="Confirmar materias elegidas y avanzar al próximo cuatrimestre"
                                        endContent={<ChevronRight size={14} />}
                                        className="font-semibold rounded-xl h-9 bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] dark:hover:bg-[#246B4E] text-white"
                                    >
                                        Siguiente
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Progreso de Título Intermedio */}
                        {progresoIntermedio?.totales > 0 && (
                            <div
                                className={`rounded-xl p-3 border space-y-2 ${
                                    isIntermedioCompletado
                                        ? 'bg-[#ECFDF5] dark:bg-[#102A20] border-[#A7F3D0] dark:border-[#1E4D38]'
                                        : 'bg-[#F8FAFC] dark:bg-[#0F1419] border-[#E2E8F0] dark:border-[#2A3540]'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2 text-xs">
                                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#1E293B] dark:text-[#F1F5F9] truncate">
                                        <i
                                            className="fa-solid fa-graduation-cap text-xs text-[#005A36] dark:text-[#6EE7B7]"
                                            aria-hidden="true"
                                        />
                                        <span className="truncate">{tituloIntermedioNombre}</span>
                                    </span>
                                    <span className="font-bold text-[#005A36] dark:text-[#86EFAC] tabular-nums shrink-0">
                                        {progresoIntermedio.completadas}/{progresoIntermedio.totales}
                                    </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-[#E2E8F0] dark:bg-[#24303C] overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-[#005A36] dark:bg-[#2E8B63] transition-all duration-300"
                                        style={{ width: `${intermedioPct}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Hito programado de Cambio de Plan (17.13 -> 17.14) */}
                        <PlanTransitionControl
                            basePlan={basePlan || plan}
                            activePlan={plan}
                            anioActual={anioActual}
                            planTransition={planTransition}
                            onChangePlanTransition={onChangePlanTransition}
                            suggestedPeriod={suggestedTransitionPeriod}
                            transitionAppliedInfo={transitionAppliedInfo}
                            oferta1713Note={oferta1713Note}
                        />

                        {/* Resumen de Historial */}
                        {historialSemestres?.length > 0 && (
                            <div className="bg-[#F8FAFC] dark:bg-[#0F1419] border border-[#E2E8F0] dark:border-[#2A3540] rounded-xl p-3 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <span className="text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9] block">
                                        Historial acumulado
                                    </span>
                                    <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                        {historialSemestres.length}{' '}
                                        {historialSemestres.length === 1 ? 'cuatrimestre' : 'cuatrimestres'} simulado
                                        {historialSemestres.length === 1 ? '' : 's'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {onDownloadPDF && (
                                        <Button
                                            size="sm"
                                            variant="flat"
                                            onPress={onDownloadPDF}
                                            isLoading={descargandoPDF}
                                            title="Descargar planilla PDF imprimible"
                                            aria-label="Descargar PDF"
                                            startContent={!descargandoPDF && <FileDown size={13} />}
                                            className="font-semibold text-xs h-8 px-2.5 rounded-lg bg-[#ECFDF5] dark:bg-[#102A20] border border-[#A7F3D0] dark:border-[#1E4D38] text-[#005A36] dark:text-[#86EFAC]"
                                        >
                                            PDF
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        onPress={onOpenHistory}
                                        title="Abrir el detalle de cuatrimestres simulados"
                                        startContent={<History size={14} />}
                                        className="font-semibold text-xs h-8 rounded-lg bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-[#005A36] dark:text-[#6EE7B7] shrink-0"
                                    >
                                        Ver ({historialSemestres.length})
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                ) : selectedMateria ? (
                    <div className="space-y-3">
                        {/* Materia Fijada */}
                        <div className="bg-[#F0FDF4] dark:bg-[#102A20]/70 border border-[#A7F3D0] dark:border-[#1E4D38] rounded-xl p-3 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-[#005A36] dark:text-[#6EE7B7]">
                                    <Pin size={13} className="shrink-0" aria-hidden="true" />
                                    {selectedMateria.codigo}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onSelectCodigo(null)}
                                    aria-label="Deseleccionar"
                                    title="Deseleccionar"
                                    className="p-1 rounded-md text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F1F5F9] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <h3 className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] leading-snug">
                                {selectedMateria.nombre}
                            </h3>
                            {(selectedMateria.anio || selectedMateria.cuatrimestre) && (
                                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                    {selectedMateria.anio}° Año · {selectedMateria.cuatrimestre}° Cuatri
                                </p>
                            )}
                        </div>

                        {/* Requisitos Previos */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between px-0.5">
                                <span className="text-[11px] font-semibold text-[#92400E] dark:text-[#FCD34D] flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#D97706]" aria-hidden="true" />
                                    Requisitos previos ({selectedRelations.reqsList.length})
                                </span>
                            </div>
                            {selectedRelations.reqsList.length > 0 ? (
                                <div className="space-y-1">
                                    {selectedRelations.reqsList.map((req) => (
                                        <button
                                            key={req.codigo}
                                            type="button"
                                            onClick={() => onSelectCodigo(req.codigo)}
                                            className="w-full text-left px-2.5 py-2 rounded-lg bg-[#FFFBEB] dark:bg-[#2D2210] border border-[#FDE68A] dark:border-[#5C4318] hover:border-[#D97706] transition-colors flex items-center justify-between gap-2 cursor-pointer"
                                        >
                                            <span className="text-xs font-medium text-[#1E293B] dark:text-[#F1F5F9] truncate">
                                                {req.nombre}
                                            </span>
                                            <span className="text-[10px] font-mono text-[#92400E] dark:text-[#FCD34D] shrink-0">
                                                {req.codigo}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] px-2.5 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0F1419] border border-[#E2E8F0] dark:border-[#2A3540]">
                                    Sin requisitos previos (materia inicial)
                                </p>
                            )}
                        </div>

                        {/* Materias que Habilita */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between px-0.5">
                                <span className="text-[11px] font-semibold text-[#005A36] dark:text-[#86EFAC] flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#478559]" aria-hidden="true" />
                                    Habilita ({selectedRelations.unlocksList.length})
                                </span>
                            </div>
                            {selectedRelations.unlocksList.length > 0 ? (
                                <div className="space-y-1">
                                    {selectedRelations.unlocksList.map((dest) => (
                                        <button
                                            key={dest.codigo}
                                            type="button"
                                            onClick={() => onSelectCodigo(dest.codigo)}
                                            className="w-full text-left px-2.5 py-2 rounded-lg bg-[#ECFDF5] dark:bg-[#102A20] border border-[#A7F3D0] dark:border-[#1E4D38] hover:border-[#005A36] transition-colors flex items-center justify-between gap-2 cursor-pointer"
                                        >
                                            <span className="text-xs font-medium text-[#1E293B] dark:text-[#F1F5F9] truncate">
                                                {dest.nombre}
                                            </span>
                                            <span className="text-[10px] font-mono text-[#005A36] dark:text-[#86EFAC] shrink-0">
                                                {dest.codigo}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] px-2.5 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0F1419] border border-[#E2E8F0] dark:border-[#2A3540]">
                                    No habilita materias posteriores
                                </p>
                            )}
                        </div>

                        <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] text-center pt-1">
                            Hacé clic en cualquier materia de las listas para inspeccionar su cadena.
                        </p>
                    </div>
                ) : (
                    <div className="bg-[#F8FAFC] dark:bg-[#0F1419] border border-dashed border-[#CBD5E1] dark:border-[#2A3540] rounded-xl p-3.5 text-center space-y-2">
                        <div className="w-8 h-8 mx-auto rounded-xl bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#6EE7B7] flex items-center justify-center">
                            <Pin size={15} aria-hidden="true" />
                        </div>
                        <p className="text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                            Ninguna materia fijada
                        </p>
                        <div className="flex flex-col gap-1.5 text-[11px] text-left">
                            <span className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#FFFBEB] dark:bg-[#2D2210] text-[#92400E] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#5C4318]">
                                <span className="w-2 h-2 rounded-full bg-[#D97706] shrink-0" aria-hidden="true" />
                                <span>Ámbar · Requisitos previos</span>
                            </span>
                            <span className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38]">
                                <span className="w-2 h-2 rounded-full bg-[#478559] shrink-0" aria-hidden="true" />
                                <span>Verde · Materias que habilita</span>
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Acciones */}
            <div className="p-3 border-t border-[#E2E8F0] dark:border-[#2A3540] bg-[#F8FAFC]/80 dark:bg-[#0F1419]/60 space-y-2 shrink-0">
                {onImportarProgreso && (
                    <Button
                        data-tour="simulador-importar"
                        size="sm"
                        variant="flat"
                        onPress={onImportarProgreso}
                        title="Traer tus materias aprobadas y regulares desde Mis Materias"
                        className="w-full font-semibold rounded-xl text-xs h-9 bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38]"
                        startContent={<CloudDownload size={14} />}
                    >
                        Importar desde Mis Materias
                    </Button>
                )}

                <div className="grid grid-cols-2 gap-1.5">
                    <Button
                        data-tour="simulador-opciones"
                        size="sm"
                        variant="bordered"
                        onPress={onOpenConfig}
                        title="Cambiar plan de estudios o cuatrimestre de inicio"
                        className="font-medium rounded-xl text-xs h-8 border-[#E2E8F0] dark:border-[#2A3540] text-[#334155] dark:text-[#E2E8F0]"
                        startContent={<SlidersHorizontal size={13} />}
                    >
                        Configurar
                    </Button>
                    <Button
                        size="sm"
                        variant="bordered"
                        onPress={onOpenTutorial}
                        title="Iniciar guía interactiva del simulador"
                        className="font-medium rounded-xl text-xs h-8 border-[#E2E8F0] dark:border-[#2A3540] text-[#005A36] dark:text-[#6EE7B7]"
                        startContent={<Compass size={13} />}
                    >
                        Tutorial
                    </Button>
                </div>
            </div>
        </aside>
    );
}

export default SimuladorSidePanel;
