import React from 'react'
import { Chip, Button } from '@heroui/react'

function HeaderSimulador({ plan, anioInicio, cuatriInicio, onOpenConfig }) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background border border-default-200 p-4 md:p-6 rounded-3xl shadow-sm mb-6">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                        Simulador de Avances
                    </h1>
                    {plan && (
                        <Chip color="primary" variant="flat" size="sm" className="font-bold text-xs">
                            Plan {plan}
                        </Chip>
                    )}
                </div>
                <p className="text-slate-500 dark:text-zinc-400 font-normal text-xs sm:text-sm max-w-lg mt-0.5">
                    Proyectá tu trayectoria académica y explorá distintos escenarios de cursado respetando las correlatividades.
                </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
                <div className="flex items-center gap-2 bg-default-100 dark:bg-default-50/10 px-3 py-1.5 rounded-2xl border border-default-200 text-xs font-medium text-foreground/80">
                    <i className="fa-solid fa-calendar-days text-primary" />
                    <span>Inicio: {anioInicio || '2026'} - {cuatriInicio || '1'}º Cuatri</span>
                </div>
                <Button 
                    size="sm" 
                    variant="flat" 
                    color="primary"
                    onPress={onOpenConfig}
                    className="font-bold rounded-2xl text-xs h-9"
                    startContent={<i className="fa-solid fa-sliders text-xs" />}
                >
                    Ajustar
                </Button>
            </div>
        </div>
    )
}

export default HeaderSimulador