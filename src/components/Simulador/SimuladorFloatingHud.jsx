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
    Maximize2,
    Minimize2,
    Pin,
    SlidersHorizontal,
    X,
} from 'lucide-react';

const GLASS_ISLAND_CLASS =
    'bg-white/95 dark:bg-[#161D24]/95 backdrop-blur-md border border-[#E2E8F0] dark:border-[#2A3540] shadow-sm rounded-xl pointer-events-auto';

/**
 * Alternativa 3 (HUD Flotante Full-Bleed): 3 islas superiores translúcidas
 * flotando directamente sobre el lienzo punteado del grafo en escritorio.
 */
function SimuladorFloatingHud({
    plan = null,
    basePlan = null,
    planTransition = null,
    transitionAppliedInfo = null,
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
    historialSemestres,
    onOpenHistory,
    onDownloadPDF = null,
    descargandoPDF = false,
    selectedMateria,
    selectedStats,
    onClearSelected,
    onImportarProgreso,
    onOpenConfig,
    onOpenTutorial,
    isFullScreen,
    onToggleFullScreen,
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-2 w-full">
            {/* Isla 1 (Izquierda): Selector de Modo */}
            <div data-tour="simulador-modos" className={`${GLASS_ISLAND_CLASS} p-1 flex items-center gap-0.5`}>
                <Button
                    size="sm"
                    variant="flat"
                    onPress={() => onChangeInteractionMode('planificar')}
                    className={`font-medium text-xs h-8 rounded-lg px-2.5 ${
                        interactionMode === 'planificar'
                            ? 'bg-[#005A36] text-white font-semibold shadow-2xs'
                            : 'bg-transparent text-[#64748B] dark:text-[#94A3B8]'
                    }`}
                    startContent={<CalendarRange size={14} />}
                >
                    Planificar avance
                </Button>
                <Button
                    size="sm"
                    variant="flat"
                    onPress={() => onChangeInteractionMode('explorar')}
                    className={`font-medium text-xs h-8 rounded-lg px-2.5 ${
                        interactionMode === 'explorar'
                            ? 'bg-[#005A36] text-white font-semibold shadow-2xs'
                            : 'bg-transparent text-[#64748B] dark:text-[#94A3B8]'
                    }`}
                    startContent={<GitBranch size={14} />}
                >
                    Explorar correlativas
                </Button>
            </div>

            {/* Isla 2 (Centro): Controles de Cuatrimestre o Inspector Compacto */}
            <div data-tour="simulador-controles" className={GLASS_ISLAND_CLASS}>
                {interactionMode === 'planificar' ? (
                    <div className="px-2 py-1 flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="flat"
                            isDisabled={!estadoAnterior}
                            onPress={onAnterior}
                            startContent={<ChevronLeft size={14} />}
                            className="font-medium rounded-lg h-8 px-2.5 bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0] text-xs"
                        >
                            Anterior
                        </Button>

                        {simulacionTerminada ? (
                            <>
                                <span className="text-xs font-bold text-[#005A36] dark:text-[#6EE7B7] tabular-nums whitespace-nowrap px-1">
                                    ¡Finalizada · {anioActual}!
                                </span>
                                <Button
                                    size="sm"
                                    onPress={onOpenFinishModal}
                                    startContent={<GraduationCap size={14} />}
                                    className="font-semibold rounded-lg h-8 px-2.5 bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] dark:hover:bg-[#246B4E] text-white text-xs"
                                >
                                    Resumen / PDF
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-1.5 px-1">
                                    {plan && (
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38] whitespace-nowrap">
                                            {transitionAppliedInfo
                                                ? `${plan} (desde ${basePlan || '17.13'})`
                                                : basePlan === '17.13' && planTransition?.enabled
                                                  ? `${plan} -> 17.14 (${planTransition.cuatri}°C ${planTransition.anio})`
                                                  : `Plan ${plan}`}
                                        </span>
                                    )}
                                    <span className="text-xs font-bold text-[#005A36] dark:text-[#6EE7B7] tabular-nums whitespace-nowrap">
                                        {cuatri}° Cuatri · {anioActual}
                                    </span>
                                    <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] tabular-nums whitespace-nowrap">
                                        {elegidasEsteCuatri} eleg.
                                    </span>
                                </div>

                                <Button
                                    size="sm"
                                    isDisabled={!estadoSiguiente}
                                    onPress={onSiguiente}
                                    endContent={<ChevronRight size={14} />}
                                    className="font-semibold rounded-lg h-8 px-2.5 bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] dark:hover:bg-[#246B4E] text-white text-xs"
                                >
                                    Siguiente
                                </Button>
                            </>
                        )}

                        {historialSemestres?.length > 0 && (
                            <>
                                <div className="h-4 w-px bg-[#E2E8F0] dark:bg-[#2A3540]" aria-hidden="true" />
                                <Button
                                    size="sm"
                                    variant="light"
                                    onPress={onOpenHistory}
                                    startContent={<History size={13} />}
                                    className="font-semibold text-xs h-8 px-2 text-[#005A36] dark:text-[#6EE7B7]"
                                >
                                    Historial ({historialSemestres.length})
                                </Button>
                                {onDownloadPDF && (
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        onPress={onDownloadPDF}
                                        isLoading={descargandoPDF}
                                        aria-label="Descargar PDF"
                                        title="Descargar planilla PDF imprimible"
                                        startContent={!descargandoPDF && <FileDown size={13} />}
                                        className="font-semibold text-xs h-8 px-2 rounded-lg bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC]"
                                    >
                                        PDF
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                ) : selectedMateria ? (
                    <div className="px-2.5 py-1 flex items-center gap-2 max-w-md min-w-0">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#005A36] dark:text-[#6EE7B7] min-w-0">
                            <Pin size={13} className="shrink-0" aria-hidden="true" />
                            <span className="truncate">{selectedMateria.nombre}</span>
                            <span className="font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8] shrink-0">
                                ({selectedMateria.codigo})
                            </span>
                        </span>
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-[#FFFBEB] dark:bg-[#2D2210] text-[#92400E] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#5C4318] shrink-0">
                            Req: {selectedStats.reqs}
                        </span>
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38] shrink-0">
                            Hab: {selectedStats.unlocks}
                        </span>
                        <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={onClearSelected}
                            aria-label="Deseleccionar"
                            title="Deseleccionar"
                            className="min-w-7 h-7 text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F1F5F9] shrink-0"
                        >
                            <X size={14} />
                        </Button>
                    </div>
                ) : (
                    <div className="px-3 py-1.5 flex items-center gap-2.5 text-xs text-[#475569] dark:text-[#94A3B8] h-10">
                        <Pin size={13} className="text-[#005A36] dark:text-[#6EE7B7] shrink-0" aria-hidden="true" />
                        <span className="font-medium whitespace-nowrap">Tocá una materia</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#92400E] dark:text-[#FCD34D] whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full bg-[#D97706]" aria-hidden="true" />
                            Requisitos
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#005A36] dark:text-[#86EFAC] whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full bg-[#478559]" aria-hidden="true" />
                            Habilita
                        </span>
                    </div>
                )}
            </div>

            {/* Isla 3 (Derecha): Acciones */}
            <div className={`${GLASS_ISLAND_CLASS} p-1 flex items-center gap-1`}>
                {onImportarProgreso && (
                    <Button
                        data-tour="simulador-importar"
                        size="sm"
                        variant="flat"
                        onPress={onImportarProgreso}
                        title="Importar desde Mis Materias"
                        className="font-semibold rounded-lg text-xs h-8 px-2.5 bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38]"
                        startContent={<CloudDownload size={14} />}
                    >
                        Importar
                    </Button>
                )}
                <Button
                    data-tour="simulador-opciones"
                    size="sm"
                    variant="light"
                    onPress={onOpenConfig}
                    title="Configurar plan e inicio"
                    className="font-medium rounded-lg text-xs h-8 px-2.5 text-[#334155] dark:text-[#E2E8F0]"
                    startContent={<SlidersHorizontal size={14} />}
                >
                    Configurar
                </Button>
                <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={onOpenTutorial}
                    aria-label="Ver tutorial"
                    title="Ver tutorial"
                    className="min-w-8 h-8 text-[#005A36] dark:text-[#6EE7B7]"
                >
                    <Compass size={15} />
                </Button>
                <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={onToggleFullScreen}
                    aria-label={isFullScreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                    title={isFullScreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                    className="min-w-8 h-8 text-[#475569] dark:text-[#CBD5E1]"
                >
                    {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </Button>
            </div>
        </div>
    );
}

export default SimuladorFloatingHud;
