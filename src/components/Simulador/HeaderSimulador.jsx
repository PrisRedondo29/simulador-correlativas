import React from 'react'
import { Chip } from '@heroui/react'

function HeaderSimulador({ plan }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
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
    )
}

export default HeaderSimulador