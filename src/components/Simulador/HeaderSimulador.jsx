import React from 'react';
import { Button, ButtonGroup } from '@heroui/react';
import { CalendarRange, CloudDownload, FileDown, GitBranch, History, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import PlanTransitionControl from './PlanTransitionControl';

function HeaderSimulador({
    plan,
    basePlan = null,
    anioActual,
    cuatri,
    anioInicio,
    cuatriInicio,
    interactionMode,
    onChangeInteractionMode,
    onOpenConfig,
    onImportarProgreso,
    onCargarSimulacion = null,
    onDownloadPDF = null,
    descargandoPDF = false,
    hasHistorial = false,
    planTransition = null,
    onChangePlanTransition = null,
    suggestedTransitionPeriod = null,
    transitionAppliedInfo = null,
    oferta1713Note = null,
    simulacionTerminada,
}) {
    const cuatriDisplay = cuatri || cuatriInicio || '1';
    const anioDisplay = anioActual || anioInicio || '2026';

    const modeDescription =
        interactionMode === 'explorar'
            ? 'Tocá cualquier materia para fijarla y ver sus requisitos previos (ámbar) y las que habilita (verde).'
            : 'Elegí qué materias cursar en cada cuatrimestre y avanzá para proyectar cuándo te recibís.';

    return (
        <header className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-3 sm:p-4 lg:py-2.5 lg:px-4 shadow-2xs flex flex-col gap-2.5 sm:gap-3 shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 lg:gap-3">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
                            Simulador de Avance
                        </h1>
                        {plan && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38] text-xs font-semibold">
                                <i className="fa-solid fa-graduation-cap text-[10px]" aria-hidden="true" />
                                Plan {plan}
                                {basePlan && basePlan !== plan ? ` (desde ${basePlan})` : ''}
                            </span>
                        )}
                        {!simulacionTerminada && interactionMode === 'planificar' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0] border border-[#E2E8F0] dark:border-[#2A3540] text-xs font-medium tabular-nums">
                                <i className="fa-regular fa-calendar text-[10px] text-[#005A36] dark:text-[#6EE7B7]" aria-hidden="true" />
                                {cuatriDisplay}° Cuatrimestre · {anioDisplay}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                        {modeDescription} Sin modificar{' '}
                        <Link to="/mis-materias" className="font-medium text-[#005A36] dark:text-[#6EE7B7] hover:underline">
                            Mis Materias
                        </Link>.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Selector de Modo Principal: Planificar vs Explorar */}
                    <div
                        data-tour="simulador-modos"
                        className="flex p-0.5 bg-[#F1F5F9] dark:bg-[#1E2730] rounded-xl border border-[#E2E8F0] dark:border-[#2A3540]"
                    >
                        <ButtonGroup size="sm" variant="flat">
                            <Button
                                onPress={() => onChangeInteractionMode('planificar')}
                                className={`font-medium text-xs h-8 rounded-lg ${
                                    interactionMode === 'planificar'
                                        ? 'bg-[#005A36] text-white font-semibold shadow-2xs'
                                        : 'bg-transparent text-[#64748B] dark:text-[#94A3B8]'
                                }`}
                                startContent={<CalendarRange size={14} />}
                            >
                                Planificar avance
                            </Button>
                            <Button
                                onPress={() => onChangeInteractionMode('explorar')}
                                className={`font-medium text-xs h-8 rounded-lg ${
                                    interactionMode === 'explorar'
                                        ? 'bg-[#005A36] text-white font-semibold shadow-2xs'
                                        : 'bg-transparent text-[#64748B] dark:text-[#94A3B8]'
                                }`}
                                startContent={<GitBranch size={14} />}
                            >
                                Explorar correlativas
                            </Button>
                        </ButtonGroup>
                    </div>

                    {/* Acciones principales: Importar y Configurar */}
                    <div className="flex items-center gap-1.5">
                        {onImportarProgreso && (
                            <Button
                                data-tour="simulador-importar"
                                size="sm"
                                variant="flat"
                                onPress={onImportarProgreso}
                                className="font-semibold rounded-xl text-xs h-9 bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38]"
                                startContent={<CloudDownload size={14} />}
                            >
                                Importar desde Mis Materias
                            </Button>
                        )}
                        {onCargarSimulacion && (
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={onCargarSimulacion}
                                className="font-semibold rounded-xl text-xs h-9 bg-white dark:bg-[#161D24] text-[#005A36] dark:text-[#6EE7B7] border border-[#A7F3D0] dark:border-[#1E4D38]"
                                startContent={<History size={14} />}
                            >
                                Cargar guardada
                            </Button>
                        )}
                        {hasHistorial && onDownloadPDF && (
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={onDownloadPDF}
                                isLoading={descargandoPDF}
                                className="font-semibold rounded-xl text-xs h-9 bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38]"
                                startContent={!descargandoPDF && <FileDown size={14} />}
                            >
                                PDF
                            </Button>
                        )}
                        <Button
                            data-tour="simulador-opciones"
                            size="sm"
                            variant="bordered"
                            onPress={onOpenConfig}
                            className="font-medium rounded-xl text-xs h-9 border-[#E2E8F0] dark:border-[#2A3540] text-[#334155] dark:text-[#E2E8F0]"
                            startContent={<SlidersHorizontal size={14} />}
                        >
                            Configurar
                        </Button>
                    </div>
                </div>
            </div>

            {interactionMode === 'planificar' && (basePlan || plan) === '17.13' && (
                <PlanTransitionControl
                    compact={true}
                    basePlan={basePlan || plan}
                    activePlan={plan}
                    anioActual={anioDisplay}
                    planTransition={planTransition}
                    onChangePlanTransition={onChangePlanTransition}
                    suggestedPeriod={suggestedTransitionPeriod}
                    transitionAppliedInfo={transitionAppliedInfo}
                    oferta1713Note={oferta1713Note}
                />
            )}
        </header>
    );
}

export default HeaderSimulador;
