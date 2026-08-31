import { Progress, Button, Tooltip, Chip, Divider } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import MateriasProgreso from './MateriasProgreso'
import regularidadUtils from '../../utils/Progreso/regularidadUtils'
import tituloIntermedioUtils from '../../utils/Progreso/tituloIntermedioUtils'

function ProgresoTotal({ carrera, plan, progress, progreso, progresoDetalles, materias, isSticky, headerRef, setIsSticky }) {
    const [isStatsExpanded, setIsStatsExpanded] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);

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
                {/* Sección Superior: Pantalla completa centrada en móvil, horizontal en desktop */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 lg:gap-8">

                    {/* Contenedor de Icono */}
                    <div className="relative group shrink-0">
                        <div className="w-16 h-16 lg:w-20 lg:h-20 bg-[#005a36] rounded-2xl flex items-center justify-center shadow-md text-white">
                            <i className="fa-solid fa-graduation-cap text-3xl lg:text-4xl"></i>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                        {/* Migas de pan / Ubicación */}
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#005a36] dark:text-emerald-400 font-black text-[10px] uppercase tracking-wider border border-emerald-200/50 shrink-0">UNLu</span>
                            <span className="text-[#005a36] dark:text-emerald-300 font-bold text-xs lg:text-sm tracking-wide uppercase">{carrera}</span>
                            <Divider orientation="vertical" className="h-4 bg-slate-200 hidden sm:block" />
                            <Link to="/config" className="hover:opacity-80 transition-opacity" title="Cambiar Plan de Estudios">
                                <Chip
                                    size="sm"
                                    variant="flat"
                                    color="warning"
                                    className="font-bold text-[10px] h-5 border border-warning/20 cursor-pointer"
                                    startContent={<i className="fa-solid fa-scroll text-[9px] mr-1" />}
                                >
                                    Plan {plan || '---'}
                                </Chip>
                            </Link>
                        </div>

                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight leading-tight mb-2">
                            Mi Progreso Académico
                        </h1>

                        <p className="text-slate-500 dark:text-zinc-400 font-normal text-xs sm:text-sm lg:text-base max-w-3xl leading-relaxed mb-6">
                            Gestioná tu avance <strong>real y oficial</strong> en la <span className="text-foreground font-semibold">Licenciatura en Sistemas de Información</span>. <span className="inline-block mt-1 sm:mt-0">Si querés planificar cómo sería tu cursada futura, usá el <Link to="/simulador" className="font-bold text-[#005a36] dark:text-emerald-400 underline hover:opacity-80">Simulador</Link>.</span>
                        </p>

                        {/* Sección Estadísticas: Grilla en móvil, flex en desktop (Imagen 4) */}
                        <div className="grid grid-cols-2 lg:flex gap-3 w-full sm:w-auto">
                            <Tooltip content="Promedio de exámenes finales aprobados." placement="bottom">
                                <div className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl shadow-2xs hover:shadow-xs transition-all">
                                    <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                        <i className="fa-solid fa-chart-line text-sm" />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">Sin Aplazos</span>
                                        <span className="text-base font-black text-slate-800 dark:text-zinc-100 leading-none">{promedios.promedioSinAplazos || '--'}</span>
                                    </div>
                                </div>
                            </Tooltip>

                            <Tooltip content="Promedio de todos los intentos registrados." placement="bottom">
                                <div className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl shadow-2xs hover:shadow-xs transition-all">
                                    <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                                        <i className="fa-solid fa-chart-area text-sm" />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">Con Aplazos</span>
                                        <span className="text-base font-black text-slate-800 dark:text-zinc-100 leading-none">{promedios.promedioConAplazos || '--'}</span>
                                    </div>
                                </div>
                            </Tooltip>

                            <Tooltip content="Materias finalizadas respecto al total de la carrera." placement="bottom">
                                <div className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl shadow-2xs hover:shadow-xs transition-all">
                                    <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-[#005a36] dark:text-teal-400 shrink-0">
                                        <i className="fa-solid fa-book-bookmark text-sm" />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">Total Materias</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-base font-black text-slate-800 dark:text-zinc-100 leading-none">{totalMateriasFinalizadas}</span>
                                            <span className="text-[10px] font-bold text-slate-400">/ {totalMateriasCarrera}</span>
                                        </div>
                                    </div>
                                </div>
                            </Tooltip>

                            <Tooltip content="Horas de materias regulares, aprobadas y promocionadas respecto al total." placement="bottom">
                                <div className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl shadow-2xs hover:shadow-xs transition-all">
                                    <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                        <i className="fa-solid fa-clock text-sm" />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">Carga Horaria</span>
                                        <div className="sm:flex items-baseline gap-1">
                                            <span className="text-base font-black text-slate-800 dark:text-zinc-100 leading-none">{totalHorasProgreso}</span>
                                            <span className="text-[10px] font-bold text-slate-400">/ {totalHorasCarrera} hs</span>
                                        </div>
                                    </div>
                                </div>
                            </Tooltip>
                        </div>
                    </div>
                </div>

                {/* Materias Progreso (Cards) */}
                <div className="pt-4">
                    <div className="flex items-start sm:items-center justify-between mb-1 gap-2">
                        <div className="flex flex-col">
                            <p className="text-default-500 text-xs sm:text-sm uppercase tracking-widest font-black">Progresos generales</p>
                            <p className="text-[10px] sm:text-xs text-primary-500/80 font-medium italic mt-0.5 flex items-center gap-1">
                                <i className="fa-regular fa-hand-pointer text-[9px] sm:hidden" /> 
                                <i className="fa-solid fa-mouse-pointer text-[9px] hidden sm:block" /> 
                                Tocá una tarjeta para ver más info
                            </p>
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
        </header>
    )
}

export default ProgresoTotal