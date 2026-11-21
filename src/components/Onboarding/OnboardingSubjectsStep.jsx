import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
    ArrowLeft,
    ArrowRight,
    CheckCheck,
    ChevronDown,
    Lock,
    Redo2,
    Search,
    Sparkles,
    Undo2,
    X,
} from 'lucide-react';
import useOnboardingChecklist, { buildInitialProgreso } from './useOnboardingChecklist';
import { ESTADOS_MATERIA } from '../../utils/Progreso/materiaStateMachine';

const QUICK_OPTIONS = [
    {
        state: ESTADOS_MATERIA.CURSANDO,
        label: 'Cursando',
        activeClass:
            'bg-[#0284C7] text-white border-[#0284C7] dark:bg-[#0369A1] dark:border-[#0369A1]',
    },
    {
        state: ESTADOS_MATERIA.REGULAR,
        label: 'Regular',
        activeClass:
            'bg-[#D97706] text-white border-[#D97706] dark:bg-[#B45309] dark:border-[#B45309]',
    },
    {
        state: ESTADOS_MATERIA.APROBADO,
        label: 'Aprobada',
        activeClass:
            'bg-[#005A36] text-white border-[#005A36] dark:bg-[#2E8B63] dark:border-[#2E8B63]',
    },
];

function buildYearGroups(materias = []) {
    const anios = [...new Set(materias.filter((m) => !m.taller).map((m) => Number(m.anio)))]
        .filter((n) => !Number.isNaN(n))
        .sort((a, b) => a - b);

    const groups = anios
        .map((anio) => ({
            key: String(anio),
            label: `${anio}° Año`,
            materias: materias.filter((m) => !m.taller && Number(m.anio) === anio),
        }))
        .filter((g) => g.materias.length > 0);

    const talleres = materias.filter((m) => m.taller === true);
    if (talleres.length > 0) {
        groups.push({
            key: 'talleres',
            label: 'Talleres',
            materias: talleres,
        });
    }

    return groups;
}

function SubjectChecklistRow({ materia, estado, onToggle }) {
    const isLockedTesis = Boolean(materia.tesis) && estado === ESTADOS_MATERIA.BLOQUEADO;

    return (
        <div className="p-3 rounded-xl bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C] space-y-2.5 min-w-0">
            <div className="flex items-start justify-between gap-2 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] leading-snug break-words min-w-0">
                    {materia.nombre}
                </p>
                <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F1F5F9] dark:bg-[#1E2730] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                    {materia.taller
                        ? 'Taller'
                        : Number(materia.cuatrimestre) % 2 === 0
                          ? '2° Cuatri'
                          : '1° Cuatri'}
                </span>
            </div>

            {isLockedTesis ? (
                <p className="inline-flex items-center gap-1.5 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Se habilita al completar las materias previas del plan.
                </p>
            ) : (
                <div
                    role="group"
                    aria-label={`Estado de ${materia.nombre}`}
                    className="grid grid-cols-3 gap-1.5"
                >
                    {QUICK_OPTIONS.map((opt) => {
                        const isActive =
                            estado === opt.state ||
                            (opt.state === ESTADOS_MATERIA.APROBADO &&
                                estado === ESTADOS_MATERIA.PROMOCIONADO);

                        return (
                            <button
                                key={opt.state}
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => onToggle(materia.codigo, opt.state)}
                                className={`min-h-11 sm:min-h-9 px-2 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer text-center ${
                                    isActive
                                        ? opt.activeClass
                                        : 'bg-[#F8FAFC] dark:bg-[#11171D] border-[#E2E8F0] dark:border-[#24303C] text-[#475569] dark:text-[#CBD5E1] hover:border-[#94A3B8] dark:hover:border-[#475569]'
                                }`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

SubjectChecklistRow.propTypes = {
    materia: PropTypes.object.isRequired,
    estado: PropTypes.string,
    onToggle: PropTypes.func.isRequired,
};

/**
 * Paso 2 Mobile-First del Onboarding:
 * Carga rápida en una sola pasada por materia con auto-completado de correlativas,
 * botones táctiles >=44px para móvil y pila Deshacer/Rehacer (Ctrl+Z / Ctrl+Y).
 */
export default function OnboardingSubjectsStep({
    plan,
    careerName,
    materias = [],
    supportsTransition = false,
    onBack,
    onComplete,
}) {
    const {
        progreso,
        counts,
        canUndo,
        canRedo,
        lastFeedback,
        toggleSubjectState,
        aprobarAnioCompleto,
        undo,
        redo,
    } = useOnboardingChecklist(materias);

    const yearGroups = useMemo(() => buildYearGroups(materias), [materias]);
    const [expandedKeys, setExpandedKeys] = useState(() =>
        yearGroups.length > 0 ? [yearGroups[0].key] : [],
    );
    const [searchQuery, setSearchQuery] = useState('');

    const toggleGroup = (key) => {
        setExpandedKeys((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
        );
    };

    const filteredMaterias = useMemo(() => {
        const q = searchQuery
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
        if (!q) return [];

        return materias.filter((m) => {
            const name = String(m.nombre || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();
            const code = String(m.codigo || '').toLowerCase();
            return name.includes(q) || code.includes(q);
        });
    }, [materias, searchQuery]);

    const isSearching = searchQuery.trim().length > 0;

    const handleFreshmanSkip = () => {
        onComplete(buildInitialProgreso(materias), {
            aprobadas: 0,
            regulares: 0,
            cursando: 0,
            totalMarcadas: 0,
        });
    };

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto scroll-pb-36">
                <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38]">
                                    Plan {plan}
                                </span>
                                {careerName && (
                                    <span className="text-xs text-[#64748B] dark:text-[#94A3B8] truncate">
                                        {careerName}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E293B] dark:text-[#F1F5F9] text-balance">
                                Marcá tus materias en una sola pasada
                            </h1>
                            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] text-pretty">
                                Tocá el estado actual de cada materia (volvé a tocar para desmarcar). Si marcás una avanzada, completamos sus correlativas previas automáticamente.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleFreshmanSkip}
                            className="min-h-11 px-3.5 py-2 rounded-xl bg-[#ECFDF5] dark:bg-[#102A20] border border-[#A7F3D0] dark:border-[#1E4D38] text-xs font-semibold text-[#005A36] dark:text-[#86EFAC] hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                        >
                            <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>Soy ingresante (0 materias)</span>
                        </button>
                    </div>

                    {/* Barra de búsqueda + Deshacer / Rehacer */}
                    <div className="sticky top-0 z-10 bg-[#F8FAFC]/95 dark:bg-[#0F1419]/95 py-2 -mx-1 px-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative flex-1 min-w-[180px]">
                                <label htmlFor="onboarding-subject-search" className="sr-only">
                                    Buscar materia por nombre o código
                                </label>
                                <Search
                                    className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                    aria-hidden="true"
                                />
                                <input
                                    id="onboarding-subject-search"
                                    type="search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar materia..."
                                    className="w-full min-h-11 sm:min-h-9 pl-9 pr-9 rounded-xl bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder:text-[#64748B]"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        aria-label="Limpiar búsqueda"
                                        onClick={() => setSearchQuery('')}
                                        className="min-w-8 min-h-8 flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#F1F5F9] cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    type="button"
                                    aria-label="Deshacer último cambio"
                                    title="Deshacer (Ctrl+Z)"
                                    disabled={!canUndo}
                                    onClick={undo}
                                    className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 px-2.5 rounded-xl bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-xs font-semibold text-[#334155] dark:text-[#E2E8F0] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-1.5"
                                >
                                    <Undo2 className="w-4 h-4" aria-hidden="true" />
                                    <span className="hidden sm:inline">Deshacer</span>
                                </button>
                                <button
                                    type="button"
                                    aria-label="Rehacer cambio"
                                    title="Rehacer (Ctrl+Y)"
                                    disabled={!canRedo}
                                    onClick={redo}
                                    className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 px-2.5 rounded-xl bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-xs font-semibold text-[#334155] dark:text-[#E2E8F0] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-1.5"
                                >
                                    <Redo2 className="w-4 h-4" aria-hidden="true" />
                                    <span className="hidden sm:inline">Rehacer</span>
                                </button>
                            </div>
                        </div>

                        <div aria-live="polite" className="min-h-0">
                            {lastFeedback && (
                                <div className="px-3 py-2 rounded-xl bg-[#ECFDF5] dark:bg-[#102A20] border border-[#A7F3D0] dark:border-[#1E4D38] text-xs text-[#166534] dark:text-[#86EFAC] flex items-center justify-between gap-2">
                                    <span>{lastFeedback.text}</span>
                                    {canUndo &&
                                        (lastFeedback.type === 'cascade' ||
                                            lastFeedback.type === 'bulk') && (
                                            <button
                                                type="button"
                                                onClick={undo}
                                                className="font-bold underline shrink-0 cursor-pointer"
                                            >
                                                Deshacer
                                            </button>
                                        )}
                                </div>
                            )}
                        </div>
                    </div>

                    {isSearching ? (
                        <div className="space-y-2.5">
                            {filteredMaterias.length === 0 ? (
                                <p className="text-center py-8 text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                                    No encontramos materias que coincidan con “{searchQuery}”.
                                </p>
                            ) : (
                                filteredMaterias.map((m) => (
                                    <SubjectChecklistRow
                                        key={m.codigo}
                                        materia={m}
                                        estado={progreso[m.codigo]}
                                        onToggle={toggleSubjectState}
                                    />
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {yearGroups.map((group) => {
                                const isExpanded = expandedKeys.includes(group.key);
                                const markedInGroup = group.materias.filter((m) =>
                                    ['Cursando', 'Regular', 'Aprobado', 'Promocionado'].includes(
                                        progreso[m.codigo],
                                    ),
                                ).length;
                                const codigosNoTesis = group.materias
                                    .filter((m) => !m.tesis)
                                    .map((m) => m.codigo);

                                return (
                                    <section
                                        key={group.key}
                                        className="rounded-2xl bg-[#F1F5F9]/70 dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] overflow-hidden"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-white dark:bg-[#161D24] border-b border-[#E2E8F0] dark:border-[#24303C]">
                                            <button
                                                type="button"
                                                aria-expanded={isExpanded}
                                                aria-controls={`onboarding-group-${group.key}`}
                                                onClick={() => toggleGroup(group.key)}
                                                className="flex items-center gap-2 min-h-11 sm:min-h-9 flex-1 min-w-0 text-left cursor-pointer"
                                            >
                                                <ChevronDown
                                                    className={`w-4 h-4 text-[#64748B] shrink-0 transition-transform duration-200 ${
                                                        isExpanded ? 'rotate-180' : ''
                                                    }`}
                                                    aria-hidden="true"
                                                />
                                                <span className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                                                    {group.label}
                                                </span>
                                                <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                                                    ({markedInGroup}/{group.materias.length})
                                                </span>
                                            </button>

                                            {codigosNoTesis.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        aprobarAnioCompleto(
                                                            codigosNoTesis,
                                                            group.label,
                                                        )
                                                    }
                                                    className="min-h-11 sm:min-h-9 px-3 rounded-xl bg-[#ECFDF5] dark:bg-[#102A20] border border-[#A7F3D0] dark:border-[#1E4D38] text-xs font-semibold text-[#005A36] dark:text-[#86EFAC] hover:opacity-90 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                                                >
                                                    <CheckCheck
                                                        className="w-3.5 h-3.5 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Aprobar todo {group.label}</span>
                                                </button>
                                            )}
                                        </div>

                                        {isExpanded && (
                                            <div
                                                id={`onboarding-group-${group.key}`}
                                                className="p-2.5 sm:p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                                            >
                                                {group.materias.map((m) => (
                                                    <SubjectChecklistRow
                                                        key={m.codigo}
                                                        materia={m}
                                                        estado={progreso[m.codigo]}
                                                        onToggle={toggleSubjectState}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Pie sticky con safe-area insets */}
            <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-[#161D24]/95 border-t border-[#E2E8F0] dark:border-[#2A3540] px-3 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
                <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="min-w-0 space-y-0.5">
                        <p className="text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                            {counts.aprobadas} aprobadas · {counts.regulares} regulares ·{' '}
                            {counts.cursando} cursando
                        </p>
                        <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                            Después podés cargar notas y vencimientos en detalle desde Mis Materias.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={onBack}
                            className="min-h-11 px-3.5 rounded-xl bg-[#F1F5F9] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540] text-xs font-semibold text-[#334155] dark:text-[#E2E8F0] inline-flex items-center gap-1.5 cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>Volver</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => onComplete(progreso, counts)}
                            className="flex-1 sm:flex-initial min-h-11 px-4 rounded-xl bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] dark:hover:bg-[#246B4E] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span>
                                {supportsTransition && counts.totalMarcadas > 0
                                    ? 'Ver si me corresponde cambio de plan'
                                    : 'Finalizar y ver Mis Materias'}
                            </span>
                            <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

OnboardingSubjectsStep.propTypes = {
    plan: PropTypes.string.isRequired,
    careerName: PropTypes.string,
    materias: PropTypes.array.isRequired,
    supportsTransition: PropTypes.bool,
    onBack: PropTypes.func.isRequired,
    onComplete: PropTypes.func.isRequired,
};
