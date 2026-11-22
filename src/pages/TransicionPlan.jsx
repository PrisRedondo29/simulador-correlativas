import { useState, useMemo, useEffect } from 'react';
import {
    Button,
    Progress,
    Chip,
    Accordion,
    AccordionItem,
    Spinner,
} from '@heroui/react';
import {
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
    Clock,
    HelpCircle,
    BookOpen,
    FileText,
    TrendingDown,
    PhoneCall,
} from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import planService from '../services/planService';
import storageRepository, { subscribeStorageChanges } from '../services/storageRepository';
import { usePlanCapabilities } from '../context/PlanContext';
import InteractiveTourOverlay from '../components/Tutorial/InteractiveTourOverlay';
import { TOUR_IDS, TUTORIAL_TOURS } from '../config/tutorialTours';
import {
    OFERTA_RESOLUCION_89_2025,
    obtenerResumenPaso1,
    evaluarElegibilidadActual,
} from '../utils/Transicion/transicionUtils';

function TransicionPlan() {
    const navigate = useNavigate();
    const location = useLocation();
    const { plan, transitionInfo } = usePlanCapabilities();
    const sourcePlan = transitionInfo?.sourcePlan || plan;
    const targetPlan = transitionInfo?.targetPlan || null;
    const resolution = transitionInfo?.resolution || 'Resolución vigente';
    const savedHours = transitionInfo?.savedHours ?? null;
    const closingYear = transitionInfo?.closingYear ?? null;

    const anioActual = useMemo(() => new Date().getFullYear(), []);
    const fromOnboarding = Boolean(location.state?.fromOnboarding);

    const [progreso, setProgreso] = useState(() =>
        sourcePlan ? storageRepository.getProgreso(sourcePlan, {}) : {},
    );
    const [progresoDetalles, setProgresoDetalles] = useState(() =>
        sourcePlan ? storageRepository.getProgresoDetalles(sourcePlan, {}) : {},
    );

    useEffect(() => {
        if (!sourcePlan) return undefined;
        const handleStorage = () => {
            setProgreso(storageRepository.getProgreso(sourcePlan, {}));
            setProgresoDetalles(storageRepository.getProgresoDetalles(sourcePlan, {}));
        };
        handleStorage();
        return subscribeStorageChanges(handleStorage);
    }, [sourcePlan]);

    const [planOrigen, setPlanOrigen] = useState(null);
    const [planDestino, setPlanDestino] = useState(null);
    const [equivalenciasData, setEquivalenciasData] = useState(null);

    useEffect(() => {
        if (!sourcePlan || !targetPlan) return undefined;

        let active = true;
        Promise.all([
            planService.getPlanByNumber(sourcePlan),
            planService.getPlanByNumber(targetPlan),
            planService.getEquivalenciasByPlan(sourcePlan),
        ]).then(([origen, destino, eqMap]) => {
            if (!active) return;
            setPlanOrigen(origen);
            setPlanDestino(destino);
            setEquivalenciasData(eqMap || {});
        });
        return () => {
            active = false;
        };
    }, [sourcePlan, targetPlan]);

    const materiasOrigen = useMemo(() => planOrigen?.materias || [], [planOrigen]);
    const materiasDestino = useMemo(() => planDestino?.materias || [], [planDestino]);

    const resumenPaso1 = useMemo(() => {
        return obtenerResumenPaso1(progreso, materiasOrigen);
    }, [progreso, materiasOrigen]);

    const tieneProgresoCargado =
        resumenPaso1.cantidadAprobadas > 0 || resumenPaso1.cantidadFuera > 0;

    const elegibilidad = useMemo(() => {
        return evaluarElegibilidadActual({
            progreso,
            progresoDetalles,
            materias1713: materiasOrigen,
            materias1714: materiasDestino,
            equivalenciasData: equivalenciasData || {},
            anioActual,
            sourcePlan,
            targetPlan,
        });
    }, [progreso, progresoDetalles, materiasOrigen, materiasDestino, equivalenciasData, anioActual, sourcePlan, targetPlan]);

    const {
        anioEvaluado,
        puedeCambiarseHoy,
        cuatrimestreHabilitado,
        anioHabilitado,
        periodoHabilitado,
        resultadoHoy,
        mensajePrincipal,
        recomendacionCorta,
    } = elegibilidad;

    const diferenciaNominalHoras = resultadoHoy?.diferenciaNominalHoras ?? savedHours;
    const ahorroIndividual = resultadoHoy?.diferenciaHoras ?? 0;

    if (!planOrigen || !planDestino || !equivalenciasData) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F1419] flex items-center justify-center">
                <Spinner color="success" size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F1419] pb-14">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-5">
                <InteractiveTourOverlay
                    tour={TUTORIAL_TOURS[TOUR_IDS.CAMBIO_PLAN]}
                    ready={Boolean(planOrigen && planDestino && equivalenciasData)}
                />

                {/* ─── CABECERA ─── */}
                <header data-tour="cambio-plan-resumen" className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#FEF3C7] dark:bg-[#2D2210] text-[#92400E] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#5C4318]">
                                {resolution}
                            </span>
                            <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                                Plan {sourcePlan} → Plan {targetPlan}
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
                            Simulador de Cambio de Plan
                        </h1>
                        <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                            Verificá si con tus materias aprobadas en{' '}
                            <Link to="/mis-materias" className="font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:underline">
                                Mis Materias
                            </Link>{' '}
                            ya te corresponde pasarte al Plan {targetPlan}.
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
                                onPress={() => navigate('/mis-materias')}
                                className="text-[#005A36] dark:text-[#6EE7B7] text-xs font-semibold h-6 px-2 min-w-0"
                            >
                                Editar
                            </Button>
                        </div>
                    )}
                </header>

                {fromOnboarding && tieneProgresoCargado && (
                    <section
                        role="status"
                        className="bg-[#ECFDF5] dark:bg-[#102A20]/80 border border-[#A7F3D0] dark:border-[#1E4D38] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                        <div className="space-y-0.5 min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-[#005A36] dark:text-[#86EFAC]">
                                ¡Listo! Cargamos tus materias del Plan {sourcePlan}
                            </p>
                            <p className="text-xs text-[#166534] dark:text-[#A7F3D0] text-pretty">
                                Acá ya podés ver si te corresponde pasarte al Plan {targetPlan}. Cuando termines de revisarlo, podés ir a Mis Materias para cargar notas y vencimientos.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            onPress={() => navigate('/mis-materias')}
                            className="min-h-11 sm:min-h-9 bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] text-white font-semibold text-xs px-4 rounded-xl shrink-0"
                            endContent={<ArrowRight size={14} />}
                        >
                            Ir a Mis Materias
                        </Button>
                    </section>
                )}

                {/* ─── BLOQUE PRINCIPAL DE EVALUACIÓN / RESULTADO ─── */}
                <div data-tour="cambio-plan-evaluacion" className="space-y-5">
                    {!tieneProgresoCargado ? (
                    <section className="p-5 sm:p-6 bg-[#FFFBEB] dark:bg-[#2D2210] border border-[#FDE68A] dark:border-[#5C4318] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={20} className="text-[#92400E] dark:text-[#FCD34D] shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <h2 className="font-semibold text-sm sm:text-base text-[#1E293B] dark:text-[#F1F5F9]">
                                    Todavía no cargaste materias del Plan {sourcePlan}
                                </h2>
                                <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#CBD5E1]">
                                    Cargá primero tus materias aprobadas en Mis Materias para poder evaluar si ya te corresponde cambiarte de plan.
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onPress={() => navigate('/mis-materias')}
                            className="bg-[#005A36] hover:bg-[#00472B] text-white font-semibold text-xs px-4 h-10 shrink-0 rounded-xl"
                        >
                            Cargar mis materias
                        </Button>
                    </section>
                ) : (
                    /* ─── RESULTADO DIRECTO: SÍ HOY O EN QUÉ AÑO SÍ ─── */
                    <>
                        <section
                            className={`border rounded-2xl p-5 sm:p-6 transition-colors ${
                                puedeCambiarseHoy
                                    ? 'bg-[#ECFDF5] dark:bg-[#102A20]/80 border-[#A7F3D0] dark:border-[#1E4D38]'
                                    : 'bg-[#FFFBEB] dark:bg-[#2D2210]/70 border-[#FDE68A] dark:border-[#5C4318]'
                            }`}
                        >
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                                <div className="flex items-start gap-4">
                                    <div
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                            puedeCambiarseHoy
                                                ? 'bg-[#478559] text-white'
                                                : 'bg-[#FEF3C7] dark:bg-[#423115] text-[#92400E] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#5C4318]'
                                        }`}
                                    >
                                        {puedeCambiarseHoy ? (
                                            <CheckCircle2 size={24} />
                                        ) : (
                                            <Clock size={24} />
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Chip
                                                size="sm"
                                                color={puedeCambiarseHoy ? 'success' : 'warning'}
                                                variant="flat"
                                                className="font-semibold text-[11px]"
                                            >
                                                {puedeCambiarseHoy
                                                    ? `Corresponde: ${cuatrimestreHabilitado}° Cuatri ${anioEvaluado}`
                                                    : `Disponible: ${cuatrimestreHabilitado}° Cuatri ${anioHabilitado}`}
                                            </Chip>
                                        </div>

                                        <h2 className="text-lg sm:text-xl font-bold text-[#1E293B] dark:text-[#F1F5F9] leading-snug">
                                            {mensajePrincipal}
                                        </h2>

                                        <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed max-w-2xl">
                                            {recomendacionCorta}
                                        </p>
                                    </div>
                                </div>

                                <div className="shrink-0 w-full md:w-auto flex flex-col sm:flex-row gap-2">
                                    <Button
                                        onPress={() =>
                                            navigate('/simulador', {
                                                state: {
                                                    plan: sourcePlan,
                                                    planTransition: {
                                                        enabled: true,
                                                        targetPlan: targetPlan || '17.14',
                                                        anio: puedeCambiarseHoy ? anioEvaluado : anioHabilitado,
                                                        cuatri: String(cuatrimestreHabilitado || 1),
                                                    },
                                                    autoImportFromTransition: true,
                                                },
                                            })
                                        }
                                        className="w-full md:w-auto bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] text-white font-semibold text-xs px-4 h-10 rounded-xl"
                                        endContent={<ArrowRight size={14} />}
                                    >
                                        Simular cambio de plan ({cuatrimestreHabilitado}°C{' '}
                                        {puedeCambiarseHoy ? anioEvaluado : anioHabilitado})
                                    </Button>
                                    <Button
                                        variant="bordered"
                                        onPress={() => navigate('/equivalencias')}
                                        className="w-full md:w-auto border-[#005A36]/40 dark:border-[#6EE7B7]/40 text-[#005A36] dark:text-[#86EFAC] font-semibold text-xs px-4 h-10 rounded-xl"
                                    >
                                        Ver Equivalencias
                                    </Button>
                                </div>
                            </div>
                        </section>

                        {/* ─── DETALLE DE RESPALDO DEL ESTADO ACTUAL ─── */}
                        {resultadoHoy && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#F1F5F9] dark:border-[#2A3540] pb-3">
                                        <h3 className="font-semibold text-sm text-[#1E293B] dark:text-[#F1F5F9]">
                                            Comparativa de Avance
                                        </h3>
                                        {ahorroIndividual > 0 ? (
                                            <Chip size="sm" variant="flat" color="success" className="font-semibold text-xs">
                                                Tu ahorro: -{ahorroIndividual} hs restantes
                                            </Chip>
                                        ) : ahorroIndividual < 0 ? (
                                            <Chip size="sm" variant="flat" color="warning" className="font-semibold text-xs">
                                                +{Math.abs(ahorroIndividual)} hs restantes en {targetPlan}
                                            </Chip>
                                        ) : (
                                            <Chip size="sm" variant="flat" className="font-semibold text-xs">
                                                Misma carga restante
                                            </Chip>
                                        )}
                                    </div>

                                    <div className="space-y-3.5">
                                        <div>
                                            <div className="flex justify-between text-xs font-medium text-[#475569] dark:text-[#CBD5E1] mb-1 tabular-nums">
                                                <span>Plan {sourcePlan} (actual)</span>
                                                <span className="font-semibold">
                                                    {resultadoHoy.avance1713.porcentaje}% ({resultadoHoy.avance1713.aprobadas}/{resultadoHoy.avance1713.totales}) · {resultadoHoy.avance1713.horasRestantes} hs rest.
                                                </span>
                                            </div>
                                            <Progress
                                                aria-label={`Avance plan ${sourcePlan}`}
                                                value={resultadoHoy.avance1713.porcentaje}
                                                size="sm"
                                                classNames={{
                                                    track: 'bg-[#E2E8F0] dark:bg-[#2A3540]',
                                                    indicator: 'bg-[#64748B] dark:bg-[#94A3B8]',
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-xs font-medium text-[#005A36] dark:text-[#86EFAC] mb-1 tabular-nums">
                                                <span>Plan {targetPlan} (por equivalencias)</span>
                                                <span className="font-semibold">
                                                    {resultadoHoy.avance1714.porcentaje}% ({resultadoHoy.avance1714.aprobadas}/{resultadoHoy.avance1714.totales}) · {resultadoHoy.avance1714.horasRestantes} hs rest.
                                                </span>
                                            </div>
                                            <Progress
                                                aria-label={`Avance plan ${targetPlan}`}
                                                value={resultadoHoy.avance1714.porcentaje}
                                                size="sm"
                                                classNames={{
                                                    track: 'bg-[#E2E8F0] dark:bg-[#2A3540]',
                                                    indicator: 'bg-[#478559] dark:bg-[#4A9D68]',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-3 bg-[#F8FAFC] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540] rounded-xl text-xs text-[#475569] dark:text-[#CBD5E1] space-y-1">
                                        <p>
                                            Se reconocen automáticamente{' '}
                                            <strong className="text-[#1E293B] dark:text-[#F1F5F9]">
                                                {resultadoHoy.equivalenciasReconocidasCount} equivalencias directas
                                            </strong>{' '}
                                            sin trámites adicionales.
                                        </p>
                                        {diferenciaNominalHoras > 0 && (
                                            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                                Diferencia nominal entre planes completos: <strong>{diferenciaNominalHoras} hs</strong> ({resultadoHoy.avance1713.horasTotales} hs vs. {resultadoHoy.avance1714.horasTotales} hs). Tu ahorro individual real se calcula sobre tus horas restantes.
                                            </p>
                                        )}
                                    </div>

                                    {resultadoHoy.equivalenciasPorConfirmar?.length > 0 && (
                                        <div
                                            role="status"
                                            className="p-3 bg-[#FFFBEB] dark:bg-[#2D2210]/70 border border-[#FDE68A] dark:border-[#5C4318] rounded-xl text-xs text-[#92400E] dark:text-[#FCD34D] space-y-2"
                                        >
                                            <div className="flex items-start gap-2 font-semibold">
                                                <AlertTriangle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
                                                <span>
                                                    Posibles equivalencias por confirmar con UNLu (no sumadas automáticamente)
                                                </span>
                                            </div>
                                            <ul className="space-y-1 pl-5 list-disc">
                                                {resultadoHoy.equivalenciasPorConfirmar.map((item) => (
                                                    <li key={item.targetCode}>
                                                        <strong>
                                                            {item.targetCode} · {item.targetName || item.materia?.nombre}
                                                        </strong>{' '}
                                                        — {item.message}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between border-b border-[#F1F5F9] dark:border-[#2A3540] pb-3 gap-2">
                                            <h3 className="font-semibold text-sm text-[#1E293B] dark:text-[#F1F5F9]">
                                                {puedeCambiarseHoy
                                                    ? `Materias habilitadas (${periodoHabilitado})`
                                                    : `Por qué esperar hasta el ${periodoHabilitado}`}
                                            </h3>
                                            <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                                                {OFERTA_RESOLUCION_89_2025[anioEvaluado]?.plan1714?.descripcion}
                                            </span>
                                        </div>

                                        {puedeCambiarseHoy ? (
                                            <div>
                                                <p className="text-xs text-[#166534] dark:text-[#86EFAC] font-semibold mb-2">
                                                    Podés cursar de inmediato en Plan {targetPlan}:
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {resultadoHoy.avance1714.materiasCursables.map((m) => (
                                                        <Chip key={m.codigo} size="sm" variant="flat" color="success" className="font-medium text-xs">
                                                            {m.codigo} · {m.nombre}
                                                        </Chip>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <ul className="space-y-1.5 text-xs text-[#475569] dark:text-[#CBD5E1]">
                                                {resultadoHoy.motivosBache.slice(0, 2).map((motivo, idx) => (
                                                    <li key={idx} className="flex items-start gap-1.5">
                                                        <span className="text-[#D97706] font-bold">•</span>
                                                        <span>{motivo}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {!puedeCambiarseHoy && (
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
                        )}
                    </>
                )}
                </div>

                {/* ─── PREGUNTAS FRECUENTES ─── */}
                <section data-tour="cambio-plan-faq" className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] flex items-center justify-center shrink-0">
                            <HelpCircle size={18} />
                        </div>
                        <div>
                            <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                                {resolution}
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
                                Según el régimen oficial de equivalencias (Res. HCS 260/24 Anexo VI y Res. HCS 836/24) y el {resolution}, las materias con cursada regular y final pendiente <strong>no otorgan equivalencia automática directa</strong> en el Plan {targetPlan}. Se recomienda rendir el examen final en el Plan {sourcePlan} para obtener el reconocimiento automático.
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

                        {diferenciaNominalHoras > 0 && (
                            <AccordionItem
                                key="3"
                                aria-label={`¿Por qué el Plan ${targetPlan} tiene menos horas totales?`}
                                title={<span className="text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]">¿Por qué el Plan {targetPlan} tiene {diferenciaNominalHoras} horas nominales menos que el Plan {sourcePlan}?</span>}
                                startContent={<TrendingDown className="text-[#005A36] dark:text-[#6EE7B7] shrink-0" size={17} />}
                                className="border border-[#E2E8F0] dark:border-[#2A3540] shadow-none rounded-xl bg-[#F8FAFC] dark:bg-[#1E2730]"
                            >
                                <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed pb-2">
                                    Esas {diferenciaNominalHoras} horas corresponden a la diferencia nominal entre los planes completos (Res. HCS 260/24). Tu ahorro individual real depende de qué materias ya tengas aprobadas y sus equivalencias al momento del pase.
                                </p>
                            </AccordionItem>
                        )}

                        <AccordionItem
                            key="4"
                            aria-label="¿El cambio de plan es definitivo?"
                            title={<span className="text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]">¿El cambio de plan es definitivo?</span>}
                            startContent={<FileText className="text-[#64748B] shrink-0" size={17} />}
                            className="border border-[#E2E8F0] dark:border-[#2A3540] shadow-none rounded-xl bg-[#F8FAFC] dark:bg-[#1E2730]"
                        >
                            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed pb-2">
                                Sí. Una vez formalizado el pase ante la Universidad, tu historia académica pasa a regirse por el Plan {targetPlan}.
                                {closingYear ? ` Dado que el Plan ${sourcePlan} cierra progresivamente sus cohortes hasta ${closingYear}, conviene verificar tu viabilidad antes de iniciar el trámite.` : ''}
                            </p>
                        </AccordionItem>
                    </Accordion>
                </section>
            </div>
        </div>
    );
}

export default TransicionPlan;
