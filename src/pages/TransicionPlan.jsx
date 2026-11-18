import React, { useState, useMemo, useEffect } from 'react';
import {
    Button,
    Progress,
    Chip,
    Accordion,
    AccordionItem,
} from '@heroui/react';
import {
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
    Clock,
    HelpCircle,
    Check,
    BookOpen,
    FileText,
    TrendingDown,
    PhoneCall,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import planService from '../services/planService';
import equivalenciasData from '../data/equivalencias.json';
import {
    OFERTA_RESOLUCION_89_2025,
    obtenerResumenPaso1,
    evaluarTransicionCompleta,
    calcularProyeccionMultianual,
} from '../utils/Transicion/transicionUtils';

function TransicionPlan() {
    const navigate = useNavigate();
    const anioActual = useMemo(() => new Date().getFullYear(), []);

    const [progreso, setProgreso] = useState(() => {
        try {
            const raw = localStorage.getItem('progreso+17.13');
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    });

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

    const plan1713 = useMemo(() => planService.getPlanByNumber('17.13'), []);
    const plan1714 = useMemo(() => planService.getPlanByNumber('17.14'), []);
    const materias1713 = useMemo(() => plan1713?.materias || [], [plan1713]);
    const materias1714 = useMemo(() => plan1714?.materias || [], [plan1714]);

    const resumenPaso1 = useMemo(() => {
        return obtenerResumenPaso1(progreso, materias1713);
    }, [progreso, materias1713]);

    const tieneProgresoCargado = resumenPaso1.cantidadAprobadas > 0 || resumenPaso1.cantidadFuera > 0;

    const proyeccionGlobal = useMemo(() => {
        return calcularProyeccionMultianual({
            progreso,
            materias1713,
            materias1714,
            equivalenciasData,
            anioActual,
        });
    }, [progreso, materias1713, materias1714, anioActual]);

    const [anioSeleccionado, setAnioSeleccionado] = useState(() => anioActual);

    const resultadoAnioSeleccionado = useMemo(() => {
        return evaluarTransicionCompleta({
            progreso,
            materias1713,
            materias1714,
            equivalenciasData,
            anioAnalisis: anioSeleccionado,
        });
    }, [progreso, materias1713, materias1714, anioSeleccionado]);

    const esViableSeleccionado = resultadoAnioSeleccionado.escenarioReal === 'A';

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F1419] pb-14">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-5">
                {/* ─── CABECERA ESTÁNDAR ALINEADA CON EL RESTO DE LA APP ─── */}
                <header className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#FEF3C7] dark:bg-[#2D2210] text-[#92400E] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#5C4318]">
                                Res. HCS 89/2025
                            </span>
                            <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                                Plan 17.13 → Plan 17.14
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
                            Simulador de Cambio de Plan
                        </h1>
                        <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                            El cálculo se basa en tus materias aprobadas con final en{' '}
                            <Link to="/progreso" className="font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:underline">
                                Mi Progreso
                            </Link>.
                        </p>
                    </div>

                    {tieneProgresoCargado && (
                        <div className="flex items-center gap-2.5 bg-[#F8FAFC] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540] px-3.5 py-2 rounded-xl shrink-0 self-start sm:self-center">
                            <div className="flex items-center gap-2 text-xs font-medium tabular-nums">
                                <span className="text-[#166534] dark:text-[#86EFAC]">
                                    {resumenPaso1.cantidadAprobadas} con final
                                </span>
                                <span className="text-[#CBD5E1] dark:text-[#3B4958]">|</span>
                                <span className="text-[#92400E] dark:text-[#FCD34D]">
                                    {resumenPaso1.cantidadFuera} regular
                                </span>
                            </div>
                            <Button
                                size="sm"
                                variant="light"
                                onPress={() => navigate('/progreso')}
                                className="text-[#005A36] dark:text-[#6EE7B7] text-xs font-semibold h-6 px-2 min-w-0"
                            >
                                Editar
                            </Button>
                        </div>
                    )}
                </header>

                {/* ─── ALERTA SI NO HAY PROGRESO ─── */}
                {!tieneProgresoCargado && (
                    <div className="p-4 bg-[#FFFBEB] dark:bg-[#2D2210] border border-[#FDE68A] dark:border-[#5C4318] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={18} className="text-[#92400E] dark:text-[#FCD34D] shrink-0 mt-0.5" />
                            <div>
                                <h2 className="font-semibold text-sm text-[#1E293B] dark:text-[#F1F5F9]">
                                    Todavía no cargaste materias del Plan 17.13
                                </h2>
                                <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
                                    Cargá tu avance en Mi Progreso para calcular exactamente qué materias se te habilitan.
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onPress={() => navigate('/progreso')}
                            className="bg-[#005A36] text-white font-semibold text-xs shrink-0 rounded-xl"
                        >
                            Cargar mi progreso
                        </Button>
                    </div>
                )}

                {/* ─── VEREDICTO INSTANTÁNEO PRINCIPAL ─── */}
                <section
                    className={`border rounded-2xl p-5 sm:p-6 transition-colors ${
                        proyeccionGlobal.esViableActual
                            ? 'bg-[#ECFDF5] dark:bg-[#102A20]/80 border-[#A7F3D0] dark:border-[#1E4D38]'
                            : 'bg-[#FFFBEB] dark:bg-[#2D2210]/70 border-[#FDE68A] dark:border-[#5C4318]'
                    }`}
                >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                        <div className="flex items-start gap-4">
                            <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                    proyeccionGlobal.esViableActual
                                        ? 'bg-[#478559] text-white'
                                        : 'bg-[#FEF3C7] dark:bg-[#423115] text-[#92400E] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#5C4318]'
                                }`}
                            >
                                {proyeccionGlobal.esViableActual ? (
                                    <CheckCircle2 size={24} />
                                ) : (
                                    <Clock size={24} />
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-medium text-[#475569] dark:text-[#CBD5E1]">
                                        Veredicto según tu avance
                                    </span>
                                    <Chip
                                        size="sm"
                                        color={proyeccionGlobal.esViableActual ? 'success' : 'warning'}
                                        variant="flat"
                                        className="font-semibold text-[11px]"
                                    >
                                        {proyeccionGlobal.esViableActual
                                            ? `Viable ahora (${anioActual})`
                                            : `Año óptimo: ${proyeccionGlobal.primerAnioViable}`}
                                    </Chip>
                                </div>

                                <h2 className="text-lg sm:text-xl font-bold text-[#1E293B] dark:text-[#F1F5F9] leading-snug">
                                    {proyeccionGlobal.mensajePrincipal}
                                </h2>

                                <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed max-w-2xl">
                                    {proyeccionGlobal.recomendacionCorta}
                                </p>
                            </div>
                        </div>

                        <div className="shrink-0 w-full md:w-auto">
                            <Button
                                onPress={() => navigate('/equivalencias')}
                                className="w-full md:w-auto bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] text-white font-semibold text-xs px-5 h-10 rounded-xl"
                                endContent={<ArrowRight size={14} />}
                            >
                                Ver Equivalencias
                            </Button>
                        </div>
                    </div>

                    {/* Selector de Año */}
                    <div className="mt-5 pt-4 border-t border-[#E2E8F0] dark:border-[#2A3540]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                            <span className="text-xs font-semibold text-[#334155] dark:text-[#E2E8F0]">
                                Explorar impacto por año de solicitud:
                            </span>
                            <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                Seleccioná un año para ver la oferta habilitada
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
                                        className={`p-3 rounded-xl text-left transition-colors border flex flex-col justify-between gap-1 cursor-pointer ${
                                            isSelected
                                                ? 'bg-white dark:bg-[#161D24] border-2 border-[#005A36] dark:border-[#4A9D68]'
                                                : 'bg-white/75 dark:bg-[#161D24]/70 border-[#E2E8F0] dark:border-[#2A3540] hover:bg-white dark:hover:bg-[#1E2730]'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className={`text-sm font-bold tabular-nums ${isSelected ? 'text-[#005A36] dark:text-[#86EFAC]' : 'text-[#1E293B] dark:text-[#F1F5F9]'}`}>
                                                {item.anio}
                                            </span>
                                            {isCurrent && (
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F1F5F9] dark:bg-[#1E2730] text-[#475569] dark:text-[#CBD5E1]">
                                                    Actual
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            {item.esViable ? (
                                                <span className="text-[11px] font-semibold text-[#166534] dark:text-[#86EFAC] flex items-center gap-1">
                                                    <Check size={12} />
                                                    {isBest && !isCurrent ? 'Óptimo' : 'Viable'}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] font-medium text-[#92400E] dark:text-[#FCD34D] flex items-center gap-1">
                                                    <Clock size={11} /> Esperar
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ─── DETALLE DEL AÑO SELECCIONADO ─── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#F1F5F9] dark:border-[#2A3540] pb-3">
                            <h3 className="font-semibold text-sm text-[#1E293B] dark:text-[#F1F5F9]">
                                Avance y Carga Horaria
                            </h3>
                            <Chip size="sm" variant="flat" color="primary" className="font-semibold text-xs">
                                -202 hs cursada
                            </Chip>
                        </div>

                        <div className="space-y-3.5">
                            <div>
                                <div className="flex justify-between text-xs font-medium text-[#475569] dark:text-[#CBD5E1] mb-1 tabular-nums">
                                    <span>Plan 17.13 (actual)</span>
                                    <span className="font-semibold">
                                        {resultadoAnioSeleccionado.avance1713.porcentaje}% ({resultadoAnioSeleccionado.avance1713.aprobadas}/{resultadoAnioSeleccionado.avance1713.totales})
                                    </span>
                                </div>
                                <Progress
                                    aria-label="Avance plan 17.13"
                                    value={resultadoAnioSeleccionado.avance1713.porcentaje}
                                    size="sm"
                                    classNames={{
                                        track: 'bg-[#E2E8F0] dark:bg-[#2A3540]',
                                        indicator: 'bg-[#64748B] dark:bg-[#94A3B8]',
                                    }}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-medium text-[#005A36] dark:text-[#86EFAC] mb-1 tabular-nums">
                                    <span>Plan 17.14 (reconocido en {anioSeleccionado})</span>
                                    <span className="font-semibold">
                                        {resultadoAnioSeleccionado.avance1714.porcentaje}% ({resultadoAnioSeleccionado.avance1714.aprobadas}/{resultadoAnioSeleccionado.avance1714.totales})
                                    </span>
                                </div>
                                <Progress
                                    aria-label="Avance plan 17.14"
                                    value={resultadoAnioSeleccionado.avance1714.porcentaje}
                                    size="sm"
                                    classNames={{
                                        track: 'bg-[#E2E8F0] dark:bg-[#2A3540]',
                                        indicator: 'bg-[#478559] dark:bg-[#4A9D68]',
                                    }}
                                />
                            </div>
                        </div>

                        <div className="p-3 bg-[#F8FAFC] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540] rounded-xl text-xs text-[#475569] dark:text-[#CBD5E1]">
                            Se reconocen automáticamente{' '}
                            <strong className="text-[#1E293B] dark:text-[#F1F5F9]">
                                {resultadoAnioSeleccionado.equivalenciasReconocidasCount} equivalencias directas
                            </strong>{' '}
                            sin trámites adicionales.
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-[#F1F5F9] dark:border-[#2A3540] pb-3 gap-2">
                                <h3 className="font-semibold text-sm text-[#1E293B] dark:text-[#F1F5F9]">
                                    Materias en Ciclo {anioSeleccionado}
                                </h3>
                                <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                                    {OFERTA_RESOLUCION_89_2025[anioSeleccionado]?.plan1714?.descripcion}
                                </span>
                            </div>

                            {esViableSeleccionado ? (
                                <div>
                                    <p className="text-xs text-[#166534] dark:text-[#86EFAC] font-semibold mb-2">
                                        Podés cursar de inmediato en Plan 17.14:
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {resultadoAnioSeleccionado.avance1714.materiasCursables.map(m => (
                                            <Chip key={m.codigo} size="sm" variant="flat" color="success" className="font-medium text-xs">
                                                {m.codigo} · {m.nombre} ({m.horas}h)
                                            </Chip>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-xs text-[#92400E] dark:text-[#FCD34D] font-semibold">
                                        Motivos para esperar en {anioSeleccionado}:
                                    </p>
                                    <ul className="space-y-1.5 text-xs text-[#475569] dark:text-[#CBD5E1]">
                                        {resultadoAnioSeleccionado.motivosBache.slice(0, 2).map((motivo, idx) => (
                                            <li key={idx} className="flex items-start gap-1.5">
                                                <span className="text-[#D97706] font-bold">•</span>
                                                <span>{motivo}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {!esViableSeleccionado && (
                            <Button
                                size="sm"
                                variant="flat"
                                color="warning"
                                onPress={() => navigate('/contacto')}
                                className="w-full font-medium text-xs rounded-xl"
                                startContent={<PhoneCall size={13} />}
                            >
                                Consultar o reportar duda
                            </Button>
                        )}
                    </div>
                </div>

                {/* ─── PREGUNTAS FRECUENTES ─── */}
                <section className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] flex items-center justify-center shrink-0">
                            <HelpCircle size={18} />
                        </div>
                        <div>
                            <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                                Resolución HCS 89/2025
                            </span>
                            <h3 className="text-base sm:text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                                Preguntas frecuentes sobre la transición
                            </h3>
                        </div>
                    </div>

                    <Accordion variant="splitted" className="px-0 gap-2.5">
                        <AccordionItem
                            key="1"
                            aria-label="¿Qué pasa con las materias regularizadas sin final?"
                            title={<span className="text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]">¿Qué pasa con las materias regularizadas pero sin examen final?</span>}
                            startContent={<AlertTriangle className="text-[#D97706] shrink-0" size={17} />}
                            className="border border-[#E2E8F0] dark:border-[#2A3540] shadow-none rounded-xl bg-[#F8FAFC] dark:bg-[#1E2730]"
                        >
                            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed pb-2">
                                Según la reglamentación oficial (Res. HCS 89/2025), las materias con cursada regular y final pendiente <strong>no otorgan equivalencia automática directa</strong> en el Plan 17.14. Se recomienda rendir el examen final en el Plan 17.13 para obtener el reconocimiento automático.
                            </p>
                        </AccordionItem>

                        <AccordionItem
                            key="2"
                            aria-label="¿Cómo se solicita formalmente el cambio de plan?"
                            title={<span className="text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]">¿Cómo se solicita formalmente el cambio de plan?</span>}
                            startContent={<BookOpen className="text-[#478559] shrink-0" size={17} />}
                            className="border border-[#E2E8F0] dark:border-[#2A3540] shadow-none rounded-xl bg-[#F8FAFC] dark:bg-[#1E2730]"
                        >
                            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed pb-2">
                                El cambio de plan es voluntario. El trámite se realiza en los períodos habilitados por el Departamento de Alumnos de la UNLu. Este simulador es orientativo y no modifica tu legajo oficial.
                            </p>
                        </AccordionItem>

                        <AccordionItem
                            key="3"
                            aria-label="¿Por qué el Plan 17.14 tiene menos horas totales?"
                            title={<span className="text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]">¿Por qué el Plan 17.14 tiene 202 horas menos de cursada?</span>}
                            startContent={<TrendingDown className="text-[#005A36] dark:text-[#6EE7B7] shrink-0" size={17} />}
                            className="border border-[#E2E8F0] dark:border-[#2A3540] shadow-none rounded-xl bg-[#F8FAFC] dark:bg-[#1E2730]"
                        >
                            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed pb-2">
                                El Plan 17.14 optimiza los contenidos curriculares y actualiza la carga horaria adaptándose a estándares CIN/CONFEDI, logrando una cursada más ágil sin perder calidad académica.
                            </p>
                        </AccordionItem>

                        <AccordionItem
                            key="4"
                            aria-label="¿El cambio de plan es definitivo?"
                            title={<span className="text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]">¿El cambio de plan es definitivo?</span>}
                            startContent={<FileText className="text-[#64748B] shrink-0" size={17} />}
                            className="border border-[#E2E8F0] dark:border-[#2A3540] shadow-none rounded-xl bg-[#F8FAFC] dark:bg-[#1E2730]"
                        >
                            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed pb-2">
                                Sí. Una vez formalizado el pase ante la Universidad, tu historia académica pasa a regirse por el Plan 17.14. Dado que el Plan 17.13 cierra progresivamente sus cohortes hasta 2029, conviene verificar tu viabilidad antes de iniciar el trámite.
                            </p>
                        </AccordionItem>
                    </Accordion>
                </section>
            </div>
        </div>
    );
}

export default TransicionPlan;
