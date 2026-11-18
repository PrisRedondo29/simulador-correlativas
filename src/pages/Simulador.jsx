import React, { useState } from 'react';
import { Button, Spinner, useDisclosure, Card, CardBody, Modal, ModalContent, ModalBody } from '@heroui/react';

import HeaderSimulador from '../components/Simulador/HeaderSimulador';
import MateriasSimulador from '../components/Simulador/MateriasSimulador';
import HistorialAcademico from '../components/Simulador/HistorialAcademico';
import CarreraFinalizada from '../components/Simulador/CarreraFinalizada';
import ConfiguracionSimulador from '../components/Simulador/modals/ConfiguracionSimulador';
import GuardarSimulacion from '../components/Simulador/modals/GuardarSimulacion';
import ConfirmarImportarModal from '../components/Simulador/modals/ConfirmarImportarModal';
import MateriasGrafo from '../components/Progreso/MateriasGrafo';
import MateriasMallaEstatica from '../components/Simulador/MateriasMallaEstatica';

import useSimuladorEstado from '../hooks/Simulador/useSimuladorEstado';
import useSimuladorMaterias from '../hooks/Simulador/useSimuladorMaterias';
import useSimuladorPDF from '../hooks/Simulador/useSimuladorPDF';
import usePlanData from '../hooks/usePlanData';
import { CloudDownload, Maximize2, Minimize2 } from 'lucide-react';
import { calculateProjection } from '../utils/Simulador/projectionUtils';
import tituloIntermedioUtils from '../utils/Progreso/tituloIntermedioUtils';
import importUtils from '../utils/Simulador/importUtils';
import { trackCambioVista } from '../services/analyticsService';

function Simulador({ plan: initialPlan }) {
    const [plan, setPlan] = useState(() => initialPlan || localStorage.getItem('plan_activo') || '17.14');
    const [anioInicio, setAnioInicio] = useState('2026');
    const [cuatriInicio, setCuatriInicio] = useState('1');

    const [openedAccordions, setOpenedAccordions] = useState(new Set());
    const [descargandoPDF, setDescargandoPDF] = useState(false);
    const [viewMode, setViewMode] = useState(() => {
        const guardada = localStorage.getItem('simulador_vista_preferida');
        if (guardada && ['malla', 'grafo', 'lista'].includes(guardada)) {
            return guardada;
        }
        if (typeof window !== 'undefined' && window.innerWidth < 768) return 'malla';
        return 'grafo';
    });

    const handleCambioVista = (nuevoModo) => {
        setViewMode(nuevoModo);
        try {
            localStorage.setItem('simulador_vista_preferida', nuevoModo);
        } catch {
            // Ignorar errores de almacenamiento
        }
        trackCambioVista({ tipo: 'tipo_simulacion', valor: nuevoModo });
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
            alert('No se encontró progreso guardado para este plan.');
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
            alert('No hay materias aprobadas o regulares para importar.');
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

    const { cambioDeEstado, materiasCursables, materiasBloqueadas } = useSimuladorMaterias(
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
        const item = projection?.items?.[codigo];
        if (item && item.estado === 'Presente') {
            cambioDeEstado(codigo);
        }
    }, [projection, cambioDeEstado]);

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

    const renderFloatingControls = () => (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center w-full px-4 max-w-sm sm:max-w-md pointer-events-none">
            <div className="pointer-events-auto flex items-center bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] p-1.5 rounded-2xl shadow-md gap-2 sm:gap-4 w-full justify-between">
                <Button
                    onPress={handleAnterior}
                    isDisabled={!estadoAnterior}
                    variant="flat"
                    size="sm"
                    className="font-medium rounded-xl px-3 sm:px-4 min-w-0 h-9 bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0]"
                    startContent={<i className="fa-solid fa-chevron-left text-xs" />}
                >
                    <span className="text-xs sm:text-sm">Anterior</span>
                </Button>

                <div className="flex flex-col items-center px-1 sm:px-2 min-w-fit">
                    <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-medium leading-none">
                        Simulando
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[#005A36] dark:text-[#6EE7B7] truncate whitespace-nowrap tabular-nums">
                        {cuatri}° Cuatri · {anioActual}
                    </span>
                </div>

                <Button
                    onPress={() => handleSiguiente(materiasCursables)}
                    isDisabled={!estadoSiguiente}
                    size="sm"
                    className="font-semibold rounded-xl px-3 sm:px-4 min-w-0 h-9 bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] dark:hover:bg-[#246B4E] text-white"
                    endContent={<i className="fa-solid fa-chevron-right text-xs" />}
                >
                    <span className="text-xs sm:text-sm">Siguiente</span>
                </Button>
            </div>
        </div>
    );

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
                                setPlan(initialPlan || '17.14');
                                setTimeout(handleImportarProgreso, 500);
                            }}
                            startContent={<CloudDownload size={17} />}
                        >
                            Importar Mi Progreso
                        </Button>
                    </div>
                </div>
            )}

            {plan && (
                <div className="animate-in fade-in duration-300 flex flex-col gap-4">
                    <HeaderSimulador
                        plan={plan}
                        anioActual={anioActual}
                        cuatri={cuatri}
                        anioInicio={anioInicio}
                        cuatriInicio={cuatriInicio}
                        viewMode={viewMode}
                        onCambioVista={handleCambioVista}
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
                                ) : viewMode === 'lista' ? (
                                    <div className="animate-in fade-in duration-300">
                                        <div className="flex flex-wrap gap-2 justify-end mb-4">
                                            <Button
                                                variant="flat"
                                                color="success"
                                                size="sm"
                                                className="font-medium text-xs rounded-xl"
                                                onPress={() => marcarTodasEnPantalla('Cursado')}
                                                startContent={<i className="fa-solid fa-check-double text-[11px]" />}
                                                isDisabled={materiasCursables.length === 0}
                                            >
                                                Seleccionar todas
                                            </Button>
                                            <Button
                                                variant="flat"
                                                size="sm"
                                                className="font-medium text-xs rounded-xl bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540]"
                                                onPress={() => marcarTodasEnPantalla('No Cursado')}
                                                startContent={<i className="fa-solid fa-rotate-left text-[11px]" />}
                                                isDisabled={materiasCursables.length === 0}
                                            >
                                                Quitar todas
                                            </Button>
                                        </div>

                                        {materiasCursables.length === 0 && materiasBloqueadas.length === 0 ? (
                                            <div className="p-10 text-center text-[#64748B] bg-white dark:bg-[#161D24] rounded-2xl border border-dashed border-[#CBD5E1] dark:border-[#2A3540]">
                                                <i className="fa-regular fa-folder-open text-3xl mb-2 opacity-60" />
                                                <p className="text-sm font-medium">No hay materias disponibles para este cuatrimestre.</p>
                                            </div>
                                        ) : (
                                            <MateriasSimulador
                                                materiasCursables={materiasCursables}
                                                materiasBloqueadas={materiasBloqueadas}
                                                cambioDeEstado={cambioDeEstado}
                                                progreso={progresoSimulado}
                                            />
                                        )}
                                    </div>
                                ) : viewMode === 'malla' ? (
                                    <div className="relative border border-[#E2E8F0] dark:border-[#2A3540] shadow-2xs rounded-2xl overflow-hidden flex flex-col bg-white dark:bg-[#161D24]">
                                        {renderFloatingControls()}
                                        <MateriasMallaEstatica
                                            materias={materias}
                                            progreso={progresoSimulado}
                                            onNodeClick={handleNodeClick}
                                            projection={projection}
                                            cambioDeEstado={cambioDeEstado}
                                            marcarTodasEnPantalla={marcarTodasEnPantalla}
                                        />
                                    </div>
                                ) : (
                                    <div
                                        ref={grafoContainerRef}
                                        className={`relative border border-[#E2E8F0] dark:border-[#2A3540] shadow-2xs transition-all duration-300 flex flex-col bg-white dark:bg-[#161D24] ${
                                            isFullScreen
                                                ? 'fixed inset-0 z-[1000] p-0 rounded-none w-screen h-screen'
                                                : 'h-[620px] sm:h-[720px] rounded-2xl overflow-hidden'
                                        }`}
                                    >
                                        {renderFloatingControls()}
                                        <div className="flex-1 min-h-0">
                                            <MateriasGrafo
                                                materias={materias}
                                                progreso={progresoSimulado}
                                                onNodeClick={handleNodeClick}
                                                projection={projection}
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
