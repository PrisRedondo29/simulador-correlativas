import React, { useState } from 'react'
import { Button, Spinner, useDisclosure, Card, CardBody, Modal, ModalContent, ModalBody, ButtonGroup } from '@heroui/react'
import { Link } from 'react-router-dom'

import HeaderSimulador from '../components/Simulador/HeaderSimulador'
import MateriasSimulador from '../components/Simulador/MateriasSimulador'
import HistorialAcademico from '../components/Simulador/HistorialAcademico'
import SimulandoAhora from '../components/Simulador/SimulandoAhora'
import CarreraFinalizada from '../components/Simulador/CarreraFinalizada'
import ConfiguracionSimulador from '../components/Simulador/modals/ConfiguracionSimulador'
import GuardarSimulacion from '../components/Simulador/modals/GuardarSimulacion'
import ConfirmarImportarModal from '../components/Simulador/modals/ConfirmarImportarModal'
import MateriasGrafo from '../components/Progreso/MateriasGrafo'
import MateriasMallaEstatica from '../components/Simulador/MateriasMallaEstatica'

import useSimuladorEstado from '../hooks/Simulador/useSimuladorEstado'
import useSimuladorMaterias from '../hooks/Simulador/useSimuladorMaterias'
import useSimuladorPDF from '../hooks/Simulador/useSimuladorPDF'
import usePlanData from '../hooks/usePlanData'
import { LayoutGrid, Network, Columns, CloudDownload, Maximize2, Minimize2 } from 'lucide-react'
import { calculateProjection } from '../utils/Simulador/projectionUtils'
import tituloIntermedioUtils from '../utils/Progreso/tituloIntermedioUtils'
import importUtils from '../utils/Simulador/importUtils'
import { trackCambioVista } from '../services/analyticsService'

import TransicionModal from '../components/Progreso/modals/TransicionModal'

function Simulador({ plan: initialPlan, setPlan: setGlobalPlan }) {
    // ─── Configuración (se inicializa con el plan activo para evitar modales bloqueantes) ────
    const [plan, setPlan] = useState(() => initialPlan || localStorage.getItem('plan_activo') || "17.14")
    const [anioInicio, setAnioInicio] = useState("2026")
    const [cuatriInicio, setCuatriInicio] = useState("1")

    // ─── Modal de Transición ────
    const { isOpen: isTransicionOpen, onOpen: onTransicionOpen, onOpenChange: onTransicionOpenChange } = useDisclosure()

    // ─── UI state ────────────────────────────────────────────────────────────
    const [openedAccordions, setOpenedAccordions] = useState(new Set())
    const [descargandoPDF, setDescargandoPDF] = useState(false)
    const [viewMode, setViewMode] = useState(() => {
        const guardada = localStorage.getItem('simulador_vista_preferida');
        if (guardada && ['malla', 'grafo', 'lista'].includes(guardada)) {
            return guardada;
        }
        if (typeof window !== 'undefined' && window.innerWidth < 768) return 'malla';
        return 'grafo';
    })

    const handleCambioVista = (nuevoModo) => {
        setViewMode(nuevoModo);
        try {
            localStorage.setItem('simulador_vista_preferida', nuevoModo);
        } catch {
            // Ignorar errores si el almacenamiento local está restringido
        }
        trackCambioVista({ tipo: 'tipo_simulacion', valor: nuevoModo });
    };
    const [isFullScreen, setIsFullScreen] = useState(false)
    const grafoContainerRef = React.useRef(null)

    // Handler para pantalla completa
    const toggleFullScreen = () => {
        if (!grafoContainerRef.current) return;

        if (!document.fullscreenElement) {
            grafoContainerRef.current.requestFullscreen?.().catch(err => {
                if (import.meta.env.DEV) console.error(`Error al intentar entrar en pantalla completa: ${err.message}`);
                // Fallback manual si falla la API nativa
                setIsFullScreen(true);
            });
        } else {
            document.exitFullscreen?.();
        }
    }

    // Escuchar cambios de pantalla completa nativa
    React.useEffect(() => {
        const handleFSChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFSChange);
        return () => document.removeEventListener('fullscreenchange', handleFSChange);
    }, []);

    // ─── Datos de Progreso Real (para importar) ──────────────────────────────
    const { 
        progreso: progresoReal, 
        progresoDetalles: progresoDetallesReal 
    } = usePlanData(plan);

    // ─── Modales ─────────────────────────────────────────────────────────────
    const { isOpen: isConfigOpen, onClose: onConfigClose, onOpenChange: onConfigOpenChange, onOpen: onConfigOpen } = useDisclosure()
    const { isOpen: isGuardarOpen, onClose: onGuardarClose, onOpenChange: onGuardarOpenChange, onOpen: onConfigOpenGuardar } = useDisclosure()
    const { isOpen: isConfirmImportOpen, onClose: onConfirmImportClose, onOpenChange: onConfirmImportOpenChange, onOpen: onConfirmImportOpen } = useDisclosure()

    // ─── Estado central de la simulación ─────────────────────────────────────
    const {
        materias,
        cargando,
        progresoSimulado, setProgresoSimulado,
        progresoBase, setProgresoBase,
        cuatri,
        anioActual,
        historialSemestres, setHistorialSemestres,
        semestreActualPlan,
        estadoAnterior,
        estadoSiguiente,
        simulacionTerminada, setSimulacionTerminada,
        handleAnterior,
        handleSiguiente,
        importarHistorialReconstruido
    } = useSimuladorEstado({ plan, anioInicio, cuatriInicio })

    // Handler para importar progreso
    const handleImportarProgreso = () => {
        if (!progresoReal || Object.keys(progresoReal).length === 0) {
            alert("No se encontró progreso guardado para este plan.");
            return;
        }
        onConfirmImportOpen();
    }

    const ejecutarImportacion = () => {
        const resultado = importUtils.reconstruirHistorial(progresoReal, progresoDetallesReal, materias);
        if (resultado) {
            importarHistorialReconstruido(resultado);
            // Solo abrimos el último cuatrimestre importado para no saturar la vista
            if (resultado.historial.length > 0) {
                const ultimoIdx = String(resultado.historial.length - 1);
                setOpenedAccordions(new Set([ultimoIdx]));
            }
        } else {
            alert("No hay materias aprobadas o regulares para importar.");
        }
    }

    // Lógica Título Intermedio
    const { tituloIntermedioNombre, progresoIntermedio, isIntermedioCompletado } = React.useMemo(() => {
        const nombre = tituloIntermedioUtils.getTituloIntermedioNombre(plan);
        const materiasIntermedio = tituloIntermedioUtils.getMateriasIntermedio(plan, materias);
        
        // Convertimos el progreso del simulador al formato de la utilidad
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
            isIntermedioCompletado: progreso.totales > 0 && progreso.completadas === progreso.totales
        };
    }, [plan, materias, progresoSimulado]);

    // ─── Materias disponibles para el cuatrimestre actual ────────────────────
    const { cambioDeEstado, materiasCursables, materiasBloqueadas } = useSimuladorMaterias(
        materias,
        progresoSimulado || {},
        cuatri,
        setProgresoSimulado,
        progresoBase || {},
        anioActual,
        semestreActualPlan
    )

    // ─── Proyección Dinámica (para el grafo) ─────────────────────────────────
    // El layout se calcula basándose en el progresoBASE (estable durante el semestre)
    const projection = React.useMemo(() => {
        if (!materias.length || !progresoBase) return null;
        return calculateProjection({
            materias,
            historialSemestres,
            progresoBase, // Dependencia estable
            cuatriActual: cuatri,
            anioActual
        });
    }, [materias, historialSemestres, progresoBase, cuatri, anioActual]);

    // Función para manejar clicks en el grafo - Envuelto en useCallback para estabilidad
    const handleNodeClick = React.useCallback((codigo) => {
        // Solo permitimos interactuar si la materia es parte del presente (columna actual)
        const item = projection?.items?.[codigo];
        if (item && item.estado === 'Presente') {
            cambioDeEstado(codigo);
        }
    }, [projection, cambioDeEstado]);

    // ─── PDF ─────────────────────────────────────────────────────────────────
    const { handleDownloadPDF } = useSimuladorPDF({
        historialSemestres,
        plan,
        openedAccordions,
        setOpenedAccordions,
        setDescargandoPDF
    })

    // ─── Marcar / desmarcar todas las materias visibles ──────────────────────
    const marcarTodasEnPantalla = (estado) => {
        if (!materiasCursables.length) return
        const nuevo = { ...progresoSimulado }
        materiasCursables.forEach(m => { nuevo[m.codigo] = estado })
        setProgresoSimulado(nuevo)
    }


    return (
        <div className="flex flex-col gap-5 py-6 px-4 sm:px-6 md:px-10 lg:px-16 mx-auto min-h-screen w-full">

            {/* ── Modales ── */}
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

            {/* Modal que muestra el estado de descarga de PDF sin afectar el render base */}
            <Modal isOpen={descargandoPDF} hideCloseButton isDismissable={false} backdrop="blur" placement="center">
                <ModalContent>
                    <ModalBody className="py-8 flex flex-col items-center justify-center text-center gap-4">
                        <Spinner size="lg" color="primary" />
                        <div>
                            <h3 className="text-xl font-black text-foreground">Generando Reporte</h3>
                            <p className="text-sm text-foreground/60 mt-1">
                                Preparando tu historial académico y procesando el documento...
                            </p>
                        </div>
                    </ModalBody>
                </ModalContent>
            </Modal>

            {/* ── Estado: sin plan configurado ── */}
            {!plan && !cargando && (
                <div className="flex flex-col items-center justify-center py-20 gap-6 text-center animate-in fade-in duration-500">
                    <div className="bg-primary/10 p-6 rounded-full">
                        <i className="fa-solid fa-gear text-5xl text-primary animate-spin-slow" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-foreground">Configuración Requerida</h2>
                        <p className="text-foreground/80 max-w-sm">Para comenzar la simulación, primero debemos definir los parámetros iniciales.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button color="primary" size="lg" variant="shadow" className="font-bold rounded-2xl px-12" onPress={onConfigOpen}>
                            Configurar Manualmente
                        </Button>
                        <Button 
                            color="secondary" 
                            size="lg" 
                            variant="flat" 
                            className="font-bold rounded-2xl px-12" 
                            onPress={() => {
                                setPlan(initialPlan || "17.14");
                                // Pequeño delay para dejar que usePlanData empiece a cargar
                                setTimeout(handleImportarProgreso, 500);
                            }}
                            startContent={<CloudDownload size={20} />}
                        >
                            Importar Mi Progreso
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Contenido principal ── */}
            {plan && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col gap-3">
                    {/* Banner Destacado: Transición de Plan Res. HCS 89/2025 */}
                    <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 border border-[#F5B82E]/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#F5B82E]/20 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-arrows-rotate text-sm" />
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                                    TRANSICIÓN DE PLAN (RES. HCS 89/2025)
                                </span>
                                <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium">
                                    ¿Dudas sobre cambiarte al nuevo Plan 17.14? Verificá con tu avance si te conviene o si tendrías baches de cursada.
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onPress={() => navigate('/cambio-plan')}
                            className="bg-[#F5B82E] hover:bg-[#e2a825] text-slate-900 font-extrabold text-xs px-4 py-2 rounded-xl shrink-0 shadow-2xs self-end sm:self-center"
                            endContent={<i className="fa-solid fa-arrow-right text-[11px]" />}
                        >
                            Simular cambio de plan
                        </Button>
                    </div>

                    {/* Header con controles inline integrados */}
                    <HeaderSimulador 
                        plan={plan} 
                        anioInicio={anioInicio} 
                        cuatriInicio={cuatriInicio} 
                        onOpenConfig={onConfigOpen}
                        onImportarProgreso={handleImportarProgreso}
                    />

                    {/* Disclaimer compacto + Selector de vista con cartel invitatorio */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 bg-warning-50/50 dark:bg-warning-500/10 border border-warning-200/70 dark:border-warning-500/20 text-warning-700 dark:text-warning-300 rounded-xl px-3 py-2 text-[11px] sm:text-xs">
                            <i className="fa-solid fa-circle-info text-warning-500 shrink-0" />
                            <span>
                                <strong>Modo Simulación</strong> — Editá tu avance real en <Link to="/progreso" className="underline font-bold hover:text-warning-600">Mi Progreso</Link>.
                            </span>
                        </div>

                        {/* Contenedor del Selector de Vista + Cartel con Flecha */}
                        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                            {/* Cartel explicativo con flecha animada apuntando a los botones de la derecha */}
                            <div className="flex items-center gap-1.5 text-foreground/80 text-[11px] sm:text-xs bg-primary-50/90 dark:bg-primary-950/70 px-3 py-1.5 rounded-xl border border-primary-200 dark:border-primary-800/80 shadow-2xs">
                                <i className="fa-solid fa-wand-magic-sparkles text-primary shrink-0" />
                                <span className="font-semibold text-primary-900 dark:text-primary-200">Proba las vistas</span>
                                <i className="fa-solid fa-arrow-right text-primary text-xs font-bold animate-pulse ml-0.5" />
                            </div>

                            {/* Selector de Vista */}
                            <div className="flex p-0.5 bg-default-100 rounded-xl border border-default-200 shrink-0">
                                <ButtonGroup size="sm" variant="flat">
                                    <Button
                                        onPress={() => handleCambioVista('malla')}
                                        color={viewMode === 'malla' ? 'primary' : 'default'}
                                        className={`font-bold transition-all text-xs ${viewMode === 'malla' ? 'shadow-sm' : 'bg-transparent text-foreground/50'}`}
                                        startContent={<Columns size={15} />}
                                    >
                                        Malla
                                    </Button>
                                    <Button
                                        onPress={() => handleCambioVista('grafo')}
                                        color={viewMode === 'grafo' ? 'primary' : 'default'}
                                        className={`font-bold transition-all text-xs ${viewMode === 'grafo' ? 'shadow-sm' : 'bg-transparent text-foreground/50'}`}
                                        startContent={<Network size={15} />}
                                    >
                                        Grafo
                                    </Button>
                                    <Button
                                        onPress={() => handleCambioVista('lista')}
                                        color={viewMode === 'lista' ? 'primary' : 'default'}
                                        className={`font-bold transition-all text-xs ${viewMode === 'lista' ? 'shadow-sm' : 'bg-transparent text-foreground/50'}`}
                                        startContent={<LayoutGrid size={15} />}
                                    >
                                        Lista
                                    </Button>
                                </ButtonGroup>
                            </div>
                        </div>
                    </div>

                    {cargando ? (
                        <div className="flex justify-center py-20">
                            <Spinner size="lg" label="Preparando simulación..." color="primary" labelColor="primary" />
                        </div>
                    ) : (
                        <div className="mt-2 flex flex-col relative">

                            {/* ── Historial ── */}
                            <HistorialAcademico
                                historialSemestres={historialSemestres}
                                openedAccordions={openedAccordions}
                                setOpenedAccordions={setOpenedAccordions}
                                descargandoPDF={descargandoPDF}
                                plan={plan}
                                materias={materias}
                            />

                            {/* ── Estado actual o finalizado ── */}
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
                                ) : (
                                    <>
                                        {/* Card "Simulando Ahora" */}
                                        <SimulandoAhora cuatri={cuatri} anioActual={anioActual} />

                                        {viewMode === 'lista' ? (
                                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                {/* Botones de marcar/desmarcar */}
                                                <div className="flex flex-col sm:flex-row gap-2 justify-end mb-4">
                                                    <Button
                                                        variant="flat" color="success" size="sm" className="font-medium"
                                                        onPress={() => marcarTodasEnPantalla('Cursado')}
                                                        startContent={<i className="fa-solid fa-check-double" />}
                                                        isDisabled={materiasCursables.length === 0}
                                                    >
                                                        Seleccionar Todas
                                                    </Button>
                                                    <Button
                                                        variant="flat" color="danger" size="sm" className="font-medium"
                                                        onPress={() => marcarTodasEnPantalla('No Cursado')}
                                                        startContent={<i className="fa-solid fa-rotate-left" />}
                                                        isDisabled={materiasCursables.length === 0}
                                                    >
                                                        Quitar Todas
                                                    </Button>
                                                </div>

                                                {/* Grilla de materias */}
                                                {materiasCursables.length === 0 && materiasBloqueadas.length === 0 ? (
                                                    <div className="p-8 text-center text-foreground/80 bg-default-50 rounded-2xl border-2 border-dashed border-default-200">
                                                        <i className="fa-regular fa-folder-open text-4xl mb-3 text-default-300" />
                                                        <p>No tienes materias disponibles para este cuatrimestre.</p>
                                                        <p className="text-xs mt-1">Sigue avanzando para desbloquear nuevas asignaturas.</p>
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
                                            /* Vista de Malla Estática con Scroll Horizontal Nativo */
                                            <div className="animate-in fade-in zoom-in-95 duration-500 relative border border-default-200/80 shadow-md rounded-3xl overflow-hidden flex flex-col bg-background">
                                                {/* Controles de Navegación Flotantes (Anterior / Simulando / Siguiente) */}
                                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 w-full px-4 max-w-sm sm:max-w-md">
                                                    <div className="flex items-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200 dark:border-zinc-800 p-1.5 rounded-2xl shadow-xl gap-2 sm:gap-4 w-full justify-between">
                                                        <Button
                                                            onPress={handleAnterior}
                                                            isDisabled={!estadoAnterior}
                                                            color="primary" variant="flat" size="sm"
                                                            className="font-bold rounded-xl px-3 sm:px-5 min-w-0 h-9"
                                                            startContent={<i className="fa-solid fa-chevron-left text-xs" />}
                                                        >
                                                            <span className="text-xs sm:text-sm">Anterior</span>
                                                        </Button>

                                                        <div className="flex flex-col items-center px-1 sm:px-2 min-w-fit">
                                                            <span className="text-[9px] text-foreground/50 font-black uppercase tracking-tighter leading-none">Simulando</span>
                                                            <span className="text-xs sm:text-sm font-black text-primary truncate whitespace-nowrap">
                                                                C{cuatri} {anioActual}
                                                            </span>
                                                        </div>

                                                        <Button
                                                            onPress={() => handleSiguiente(materiasCursables)}
                                                            isDisabled={!estadoSiguiente}
                                                            color="primary" variant="shadow" size="sm"
                                                            className="font-bold rounded-xl px-3 sm:px-5 min-w-0 h-9 transition-transform hover:scale-105 active:scale-95"
                                                            endContent={<i className="fa-solid fa-chevron-right text-xs" />}
                                                        >
                                                            <span className="text-xs sm:text-sm">Siguiente</span>
                                                        </Button>
                                                    </div>
                                                </div>

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
                                            /* Vista de Grafo (Pizarra Interactiva ReactFlow) */
                                            <div 
                                                ref={grafoContainerRef}
                                                className={`animate-in fade-in zoom-in-95 duration-500 relative border border-default-200/80 shadow-md transition-all duration-300 flex flex-col bg-background ${isFullScreen ? 'fixed inset-0 z-[1000] bg-background p-0 rounded-none w-screen h-screen' : 'h-[650px] sm:h-[750px] rounded-3xl overflow-hidden'}`}
                                            >
                                                {/* Controles de Navegación Flotantes (Anterior / Simulando / Siguiente) */}
                                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 w-full px-4 max-w-sm sm:max-w-md">
                                                    <div className="flex items-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200 dark:border-zinc-800 p-1.5 rounded-2xl shadow-xl gap-2 sm:gap-4 w-full justify-between">
                                                        <Button
                                                            onPress={handleAnterior}
                                                            isDisabled={!estadoAnterior}
                                                            color="primary" variant="flat" size="sm"
                                                            className="font-bold rounded-xl px-3 sm:px-5 min-w-0 h-9"
                                                            startContent={<i className="fa-solid fa-chevron-left text-xs" />}
                                                        >
                                                            <span className="text-xs sm:text-sm">Anterior</span>
                                                        </Button>

                                                        <div className="flex flex-col items-center px-1 sm:px-2 min-w-fit">
                                                            <span className="text-[9px] text-foreground/50 font-black uppercase tracking-tighter leading-none">Simulando</span>
                                                            <span className="text-xs sm:text-sm font-black text-primary truncate whitespace-nowrap">
                                                                C{cuatri} {anioActual}
                                                            </span>
                                                        </div>

                                                        <Button
                                                            onPress={() => handleSiguiente(materiasCursables)}
                                                            isDisabled={!estadoSiguiente}
                                                            color="primary" variant="shadow" size="sm"
                                                            className="font-bold rounded-xl px-3 sm:px-5 min-w-0 h-9 transition-transform hover:scale-105 active:scale-95"
                                                            endContent={<i className="fa-solid fa-chevron-right text-xs" />}
                                                        >
                                                            <span className="text-xs sm:text-sm">Siguiente</span>
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-h-0">
                                                    <MateriasGrafo
                                                        materias={materias}
                                                        progreso={progresoSimulado}
                                                        onNodeClick={handleNodeClick}
                                                        projection={projection}
                                                        topRightContent={
                                                            <>
                                                                {progresoIntermedio.totales > 0 && (
                                                                    <div className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 shadow-md backdrop-blur-md border ${isIntermedioCompletado ? 'bg-success/20 text-success border-success/30' : 'bg-primary/20 text-primary border-primary/30'}`}>
                                                                        <i className="fa-solid fa-graduation-cap text-xs" />
                                                                        <span className="hidden sm:inline">{tituloIntermedioNombre}:</span>
                                                                        <span>{progresoIntermedio.completadas}/{progresoIntermedio.totales}</span>
                                                                    </div>
                                                                )}
                                                                <Button
                                                                    isIconOnly
                                                                    variant="flat"
                                                                    className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md shadow-md border border-default-200 min-w-8 h-8 sm:min-w-9 sm:h-9"
                                                                    onPress={toggleFullScreen}
                                                                    title={isFullScreen ? "Salir de pantalla completa" : "Pantalla completa"}
                                                                >
                                                                    {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                                                </Button>
                                                            </>
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Barra de navegación de lista (solo se muestra en modo lista) */}
                                {viewMode === 'lista' && !simulacionTerminada && (
                                    <Card className="mt-8 bg-background/60 backdrop-blur-md border border-default-200 shadow-sm rounded-2xl">
                                        <CardBody className="flex flex-col md:flex-row justify-between items-center p-4 md:p-6 gap-4">
                                            <Button
                                                onPress={handleAnterior}
                                                isDisabled={!estadoAnterior}
                                                variant="flat" color="primary"
                                                startContent={<i className="fa-solid fa-chevron-left" />}
                                                className="w-full md:w-auto font-medium"
                                            >
                                                Anterior
                                            </Button>

                                            <div className="flex flex-col items-center text-center">
                                                <span className="text-xs md:text-sm text-foreground/80 font-medium tracking-wider uppercase mb-1">Progreso</span>
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-sm md:text-base font-semibold text-foreground leading-none">
                                                        Continúa configurando el semestre
                                                    </span>
                                                    {progresoIntermedio.totales > 0 && (
                                                        <span className={`text-[10px] font-bold uppercase tracking-tighter ${isIntermedioCompletado ? 'text-success' : 'text-primary'}`}>
                                                            {tituloIntermedioNombre}: {progresoIntermedio.porcentaje}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <Button
                                                onPress={() => handleSiguiente(materiasCursables)}
                                                isDisabled={!estadoSiguiente}
                                                variant="shadow" color="primary"
                                                endContent={<i className="fa-solid fa-chevron-right" />}
                                                className="w-full md:w-auto font-bold transition-transform hover:scale-105"
                                                aria-label="Siguiente cuatrimestre"
                                            >
                                                Siguiente
                                            </Button>
                                        </CardBody>
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default Simulador