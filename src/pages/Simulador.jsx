import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { addToast, Button, Spinner, useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';

import HeaderSimulador from '../components/Simulador/HeaderSimulador';
import HistorialAcademico from '../components/Simulador/HistorialAcademico';
import CarreraFinalizada from '../components/Simulador/CarreraFinalizada';
import ConfiguracionSimulador from '../components/Simulador/modals/ConfiguracionSimulador';
import ConfirmarImportarModal from '../components/Simulador/modals/ConfirmarImportarModal';
import SimuladorModeModal from '../components/Simulador/modals/SimuladorModeModal';
import SimulacionFinalizadaModal from '../components/Simulador/modals/SimulacionFinalizadaModal';
import SimuladorSidePanel from '../components/Simulador/SimuladorSidePanel';
import SimuladorFloatingHud from '../components/Simulador/SimuladorFloatingHud';
import InteractiveTourOverlay from '../components/Tutorial/InteractiveTourOverlay';
import { TOUR_IDS, TUTORIAL_TOURS } from '../config/tutorialTours';
import MateriasGrafo from '../components/Progreso/MateriasGrafo';
import MateriasMallaEstatica from '../components/Simulador/MateriasMallaEstatica';

import useSimuladorEstado from '../hooks/Simulador/useSimuladorEstado';
import useSimuladorMaterias from '../hooks/Simulador/useSimuladorMaterias';
import useSimuladorPDF from '../hooks/Simulador/useSimuladorPDF';
import usePlanData from '../hooks/usePlanData';
import { CloudDownload, Columns2, FileDown, GraduationCap, Layers, Maximize2, Minimize2, PanelRightOpen, Pin, X } from 'lucide-react';
import { calculateProjection } from '../utils/Simulador/projectionUtils';
import tituloIntermedioUtils from '../utils/Progreso/tituloIntermedioUtils';
import importUtils from '../utils/Simulador/importUtils';
import { evaluarElegibilidadActual, OFERTA_RESOLUCION_89_2025 } from '../utils/Transicion/transicionUtils';
import { trackCambioVista } from '../services/analyticsService';
import storageRepository from '../services/storageRepository';
import { DEFAULT_PLAN } from '../config/planPolicies';

function Simulador({ plan: initialPlan }) {
    const location = useLocation();
    const routeState = location.state || null;
    const [plan, setPlan] = useState(
        () => routeState?.plan || initialPlan || storageRepository.getPlanActivo() || DEFAULT_PLAN,
    );
    const [anioInicio, setAnioInicio] = useState('2026');
    const [cuatriInicio, setCuatriInicio] = useState('1');
    const [customPlanTransition, setCustomPlanTransition] = useState(() => {
        if (routeState?.planTransition) {
            return {
                enabled: Boolean(routeState.planTransition.enabled),
                targetPlan: routeState.planTransition.targetPlan || '17.14',
                anio: Number(routeState.planTransition.anio) || 2027,
                cuatri: String(routeState.planTransition.cuatri || '1'),
            };
        }
        return null;
    });
    const autoImportedTransitionRef = React.useRef(false);

    const [openedAccordions, setOpenedAccordions] = useState(new Set());
    const [descargandoPDF, setDescargandoPDF] = useState(false);
    const [interactionMode, setInteractionMode] = useState(
        () => storageRepository.getSimuladorModeSelected() || 'planificar',
    );
    const [isModeModalOpen, setIsModeModalOpen] = useState(
        () => !storageRepository.getSimuladorModeSelected(),
    );
    const [selectedCodigo, setSelectedCodigo] = useState(null);
    const [desktopLayout, setDesktopLayout] = useState(
        () => storageRepository.getSimuladorDesktopLayout(),
    ); // 'panel' (Alt 2) | 'hud' (Alt 3)
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
    const [tourOpenKey, setTourOpenKey] = useState(0);
    const [viewMode] = useState(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) return 'malla';
        return 'grafo';
    });

    const handleChangeDesktopLayout = (nextLayout) => {
        setDesktopLayout(nextLayout);
        storageRepository.setSimuladorDesktopLayout(nextLayout);
        trackCambioVista({ tipo: 'diseno_simulador', valor: nextLayout });
    };

    const handleChangeInteractionMode = (nextMode) => {
        setInteractionMode(nextMode);
        storageRepository.setSimuladorModeSelected(nextMode);
        if (nextMode === 'planificar') {
            setSelectedCodigo(null);
        }
        trackCambioVista({ tipo: 'tipo_simulacion', valor: nextMode });
    };

    const handleSelectInitialMode = (nextMode) => {
        handleChangeInteractionMode(nextMode);
        setIsModeModalOpen(false);
    };

    const [isFullScreen, setIsFullScreen] = useState(false);
    const grafoContainerRef = React.useRef(null);

    const toggleFullScreen = () => {
        if (!grafoContainerRef.current) return;

        if (!document.fullscreenElement) {
            grafoContainerRef.current.requestFullscreen?.().catch(() => {
                setIsFullScreen(true);
            });
        } else {
            document.exitFullscreen?.();
        }
    };

    React.useEffect(() => {
        const handleFSChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFSChange);
        return () => document.removeEventListener('fullscreenchange', handleFSChange);
    }, []);

    const {
        progreso: progresoReal,
        progresoDetalles: progresoDetallesReal,
    } = usePlanData(plan);

    const { isOpen: isConfigOpen, onClose: onConfigClose, onOpenChange: onConfigOpenChange, onOpen: onConfigOpen } = useDisclosure();
    const { isOpen: isConfirmImportOpen, onOpenChange: onConfirmImportOpenChange, onOpen: onConfirmImportOpen } = useDisclosure();
    const { isOpen: isHistoryOpen, onOpen: onHistoryOpen, onClose: onHistoryClose, onOpenChange: onHistoryOpenChange } = useDisclosure();

    const {
        materias,
        sourceMaterias,
        activePlan: rawActivePlan,
        targetPlanData,
        transitionAppliedInfo = null,
        cargando,
        progresoSimulado, setProgresoSimulado,
        progresoBase,
        cuatri,
        anioActual,
        historialSemestres,
        semestreActualPlan,
        estadoAnterior,
        estadoSiguiente,
        simulacionTerminada,
        handleAnterior,
        handleSiguiente,
        importarHistorialReconstruido,
        syncPlanTransition,
    } = useSimuladorEstado({
        plan,
        anioInicio,
        cuatriInicio,
        planTransition: customPlanTransition,
    });

    const activePlan = rawActivePlan || plan;
    const basePlanMaterias = sourceMaterias?.length ? sourceMaterias : materias;

    const suggestedTransitionPeriod = React.useMemo(() => {
        if (plan !== '17.13' || !targetPlanData?.materiasTarget?.length || !basePlanMaterias?.length) {
            return { anio: 2027, cuatri: '1' };
        }
        const eleg = evaluarElegibilidadActual({
            progreso: progresoReal || {},
            materias1713: basePlanMaterias,
            materias1714: targetPlanData.materiasTarget,
            equivalenciasData: targetPlanData.equivalencias || {},
            anioActual: new Date().getFullYear(),
            sourcePlan: '17.13',
            targetPlan: '17.14',
        });
        return {
            anio: eleg.puedeCambiarseHoy ? eleg.anioEvaluado : eleg.anioHabilitado,
            cuatri: String(eleg.cuatrimestreHabilitado || 1),
        };
    }, [plan, targetPlanData, basePlanMaterias, progresoReal]);

    const planTransition = React.useMemo(
        () =>
            customPlanTransition || {
                enabled: false,
                targetPlan: '17.14',
                anio: suggestedTransitionPeriod.anio,
                cuatri: suggestedTransitionPeriod.cuatri,
            },
        [customPlanTransition, suggestedTransitionPeriod],
    );

    const handleChangePlanTransition = React.useCallback(
        (nextTransition) => {
            setCustomPlanTransition(nextTransition);
            syncPlanTransition?.(nextTransition);
        },
        [syncPlanTransition],
    );

    const handleImportarProgreso = () => {
        if (!progresoReal || Object.keys(progresoReal).length === 0) {
            addToast({
                title: 'Sin materias guardadas',
                description: 'No se encontró progreso guardado para este plan en Mis Materias.',
                color: 'warning',
            });
            return;
        }
        onConfirmImportOpen();
    };

    const ejecutarImportacion = React.useCallback(() => {
        const resultado = importUtils.reconstruirHistorial(
            progresoReal,
            progresoDetallesReal,
            basePlanMaterias,
        );
        if (resultado) {
            importarHistorialReconstruido(resultado);
            if (resultado.historial.length > 0) {
                const ultimoIdx = String(resultado.historial.length - 1);
                setOpenedAccordions(new Set([ultimoIdx]));
            }
        } else {
            addToast({
                title: 'Sin materias para importar',
                description: 'No hay materias aprobadas o regulares cargadas en Mis Materias para importar.',
                color: 'warning',
            });
        }
    }, [progresoReal, progresoDetallesReal, basePlanMaterias, importarHistorialReconstruido]);

    React.useEffect(() => {
        if (
            !routeState?.autoImportFromTransition ||
            autoImportedTransitionRef.current ||
            cargando ||
            !basePlanMaterias?.length ||
            !progresoReal
        ) {
            return undefined;
        }
        const hayImportables = basePlanMaterias.some((m) =>
            ['Regular', 'Aprobado', 'Promocionado'].includes(progresoReal[m.codigo]),
        );
        if (!hayImportables) return undefined;

        autoImportedTransitionRef.current = true;
        const timer = setTimeout(() => {
            ejecutarImportacion();
        }, 0);
        return () => clearTimeout(timer);
    }, [routeState, cargando, basePlanMaterias, progresoReal, ejecutarImportacion]);

    const {
        tituloIntermedioNombre,
        codigosIntermedio,
        progresoIntermedio,
        isIntermedioCompletado,
    } = React.useMemo(() => {
        const nombre = tituloIntermedioUtils.getTituloIntermedioNombre(activePlan);
        const materiasIntermedio = tituloIntermedioUtils.getMateriasIntermedio(activePlan, materias);
        const codigosSet = new Set(materiasIntermedio.map((m) => String(m.codigo)));

        const mappedProgreso = {};
        if (progresoSimulado) {
            Object.keys(progresoSimulado).forEach(key => {
                if (progresoSimulado[key] === 'Cursado') mappedProgreso[key] = 'Aprobado';
            });
        }

        const progreso = tituloIntermedioUtils.calcularProgresoIntermedio(materiasIntermedio, mappedProgreso);
        return {
            tituloIntermedioNombre: nombre,
            codigosIntermedio: codigosSet,
            progresoIntermedio: progreso,
            isIntermedioCompletado: progreso.totales > 0 && progreso.completadas === progreso.totales,
        };
    }, [activePlan, materias, progresoSimulado]);

    const { cambioDeEstado, materiasCursables } = useSimuladorMaterias(
        materias,
        progresoSimulado || {},
        cuatri,
        setProgresoSimulado,
        progresoBase || {},
        anioActual,
        semestreActualPlan
    );

    const oferta1713Note = React.useMemo(() => {
        if (activePlan !== '17.13' || !planTransition?.enabled) return null;
        const anioLookup = Math.min(Math.max(Number(anioActual) || 2026, 2024), 2029);
        const oferta = OFERTA_RESOLUCION_89_2025[anioLookup]?.plan1713;
        if (!oferta) return null;
        const cerradas = (materiasCursables || []).filter(
            (m) => !oferta.cuatrimestres.includes(Number(m.cuatrimestre) || 1),
        );
        if (cerradas.length > 0) {
            return `Oferta 17.13 en ${anioLookup}: ${oferta.descripcion}. ${cerradas.length} ${
                cerradas.length === 1 ? 'materia disponible ya cerró cursado regular' : 'materias disponibles ya cerraron cursado regular'
            } en 17.13 (solo final).`;
        }
        return `Oferta 17.13 en ${anioLookup}: ${oferta.descripcion}.`;
    }, [activePlan, planTransition?.enabled, anioActual, materiasCursables]);

    const projection = React.useMemo(() => {
        if (!materias.length || !progresoBase) return null;
        return calculateProjection({
            materias,
            historialSemestres,
            progresoBase,
            cuatriActual: cuatri,
            anioActual,
            equivalenciasMap: targetPlanData?.equivalencias || null,
        });
    }, [materias, historialSemestres, progresoBase, cuatri, anioActual, targetPlanData]);

    const handleNodeClick = React.useCallback((codigo) => {
        if (interactionMode === 'explorar') {
            setSelectedCodigo((prev) => (prev === codigo ? null : codigo));
            return;
        }
        const item = projection?.items?.[codigo];
        if (item && item.estado === 'Presente') {
            cambioDeEstado(codigo);
        }
    }, [interactionMode, projection, cambioDeEstado]);

    const selectedMateria = React.useMemo(
        () => (selectedCodigo ? materias.find((m) => m.codigo === selectedCodigo) || null : null),
        [selectedCodigo, materias],
    );

    const selectedStats = React.useMemo(() => {
        if (!selectedMateria) return { reqs: 0, unlocks: 0 };
        const reqs = selectedMateria.correlativas?.length || 0;
        const unlocks = materias.filter((m) => m.correlativas?.includes(selectedMateria.codigo)).length;
        return { reqs, unlocks };
    }, [selectedMateria, materias]);

    const selectedRelations = React.useMemo(() => {
        if (!selectedMateria || !materias?.length) return { reqsList: [], unlocksList: [] };
        const reqCodes = new Set(selectedMateria.correlativas || []);
        const reqsList = materias.filter((m) => reqCodes.has(m.codigo));
        const unlocksList = materias.filter((m) => m.correlativas?.includes(selectedMateria.codigo));
        return { reqsList, unlocksList };
    }, [selectedMateria, materias]);

    const elegidasEsteCuatri = React.useMemo(
        () =>
            materiasCursables.filter((m) => {
                const st = progresoSimulado?.[m.codigo];
                return st === 'Cursado' || st === 'Aprobado' || st === 'Promocionado';
            }).length,
        [materiasCursables, progresoSimulado],
    );

    const handleBeforeTourStep = React.useCallback(() => {
        if (desktopLayout === 'panel') {
            setIsSidePanelOpen(true);
        }
    }, [desktopLayout]);

    const { handleDownloadPDF } = useSimuladorPDF({
        historialSemestres,
        plan: activePlan,
        materias,
        progresoSimulado,
        progresoBase,
        progresoReal,
        progresoDetallesReal,
        anioActual,
        cuatri,
        setDescargandoPDF,
    });

    const marcarTodasEnPantalla = (estado) => {
        if (!materiasCursables.length) return;
        const nuevo = { ...progresoSimulado };
        materiasCursables.forEach(m => { nuevo[m.codigo] = estado; });
        setProgresoSimulado(nuevo);
    };

    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);

    const handleDownloadPDFFromHistory = () => {
        onHistoryClose();
        handleDownloadPDF();
    };

    React.useEffect(() => {
        if (!simulacionTerminada || viewMode !== 'grafo') {
            const t = setTimeout(() => setIsFinishModalOpen(false), 0);
            return () => clearTimeout(t);
        }
        const t = setTimeout(() => setIsFinishModalOpen(true), 120);
        return () => clearTimeout(t);
    }, [simulacionTerminada, viewMode]);

    const isDesktopGrafo = Boolean(plan) && !cargando && viewMode === 'grafo';

    const renderIntermediateBadge = () => (
        <div
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 border ${
                isIntermedioCompletado
                    ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0] dark:bg-[#102A20] dark:text-[#86EFAC] dark:border-[#1E4D38]'
                    : 'bg-white/95 dark:bg-[#161D24]/95 text-[#334155] dark:text-[#E2E8F0] border-[#E2E8F0] dark:border-[#2A3540]'
            }`}
        >
            <i className="fa-solid fa-graduation-cap text-xs text-[#005A36] dark:text-[#6EE7B7]" aria-hidden="true" />
            <span className="hidden sm:inline">{tituloIntermedioNombre}:</span>
            <span className="tabular-nums">
                {progresoIntermedio.completadas}/{progresoIntermedio.totales}
            </span>
        </div>
    );

    const mobileSimuladorTour = React.useMemo(() => {
        const base = TUTORIAL_TOURS[TOUR_IDS.SIMULADOR];
        return {
            ...base,
            steps: base.steps.filter((s) => s.id !== 'simulador_diseno'),
        };
    }, []);

    const renderLayoutComparisonSwitcher = () => (
        <div
            data-tour="simulador-diseno"
            aria-label="Elegir diseño de escritorio"
            className="bg-white/95 dark:bg-[#161D24]/95 backdrop-blur-md border border-[#E2E8F0] dark:border-[#2A3540] shadow-sm rounded-xl p-1 flex items-center gap-1"
        >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] px-1.5 hidden xl:inline">
                Diseño
            </span>
            <Button
                size="sm"
                variant="flat"
                onPress={() => handleChangeDesktopLayout('panel')}
                startContent={<Columns2 size={13} />}
                className={`h-7 text-[11px] font-medium rounded-lg px-2 ${
                    desktopLayout === 'panel'
                        ? 'bg-[#005A36] text-white font-semibold shadow-2xs'
                        : 'bg-transparent text-[#64748B] dark:text-[#94A3B8]'
                }`}
            >
                Panel lateral
            </Button>
            <Button
                size="sm"
                variant="flat"
                onPress={() => handleChangeDesktopLayout('hud')}
                startContent={<Layers size={13} />}
                className={`h-7 text-[11px] font-medium rounded-lg px-2 ${
                    desktopLayout === 'hud'
                        ? 'bg-[#005A36] text-white font-semibold shadow-2xs'
                        : 'bg-transparent text-[#64748B] dark:text-[#94A3B8]'
                }`}
            >
                HUD flotante
            </Button>
        </div>
    );

    const renderModeControlBar = () => {
        if (interactionMode === 'explorar') {
            return (
                <div
                    data-tour="simulador-controles"
                    className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl px-4 py-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                    {selectedMateria ? (
                        <>
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#005A36] dark:text-[#6EE7B7]">
                                    <Pin size={14} className="shrink-0" aria-hidden="true" />
                                    <span className="truncate">{selectedMateria.nombre}</span>
                                    <span className="font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                        ({selectedMateria.codigo})
                                    </span>
                                </span>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#FFFBEB] dark:bg-[#2D2210] text-[#92400E] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#5C4318]">
                                    Requiere: {selectedStats.reqs}
                                </span>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38]">
                                    Habilita: {selectedStats.unlocks}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    size="sm"
                                    variant="bordered"
                                    className="h-8 text-xs font-medium border-[#E2E8F0] dark:border-[#2A3540] text-[#475569] dark:text-[#CBD5E1]"
                                    startContent={<X size={14} />}
                                    onPress={() => setSelectedCodigo(null)}
                                >
                                    Deseleccionar
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-[#475569] dark:text-[#94A3B8]">
                            <Pin size={14} className="text-[#005A36] dark:text-[#6EE7B7] shrink-0" aria-hidden="true" />
                            <span>
                                Tocá cualquier materia del mapa para dejarla fijada y ver sus requisitos previos (ámbar) y las materias que habilita (verde).
                            </span>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div
                data-tour="simulador-controles"
                className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl px-3 sm:px-4 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5"
            >
                <div className="flex items-center gap-2">
                    <Button
                        onPress={handleAnterior}
                        isDisabled={!estadoAnterior}
                        variant="flat"
                        size="sm"
                        className="font-medium rounded-xl px-3 h-9 bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0]"
                        startContent={<i className="fa-solid fa-chevron-left text-xs" />}
                    >
                        <span className="text-xs sm:text-sm">Anterior</span>
                    </Button>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 px-1 sm:px-2">
                        <span className="text-xs sm:text-sm font-bold text-[#005A36] dark:text-[#6EE7B7] tabular-nums">
                            {cuatri}° Cuatri · {anioActual}
                        </span>
                        <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                            {elegidasEsteCuatri} {elegidasEsteCuatri === 1 ? 'elegida' : 'elegidas'}
                        </span>
                    </div>

                    <Button
                        onPress={() => handleSiguiente(materiasCursables)}
                        isDisabled={!estadoSiguiente}
                        size="sm"
                        className="font-semibold rounded-xl px-3 h-9 bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] dark:hover:bg-[#246B4E] text-white"
                        endContent={<i className="fa-solid fa-chevron-right text-xs" />}
                    >
                        <span className="text-xs sm:text-sm">Siguiente</span>
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div
            className={
                isDesktopGrafo
                    ? `w-full flex flex-col h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)] overflow-hidden ${
                          desktopLayout === 'hud' ? 'p-0' : 'p-3'
                      }`
                    : 'flex flex-col gap-3 sm:gap-4 py-3 sm:py-4 px-3 sm:px-6 md:px-8 max-w-7xl mx-auto w-full min-h-[calc(100vh-3.5rem)]'
            }
        >
            <ConfiguracionSimulador
                isOpen={isConfigOpen}
                onOpenChange={onConfigOpenChange}
                onClose={onConfigClose}
                setAnio={setAnioInicio}
                setCuatri={setCuatriInicio}
                setPlan={(nextPlan) => {
                    setPlan(nextPlan);
                    setCustomPlanTransition(null);
                }}
                initialPlan={initialPlan}
            />
            <ConfirmarImportarModal
                isOpen={isConfirmImportOpen}
                onOpenChange={onConfirmImportOpenChange}
                onConfirm={ejecutarImportacion}
                progresoReal={progresoReal}
                progresoDetalles={progresoDetallesReal}
                materias={basePlanMaterias}
            />
            <SimuladorModeModal
                isOpen={Boolean(plan) && !cargando && isModeModalOpen}
                onSelectMode={handleSelectInitialMode}
            />
            <SimulacionFinalizadaModal
                isOpen={isFinishModalOpen}
                onOpenChange={setIsFinishModalOpen}
                onClose={() => setIsFinishModalOpen(false)}
                anioActual={anioActual}
                cuatri={cuatri}
                plan={activePlan}
                historialSemestres={historialSemestres}
                handleDownloadPDF={handleDownloadPDF}
                descargandoPDF={descargandoPDF}
                onOpenHistory={() => {
                    setIsFinishModalOpen(false);
                    onHistoryOpen();
                }}
            />

            <Modal isOpen={isHistoryOpen} onOpenChange={onHistoryOpenChange} size="3xl" scrollBehavior="inside">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex items-center justify-between gap-2 pr-10 border-b border-[#E2E8F0] dark:border-[#24303C]">
                                <span className="text-base font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                                    Historial Académico
                                </span>
                                {activePlan && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38] text-xs font-semibold">
                                        Plan {activePlan}
                                        {plan !== activePlan ? ` (desde ${plan})` : ''}
                                    </span>
                                )}
                            </ModalHeader>
                            <ModalBody className="py-4">
                                <HistorialAcademico
                                    historialSemestres={historialSemestres}
                                    openedAccordions={openedAccordions}
                                    setOpenedAccordions={setOpenedAccordions}
                                    plan={activePlan}
                                    materias={materias}
                                    embedded={true}
                                    onDownloadPDF={handleDownloadPDF}
                                    descargandoPDF={descargandoPDF}
                                />
                            </ModalBody>
                            {historialSemestres.length > 0 && (
                                <ModalFooter className="border-t border-[#E2E8F0] dark:border-[#24303C] flex flex-wrap items-center justify-end gap-2">
                                    <Button
                                        size="sm"
                                        onPress={handleDownloadPDFFromHistory}
                                        isLoading={descargandoPDF}
                                        startContent={!descargandoPDF && <FileDown size={15} />}
                                        className="font-semibold rounded-xl h-9 px-4 bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] dark:hover:bg-[#246B4E] text-white"
                                    >
                                        {descargandoPDF ? 'Generando...' : 'Descargar PDF'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="light"
                                        onPress={onClose}
                                        className="font-medium rounded-xl h-9 text-[#64748B] dark:text-[#94A3B8]"
                                    >
                                        Cerrar
                                    </Button>
                                </ModalFooter>
                            )}
                        </>
                    )}
                </ModalContent>
            </Modal>

            <Modal isOpen={descargandoPDF} hideCloseButton isDismissable={false} backdrop="opaque" placement="center">
                <ModalContent>
                    <ModalBody className="py-8 flex flex-col items-center justify-center text-center gap-4">
                        <Spinner size="lg" color="primary" />
                        <div>
                            <h3 className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9]">Generando Reporte</h3>
                            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                                Preparando tu planilla académica imprimible...
                            </p>
                        </div>
                    </ModalBody>
                </ModalContent>
            </Modal>

            {!plan && !cargando && (
                <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
                    <div className="bg-[#ECFDF5] dark:bg-[#102A20] p-5 rounded-2xl text-[#005A36] dark:text-[#86EFAC]">
                        <i className="fa-solid fa-sliders text-3xl" />
                    </div>
                    <div className="space-y-1.5">
                        <h2 className="text-xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">Configuración Requerida</h2>
                        <p className="text-sm text-[#64748B] dark:text-[#94A3B8] max-w-sm">
                            Definí tu plan de estudios y cuatrimestre de inicio para comenzar la simulación.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button color="primary" size="md" className="font-semibold rounded-xl px-8" onPress={onConfigOpen}>
                            Configurar Manualmente
                        </Button>
                        <Button
                            variant="flat"
                            size="md"
                            className="font-medium rounded-xl px-8 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540]"
                            onPress={() => {
                                setPlan(initialPlan || DEFAULT_PLAN);
                                setTimeout(handleImportarProgreso, 500);
                            }}
                            startContent={<CloudDownload size={17} />}
                        >
                            Importar Mis Materias
                        </Button>
                    </div>
                </div>
            )}

            {plan && isDesktopGrafo && (
                <div className="animate-in fade-in duration-300 flex-1 min-h-0 flex flex-col">
                    <InteractiveTourOverlay
                        tour={TUTORIAL_TOURS[TOUR_IDS.SIMULADOR]}
                        ready={Boolean(plan) && !cargando && !isModeModalOpen}
                        triggerPlacement="hidden"
                        openRequestKey={tourOpenKey}
                        onBeforeStep={handleBeforeTourStep}
                    />

                    {desktopLayout === 'panel' ? (
                        <div className="flex flex-1 min-h-0 h-full w-full gap-3">
                            <div
                                ref={grafoContainerRef}
                                className={`relative border border-[#E2E8F0] dark:border-[#2A3540] shadow-2xs flex-1 min-w-0 h-full flex flex-col bg-white dark:bg-[#161D24] ${
                                    isFullScreen
                                        ? 'fixed inset-0 z-[1000] p-0 rounded-none w-screen h-screen'
                                        : 'rounded-2xl overflow-hidden'
                                }`}
                            >
                                <div className="flex-1 min-h-0 h-full">
                                    <MateriasGrafo
                                        materias={materias}
                                        progreso={progresoSimulado}
                                        onNodeClick={handleNodeClick}
                                        projection={projection}
                                        interactionMode={interactionMode}
                                        selectedNodeId={interactionMode === 'explorar' ? selectedCodigo : null}
                                        codigosIntermedio={codigosIntermedio}
                                        tituloIntermedioNombre={tituloIntermedioNombre}
                                        controlsPosition="top-left"
                                        rounded={true}
                                        topRightContent={
                                            <>
                                                {interactionMode === 'planificar' &&
                                                    progresoIntermedio.totales > 0 &&
                                                    renderIntermediateBadge()}
                                                <Button
                                                    isIconOnly
                                                    variant="flat"
                                                    className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-[#475569] dark:text-[#CBD5E1] min-w-8 h-8 sm:min-w-9 sm:h-9"
                                                    onPress={toggleFullScreen}
                                                    aria-label={isFullScreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                                                    title={isFullScreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                                                >
                                                    {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                                </Button>
                                                {simulacionTerminada && !isSidePanelOpen && !isFullScreen && (
                                                    <Button
                                                        size="sm"
                                                        variant="flat"
                                                        onPress={() => setIsFinishModalOpen(true)}
                                                        startContent={<GraduationCap size={14} />}
                                                        className="bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] text-white font-semibold h-8 sm:h-9 rounded-xl"
                                                    >
                                                        Resumen / PDF
                                                    </Button>
                                                )}
                                                {!isSidePanelOpen && !isFullScreen && (
                                                    <Button
                                                        size="sm"
                                                        variant="flat"
                                                        onPress={() => setIsSidePanelOpen(true)}
                                                        startContent={<PanelRightOpen size={14} />}
                                                        className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-[#005A36] dark:text-[#6EE7B7] font-semibold h-8 sm:h-9 rounded-xl"
                                                    >
                                                        Panel
                                                    </Button>
                                                )}
                                            </>
                                        }
                                        bottomRightContent={renderLayoutComparisonSwitcher()}
                                    />
                                </div>
                            </div>

                            {isSidePanelOpen && (
                                <SimuladorSidePanel
                                    plan={activePlan}
                                    basePlan={plan}
                                    interactionMode={interactionMode}
                                    onChangeInteractionMode={handleChangeInteractionMode}
                                    cuatri={cuatri}
                                    anioActual={anioActual}
                                    elegidasEsteCuatri={elegidasEsteCuatri}
                                    estadoAnterior={estadoAnterior}
                                    estadoSiguiente={estadoSiguiente}
                                    onAnterior={handleAnterior}
                                    onSiguiente={() => handleSiguiente(materiasCursables)}
                                    simulacionTerminada={simulacionTerminada}
                                    onOpenFinishModal={() => setIsFinishModalOpen(true)}
                                    tituloIntermedioNombre={tituloIntermedioNombre}
                                    progresoIntermedio={progresoIntermedio}
                                    isIntermedioCompletado={isIntermedioCompletado}
                                    historialSemestres={historialSemestres}
                                    onOpenHistory={onHistoryOpen}
                                    onDownloadPDF={handleDownloadPDF}
                                    descargandoPDF={descargandoPDF}
                                    planTransition={planTransition}
                                    onChangePlanTransition={handleChangePlanTransition}
                                    suggestedTransitionPeriod={suggestedTransitionPeriod}
                                    transitionAppliedInfo={transitionAppliedInfo}
                                    oferta1713Note={oferta1713Note}
                                    selectedMateria={selectedMateria}
                                    selectedRelations={selectedRelations}
                                    onSelectCodigo={setSelectedCodigo}
                                    onImportarProgreso={handleImportarProgreso}
                                    onOpenConfig={onConfigOpen}
                                    onOpenTutorial={() => setTourOpenKey((k) => k + 1)}
                                    onClose={() => setIsSidePanelOpen(false)}
                                />
                            )}
                        </div>
                    ) : (
                        <div
                            ref={grafoContainerRef}
                            className={`relative flex-1 min-h-0 flex flex-col bg-[#F8FAFC] dark:bg-[#0F1419] ${
                                isFullScreen
                                    ? 'fixed inset-0 z-[1000] p-0 rounded-none w-screen h-screen'
                                    : 'w-full h-full overflow-hidden'
                            }`}
                        >
                            <div className="flex-1 min-h-0 h-full">
                                <MateriasGrafo
                                    materias={materias}
                                    progreso={progresoSimulado}
                                    onNodeClick={handleNodeClick}
                                    projection={projection}
                                    interactionMode={interactionMode}
                                    selectedNodeId={interactionMode === 'explorar' ? selectedCodigo : null}
                                    codigosIntermedio={codigosIntermedio}
                                    tituloIntermedioNombre={tituloIntermedioNombre}
                                    controlsPosition="bottom-left"
                                    rounded={false}
                                    topOverlayContent={
                                        <SimuladorFloatingHud
                                            plan={activePlan}
                                            basePlan={plan}
                                            planTransition={planTransition}
                                            transitionAppliedInfo={transitionAppliedInfo}
                                            interactionMode={interactionMode}
                                            onChangeInteractionMode={handleChangeInteractionMode}
                                            cuatri={cuatri}
                                            anioActual={anioActual}
                                            elegidasEsteCuatri={elegidasEsteCuatri}
                                            estadoAnterior={estadoAnterior}
                                            estadoSiguiente={estadoSiguiente}
                                            onAnterior={handleAnterior}
                                            onSiguiente={() => handleSiguiente(materiasCursables)}
                                            simulacionTerminada={simulacionTerminada}
                                            onOpenFinishModal={() => setIsFinishModalOpen(true)}
                                            historialSemestres={historialSemestres}
                                            onOpenHistory={onHistoryOpen}
                                            onDownloadPDF={handleDownloadPDF}
                                            descargandoPDF={descargandoPDF}
                                            selectedMateria={selectedMateria}
                                            selectedStats={selectedStats}
                                            onClearSelected={() => setSelectedCodigo(null)}
                                            onImportarProgreso={handleImportarProgreso}
                                            onOpenConfig={onConfigOpen}
                                            onOpenTutorial={() => setTourOpenKey((k) => k + 1)}
                                            isFullScreen={isFullScreen}
                                            onToggleFullScreen={toggleFullScreen}
                                        />
                                    }
                                    bottomRightContent={
                                        <>
                                            {interactionMode === 'planificar' &&
                                                progresoIntermedio.totales > 0 &&
                                                renderIntermediateBadge()}
                                            {renderLayoutComparisonSwitcher()}
                                        </>
                                    }
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {plan && !isDesktopGrafo && (
                <div className="animate-in fade-in duration-300 flex flex-col gap-3 flex-1 min-h-0">
                    <InteractiveTourOverlay
                        tour={mobileSimuladorTour}
                        ready={Boolean(plan) && !cargando && !isModeModalOpen}
                        triggerPlacement="inline"
                    />

                    <HeaderSimulador
                        plan={activePlan}
                        basePlan={plan}
                        anioActual={anioActual}
                        cuatri={cuatri}
                        anioInicio={anioInicio}
                        cuatriInicio={cuatriInicio}
                        interactionMode={interactionMode}
                        onChangeInteractionMode={handleChangeInteractionMode}
                        onOpenConfig={onConfigOpen}
                        onImportarProgreso={handleImportarProgreso}
                        onDownloadPDF={handleDownloadPDF}
                        descargandoPDF={descargandoPDF}
                        hasHistorial={historialSemestres.length > 0}
                        planTransition={planTransition}
                        onChangePlanTransition={handleChangePlanTransition}
                        suggestedTransitionPeriod={suggestedTransitionPeriod}
                        transitionAppliedInfo={transitionAppliedInfo}
                        oferta1713Note={oferta1713Note}
                        simulacionTerminada={simulacionTerminada}
                    />

                    {cargando ? (
                        <div className="flex justify-center py-20 flex-1 items-center">
                            <Spinner size="lg" label="Preparando simulación..." color="primary" labelColor="primary" />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2.5 flex-1 min-h-0 relative">
                            <HistorialAcademico
                                historialSemestres={historialSemestres}
                                openedAccordions={openedAccordions}
                                setOpenedAccordions={setOpenedAccordions}
                                plan={activePlan}
                                materias={materias}
                                onDownloadPDF={handleDownloadPDF}
                                descargandoPDF={descargandoPDF}
                            />

                            <div className="flex-1 min-h-0 flex flex-col">
                                {simulacionTerminada ? (
                                    <CarreraFinalizada
                                        anioActual={anioActual}
                                        plan={activePlan}
                                        handleDownloadPDF={handleDownloadPDF}
                                        descargandoPDF={descargandoPDF}
                                    />
                                ) : (
                                    <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                                        <div className="shrink-0">{renderModeControlBar()}</div>
                                        <div className="relative border border-[#E2E8F0] dark:border-[#2A3540] shadow-2xs rounded-2xl overflow-hidden flex-1 min-h-0 flex flex-col bg-white dark:bg-[#161D24]">
                                            <MateriasMallaEstatica
                                                materias={materias}
                                                progreso={progresoSimulado}
                                                onNodeClick={handleNodeClick}
                                                projection={projection}
                                                cambioDeEstado={cambioDeEstado}
                                                marcarTodasEnPantalla={marcarTodasEnPantalla}
                                                selectedCodigo={interactionMode === 'explorar' ? selectedCodigo : null}
                                                interactionMode={interactionMode}
                                                codigosIntermedio={codigosIntermedio}
                                                tituloIntermedioNombre={tituloIntermedioNombre}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Simulador;
