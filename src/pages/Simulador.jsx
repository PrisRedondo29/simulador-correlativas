import React, { useState } from 'react';
import { addToast, Button, Spinner, useDisclosure, Card, CardBody, Modal, ModalContent, ModalBody } from '@heroui/react';

import HeaderSimulador from '../components/Simulador/HeaderSimulador';
import HistorialAcademico from '../components/Simulador/HistorialAcademico';
import CarreraFinalizada from '../components/Simulador/CarreraFinalizada';
import ConfiguracionSimulador from '../components/Simulador/modals/ConfiguracionSimulador';
import GuardarSimulacion from '../components/Simulador/modals/GuardarSimulacion';
import ConfirmarImportarModal from '../components/Simulador/modals/ConfirmarImportarModal';
import SimuladorModeModal from '../components/Simulador/modals/SimuladorModeModal';
import InteractiveTourOverlay from '../components/Tutorial/InteractiveTourOverlay';
import { TOUR_IDS, TUTORIAL_TOURS } from '../config/tutorialTours';
import MateriasGrafo from '../components/Progreso/MateriasGrafo';
import MateriasMallaEstatica from '../components/Simulador/MateriasMallaEstatica';

import useSimuladorEstado from '../hooks/Simulador/useSimuladorEstado';
import useSimuladorMaterias from '../hooks/Simulador/useSimuladorMaterias';
import useSimuladorPDF from '../hooks/Simulador/useSimuladorPDF';
import usePlanData from '../hooks/usePlanData';
import { CloudDownload, Maximize2, Minimize2, Pin, X } from 'lucide-react';
import { calculateProjection } from '../utils/Simulador/projectionUtils';
import tituloIntermedioUtils from '../utils/Progreso/tituloIntermedioUtils';
import importUtils from '../utils/Simulador/importUtils';
import { trackCambioVista } from '../services/analyticsService';
import storageRepository from '../services/storageRepository';
import { DEFAULT_PLAN } from '../config/planPolicies';

function Simulador({ plan: initialPlan }) {
    const [plan, setPlan] = useState(() => initialPlan || storageRepository.getPlanActivo() || DEFAULT_PLAN);
    const [anioInicio, setAnioInicio] = useState('2026');
    const [cuatriInicio, setCuatriInicio] = useState('1');

    const [openedAccordions, setOpenedAccordions] = useState(new Set());
    const [descargandoPDF, setDescargandoPDF] = useState(false);
    const [interactionMode, setInteractionMode] = useState(
        () => storageRepository.getSimuladorModeSelected() || 'planificar',
    );
    const [isModeModalOpen, setIsModeModalOpen] = useState(
        () => !storageRepository.getSimuladorModeSelected(),
    );
    const [selectedCodigo, setSelectedCodigo] = useState(null);
    const [viewMode] = useState(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) return 'malla';
        return 'grafo';
    });

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
    const { isOpen: isGuardarOpen, onClose: onGuardarClose, onOpenChange: onGuardarOpenChange, onOpen: onGuardarOpen } = useDisclosure();
    const { isOpen: isConfirmImportOpen, onOpenChange: onConfirmImportOpenChange, onOpen: onConfirmImportOpen } = useDisclosure();

    const {
        materias,
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
    } = useSimuladorEstado({ plan, anioInicio, cuatriInicio });

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

    const ejecutarImportacion = () => {
        const resultado = importUtils.reconstruirHistorial(progresoReal, progresoDetallesReal, materias);
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
    };

    const { tituloIntermedioNombre, progresoIntermedio, isIntermedioCompletado } = React.useMemo(() => {
        const nombre = tituloIntermedioUtils.getTituloIntermedioNombre(plan);
        const materiasIntermedio = tituloIntermedioUtils.getMateriasIntermedio(plan, materias);

        const mappedProgreso = {};
        if (progresoSimulado) {
            Object.keys(progresoSimulado).forEach(key => {
                if (progresoSimulado[key] === 'Cursado') mappedProgreso[key] = 'Aprobado';
            });
        }

        const progreso = tituloIntermedioUtils.calcularProgresoIntermedio(materiasIntermedio, mappedProgreso);
        return {
            tituloIntermedioNombre: nombre,
            progresoIntermedio: progreso,
            isIntermedioCompletado: progreso.totales > 0 && progreso.completadas === progreso.totales,
        };
    }, [plan, materias, progresoSimulado]);

    const { cambioDeEstado, materiasCursables } = useSimuladorMaterias(
        materias,
        progresoSimulado || {},
        cuatri,
        setProgresoSimulado,
        progresoBase || {},
        anioActual,
        semestreActualPlan
    );

    const projection = React.useMemo(() => {
        if (!materias.length || !progresoBase) return null;
        return calculateProjection({
            materias,
            historialSemestres,
            progresoBase,
            cuatriActual: cuatri,
            anioActual,
        });
    }, [materias, historialSemestres, progresoBase, cuatri, anioActual]);

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

    const elegidasEsteCuatri = React.useMemo(
        () =>
            materiasCursables.filter((m) => {
                const st = progresoSimulado?.[m.codigo];
                return st === 'Cursado' || st === 'Aprobado' || st === 'Promocionado';
            }).length,
        [materiasCursables, progresoSimulado],
    );

    const { handleDownloadPDF } = useSimuladorPDF({
        historialSemestres,
        plan,
        openedAccordions,
        setOpenedAccordions,
        setDescargandoPDF,
    });

    const marcarTodasEnPantalla = (estado) => {
        if (!materiasCursables.length) return;
        const nuevo = { ...progresoSimulado };
        materiasCursables.forEach(m => { nuevo[m.codigo] = estado; });
        setProgresoSimulado(nuevo);
    };

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
        <div className="flex flex-col gap-5 py-5 sm:py-6 px-4 sm:px-6 md:px-10 max-w-7xl mx-auto min-h-screen w-full">
            <ConfiguracionSimulador
                isOpen={isConfigOpen}
                onOpenChange={onConfigOpenChange}
                onClose={onConfigClose}
                setAnio={setAnioInicio}
                setCuatri={setCuatriInicio}
                setPlan={setPlan}
                initialPlan={initialPlan}
            />
            <GuardarSimulacion
                isOpen={isGuardarOpen}
                onOpenChange={onGuardarOpenChange}
                onClose={onGuardarClose}
                plan={plan}
                historialSemestres={historialSemestres}
                progresoSimulado={progresoSimulado}
                progresoBase={progresoBase}
                anioActual={anioActual}
                cuatri={cuatri}
                simulacionTerminada={simulacionTerminada}
            />
            <ConfirmarImportarModal
                isOpen={isConfirmImportOpen}
                onOpenChange={onConfirmImportOpenChange}
                onConfirm={ejecutarImportacion}
                progresoReal={progresoReal}
                progresoDetalles={progresoDetallesReal}
                materias={materias}
            />
            <SimuladorModeModal
                isOpen={Boolean(plan) && !cargando && isModeModalOpen}
                onSelectMode={handleSelectInitialMode}
            />

            <Modal isOpen={descargandoPDF} hideCloseButton isDismissable={false} backdrop="opaque" placement="center">
                <ModalContent>
                    <ModalBody className="py-8 flex flex-col items-center justify-center text-center gap-4">
                        <Spinner size="lg" color="primary" />
                        <div>
                            <h3 className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9]">Generando Reporte</h3>
                            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                                Preparando tu historial académico y procesando el documento...
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

            {plan && (
                <div className="animate-in fade-in duration-300 flex flex-col gap-4">
                    <InteractiveTourOverlay
                        tour={TUTORIAL_TOURS[TOUR_IDS.SIMULADOR]}
                        ready={Boolean(plan) && !cargando && !isModeModalOpen}
                        triggerPlacement="inline"
                    />

                    <HeaderSimulador
                        plan={plan}
                        anioActual={anioActual}
                        cuatri={cuatri}
                        anioInicio={anioInicio}
                        cuatriInicio={cuatriInicio}
                        interactionMode={interactionMode}
                        onChangeInteractionMode={handleChangeInteractionMode}
                        onOpenConfig={onConfigOpen}
                        onImportarProgreso={handleImportarProgreso}
                        simulacionTerminada={simulacionTerminada}
                    />

                    {cargando ? (
                        <div className="flex justify-center py-20">
                            <Spinner size="lg" label="Preparando simulación..." color="primary" labelColor="primary" />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 relative">
                            <HistorialAcademico
                                historialSemestres={historialSemestres}
                                openedAccordions={openedAccordions}
                                setOpenedAccordions={setOpenedAccordions}
                                descargandoPDF={descargandoPDF}
                                plan={plan}
                                materias={materias}
                            />

                            <div>
                                {simulacionTerminada ? (
                                    <CarreraFinalizada
                                        anioActual={anioActual}
                                        plan={plan}
                                        historialSemestres={historialSemestres}
                                        progresoSimulado={progresoSimulado}
                                        progresoBase={progresoBase}
                                        cuatri={cuatri}
                                        simulacionTerminada={simulacionTerminada}
                                        onGuardarOpen={onGuardarOpen}
                                        handleDownloadPDF={handleDownloadPDF}
                                        descargandoPDF={descargandoPDF}
                                    />
                                ) : viewMode === 'malla' ? (
                                    <div className="space-y-3">
                                        {renderModeControlBar()}
                                        <div className="relative border border-[#E2E8F0] dark:border-[#2A3540] shadow-2xs rounded-2xl overflow-hidden flex flex-col bg-white dark:bg-[#161D24]">
                                            <MateriasMallaEstatica
                                                materias={materias}
                                                progreso={progresoSimulado}
                                                onNodeClick={handleNodeClick}
                                                projection={projection}
                                                cambioDeEstado={cambioDeEstado}
                                                marcarTodasEnPantalla={marcarTodasEnPantalla}
                                                selectedCodigo={interactionMode === 'explorar' ? selectedCodigo : null}
                                                interactionMode={interactionMode}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {renderModeControlBar()}
                                        <div
                                            ref={grafoContainerRef}
                                            className={`relative border border-[#E2E8F0] dark:border-[#2A3540] shadow-2xs transition-all duration-300 flex flex-col bg-white dark:bg-[#161D24] ${
                                                isFullScreen
                                                    ? 'fixed inset-0 z-[1000] p-0 rounded-none w-screen h-screen'
                                                    : 'h-[620px] sm:h-[720px] rounded-2xl overflow-hidden'
                                            }`}
                                        >
                                            <div className="flex-1 min-h-0">
                                                <MateriasGrafo
                                                    materias={materias}
                                                    progreso={progresoSimulado}
                                                    onNodeClick={handleNodeClick}
                                                    projection={projection}
                                                    selectedNodeId={interactionMode === 'explorar' ? selectedCodigo : null}
                                                    topRightContent={
                                                    <>
                                                        {progresoIntermedio.totales > 0 && (
                                                            <div
                                                                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 border ${
                                                                    isIntermedioCompletado
                                                                        ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0] dark:bg-[#102A20] dark:text-[#86EFAC] dark:border-[#1E4D38]'
                                                                        : 'bg-white dark:bg-[#161D24] text-[#334155] dark:text-[#E2E8F0] border-[#E2E8F0] dark:border-[#2A3540]'
                                                                }`}
                                                            >
                                                                <i className="fa-solid fa-graduation-cap text-xs text-[#005A36] dark:text-[#6EE7B7]" />
                                                                <span className="hidden sm:inline">{tituloIntermedioNombre}:</span>
                                                                <span className="tabular-nums">
                                                                    {progresoIntermedio.completadas}/{progresoIntermedio.totales}
                                                                </span>
                                                            </div>
                                                        )}
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
                                                    </>
                                                }
                                            />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {viewMode === 'lista' && !simulacionTerminada && (
                                <Card shadow="none" className="mt-4 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl">
                                    <CardBody className="flex flex-col md:flex-row justify-between items-center p-4 gap-3">
                                        <Button
                                            onPress={handleAnterior}
                                            isDisabled={!estadoAnterior}
                                            variant="flat"
                                            startContent={<i className="fa-solid fa-chevron-left text-xs" />}
                                            className="w-full md:w-auto font-medium bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0]"
                                        >
                                            Anterior
                                        </Button>

                                        <div className="flex flex-col items-center text-center">
                                            <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                                                {cuatri}° Cuatrimestre · Año {anioActual}
                                            </span>
                                            {progresoIntermedio.totales > 0 && (
                                                <span className={`text-xs font-semibold ${isIntermedioCompletado ? 'text-[#478559] dark:text-[#86EFAC]' : 'text-[#005A36] dark:text-[#6EE7B7]'}`}>
                                                    {tituloIntermedioNombre}: {progresoIntermedio.porcentaje}%
                                                </span>
                                            )}
                                        </div>

                                        <Button
                                            onPress={() => handleSiguiente(materiasCursables)}
                                            isDisabled={!estadoSiguiente}
                                            className="w-full md:w-auto font-semibold bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] dark:hover:bg-[#246B4E] text-white"
                                            endContent={<i className="fa-solid fa-chevron-right text-xs" />}
                                            aria-label="Siguiente cuatrimestre"
                                        >
                                            Siguiente
                                        </Button>
                                    </CardBody>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Simulador;
