import { Progress, Button, Tooltip, Chip, Divider, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import MateriasProgreso from './MateriasProgreso'
import regularidadUtils from '../../utils/Progreso/regularidadUtils'
import tituloIntermedioUtils from '../../utils/Progreso/tituloIntermedioUtils'
import TransicionModal from './modals/TransicionModal'

function ProgresoTotal({ carrera, plan, progress, progreso, progresoDetalles, materias, isSticky, headerRef, setIsSticky }) {
    const [isStatsExpanded, setIsStatsExpanded] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
    const { isOpen: isPromedioModalOpen, onOpen: onPromedioModalOpen, onOpenChange: onPromedioModalOpenChange } = useDisclosure();
    const { isOpen: isTransicionModalOpen, onOpen: onTransicionModalOpen, onOpenChange: onTransicionModalOpenChange } = useDisclosure();
    const [tipoPromedioModal, setTipoPromedioModal] = useState('sinAplazos'); // 'sinAplazos' | 'conAplazos'

    const promedios = regularidadUtils.calcularPromedioGeneral(progresoDetalles, progreso);

    // Lógica Título Intermedio
    const tituloIntermedioNombre = tituloIntermedioUtils.getTituloIntermedioNombre(plan);
    const materiasIntermedio = tituloIntermedioUtils.getMateriasIntermedio(plan, materias);
    const progresoIntermedio = tituloIntermedioUtils.calcularProgresoIntermedio(materiasIntermedio, progreso);
    
    // Calcular en qué porcentaje de la carrera total se encuentra el título intermedio
    const markerPosition = materias.length > 0 && materiasIntermedio.length > 0
        ? (materiasIntermedio.length / materias.length) * 100
        : 0;

    const isIntermedioCompletado = progresoIntermedio.totales > 0 && progresoIntermedio.completadas === progresoIntermedio.totales;

    // Calcular carga horaria de progreso (Regular, Aprobado, Promocionado)
    const totalHorasProgreso = materias.reduce((acc, m) => {
        const estado = progreso[m.codigo];
        if (estado === 'Aprobado' || estado === 'Promocionado' || estado === 'Regular') {
            return acc + (Number(m.horas_totales) || 0);
        }
        return acc;
    }, 0);

    const totalMateriasFinalizadas = materias.filter(m =>
        progreso[m.codigo] === 'Aprobado' || progreso[m.codigo] === 'Promocionado'
    ).length;

    const totalMateriasCarrera = materias.length;
    const totalHorasCarrera = materias.reduce((acc, m) => acc + (Number(m.horas_totales) || 0), 0);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsSticky(!entry.isIntersecting)
            }, {
            threshold: 0,
            rootMargin: "-80px 0px 0px 0px"
        }
        )
        if (headerRef.current) {
            observer.observe(headerRef.current)
        }
        return () => observer.disconnect()
    }, [setIsSticky, headerRef])

    const barRef = useRef(null)
    const [barHeight, setBarHeight] = useState(0)

    // Medir la altura de la barra para evitar saltos de layout
    useEffect(() => {
        if (barRef.current && !isSticky) {
            setBarHeight(barRef.current.offsetHeight)
        }
    }, [isSticky, progreso])

    return (
        <header ref={headerRef} className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs hover:shadow-sm rounded-3xl flex flex-col transition-all duration-300">
            {/* Contenedor con blur para la parte superior (No afecta al fixed de abajo) */}
            <div className="p-6 md:p-8 pb-4 flex flex-col gap-6 rounded-t-3xl w-full">
                {/* Sección Superior: Limpia, alineada y jerárquica con botón de simulación */}
                <div className="flex flex-col gap-6 w-full">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                        <div className="flex flex-col items-start text-left gap-2">
                            {/* Migas de pan / Ubicación */}
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-slate-700 dark:text-zinc-300 font-semibold text-xs sm:text-sm tracking-wide uppercase">
                                    {carrera}
                                </span>
                                <Divider orientation="vertical" className="h-4 bg-slate-200 dark:bg-zinc-700 hidden sm:block" />
                                <Link to="/config" className="hover:opacity-80 transition-opacity" title="Cambiar Plan de Estudios">
                                    <Chip
                                        size="md"
                                        variant="flat"
                                        color="warning"
                                        className="font-extrabold text-xs sm:text-sm h-7 sm:h-8 px-2.5 sm:px-3 border border-warning/30 shadow-2xs cursor-pointer"
                                        startContent={<i className="fa-solid fa-scroll text-xs sm:text-sm mr-1" />}
                                    >
                                        Plan {plan || '---'}
                                    </Chip>
                                </Link>
                                <Chip
                                    size="sm"
                                    variant="flat"
                                    color="success"
                                    className="font-extrabold text-[11px] h-6 px-2 text-emerald-800 dark:text-emerald-300"
                                >
                                    En curso
                                </Chip>
                            </div>

                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight leading-tight">
                                Mi Progreso Académico
                            </h1>

                            <p className="text-slate-500 dark:text-zinc-400 font-normal text-xs sm:text-sm lg:text-base max-w-2xl leading-relaxed">
                                Gestioná tu avance académico oficial. Si querés planificar tus materias futuras, probá el <Link to="/simulador" className="font-bold text-[#005a36] dark:text-emerald-400 underline hover:opacity-80 whitespace-nowrap">Simulador de Avance</Link>.
                            </p>
                        </div>

                        {/* Botón Destacado Simular cambio de plan (Amarillo institucional) */}
                        <div className="shrink-0 flex items-center gap-2">
                            <Button
                                onPress={() => navigate('/cambio-plan')}
                                className="bg-[#F5B82E] hover:bg-[#e2a825] text-slate-900 font-black text-xs sm:text-sm px-4 sm:px-6 py-2.5 sm:py-6 rounded-2xl shadow-xs hover:shadow-md transition-all flex items-center gap-2"
                                startContent={<i className="fa-solid fa-arrows-rotate text-sm text-slate-900" />}
                            >
                                Simular cambio de plan
                            </Button>
                        </div>
                    </div>

                    {/* Sección Estadísticas: Grilla responisva con tarjetas neutras y limpias */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                        <Tooltip content="Hacé clic para entender cómo se calcula el promedio sin aplazos" placement="bottom">
                            <div 
                                onClick={() => {
                                    setTipoPromedioModal('sinAplazos');
                                    onPromedioModalOpen();
                                }}
                                className="group cursor-pointer flex items-center gap-3 p-3.5 bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200/70 dark:border-zinc-700/70 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 rounded-2xl shadow-2xs hover:shadow-xs transition-all"
                            >
                                <div className="w-10 h-10 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                                    <i className="fa-solid fa-chart-line text-sm" />
                                </div>
                                <div className="flex flex-col items-start min-w-0">
                                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider leading-none mb-1 truncate flex items-center gap-1">
                                        <span>Prom. Sin Aplazos</span>
                                        <i className="fa-solid fa-circle-info text-[9px] text-slate-400 group-hover:text-emerald-600 transition-colors" />
                                    </span>
                                    <span className="text-lg font-black text-slate-900 dark:text-zinc-50 leading-none tabular-nums">{promedios.promedioSinAplazos || '--'}</span>
                                </div>
                            </div>
                        </Tooltip>

                        <Tooltip content="Hacé clic para entender cómo se calcula el promedio con aplazos" placement="bottom">
                            <div 
                                onClick={() => {
                                    setTipoPromedioModal('conAplazos');
                                    onPromedioModalOpen();
                                }}
                                className="group cursor-pointer flex items-center gap-3 p-3.5 bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200/70 dark:border-zinc-700/70 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 rounded-2xl shadow-2xs hover:shadow-xs transition-all"
                            >
                                <div className="w-10 h-10 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                                    <i className="fa-solid fa-chart-area text-sm" />
                                </div>
                                <div className="flex flex-col items-start min-w-0">
                                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider leading-none mb-1 truncate flex items-center gap-1">
                                        <span>Prom. Con Aplazos</span>
                                        <i className="fa-solid fa-circle-info text-[9px] text-slate-400 group-hover:text-amber-600 transition-colors" />
                                    </span>
                                    <span className="text-lg font-black text-slate-900 dark:text-zinc-50 leading-none tabular-nums">{promedios.promedioConAplazos || '--'}</span>
                                </div>
                            </div>
                        </Tooltip>

                        <Tooltip content="Materias aprobadas y promocionadas respecto al plan." placement="bottom">
                            <div className="flex items-center gap-3 p-3.5 bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200/70 dark:border-zinc-700/70 rounded-2xl shadow-2xs hover:border-slate-300 dark:hover:border-zinc-600 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-slate-200/70 dark:bg-zinc-700/70 flex items-center justify-center text-slate-700 dark:text-zinc-200 shrink-0">
                                    <i className="fa-solid fa-book-bookmark text-sm" />
                                </div>
                                <div className="flex flex-col items-start min-w-0">
                                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider leading-none mb-1 truncate">Total Materias</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-lg font-black text-slate-900 dark:text-zinc-50 leading-none tabular-nums">{totalMateriasFinalizadas}</span>
                                        <span className="text-[11px] font-bold text-slate-400">/ {totalMateriasCarrera}</span>
                                    </div>
                                </div>
                            </div>
                        </Tooltip>

                        <Tooltip content="Carga horaria completada sobre el total del plan de estudios." placement="bottom">
                            <div className="flex items-center gap-3 p-3.5 bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200/70 dark:border-zinc-700/70 rounded-2xl shadow-2xs hover:border-slate-300 dark:hover:border-zinc-600 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-slate-200/70 dark:bg-zinc-700/70 flex items-center justify-center text-slate-700 dark:text-zinc-200 shrink-0">
                                    <i className="fa-solid fa-clock text-sm" />
                                </div>
                                <div className="flex flex-col items-start min-w-0">
                                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider leading-none mb-1 truncate">Carga Horaria</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-lg font-black text-slate-900 dark:text-zinc-50 leading-none tabular-nums">{totalHorasProgreso}</span>
                                        <span className="text-[11px] font-bold text-slate-400">/ {totalHorasCarrera} hs</span>
                                    </div>
                                </div>
                            </div>
                        </Tooltip>
                    </div>
                </div>

                {/* Banner Destacado: TU PRÓXIMO PASO */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 dark:via-amber-950/15 border border-[#F5B82E]/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs hover:shadow-xs transition-all">
                    <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-[#F5B82E]/20 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-map-location-dot text-lg" />
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                                TU PRÓXIMO PASO
                            </span>
                            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-zinc-100">
                                Explorá una nueva posibilidad
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-zinc-400">
                                Simulá cómo impactaría el Plan 17.14 en tu recorrido académico según la Res. HCS 89/2025.
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        onPress={() => navigate('/cambio-plan')}
                        className="bg-[#F5B82E] hover:bg-[#e2a825] text-slate-900 font-extrabold text-xs px-4 py-2 rounded-xl shrink-0 shadow-2xs self-end sm:self-center"
                        endContent={<i className="fa-solid fa-arrow-right text-[11px]" />}
                    >
                        Iniciar simulación
                    </Button>
                </div>

                {/* Materias Progreso (Cards) */}
                <div className="pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-2">
                        <div className="flex flex-col gap-1">
                            <p className="text-default-500 text-xs sm:text-sm uppercase tracking-widest font-black">Progresos generales</p>
                            <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20 text-[11px] font-bold">
                                    <i className="fa-solid fa-hand-pointer text-xs animate-bounce" /> 
                                    <span>Hacé clic en cualquier tarjeta para filtrar y ver sus materias</span>
                                </span>
                            </div>
                        </div>
                        {/* Toggle exclusivo para celular */}
                        <Button
                            size="sm"
                            variant="flat"
                            className="font-bold h-7 px-3 rounded-lg"
                            onPress={() => setIsStatsExpanded(!isStatsExpanded)}
                            endContent={<i className={`fa-solid fa-chevron-down transition-transform duration-300 ${isStatsExpanded ? 'rotate-180' : ''}`}></i>}
                        >
                            {isStatsExpanded ? 'Ocultar' : 'Mostrar'}
                        </Button>
                    </div>

                    <div className={`mt-4 ${isStatsExpanded ? 'flex animate-in fade-in slide-in-from-top-2' : 'hidden'}`}>
                        <MateriasProgreso progreso={progreso} materias={materias} />
                    </div>
                </div>
            </div>

            {/* Sección Inferior: Barra de Progreso (Fuera del blur superior para que el fixed funcione) */}
            <div
                className={`transition-all duration-300 ${!isSticky ? "bg-background/80 backdrop-blur-md p-6 md:p-8 pt-3 rounded-b-2xl border-t border-default-200/50" : ""}`}
                style={{ minHeight: isSticky ? `${barHeight}px` : "auto" }}
            >
                <div
                    id="progreso-total"
                    ref={barRef}
                    className={
                        isSticky
                            ? "fixed top-0 left-0 right-0 z-30 p-4 bg-background shadow-lg border-b border-default-200/60 animate-in slide-in-from-top duration-300"
                            : "w-full"
                    }
                >
                    <div className={isSticky ? "max-w-7xl mx-auto lg:pl-64 transition-all duration-300" : ""}>
                        <div className="flex sm:px-10 pr-10 sm:p-0 justify-between items-end mb-3 ">
                            <div className="space-y-0.5 flex flex-col items-start">
                                <span className="text-default-500 text-xs uppercase tracking-widest font-black">Estado Actual</span>
                                <div className="flex items-center gap-2">
                                    <p className="text-foreground font-bold ">Progreso de la carrera</p>
                                    {isIntermedioCompletado && (
                                        <Tooltip content={`¡Felicidades! Completaste el ${tituloIntermedioNombre}`}>
                                            <Chip
                                                size="sm"
                                                color="success"
                                                variant="flat"
                                                className="h-5 font-bold animate-pulse"
                                                startContent={<i className="fa-solid fa-graduation-cap text-[10px] mr-1" />}
                                            >
                                                Analista
                                            </Chip>
                                        </Tooltip>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-black text-[#005a36] dark:text-emerald-400 tabular-nums">{progress}%</span>
                                <span className="text-slate-500 font-bold text-xs sm:text-sm ml-1 hidden sm:inline-block">completado</span>
                            </div>
                        </div>

                        <div className="relative w-full">
                            <Progress
                                value={progress}
                                aria-label="Progreso total de la carrera"
                                className="h-2.5"
                                showValueLabel={false}
                                classNames={{
                                    track: "bg-slate-200/80 dark:bg-zinc-800",
                                    indicator: "bg-linear-to-r from-[#005a36] to-emerald-500"
                                }}
                            />
                            {markerPosition > 0 && markerPosition < 100 && (
                                <Tooltip 
                                    content={
                                        <div className="px-1 py-1">
                                            <p className="font-bold text-tiny">{tituloIntermedioNombre}</p>
                                            <p className="text-tiny text-default-500">{progresoIntermedio.completadas}/{progresoIntermedio.totales} materias ({progresoIntermedio.porcentaje}%)</p>
                                        </div>
                                    }
                                >
                                    <div 
                                        className="absolute top-0 bottom-0 w-1 bg-white/50 backdrop-blur-xs z-10 shadow-[0_0_8px_rgba(255,255,255,0.5)] cursor-help group"
                                        style={{ left: `${markerPosition}%`, height: '10px', top: '0px' }}
                                    >
                                        <div className={`absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center transition-opacity duration-300 ${isIntermedioCompletado ? 'text-success' : 'text-default-400 group-hover:text-primary'}`}>
                                            <i className="fa-solid fa-graduation-cap text-[10px]"></i>
                                            <div className="w-0.5 h-2 bg-current mt-0.5"></div>
                                        </div>
                                    </div>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Explicativo de Promedios */}
            <Modal isOpen={isPromedioModalOpen} onOpenChange={onPromedioModalOpenChange} size="md">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-primary">
                                    <i className={`fa-solid ${tipoPromedioModal === 'sinAplazos' ? 'fa-chart-line text-emerald-600' : 'fa-chart-area text-amber-600'} text-lg`} />
                                    <span className="font-extrabold text-base">
                                        {tipoPromedioModal === 'sinAplazos' ? 'Promedio Sin Aplazos' : 'Promedio Con Aplazos'}
                                    </span>
                                </div>
                            </ModalHeader>
                            <ModalBody className="text-sm space-y-3">
                                <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-xl flex justify-between items-center">
                                    <span className="font-bold text-slate-600 dark:text-zinc-400">Valor actual calculado:</span>
                                    <span className="text-xl font-black text-foreground">
                                        {tipoPromedioModal === 'sinAplazos' ? (promedios.promedioSinAplazos || '--') : (promedios.promedioConAplazos || '--')}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-bold text-foreground">¿Qué representa esta métrica?</h4>
                                    <p className="text-slate-600 dark:text-zinc-300 leading-relaxed text-xs sm:text-sm">
                                        {tipoPromedioModal === 'sinAplazos' 
                                            ? 'Es el promedio de las notas finales obtenidas únicamente en las materias que tenés registradas como Aprobadas o Promocionadas.'
                                            : 'Es el promedio general considerando todas las notas de tus exámenes finales, incluyendo aplazos (notas menores a 4) e intentos reprobados.'}
                                    </p>
                                </div>

                                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 rounded-xl space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                                    <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                                        <i className="fa-solid fa-triangle-exclamation" />
                                        <span>¿Por qué no veo reflejado mi promedio o me aparece "--"?</span>
                                    </div>
                                    <p className="leading-relaxed">
                                        Para poder calcular tus promedios, tenés que <strong>ingresar la nota de final</strong> en cada materia.
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 pt-1 font-medium">
                                        <li>Para <strong>Promedio Sin Aplazos</strong>: necesitás cargar la nota aprobada de cada materia.</li>
                                        <li>Para <strong>Promedio Con Aplazos</strong>: necesitás ingresar las notas de <strong>todos los intentos</strong> de exámenes finales que hayas realizado.</li>
                                    </ul>
                                </div>

                                <div className="text-xs text-slate-500 dark:text-zinc-400">
                                    💡 <strong>¿Cómo ingresar las notas?</strong><br />
                                    Hacé clic en cualquier materia aprobada o regular desde la lista para abrir sus detalles y registrar la nota del final o tus intentos.
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="primary" variant="flat" onPress={onClose} className="font-bold">
                                    Entendido
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </header>
    )
}

export default ProgresoTotal