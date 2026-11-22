import React from 'react';
import { Switch } from '@heroui/react';
import { ArrowRightLeft, CheckCircle2, Info } from 'lucide-react';

/**
 * Genera opciones de período (Cuatrimestre + Año) para programar el cambio de plan 17.13 -> 17.14.
 * @param {number} minYear
 * @param {{ anio: number, cuatri: string } | null | undefined} suggestedPeriod
 * @param {{ anio: number | string, cuatri: string } | null | undefined} currentValue
 */
function buildTransitionOptions(minYear = 2026, suggestedPeriod = null, currentValue = null) {
    const startYear = Math.max(2025, Math.min(Number(minYear) || 2026, 2029));
    /** @type {Array<{ key: string, anio: number, cuatri: string, label: string }>} */
    const options = [];
    const seen = new Set();

    const addOption = (anio, cuatri) => {
        const key = `${anio}-${cuatri}`;
        if (seen.has(key)) return;
        seen.add(key);
        const isSuggested =
            suggestedPeriod &&
            Number(suggestedPeriod.anio) === Number(anio) &&
            String(suggestedPeriod.cuatri) === String(cuatri);
        options.push({
            key,
            anio: Number(anio),
            cuatri: String(cuatri),
            label: `${cuatri}° Cuatri ${anio}${isSuggested ? ' (Sugerido)' : ''}`,
        });
    };

    if (currentValue?.anio && currentValue?.cuatri) {
        addOption(Number(currentValue.anio), String(currentValue.cuatri));
    }

    for (let y = startYear; y <= 2029; y++) {
        ['1', '2'].forEach((c) => addOption(y, c));
    }

    return options.sort((a, b) => a.anio - b.anio || Number(a.cuatri) - Number(b.cuatri));
}

/**
 * Selector compacto del hito de Cambio de Plan (17.13 -> 17.14) para el Simulador de Avance.
 */
export default function PlanTransitionControl({
    basePlan,
    activePlan,
    anioActual,
    planTransition,
    onChangePlanTransition,
    suggestedPeriod = null,
    transitionAppliedInfo = null,
    oferta1713Note = null,
    compact = false,
}) {
    if (basePlan !== '17.13') return null;

    const options = buildTransitionOptions(
        Math.min(Number(anioActual) || 2026, 2026),
        suggestedPeriod,
        planTransition,
    );
    const selectedKey = `${planTransition?.anio || suggestedPeriod?.anio || 2027}-${
        planTransition?.cuatri || suggestedPeriod?.cuatri || '1'
    }`;

    if (activePlan === '17.14' && transitionAppliedInfo) {
        return (
            <div className="rounded-xl border border-[#A7F3D0] dark:border-[#1E4D38] bg-[#ECFDF5] dark:bg-[#102A20]/80 p-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#005A36] dark:text-[#86EFAC]">
                    <CheckCircle2 size={14} className="shrink-0" aria-hidden="true" />
                    <span>
                        Pase aplicado: Plan {transitionAppliedInfo.fromPlan} → {transitionAppliedInfo.toPlan}
                    </span>
                </div>
                <p className="text-[11px] text-[#166534] dark:text-[#A7F3D0] leading-snug">
                    Desde {transitionAppliedInfo.cuatri}°C {transitionAppliedInfo.anio} ·{' '}
                    {transitionAppliedInfo.equivalenciasCount} materias homologadas. Usá{' '}
                    <strong>Anterior</strong> para retroceder al Plan 17.13.
                </p>
            </div>
        );
    }

    return (
        <div
            className={`rounded-xl border border-[#E2E8F0] dark:border-[#2A3540] bg-[#F8FAFC] dark:bg-[#0F1419] ${
                compact ? 'p-2.5' : 'p-3 space-y-2'
            }`}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                    <ArrowRightLeft
                        size={13}
                        className="text-[#005A36] dark:text-[#6EE7B7] shrink-0"
                        aria-hidden="true"
                    />
                    Simular pase al Plan 17.14
                </span>
                <Switch
                    size="sm"
                    isSelected={Boolean(planTransition?.enabled)}
                    onValueChange={(enabled) =>
                        onChangePlanTransition?.({
                            ...(planTransition || {
                                targetPlan: '17.14',
                                anio: suggestedPeriod?.anio || 2027,
                                cuatri: suggestedPeriod?.cuatri || '1',
                            }),
                            enabled,
                        })
                    }
                    aria-label="Activar simulación de cambio al Plan 17.14"
                    classNames={{
                        wrapper:
                            'group-data-[selected=true]:bg-[#005A36] dark:group-data-[selected=true]:bg-[#2E8B63]',
                    }}
                />
            </div>

            {planTransition?.enabled && (
                <div className={compact ? 'mt-2 flex flex-col sm:flex-row sm:items-center gap-2' : 'space-y-2'}>
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor={compact ? 'transition-period-compact' : 'transition-period-panel'}
                            className="text-[11px] text-[#64748B] dark:text-[#94A3B8] shrink-0"
                        >
                            En:
                        </label>
                        <select
                            id={compact ? 'transition-period-compact' : 'transition-period-panel'}
                            aria-label="Cuatrimestre de cambio al Plan 17.14"
                            value={selectedKey}
                            onChange={(e) => {
                                const [nextAnio, nextCuatri] = e.target.value.split('-');
                                onChangePlanTransition?.({
                                    ...planTransition,
                                    enabled: true,
                                    anio: Number(nextAnio),
                                    cuatri: String(nextCuatri),
                                });
                            }}
                            className="w-full h-8 px-2 rounded-lg border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#161D24] text-xs font-medium text-[#1E293B] dark:text-[#F1F5F9]"
                        >
                            {options.map((opt) => (
                                <option key={opt.key} value={opt.key}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {oferta1713Note && (
                        <p className="text-[11px] text-[#92400E] dark:text-[#FCD34D] bg-[#FFFBEB] dark:bg-[#2D2210]/70 border border-[#FDE68A] dark:border-[#5C4318] rounded-lg px-2 py-1.5 flex items-start gap-1.5 leading-snug">
                            <Info size={12} className="shrink-0 mt-0.5" aria-hidden="true" />
                            <span>{oferta1713Note}</span>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
