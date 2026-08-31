import React from 'react'
import { Card, CardBody } from '@heroui/react'

/**
 * Card que muestra el cuatrimestre y año que se está simulando actualmente.
 */
function SimulandoAhora({ cuatri, anioActual }) {
    return (
        <Card className="mb-6 bg-linear-to-r from-[#005a36] to-[#004d2e] text-white shadow-sm border border-emerald-800 rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

            <CardBody className="p-5 sm:p-6 relative z-10">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
                            <i className="fa-regular fa-calendar-days text-xl" />
                        </div>
                        <div className="flex flex-col">
                            <div className="text-[11px] text-emerald-200 font-bold tracking-widest uppercase mb-0.5">
                                Simulando Ahora
                            </div>
                            <div className="text-lg sm:text-2xl font-black text-white">
                                {cuatri}º Cuatrimestre · Año {anioActual}
                            </div>
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}

export default SimulandoAhora
