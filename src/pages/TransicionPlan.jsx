import React, { useState, useMemo, useEffect } from 'react';
import { 
    Button, 
    Progress, 
    Chip, 
    Accordion,
    AccordionItem
} from '@heroui/react';
import { 
    AlertTriangle, 
    CheckCircle2, 
    Sparkles, 
    ArrowRight, 
    Clock, 
    HelpCircle, 
    ExternalLink, 
    Check,
    BookOpen,
    FileText,
    TrendingDown,
    PhoneCall
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import planService from '../services/planService';
import equivalenciasData from '../data/equivalencias.json';
import { 
    OFERTA_RESOLUCION_89_2025, 
    obtenerResumenPaso1, 
    evaluarTransicionCompleta,
    calcularProyeccionMultianual
} from '../utils/Transicion/transicionUtils';

function TransicionPlan({ plan = "17.13" }) {
    const navigate = useNavigate();
    const anioActual = useMemo(() => new Date().getFullYear(), []);
    
    // Progreso del usuario
    const [progreso, setProgreso] = useState(() => {
        try {
            const raw = localStorage.getItem('progreso+17.13');
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    });

    // Sincronización de progreso en tiempo real
    useEffect(() => {
        const handleStorage = () => {
            try {
                const raw = localStorage.getItem('progreso+17.13');
                setProgreso(raw ? JSON.parse(raw) : {});
            } catch {
                setProgreso({});
            }
        };
        window.addEventListener('storage', handleStorage);
        window.addEventListener('progress-hydrated', handleStorage);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('progress-hydrated', handleStorage);
        };
    }, []);

    // Cargar materias de ambos planes
    const plan1713 = useMemo(() => planService.getPlanByNumber("17.13"), []);
    const plan1714 = useMemo(() => planService.getPlanByNumber("17.14"), []);
    const materias1713 = useMemo(() => plan1713?.materias || [], [plan1713]);
    const materias1714 = useMemo(() => plan1714?.materias || [], [plan1714]);

    // Resumen de materias registradas
    const resumenPaso1 = useMemo(() => {
        return obtenerResumenPaso1(progreso, materias1713);
    }, [progreso, materias1713]);

    const tieneProgresoCargado = resumenPaso1.cantidadAprobadas > 0 || resumenPaso1.cantidadFuera > 0;

    // Proyección inteligente multianual (determina automáticamente el año óptimo)
    const proyeccionGlobal = useMemo(() => {
        return calcularProyeccionMultianual({
            progreso,
            materias1713,
            materias1714,
            equivalenciasData,
            anioActual
        });
    }, [progreso, materias1713, materias1714, anioActual]);

    // Año actualmente inspeccionado por el usuario (por defecto: el año actual)
    const [anioSeleccionado, setAnioSeleccionado] = useState(() => anioActual);

    // Evaluación detallada del año seleccionado
    const resultadoAnioSeleccionado = useMemo(() => {
        return evaluarTransicionCompleta({
            progreso,
            materias1713,
            materias1714,
            equivalenciasData,
            anioAnalisis: anioSeleccionado
        });
    }, [progreso, materias1713, materias1714, anioSeleccionado]);

    const esViableSeleccionado = resultadoAnioSeleccionado.escenarioReal === 'A';

    return (
        <div className="min-h-screen bg-slate-50/60 dark:bg-zinc-950 pb-16 transition-colors duration-300">
            {/* ─── HEADER COMPACTO INSTITUCIONAL ─── */}
            <div className="bg-[#005a36] text-white border-b border-emerald-900/40 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-[#F5B82E]">
                                TRANSICIÓN DE PLANES (RES. HCS 89/2025)
                            </span>
                            <span className="text-white/30">•</span>
                            <span className="text-xs text-emerald-200">Plan 17.13 → Plan 17.14</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                            Simulador de Cambio de Plan
                        </h1>
                    </div>

                    {/* Resumen de materias registradas en píldora compacta */}
                    {tieneProgresoCargado && (
                        <div className="flex items-center gap-2 bg-emerald-950/70 border border-emerald-500/20 px-3.5 py-1.5 rounded-2xl shrink-0">
                            <div className="flex items-center gap-1.5 text-xs font-bold">
                                <span className="text-emerald-400">🟢 {resumenPaso1.cantidadAprobadas} con final</span>
                                <span className="text-white/20">|</span>
                                <span className="text-amber-400">🟡 {resumenPaso1.cantidadFuera} regular</span>
                            </div>
                            <Button
                                size="sm"
                                variant="light"
                                onPress={() => navigate('/progreso')}
                                className="text-white hover:text-[#F5B82E] text-[11px] font-extrabold h-6 px-2 min-w-0"
                                title="Editar avance en Mi Progreso"
                            >
                                <ExternalLink size={12} />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
                {/* ─── RECORDATORIO DE ACTUALIZACIÓN DE PROGRESO ─── */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/30 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
                    <div className="flex items-start gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles size={18} />
                        </div>
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                                    ANTES DE SIMULAR · VERIFICÁ TU PROGRESO ACADÉMICO
                                </span>
                                {tieneProgresoCargado && (
                                    <Chip size="sm" variant="flat" color="success" className="text-[10px] h-5 font-bold">
                                        {resumenPaso1.cantidadAprobadas} con final
                                    </Chip>
                                )}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 font-medium leading-relaxed">
                                ¿Rendiste finales recientemente? Recordá marcar tus materias como <strong>"Aprobada con final"</strong> en <em>Mi Progreso</em> para que el cálculo de equivalencias automáticas sea 100% exacto a tu situación.
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="flat"
                        color="success"
                        onPress={() => navigate('/progreso')}
                        className="font-bold text-xs shrink-0 self-end sm:self-center bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30"
                        endContent={<ArrowRight size={14} />}
                    >
                        Actualizar mi progreso
                    </Button>
                </div>

                {/* ─── ALERTA SI NO HAY PROGRESO ─── */}
                {!tieneProgresoCargado && (
                    <div className="p-4 sm:p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={20} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-black text-sm text-slate-900 dark:text-amber-100">
                                    No tenés materias cargadas todavía
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-amber-200/90">
                                    Para que el diagnóstico calcule tus materias habilitadas reales, cargá tu avance en <em>Mi Progreso</em>.
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onPress={() => navigate('/progreso')}
                            className="bg-[#005a36] text-white font-bold text-xs shrink-0"
                        >
                            Cargar mi progreso
                        </Button>
                    </div>
                )}

                {/* ─── VEREDICTO INSTANTÁNEO PRINCIPAL ─── */}
                <div className={`border-2 rounded-3xl p-6 sm:p-8 shadow-sm transition-all relative overflow-hidden ${
                    proyeccionGlobal.esViableActual 
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500/60' 
                        : 'bg-[#FDF0D5]/90 dark:bg-amber-950/40 border-[#F5B82E]'
                }`}>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md shrink-0 ${
                                proyeccionGlobal.esViableActual 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-[#F5B82E] text-slate-950'
                            }`}>
                                {proyeccionGlobal.esViableActual ? (
                                    <CheckCircle2 size={32} className="stroke-[2.5]" />
                                ) : (
                                    <Clock size={30} className="stroke-[2.5]" />
                                )}
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                                        VEREDICTO INMEDIATO PARA TU AVANCE
                                    </span>
                                    {proyeccionGlobal.esViableActual ? (
                                        <Chip size="sm" color="success" variant="flat" className="font-black text-[10px]">
                                            VIABLE AHORA ({anioActual})
                                        </Chip>
                                    ) : (
                                        <Chip size="sm" color="warning" variant="flat" className="font-black text-[10px]">
                                            AÑO ÓPTIMO: {proyeccionGlobal.primerAnioViable}
                                        </Chip>
                                    )}
                                </div>

                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 leading-tight">
                                    {proyeccionGlobal.mensajePrincipal}
                                </h2>

                                <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 font-medium leading-relaxed max-w-2xl">
                                    {proyeccionGlobal.recomendacionCorta}
                                </p>
                            </div>
                        </div>

                        {/* Botón CTA directo */}
                        <div className="shrink-0 w-full md:w-auto">
                            <Button
                                onPress={() => navigate('/equivalencias')}
                                className="w-full md:w-auto bg-[#005a36] hover:bg-[#004a2c] text-white font-black text-xs uppercase tracking-wider px-6 py-5 rounded-2xl shadow-sm"
                                endContent={<ArrowRight size={15} />}
                            >
                                Ver Mapa de Equivalencias
                            </Button>
                        </div>
                    </div>

                    {/* ─── SELECTOR HORIZONTAL DE AÑOS (TIMELINE EN UNA SOLA FILA) ─── */}
                    <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-zinc-800/80">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                Explorar impacto por año de solicitud:
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                                Hacé clic en cualquier año para ver las materias y ofertas exactas
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {proyeccionGlobal.proyeccion.map(item => {
                                const isSelected = anioSeleccionado === item.anio;
                                const isCurrent = item.anio === anioActual;
                                const isBest = item.anio === proyeccionGlobal.primerAnioViable;

                                return (
                                    <button
                                        key={item.anio}
                                        type="button"
                                        onClick={() => setAnioSeleccionado(item.anio)}
                                        className={`p-3 rounded-2xl text-left transition-all border flex flex-col justify-between gap-1.5 ${
                                            isSelected 
                                                ? 'bg-white dark:bg-zinc-900 border-2 border-[#005a36] dark:border-emerald-400 shadow-sm ring-2 ring-emerald-500/20' 
                                                : 'bg-white/60 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-800'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className={`text-sm font-black ${isSelected ? 'text-[#005a36] dark:text-emerald-400' : 'text-slate-800 dark:text-zinc-200'}`}>
                                                {item.anio}
                                            </span>
                                            {isCurrent && (
                                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300">
                                                    Actual
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {item.esViable ? (
                                                <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                                    <Check size={12} className="stroke-[3]" />
                                                    {isBest && !isCurrent ? 'Óptimo' : 'Viable'}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                                    <Clock size={11} /> Esperar
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ─── DETALLE COMPACTO DEL AÑO SELECCIONADO (2 COLUMNAS) ─── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Tarjeta 1: Impacto en la Carrera */}
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                            <h3 className="font-black text-sm text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                                Avance y Carga Horaria
                            </h3>
                            <Chip size="sm" variant="flat" color="primary" className="font-extrabold text-xs">
                                -202 hs cursada
                            </Chip>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                                    <span>Plan 17.13 (tu plan actual)</span>
                                    <span className="font-black">{resultadoAnioSeleccionado.avance1713.porcentaje}% ({resultadoAnioSeleccionado.avance1713.aprobadas}/{resultadoAnioSeleccionado.avance1713.totales})</span>
                                </div>
                                <Progress 
                                    aria-label="Avance plan 17.13"
                                    value={resultadoAnioSeleccionado.avance1713.porcentaje} 
                                    size="sm" 
                                    classNames={{ indicator: "bg-slate-500" }}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-bold text-[#005a36] dark:text-emerald-400 mb-1">
                                    <span>Plan 17.14 (reconocido en {anioSeleccionado})</span>
                                    <span className="font-black">{resultadoAnioSeleccionado.avance1714.porcentaje}% ({resultadoAnioSeleccionado.avance1714.aprobadas}/{resultadoAnioSeleccionado.avance1714.totales})</span>
                                </div>
                                <Progress 
                                    aria-label="Avance plan 17.14"
                                    value={resultadoAnioSeleccionado.avance1714.porcentaje} 
                                    size="sm" 
                                    classNames={{ indicator: "bg-[#005a36] dark:bg-emerald-500" }}
                                />
                            </div>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl text-xs text-slate-600 dark:text-zinc-300 font-medium">
                            💡 Se reconocen automáticamente <strong className="text-slate-900 dark:text-zinc-100 font-bold">{resultadoAnioSeleccionado.equivalenciasReconocidasCount} equivalencias directas</strong> sin trámites extra.
                        </div>
                    </div>

                    {/* Tarjeta 2: Materias Disponibles / Diagnóstico */}
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                                <h3 className="font-black text-sm text-slate-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                                    <Sparkles size={15} className="text-[#F5B82E]" />
                                    Materias para el Ciclo {anioSeleccionado}
                                </h3>
                                <span className="text-xs font-bold text-slate-500">
                                    {OFERTA_RESOLUCION_89_2025[anioSeleccionado]?.plan1714?.descripcion}
                                </span>
                            </div>

                            {esViableSeleccionado ? (
                                <div>
                                    <p className="text-xs text-emerald-800 dark:text-emerald-300 font-bold mb-2">
                                        ✅ Podés cursar de inmediato en Plan 17.14:
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {resultadoAnioSeleccionado.avance1714.materiasCursables.map(m => (
                                            <Chip key={m.codigo} size="sm" variant="flat" color="success" className="font-bold text-xs">
                                                {m.codigo} • {m.nombre} ({m.horas} hs)
                                            </Chip>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-xs text-amber-800 dark:text-amber-300 font-bold">
                                        ⚠️ Motivo por el que conviene esperar en {anioSeleccionado}:
                                    </p>
                                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-zinc-300">
                                        {resultadoAnioSeleccionado.motivosBache.slice(0, 2).map((motivo, idx) => (
                                            <li key={idx} className="flex items-start gap-1.5">
                                                <span className="text-amber-600 font-bold">•</span>
                                                <span>{motivo}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {!esViableSeleccionado && (
                            <div className="pt-2">
                                <Button
                                    size="sm"
                                    variant="flat"
                                    color="warning"
                                    onPress={() => navigate('/contacto')}
                                    className="w-full font-bold text-xs"
                                    startContent={<PhoneCall size={13} />}
                                >
                                    Consultar con Coordinación de Carrera
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── PREGUNTAS FRECUENTES Y MARCO REGLAMENTARIO (FORMATO DESTACADO) ─── */}
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#005a36]/10 dark:bg-emerald-500/20 text-[#005a36] dark:text-emerald-300 flex items-center justify-center shrink-0">
                            <HelpCircle size={22} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                RESOLUCIÓN HCS 89/2025 • GUÍA AL ESTUDIANTE
                            </span>
                            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-zinc-100">
                                Preguntas Frecuentes sobre la Transición
                            </h3>
                        </div>
                    </div>

                    <Accordion variant="splitted" className="px-0 gap-3">
                        <AccordionItem 
                            key="1" 
                            aria-label="¿Qué pasa con las materias regularizadas sin final?"
                            title={<span className="text-sm font-bold text-slate-900 dark:text-zinc-100">¿Qué pasa con las materias que tengo regularizadas pero sin examen final?</span>}
                            startContent={<AlertTriangle className="text-amber-500 shrink-0" size={20} />}
                            className="border border-slate-200/80 dark:border-zinc-800 shadow-xs rounded-2xl"
                        >
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed font-medium pb-2">
                                Según la reglamentación oficial (Res. HCS 89/2025), las materias con cursada regular y final pendiente <strong>no otorgan equivalencia automática directa</strong> en el Plan 17.14. Se recomienda rendir el examen final en el Plan 17.13 para obtener el reconocimiento automático de la materia.
                            </p>
                        </AccordionItem>

                        <AccordionItem 
                            key="2" 
                            aria-label="¿Cómo se solicita formalmente el cambio de plan?"
                            title={<span className="text-sm font-bold text-slate-900 dark:text-zinc-100">¿Cómo se solicita formalmente el cambio de plan?</span>}
                            startContent={<BookOpen className="text-emerald-600 shrink-0" size={20} />}
                            className="border border-slate-200/80 dark:border-zinc-800 shadow-xs rounded-2xl"
                        >
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed font-medium pb-2">
                                El cambio de plan es voluntario y no obligatorio. Si decidís pasarte, el trámite se realiza formalmente en los períodos habilitados por el Departamento de Alumnos de la UNLu. Este simulador es una herramienta de orientación y no modifica tu legajo oficial.
                            </p>
                        </AccordionItem>

                        <AccordionItem 
                            key="3" 
                            aria-label="¿Por qué el Plan 17.14 tiene menos horas totales?"
                            title={<span className="text-sm font-bold text-slate-900 dark:text-zinc-100">¿Por qué el Plan 17.14 tiene 202 horas menos de cursada?</span>}
                            startContent={<TrendingDown className="text-[#005a36] dark:text-emerald-400 shrink-0" size={20} />}
                            className="border border-slate-200/80 dark:border-zinc-800 shadow-xs rounded-2xl"
                        >
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed font-medium pb-2">
                                El Plan 17.14 optimiza los contenidos curriculares y actualiza la carga horaria adaptándose a los estándares modernos de acreditación universitaria CIN/CONFEDI, logrando una cursada más ágil y eficiente sin perder calidad académica.
                            </p>
                        </AccordionItem>

                        <AccordionItem 
                            key="4" 
                            aria-label="¿El cambio de plan es definitivo?"
                            title={<span className="text-sm font-bold text-slate-900 dark:text-zinc-100">¿El cambio de plan es definitivo?</span>}
                            startContent={<FileText className="text-slate-500 shrink-0" size={20} />}
                            className="border border-slate-200/80 dark:border-zinc-800 shadow-xs rounded-2xl"
                        >
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed font-medium pb-2">
                                Sí. Una vez formalizado el pase ante la Universidad, tu historia académica pasa a regirse por el Plan 17.14. Dado que el Plan 17.13 cierra progresivamente sus cohortes año a año hasta extinguirse en 2029, se aconseja verificar la viabilidad con este simulador antes de iniciar el trámite.
                            </p>
                        </AccordionItem>
                    </Accordion>
                </div>
            </div>
        </div>
    );
}

export default TransicionPlan;
