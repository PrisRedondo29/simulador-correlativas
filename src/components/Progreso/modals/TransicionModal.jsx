import React, { useState, useMemo, useEffect } from 'react';
import { Modal, ModalContent, ModalBody, Button, Progress, Tooltip, Chip } from '@heroui/react';
import { 
    AlertTriangle, 
    CheckCircle2, 
    Info, 
    FileText, 
    ArrowRight, 
    ArrowLeft, 
    PhoneCall, 
    Calendar,
    Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import planService from '../../../services/planService';
import equivalenciasData from '../../../data/equivalencias.json';
import { obtenerResumenPaso1, evaluarTransicionCompleta } from '../../../utils/Transicion/transicionUtils';

function TransicionModal({ isOpen, onOpenChange, plan = "17.13", progreso = {} }) {
    const navigate = useNavigate();
    const [paso, setPaso] = useState(1); // 1: Aviso & Conteo, 2: Resultados
    const [anioAnalisis, setAnioAnalisis] = useState(2025);

    // Cargar materias de ambos planes
    const plan1713 = useMemo(() => planService.getPlanByNumber("17.13"), []);
    const plan1714 = useMemo(() => planService.getPlanByNumber("17.14"), []);

    const materias1713 = useMemo(() => plan1713?.materias || [], [plan1713]);
    const materias1714 = useMemo(() => plan1714?.materias || [], [plan1714]);

    // Resetear al abrir
    useEffect(() => {
        if (isOpen) {
            setPaso(1);
            setAnioAnalisis(2025);
        }
    }, [isOpen]);

    // Resumen del Paso 1 (conteo de materias con final vs en curso)
    const resumenPaso1 = useMemo(() => {
        return obtenerResumenPaso1(progreso, materias1713);
    }, [progreso, materias1713]);

    // Evaluación matemática y de oferta real para el Paso 2
    const resultadoTransicion = useMemo(() => {
        return evaluarTransicionCompleta({
            progreso,
            materias1713,
            materias1714,
            equivalenciasData,
            anioAnalisis
        });
    }, [progreso, materias1713, materias1714, anioAnalisis]);

    const handleSimular = () => {
        setPaso(2);
    };

    const handleVolver = () => {
        if (paso === 2) {
            setPaso(1);
        } else {
            onOpenChange(false);
        }
    };

    const handleIrEquivalencias = (onClose) => {
        onClose();
        navigate('/equivalencias');
    };

    const handleIrContacto = (onClose) => {
        onClose();
        navigate('/contacto');
    };

    const tieneProgresoCargado = resumenPaso1.cantidadAprobadas > 0 || resumenPaso1.cantidadFuera > 0;

    const handleIrAProgreso = (onClose) => {
        onClose();
        navigate('/progreso');
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onOpenChange={onOpenChange} 
            size="3xl" 
            backdrop="blur"
            scrollBehavior="inside"
            classNames={{
                wrapper: "overflow-hidden p-2 sm:p-4",
                base: "bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl p-0 max-h-[90vh] my-auto flex flex-col",
                closeButton: "top-4 right-4 text-white hover:bg-white/20 z-50 rounded-full"
            }}
        >
            <ModalContent className="max-h-[90vh] flex flex-col overflow-hidden p-0">
                {(onClose) => (
                    <>
                        {/* Header Institucional UNLu (Fijo arriba) */}
                        <div className="bg-[#005a36] text-white p-5 sm:p-7 relative overflow-hidden shrink-0 border-b border-emerald-900/50">
                            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                            <div className="relative z-10 flex flex-col items-start gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#F5B82E] font-black text-xs tracking-widest uppercase">
                                        PASO {paso} DE 2
                                    </span>
                                    <span className="text-white/40">•</span>
                                    <span className="text-white/80 font-bold text-xs">Res. HCS 89/2025</span>
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                                    Prueba de Transición al Nuevo Plan
                                </h2>
                                <p className="text-white/85 font-normal text-xs sm:text-sm max-w-2xl leading-relaxed">
                                    Comparamos tu progreso del Plan 17.13 con la oferta progresiva del Plan 17.14. Es una simulación: no altera tu legajo oficial.
                                </p>
                            </div>
                        </div>

                        {/* ModalBody con Scroll Independiente Completo */}
                        <ModalBody className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1 min-h-0">
                            {paso === 1 ? (
                                !tieneProgresoCargado ? (
                                    /* ─── CASO: SIN PROGRESO CARGADO ─── */
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        {/* Card informativa de progreso requerido */}
                                        <div className="bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-500/50 rounded-3xl p-6 sm:p-7 text-center flex flex-col items-center">
                                            <div className="w-16 h-16 rounded-2xl bg-[#F5B82E] text-slate-950 flex items-center justify-center shadow-md mb-4">
                                                <FileText size={32} className="stroke-[2.5]" />
                                            </div>
                                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-900 dark:text-amber-300">
                                                PASO PREVIO REQUERIDO
                                            </span>
                                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-amber-100 tracking-tight mt-1">
                                                Todavía no registraste materias en tu progreso
                                            </h3>
                                            <p className="text-xs sm:text-sm text-slate-600 dark:text-amber-200/90 max-w-lg mt-2 font-medium leading-relaxed">
                                                Para que el simulador determine con exactitud si te conviene el cambio según la <strong>Resolución HCS 89/2025</strong>, necesitás cargar qué materias tenés aprobadas o cursadas en el <strong>Plan 17.13</strong>.
                                            </p>
                                        </div>

                                        {/* Guía rápida para facilitar el registro */}
                                        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-2xl space-y-3">
                                            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                                                <Sparkles size={16} className="text-[#F5B82E]" />
                                                ¿Cómo registrar tu avance en segundos?
                                            </h4>
                                            <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-zinc-300 font-medium">
                                                <li className="flex items-start gap-2.5">
                                                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                                                    <span>
                                                        <strong>Carga rápida por año:</strong> En <em>Mi Progreso</em> podés marcar años enteros (ej. todo 1° o 2° año) con un solo clic si tenés los bloques completados.
                                                    </span>
                                                </li>
                                                <li className="flex items-start gap-2.5">
                                                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                                                    <span>
                                                        <strong>Finales vs Cursadas:</strong> Marcá como <em>"Aprobada"</em> sólo si diste el examen final (son las que otorgan equivalencia), y como <em>"Regular"</em> si tenés la cursada aprobada.
                                                    </span>
                                                </li>
                                                <li className="flex items-start gap-2.5">
                                                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                                                    <span>
                                                        <strong>Buscador ágil:</strong> Presioná <kbd className="px-1.5 py-0.5 text-[11px] font-bold bg-white dark:bg-zinc-700 border rounded">Ctrl + K</kbd> en Mi Progreso para buscar cualquier materia por código o nombre.
                                                    </span>
                                                </li>
                                            </ul>
                                        </div>

                                        {/* Botones de acción */}
                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                                            <Button
                                                onPress={() => handleIrAProgreso(onClose)}
                                                className="w-full sm:w-auto bg-[#005a36] hover:bg-[#004a2c] text-white font-black text-sm uppercase tracking-wider px-8 py-6 rounded-2xl shadow-md hover:shadow-lg transition-all"
                                                endContent={<ArrowRight size={18} className="stroke-[2.5]" />}
                                            >
                                                Ir a cargar mi progreso
                                            </Button>
                                            <Button
                                                variant="bordered"
                                                onPress={() => onOpenChange(false)}
                                                className="w-full sm:w-auto border-slate-300 dark:border-zinc-700 font-bold text-slate-700 dark:text-zinc-300 text-sm px-6 py-6 rounded-2xl"
                                            >
                                                Cerrar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    /* ─── PASO 1: AVISO, RECORDATORIO Y CONTEO DE MATERIAS ─── */
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        {/* Recordatorio de Actualización de Progreso */}
                                        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/30 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Sparkles size={16} />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                                                        ¿TU PROGRESO ESTÁ AL DÍA?
                                                    </span>
                                                    <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium">
                                                        Tenés <strong className="text-slate-900 dark:text-zinc-100 font-bold">{resumenPaso1.cantidadAprobadas} aprobadas con final</strong> y <strong className="text-slate-900 dark:text-zinc-100 font-bold">{resumenPaso1.cantidadFuera} en curso/regular</strong>. Si rendiste finales en la última mesa, asegurate de tenerlos marcados.
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                color="success"
                                                onPress={() => handleIrAProgreso(onClose)}
                                                className="font-bold text-xs shrink-0 self-end sm:self-center"
                                                endContent={<ArrowRight size={14} />}
                                            >
                                                Editar progreso
                                            </Button>
                                        </div>

                                        {/* Aviso Importante Amarillo */}
                                        <div className="bg-[#FDF0D5] dark:bg-amber-950/40 border-2 border-[#F5B82E] dark:border-amber-500/50 rounded-2xl p-5 sm:p-6 shadow-sm">
                                            <div className="flex items-start gap-3.5">
                                                <div className="w-9 h-9 rounded-xl bg-[#F5B82E]/30 dark:bg-amber-500/20 flex items-center justify-center text-amber-900 dark:text-amber-300 shrink-0 mt-0.5">
                                                    <AlertTriangle size={20} className="stroke-[2.5]" />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                                                        AVISO IMPORTANTE
                                                    </span>
                                                    <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-amber-100 leading-snug">
                                                        SÓLO LAS MATERIAS APROBADAS CON FINAL CUENTAN PARA EQUIVALENCIA
                                                    </h3>
                                                    <p className="text-xs sm:text-sm text-slate-700 dark:text-amber-200/90 leading-relaxed font-medium">
                                                        Las materias con cursada aprobada (regular) y final pendiente no generan equivalencia automática en el Plan 17.14 según la reglamentación vigente.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Grilla de Conteo: Se computarán vs Quedarán fuera */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Card Se computarán */}
                                            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-2xl shadow-2xs">
                                                <div className="flex items-center gap-2.5 mb-2">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                                                        <FileText size={16} />
                                                    </div>
                                                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-zinc-100">
                                                        Se computarán
                                                    </h4>
                                                </div>
                                                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                                                    <strong className="text-slate-900 dark:text-zinc-100 font-bold">
                                                        {resumenPaso1.cantidadAprobadas} materias
                                                    </strong> aprobadas con final registradas en tu legajo.
                                                </p>
                                            </div>

                                            {/* Card Quedarán fuera */}
                                            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-2xl shadow-2xs">
                                                <div className="flex items-center gap-2.5 mb-2">
                                                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                                                        <Info size={16} />
                                                    </div>
                                                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-zinc-100">
                                                        Quedarán fuera
                                                    </h4>
                                                </div>
                                                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                                                    {resumenPaso1.cantidadFuera > 0 ? (
                                                        <>
                                                            <strong className="text-slate-900 dark:text-zinc-100 font-bold">
                                                                {resumenPaso1.cantidadFuera} {resumenPaso1.cantidadFuera === 1 ? 'materia' : 'materias'}
                                                            </strong>{' '}
                                                            en curso o regular:{' '}
                                                            {(() => {
                                                                const nombres = resumenPaso1.enCursoORegulares.map(m => m.nombre);
                                                                const MAX_MATERIAS = 4;
                                                                if (nombres.length <= MAX_MATERIAS) {
                                                                    return `${nombres.join(', ')}.`;
                                                                }
                                                                const mostradas = nombres.slice(0, 3).join(', ');
                                                                const restantes = nombres.length - 3;
                                                                const listaCompleta = nombres.join('\n• ');

                                                                return (
                                                                    <span>
                                                                        {mostradas},{' '}
                                                                        <Tooltip
                                                                            content={
                                                                                <div className="px-2 py-1.5 max-w-xs">
                                                                                    <p className="font-black text-xs text-amber-300 mb-1">
                                                                                        Materias sin final ({nombres.length}):
                                                                                    </p>
                                                                                    <p className="text-[11px] leading-tight text-white whitespace-pre-line">
                                                                                        • {listaCompleta}
                                                                                    </p>
                                                                                </div>
                                                                            }
                                                                            placement="top"
                                                                        >
                                                                            <span className="font-bold text-amber-700 dark:text-amber-400 underline decoration-dotted cursor-help">
                                                                                y {restantes} más.
                                                                            </span>
                                                                        </Tooltip>
                                                                    </span>
                                                                );
                                                            })()}
                                                        </>
                                                    ) : (
                                                        <span>No tenés materias en curso o regulares pendientes de final.</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Botones de acción Paso 1 */}
                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
                                            <Button
                                                onPress={handleSimular}
                                                className="w-full sm:w-auto bg-[#F5B82E] hover:bg-[#e2a825] text-slate-900 font-black text-sm uppercase tracking-wider px-8 py-6 rounded-2xl shadow-sm hover:shadow transition-all"
                                                endContent={<ArrowRight size={18} className="stroke-[2.5]" />}
                                            >
                                                SÍ, SIMULAR CAMBIO
                                            </Button>
                                            <Button
                                                variant="bordered"
                                                onPress={() => onOpenChange(false)}
                                                className="w-full sm:w-auto border-slate-300 dark:border-zinc-700 font-bold text-slate-700 dark:text-zinc-300 text-sm px-6 py-6 rounded-2xl"
                                                startContent={<ArrowLeft size={16} />}
                                            >
                                                Volver
                                            </Button>
                                        </div>
                                    </div>
                                )
                            ) : (
                                /* ─── PASO 2: RESULTADOS REALES EVALUADOS ─── */
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    {/* Selector interactivo de año de proyección */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-slate-100 dark:bg-zinc-800/70 rounded-2xl border border-slate-200 dark:border-zinc-700/60">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-[#005a36] dark:text-emerald-400 shrink-0" />
                                            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                                Ciclo lectivo de análisis:
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {[2025, 2026, 2027, 2028, 2029].map(anio => (
                                                <button
                                                    key={anio}
                                                    type="button"
                                                    onClick={() => setAnioAnalisis(anio)}
                                                    className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all ${
                                                        anioAnalisis === anio
                                                            ? 'bg-[#005a36] text-white shadow-xs'
                                                            : 'bg-white dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 border border-slate-200 dark:border-zinc-600'
                                                    }`}
                                                >
                                                    {anio} {anio === new Date().getFullYear() ? '(Actual)' : ''}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ESCENARIO A: POSITIVO / TRANSICIÓN VIABLE */}
                                    {esEscenarioViable ? (
                                        <div className="space-y-5">
                                            {/* Banner Verde Superior */}
                                            <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-500/50 rounded-3xl p-6 text-center flex flex-col items-center">
                                                <div className="w-14 h-14 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-md mb-3">
                                                    <CheckCircle2 size={32} className="stroke-[2.5]" />
                                                </div>
                                                <span className="text-emerald-800 dark:text-emerald-300 font-extrabold text-xs uppercase tracking-widest">
                                                    DIAGNÓSTICO OFICIAL • RES. HCS 89/2025
                                                </span>
                                                <h3 className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100 tracking-tight mt-1">
                                                    ¡Resultado positivo! Transición viable
                                                </h3>
                                                <p className="text-xs sm:text-sm text-emerald-800/90 dark:text-emerald-300 max-w-lg mt-1 font-medium leading-relaxed">
                                                    Con tu avance actual de {resultadoTransicion.avance1713.aprobadas} materias aprobadas con final, migrar al Plan 17.14 en {anioAnalisis} es viable: tenés materias para cursar de inmediato y reducís tu carga total.
                                                </p>
                                            </div>

                                            {/* Grilla Comparativa de Avance */}
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                {/* Barras de avance */}
                                                <div className="lg:col-span-2 p-5 sm:p-6 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-2xl space-y-4">
                                                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                                                        Avance comparado entre planes
                                                    </h4>

                                                    <div>
                                                        <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                                                            <span>Avance Plan 17.13 (actual)</span>
                                                            <span className="font-extrabold">{resultadoTransicion.avance1713.porcentaje}% ({resultadoTransicion.avance1713.aprobadas}/{resultadoTransicion.avance1713.totales} mat.)</span>
                                                        </div>
                                                        <Progress 
                                                            aria-label="Avance plan 17.13"
                                                            value={resultadoTransicion.avance1713.porcentaje} 
                                                            size="md" 
                                                            classNames={{
                                                                indicator: "bg-slate-600 dark:bg-slate-400"
                                                            }}
                                                        />
                                                    </div>

                                                    <div>
                                                        <div className="flex justify-between text-xs font-bold text-[#005a36] dark:text-emerald-400 mb-1">
                                                            <span>Avance Plan 17.14 (reconocido)</span>
                                                            <span className="font-black text-emerald-700 dark:text-emerald-400">
                                                                {resultadoTransicion.avance1714.porcentaje}% ({resultadoTransicion.avance1714.aprobadas}/{resultadoTransicion.avance1714.totales} mat.)
                                                            </span>
                                                        </div>
                                                        <Progress 
                                                            aria-label="Avance plan 17.14"
                                                            value={resultadoTransicion.avance1714.porcentaje} 
                                                            size="md" 
                                                            classNames={{
                                                                indicator: "bg-[#005a36] dark:bg-emerald-500"
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="pt-2">
                                                        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-medium">
                                                            Se reconocen <strong className="text-slate-900 dark:text-zinc-100 font-bold">{resultadoTransicion.equivalenciasReconocidasCount} equivalencias directas</strong> automáticas.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Diferencia de cursada destacada */}
                                                <div className="p-5 sm:p-6 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-2xl flex flex-col justify-between">
                                                    <div>
                                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-1">
                                                            DIFERENCIA DE CURSADA
                                                        </span>
                                                        <span className="text-3xl font-black text-[#005a36] dark:text-emerald-400 leading-tight">
                                                            {Math.abs(resultadoTransicion.diferenciaHoras) > 0 ? `${Math.abs(resultadoTransicion.diferenciaHoras)} hs` : '200 hs'}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 block mt-0.5">
                                                            menos por cursar
                                                        </span>
                                                    </div>

                                                    <div className="mt-4 p-2.5 rounded-xl bg-emerald-100/50 dark:bg-emerald-950/40 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                                                        Plan actualizado a estándares universitarios y mayor flexibilidad.
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Materias disponibles para cursar en 17.14 */}
                                            {resultadoTransicion.avance1714.materiasCursables.length > 0 && (
                                                <div className="p-4 sm:p-5 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-2xl space-y-2">
                                                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                                                        <Sparkles size={16} className="text-[#F5B82E]" />
                                                        Materias que podrías cursar de inmediato en Plan 17.14 ({anioAnalisis}):
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        {resultadoTransicion.avance1714.materiasCursables.map(m => (
                                                            <Chip key={m.codigo} size="sm" variant="flat" color="success" className="font-bold text-xs">
                                                                {m.nombre}
                                                            </Chip>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Botón CTA Escenario A */}
                                            <div className="pt-2 flex flex-col gap-3 pb-2">
                                                <Button
                                                    onPress={() => handleIrEquivalencias(onClose)}
                                                    className="w-full bg-[#F5B82E] hover:bg-[#e2a825] text-slate-900 font-black text-sm uppercase tracking-wider py-6 rounded-2xl shadow-sm hover:shadow transition-all"
                                                    endContent={<ArrowRight size={18} className="stroke-[2.5]" />}
                                                >
                                                    Ver tu nuevo plan de cursada visual
                                                </Button>
                                                <Button
                                                    variant="light"
                                                    onPress={handleVolver}
                                                    className="w-full font-bold text-slate-600 dark:text-zinc-400 text-xs"
                                                >
                                                    ← Volver al paso anterior
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* ESCENARIO B: NO VIABLE / REQUIERE CONSULTA */
                                        <div className="space-y-5">
                                            {/* Banner Amarillo Superior */}
                                            <div className="bg-[#FDF0D5] dark:bg-amber-950/40 border-2 border-[#F5B82E] dark:border-amber-500/50 rounded-3xl p-6 text-center flex flex-col items-center">
                                                <div className="w-14 h-14 rounded-full bg-[#F5B82E] text-slate-900 flex items-center justify-center shadow-md mb-3">
                                                    <AlertTriangle size={32} className="stroke-[2.5]" />
                                                </div>
                                                <span className="text-amber-900 dark:text-amber-300 font-extrabold text-xs uppercase tracking-widest">
                                                    DIAGNÓSTICO OFICIAL • RES. HCS 89/2025
                                                </span>
                                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-amber-100 tracking-tight mt-1">
                                                    Se requiere consulta: transición no viable por ahora
                                                </h3>
                                                <p className="text-xs sm:text-sm text-slate-700 dark:text-amber-200/90 max-w-lg mt-1 font-medium leading-relaxed">
                                                    En el ciclo lectivo {anioAnalisis}, migrar al Plan 17.14 te generaría baches de cursada por falta de oferta en materias intermedias.
                                                </p>
                                            </div>

                                            {/* Comparativa con Estancamiento */}
                                            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-2xl space-y-4">
                                                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                                                    Avance comparado entre planes
                                                </h4>

                                                <div>
                                                    <div className="flex justify-between text-xs font-bold text-[#005a36] dark:text-emerald-400 mb-1">
                                                        <span>Avance Plan 17.13 (actual)</span>
                                                        <span className="font-extrabold">{resultadoTransicion.avance1713.porcentaje}% ({resultadoTransicion.avance1713.aprobadas}/{resultadoTransicion.avance1713.totales} mat.)</span>
                                                    </div>
                                                    <Progress 
                                                        aria-label="Avance plan 17.13"
                                                        value={resultadoTransicion.avance1713.porcentaje} 
                                                        size="md" 
                                                        classNames={{
                                                            indicator: "bg-[#005a36] dark:bg-emerald-500"
                                                        }}
                                                    />
                                                </div>

                                                <div>
                                                    <div className="flex justify-between text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">
                                                        <span>Avance Plan 17.14 (reconocido)</span>
                                                        <span className="font-black text-amber-700 dark:text-amber-400">
                                                            {resultadoTransicion.avance1714.porcentaje}% ({resultadoTransicion.avance1714.aprobadas}/{resultadoTransicion.avance1714.totales} mat.)
                                                        </span>
                                                    </div>
                                                    <Progress 
                                                        aria-label="Avance plan 17.14"
                                                        value={resultadoTransicion.avance1714.porcentaje} 
                                                        size="md" 
                                                        classNames={{
                                                            indicator: "bg-amber-500"
                                                        }}
                                                    />
                                                </div>

                                                <div className="p-3 bg-amber-500/10 border border-dashed border-amber-500/30 rounded-xl text-center text-xs font-bold text-amber-900 dark:text-amber-300">
                                                    ⏸ El avance en el Plan 17.14 queda limitado por la implementación gradual de materias (Res. 89/2025)
                                                </div>
                                            </div>

                                            {/* Card de Causas Detalladas */}
                                            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-2xl space-y-3">
                                                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                                                    <AlertTriangle size={18} />
                                                    <h4 className="font-extrabold text-sm sm:text-base">
                                                        ¿Por qué no es viable todavía en {anioAnalisis}?
                                                    </h4>
                                                </div>
                                                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-zinc-300 font-medium list-none">
                                                    {resultadoTransicion.motivosBache.map((motivo, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 leading-relaxed">
                                                            <span className="text-amber-600 font-black">•</span>
                                                            <span>{motivo}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Botón CTA Escenario B */}
                                            <div className="pt-2 flex flex-col gap-3 pb-2">
                                                <Button
                                                    onPress={() => handleIrContacto(onClose)}
                                                    className="w-full bg-[#005a36] hover:bg-[#004a2c] text-white font-black text-sm uppercase tracking-wider py-6 rounded-2xl shadow-sm hover:shadow transition-all"
                                                    startContent={<PhoneCall size={18} />}
                                                >
                                                    Permanecer en Plan 17.13 / Consultar coordinación
                                                </Button>
                                                <Button
                                                    variant="light"
                                                    onPress={handleVolver}
                                                    className="w-full font-bold text-slate-600 dark:text-zinc-400 text-xs"
                                                >
                                                    ← Volver al paso anterior
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}

export default TransicionModal;
