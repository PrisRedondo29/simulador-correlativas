import { useState } from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, ArrowRight, ChevronDown, GraduationCap } from 'lucide-react';

/**
 * Paso 1 del Onboarding inicial:
 *  - Para 1 carrera con par vigente/anterior (ej. UNLu LSI 17.14 / 17.13), guía por cohorte de ingreso.
 *  - Si hay 2+ carreras activas en catálogo, antepone automáticamente el selector de carrera.
 *  - Si el usuario ya tenía datos previos, muestra un aviso exclusivo de sobrescritura con acceso a "Omitir".
 */
export default function OnboardingPlanStep({
    availableCareers = [],
    catalogCareers = [],
    initialPlan = null,
    hasExistingData = false,
    onSelectPlan,
    onSkip,
}) {
    const initialCareer =
        availableCareers.find((c) => c.plans?.some((p) => p.planNumero === initialPlan)) ||
        availableCareers[0] ||
        null;

    const [selectedCareerId, setSelectedCareerId] = useState(initialCareer?.id || null);
    const [showLegacyChoice, setShowLegacyChoice] = useState(false);

    const activeCareer =
        availableCareers.find((c) => c.id === selectedCareerId) || availableCareers[0] || null;
    const plans = activeCareer?.plans || [];

    const defaultPlan = plans.find((p) => p.isDefault) || plans[0] || null;
    const transitionPlan = plans.find((p) => p.features?.planTransition) || null;
    const useCohortShortcut =
        availableCareers.length === 1 &&
        Boolean(defaultPlan) &&
        Boolean(transitionPlan) &&
        defaultPlan.planNumero !== transitionPlan.planNumero;

    return (
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
            {hasExistingData && (
                <div
                    role="status"
                    className="p-4 rounded-2xl bg-[#FFFBEB] dark:bg-[#2D2210] border border-[#FDE68A] dark:border-[#5C4318] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                    <div className="flex items-start gap-3 min-w-0">
                        <AlertTriangle
                            className="w-5 h-5 text-[#92400E] dark:text-[#FCD34D] shrink-0 mt-0.5"
                            aria-hidden="true"
                        />
                        <div className="space-y-1 min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-[#92400E] dark:text-[#FCD34D]">
                                Ya tenés materias guardadas en este dispositivo
                            </p>
                            <p className="text-xs text-[#78350F] dark:text-[#FDE68A]/90 leading-relaxed text-pretty">
                                Si completás esta nueva carga rápida, se reemplazará tu registro anterior del plan seleccionado. Si querés conservar todo como estaba, podés omitir este asistente.
                            </p>
                        </div>
                    </div>
                    {onSkip && (
                        <button
                            type="button"
                            onClick={onSkip}
                            className="min-h-11 px-4 rounded-xl bg-white dark:bg-[#161D24] border border-[#FDE68A] dark:border-[#5C4318] text-xs font-semibold text-[#92400E] dark:text-[#FCD34D] hover:bg-[#FEF3C7]/60 transition-colors cursor-pointer shrink-0 self-start sm:self-center"
                        >
                            Omitir y conservar mis datos
                        </button>
                    )}
                </div>
            )}

            <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] dark:bg-[#102A20] border border-[#A7F3D0] dark:border-[#1E4D38] text-[#005A36] dark:text-[#86EFAC] flex items-center justify-center mx-auto">
                    <GraduationCap className="w-6 h-6" aria-hidden="true" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E293B] dark:text-[#F1F5F9] text-balance">
                    {useCohortShortcut
                        ? '¿En qué año ingresaste a la carrera?'
                        : 'Elegí tu carrera y plan de estudios'}
                </h1>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-lg mx-auto leading-relaxed text-pretty">
                    {useCohortShortcut
                        ? `${activeCareer.name}: te ubicamos en el plan correcto para que puedas marcar tus materias en menos de un minuto.`
                        : 'Seleccioná tu carrera y plan de estudios para configurar tus correlativas.'}
                </p>
            </div>

            {useCohortShortcut ? (
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={() => onSelectPlan(defaultPlan.planNumero)}
                        className="w-full min-h-[76px] p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] hover:border-[#005A36] dark:hover:border-[#4A9D68] shadow-2xs transition-colors flex items-center justify-between gap-3 text-left cursor-pointer group"
                    >
                        <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm sm:text-base font-bold text-[#1E293B] dark:text-[#F1F5F9] group-hover:text-[#005A36] dark:group-hover:text-[#6EE7B7]">
                                    Ingresé en 2024 o después
                                </span>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38]">
                                    Plan {defaultPlan.planNumero} · Vigente
                                </span>
                            </div>
                            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed text-pretty">
                                Corresponde directamente al plan actual (también si ingresaste antes pero ya te pasaste al {defaultPlan.planNumero}).
                            </p>
                        </div>
                        <ArrowRight
                            className="w-5 h-5 text-[#64748B] group-hover:text-[#005A36] dark:group-hover:text-[#6EE7B7] shrink-0 transition-transform group-hover:translate-x-0.5"
                            aria-hidden="true"
                        />
                    </button>

                    <div className="rounded-2xl bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] overflow-hidden">
                        <button
                            type="button"
                            aria-expanded={showLegacyChoice}
                            onClick={() => setShowLegacyChoice((prev) => !prev)}
                            className="w-full min-h-[76px] p-4 sm:p-5 hover:bg-[#F8FAFC] dark:hover:bg-[#1E2730]/60 transition-colors flex items-center justify-between gap-3 text-left cursor-pointer"
                        >
                            <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm sm:text-base font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                                        Ingresé en 2023 o antes
                                    </span>
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#F1F5F9] dark:bg-[#1E2730] text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#2A3540]">
                                        Plan {transitionPlan.planNumero} o {defaultPlan.planNumero}
                                    </span>
                                </div>
                                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed text-pretty">
                                    Elegí si seguís cursando con el plan anterior o si ya tramitaste el cambio al nuevo.
                                </p>
                            </div>
                            <ChevronDown
                                className={`w-5 h-5 text-[#64748B] shrink-0 transition-transform duration-200 ${
                                    showLegacyChoice ? 'rotate-180' : ''
                                }`}
                                aria-hidden="true"
                            />
                        </button>

                        {showLegacyChoice && (
                            <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-[#F1F5F9] dark:border-[#2A3540] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => onSelectPlan(transitionPlan.planNumero)}
                                    className="min-h-11 p-3.5 rounded-xl bg-[#FFFBEB] dark:bg-[#2D2210]/80 border border-[#FDE68A] dark:border-[#5C4318] hover:border-[#D97706] text-left transition-colors cursor-pointer space-y-1"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-bold text-[#92400E] dark:text-[#FCD34D]">
                                            Sigo en Plan {transitionPlan.planNumero}
                                        </span>
                                        <ArrowRight className="w-4 h-4 text-[#92400E] dark:text-[#FCD34D] shrink-0" aria-hidden="true" />
                                    </div>
                                    <p className="text-[11px] text-[#78350F] dark:text-[#FDE68A]/90 leading-snug text-pretty">
                                        Al cargar tus materias podrás comprobar al instante si ya te corresponde pasar al {defaultPlan.planNumero}.
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => onSelectPlan(defaultPlan.planNumero)}
                                    className="min-h-11 p-3.5 rounded-xl bg-[#ECFDF5] dark:bg-[#102A20]/80 border border-[#A7F3D0] dark:border-[#1E4D38] hover:border-[#005A36] text-left transition-colors cursor-pointer space-y-1"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-bold text-[#005A36] dark:text-[#86EFAC]">
                                            Ya me pasé al {defaultPlan.planNumero}
                                        </span>
                                        <ArrowRight className="w-4 h-4 text-[#005A36] dark:text-[#86EFAC] shrink-0" aria-hidden="true" />
                                    </div>
                                    <p className="text-[11px] text-[#166534] dark:text-[#A7F3D0]/90 leading-snug text-pretty">
                                        Cargá directamente tus materias aprobadas y regulares del plan vigente.
                                    </p>
                                </button>
                            </div>
                        )}
                    </div>

                    <details className="rounded-xl bg-[#F1F5F9]/70 dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] px-4 py-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
                        <summary className="font-semibold text-[#334155] dark:text-[#CBD5E1] cursor-pointer list-none flex items-center justify-between gap-2">
                            <span>¿No estás seguro en qué plan estás?</span>
                            <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
                        </summary>
                        <p className="mt-2 leading-relaxed text-pretty">
                            Si te inscribiste en {activeCareer.name} a partir de 2024 te corresponde automáticamente el <strong>Plan {defaultPlan.planNumero}</strong>. Si ingresaste antes, en tu historial académico del SIU figuran tus materias bajo <strong>{transitionPlan.planNumero}</strong> o <strong>{defaultPlan.planNumero}</strong>. Siempre podés cambiar de plan después en Configuración.
                        </p>
                    </details>
                </div>
            ) : (
                <div className="space-y-4">
                    {catalogCareers.length > 1 && (
                        <div className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                                1. Elegí tu carrera
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {catalogCareers.map((career) => {
                                    const isAvailable =
                                        career.available &&
                                        Array.isArray(career.plans) &&
                                        career.plans.length > 0;
                                    const isSelected = career.id === activeCareer?.id;
                                    return (
                                        <button
                                            key={career.id}
                                            type="button"
                                            disabled={!isAvailable}
                                            onClick={() => {
                                                if (isAvailable) setSelectedCareerId(career.id);
                                            }}
                                            className={`min-h-11 sm:min-h-9 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 ${
                                                isSelected
                                                    ? 'border-[#005A36] dark:border-[#4A9D68] bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] cursor-pointer'
                                                    : isAvailable
                                                        ? 'border-[#E2E8F0] dark:border-[#2A3540] bg-white dark:bg-[#161D24] text-[#475569] dark:text-[#CBD5E1] cursor-pointer'
                                                        : 'border-[#E2E8F0] dark:border-[#2A3540] bg-[#F8FAFC]/60 dark:bg-[#1E2730]/40 text-[#94A3B8] cursor-not-allowed'
                                            }`}
                                        >
                                            <span>{career.name}</span>
                                            {!isAvailable && (
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#E2E8F0]/70 dark:bg-[#24303C]">
                                                    Próximamente
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {catalogCareers.length > 1 && (
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                                2. Elegí tu plan de estudios
                            </p>
                        )}
                        <div className={`grid grid-cols-1 ${plans.length > 1 ? 'sm:grid-cols-2' : ''} gap-3`}>
                            {plans.map((planItem) => (
                                <button
                                    key={planItem.planNumero}
                                    type="button"
                                    onClick={() => onSelectPlan(planItem.planNumero)}
                                    className="min-h-[72px] p-4 rounded-2xl bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] hover:border-[#005A36] dark:hover:border-[#4A9D68] text-left transition-colors flex flex-col justify-between gap-2 cursor-pointer"
                                >
                                    <div className="flex items-center justify-between gap-2 w-full">
                                        <span className="text-base font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                                            {planItem.label || `Plan ${planItem.planNumero}`}
                                        </span>
                                        {planItem.statusLabel && (
                                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC]">
                                                {planItem.statusLabel}
                                            </span>
                                        )}
                                    </div>
                                    {(planItem.shortTitle || planItem.description) && (
                                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-snug text-pretty">
                                            {planItem.description || planItem.shortTitle}
                                        </p>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

OnboardingPlanStep.propTypes = {
    availableCareers: PropTypes.array,
    catalogCareers: PropTypes.array,
    initialPlan: PropTypes.string,
    hasExistingData: PropTypes.bool,
    onSelectPlan: PropTypes.func.isRequired,
    onSkip: PropTypes.func,
};
