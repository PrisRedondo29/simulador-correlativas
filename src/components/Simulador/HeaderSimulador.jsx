import React from 'react'
import { Chip, Button } from '@heroui/react'
import { CloudDownload } from 'lucide-react'

function HeaderSimulador({ plan, anioInicio, cuatriInicio, onOpenConfig, onImportarProgreso }) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-background border border-default-200 p-4 md:p-5 rounded-2xl shadow-sm">
            <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                        Simulador de Avances
                    </h1>
                    {plan && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs shadow-md shadow-emerald-500/20 border border-emerald-400/40 shrink-0">
                            <i className="fa-solid fa-graduation-cap text-xs" />
                            <span>Plan {plan}</span>
                        </div>
                    )}
                </div>
                <p className="text-slate-500 dark:text-zinc-400 font-normal text-[11px] sm:text-xs max-w-md">
                    Proyectá tu trayectoria académica y explorá distintos escenarios de cursado.
                </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
                <div className="hidden sm:flex items-center gap-1.5 bg-default-100 dark:bg-default-50/10 px-2.5 py-1 rounded-xl border border-default-200 text-[11px] font-medium text-foreground/70">
                    <i className="fa-solid fa-calendar-days text-primary text-[10px]" />
                    <span>{anioInicio || '2026'} - {cuatriInicio || '1'}° Cuatri</span>
                </div>
                {onImportarProgreso && (
                    <Button
                        size="sm"
                        variant="flat"
                        color="secondary"
                        onPress={onImportarProgreso}
                        className="font-bold rounded-xl text-xs h-8"
                        startContent={<CloudDownload size={14} />}
                    >
                        Importar Progreso
                    </Button>
                )}
                <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    onPress={onOpenConfig}
                    className="font-bold rounded-xl text-xs h-8"
                    startContent={<i className="fa-solid fa-sliders text-[10px]" />}
                >
                    Configurar
                </Button>
            </div>
        </div>
    )
}

export default HeaderSimulador
