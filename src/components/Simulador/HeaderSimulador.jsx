import React from 'react';
import { Button, ButtonGroup } from '@heroui/react';
import { CloudDownload, Columns, Network, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';

function HeaderSimulador({
    plan,
    anioActual,
    cuatri,
    anioInicio,
    cuatriInicio,
    viewMode,
    onCambioVista,
    onOpenConfig,
    onImportarProgreso,
    simulacionTerminada,
}) {
    const cuatriDisplay = cuatri || cuatriInicio || '1';
    const anioDisplay = anioActual || anioInicio || '2026';

    return (
        <header className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
                            Simulador de Avance
                        </h1>
                        {plan && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38] text-xs font-semibold">
                                <i className="fa-solid fa-graduation-cap text-[10px]" aria-hidden="true" />
                                Plan {plan}
                            </span>
                        )}
                        {!simulacionTerminada && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0] border border-[#E2E8F0] dark:border-[#2A3540] text-xs font-medium tabular-nums">
                                <i className="fa-regular fa-calendar text-[10px] text-[#005A36] dark:text-[#6EE7B7]" aria-hidden="true" />
                                {cuatriDisplay}° Cuatrimestre · {anioDisplay}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                        Modo simulación: probá escenarios libremente sin modificar{' '}
                        <Link to="/mis-materias" className="font-medium text-[#005A36] dark:text-[#6EE7B7] hover:underline">
                            Mis Materias
                        </Link>.
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                    {/* Selector de Vista */}
                    <div className="flex p-0.5 bg-[#F1F5F9] dark:bg-[#1E2730] rounded-xl border border-[#E2E8F0] dark:border-[#2A3540]">
                        <ButtonGroup size="sm" variant="flat">
                            <Button
                                onPress={() => onCambioVista('malla')}
                                className={`font-medium text-xs h-7 rounded-lg ${
                                    viewMode === 'malla'
                                        ? 'bg-white dark:bg-[#161D24] text-[#005A36] dark:text-[#6EE7B7] font-semibold shadow-2xs'
                                        : 'bg-transparent text-[#64748B] dark:text-[#94A3B8]'
                                }`}
                                startContent={<Columns size={14} />}
                            >
                                Malla
                            </Button>
                            <Button
                                onPress={() => onCambioVista('grafo')}
                                className={`font-medium text-xs h-7 rounded-lg ${
                                    viewMode === 'grafo'
                                        ? 'bg-white dark:bg-[#161D24] text-[#005A36] dark:text-[#6EE7B7] font-semibold shadow-2xs'
                                        : 'bg-transparent text-[#64748B] dark:text-[#94A3B8]'
                                }`}
                                startContent={<Network size={14} />}
                            >
                                Grafo
                            </Button>
                            <Button
                                onPress={() => onCambioVista('lista')}
                                className={`font-medium text-xs h-7 rounded-lg ${
                                    viewMode === 'lista'
                                        ? 'bg-white dark:bg-[#161D24] text-[#005A36] dark:text-[#6EE7B7] font-semibold shadow-2xs'
                                        : 'bg-transparent text-[#64748B] dark:text-[#94A3B8]'
                                }`}
                                startContent={<LayoutGrid size={14} />}
                            >
                                Lista
                            </Button>
                        </ButtonGroup>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {onImportarProgreso && (
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={onImportarProgreso}
                                className="font-medium rounded-xl text-xs h-8 bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0] border border-[#E2E8F0] dark:border-[#2A3540]"
                                startContent={<CloudDownload size={14} />}
                            >
                                Importar
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="flat"
                            onPress={onOpenConfig}
                            className="font-semibold rounded-xl text-xs h-8 bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38]"
                            startContent={<i className="fa-solid fa-sliders text-[11px]" />}
                        >
                            Configurar
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default HeaderSimulador;
