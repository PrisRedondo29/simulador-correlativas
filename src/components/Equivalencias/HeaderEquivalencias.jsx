import React from 'react';
import { Card, CardBody, Progress, Chip } from '@heroui/react';
import { Link } from 'react-router-dom';
import { usePlanCapabilities } from '../../context/PlanContext';

function HeaderEquivalencias({
    sourcePlan,
    targetPlan,
    progresoViejo,
    progresoNuevo,
    totalMaterias,
    equivalenciasAprobadas,
    comparativaHoras,
}) {
    const { canSimulateTransition, transitionInfo } = usePlanCapabilities();
    const restantesViejo = comparativaHoras?.viejo?.restantes ?? 0;
    const totalesViejo = comparativaHoras?.viejo?.totales || 1;
    const restantesNuevo = comparativaHoras?.nuevo?.restantes ?? 0;
    const totalesNuevo = comparativaHoras?.nuevo?.totales || 1;

    const horasDiferencia = Math.abs(restantesViejo - restantesNuevo);
    const esMasEficiente = restantesNuevo < restantesViejo;
    const origenLabel = sourcePlan ? `Plan ${sourcePlan}` : 'Plan origen';
    const destinoLabel = targetPlan ? `Plan ${targetPlan}` : 'Plan destino';

    return (
        <header className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
                        Equivalencias <span className="text-[#005A36] dark:text-[#6EE7B7]">{destinoLabel}</span>
                    </h1>
                    <p className="text-[#64748B] dark:text-[#94A3B8] text-xs sm:text-sm max-w-2xl">
                        Mapeo oficial desde {origenLabel} hacia {destinoLabel}.
                        {canSimulateTransition && transitionInfo && (
                            <>
                                {' '}
                                <Link to={transitionInfo.route} className="font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:underline">
                                    Evaluar viabilidad del cambio ({transitionInfo.shortBadge}) →
                                </Link>
                            </>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Chip
                        size="sm"
                        variant="flat"
                        className="font-semibold text-xs bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38]"
                    >
                        {equivalenciasAprobadas} / {totalMaterias} otorgadas
                    </Chip>
                    {esMasEficiente && horasDiferencia > 0 && (
                        <Chip
                            size="sm"
                            variant="flat"
                            className="font-medium text-xs bg-[#F0F9FF] dark:bg-[#0F2636] text-[#075985] dark:text-[#7DD3FC] border border-[#BAE6FD] dark:border-[#1E4E6E]"
                        >
                            {horasDiferencia}h menos restantes
                        </Chip>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Plan Origen */}
                <Card shadow="none" className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl">
                    <CardBody className="gap-2 p-3.5 sm:p-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                                {origenLabel} (Origen)
                            </span>
                            <span className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                                {progresoViejo}%
                            </span>
                        </div>
                        <Progress
                            aria-label={`Progreso ${origenLabel}`}
                            value={progresoViejo}
                            size="sm"
                            classNames={{
                                track: 'bg-[#E2E8F0] dark:bg-[#2A3540]',
                                indicator: 'bg-[#64748B] dark:bg-[#94A3B8]',
                            }}
                        />
                        <div className="flex justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                            <span>Carga horaria restante</span>
                            <span className="font-medium font-mono">{restantesViejo}h / {totalesViejo}h</span>
                        </div>
                    </CardBody>
                </Card>

                {/* Plan Destino */}
                <Card shadow="none" className="bg-white dark:bg-[#161D24] border border-[#A7F3D0] dark:border-[#1E4D38] rounded-2xl">
                    <CardBody className="gap-2 p-3.5 sm:p-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-[#005A36] dark:text-[#86EFAC]">
                                {destinoLabel} (Destino)
                            </span>
                            <span className="text-sm font-bold text-[#005A36] dark:text-[#86EFAC] tabular-nums">
                                {progresoNuevo}%
                            </span>
                        </div>
                        <Progress
                            aria-label={`Progreso ${destinoLabel}`}
                            value={progresoNuevo}
                            size="sm"
                            classNames={{
                                track: 'bg-[#E2E8F0] dark:bg-[#2A3540]',
                                indicator: 'bg-[#478559] dark:bg-[#4A9D68]',
                            }}
                        />
                        <div className="flex justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                            <span>Carga horaria restante</span>
                            <span className="font-medium font-mono text-[#005A36] dark:text-[#86EFAC]">{restantesNuevo}h / {totalesNuevo}h</span>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </header>
    );
}

export default HeaderEquivalencias;
