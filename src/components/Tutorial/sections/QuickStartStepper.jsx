import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@heroui/react'

const steps = [
    {
        number: '01',
        icon: 'fa-chart-line',
        title: 'Marcá tu progreso',
        description: 'Cargá qué materias aprobaste, regularizaste o estás cursando. El sistema calcula tus promedios y porcentajes automáticamente.',
        color: '#005a36',
        badgeBg: 'bg-[#005a36] text-white',
        cardBorder: 'hover:border-[#005a36]/40 hover:shadow-[#005a36]/10',
        iconBg: 'bg-[#005a36]/15 text-[#005a36] dark:bg-emerald-500/20 dark:text-emerald-400',
        btnClass: 'bg-[#005a36] text-white hover:bg-[#004a2c]',
        path: '/progreso',
        cta: 'Ir a Mi Progreso',
    },
    {
        number: '02',
        icon: 'fa-wand-magic-sparkles',
        title: 'Simulá tu futuro',
        description: 'Proyectá cuántos cuatrimestres te quedan y organizá tus cursadas cuatrimestre a cuatrimestre sin tocar tu progreso real.',
        color: '#F5B82E',
        badgeBg: 'bg-[#F5B82E] text-slate-950',
        cardBorder: 'hover:border-amber-500/40 hover:shadow-amber-500/10',
        iconBg: 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
        btnClass: 'bg-[#F5B82E] text-slate-950 hover:bg-amber-400',
        path: '/simulador',
        cta: 'Ir al Simulador',
    },
    {
        number: '03',
        icon: 'fa-scale-balanced',
        title: 'Tomá decisiones',
        description: 'Evaluá si te conviene cambiar de plan comparando equivalencias oficiales de la UNLu y visualizando el impacto en tus materias.',
        color: '#6366f1',
        badgeBg: 'bg-indigo-600 text-white',
        cardBorder: 'hover:border-indigo-500/40 hover:shadow-indigo-500/10',
        iconBg: 'bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
        btnClass: 'bg-indigo-600 text-white hover:bg-indigo-700',
        path: '/equivalencias',
        cta: 'Ver Equivalencias',
    },
]

export default function QuickStartStepper() {
    const navigate = useNavigate()

    return (
        <section className="py-8">
            <div className="text-center mb-8">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#005a36] dark:text-emerald-400 bg-[#005a36]/10 dark:bg-emerald-950/30 px-3 py-1 rounded-full mb-2">
                    <i className="fa-solid fa-rocket text-[9px]" />
                    Inicio rápido
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-foreground">
                    3 pasos para dominar la herramienta
                </h2>
                <p className="text-xs sm:text-sm text-foreground/50 mt-1 max-w-lg mx-auto">
                    Seguí este flujo simple para sacarle el 100% de provecho a la plataforma.
                </p>
            </div>

            {/* Desktop: 3 rich step cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {steps.map((step, idx) => (
                    <div
                        key={idx}
                        className={`relative rounded-3xl p-6 bg-background border border-default-200/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${step.cardBorder} flex flex-col justify-between group overflow-hidden`}
                    >
                        {/* Background subtle gradient accent */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-current/5 to-transparent rounded-bl-full pointer-events-none opacity-40" />

                        <div>
                            {/* Header row: Badge + Icon */}
                            <div className="flex items-center justify-between mb-5">
                                <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl shadow-2xs ${step.badgeBg}`}>
                                    Paso {step.number}
                                </span>
                                <div className={`w-12 h-12 rounded-2xl ${step.iconBg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                                    <i className={`fa-solid ${step.icon} text-lg`} />
                                </div>
                            </div>

                            <h3 className="text-base font-black text-foreground mb-2 group-hover:text-primary transition-colors">
                                {step.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-foreground/60 leading-relaxed mb-6">
                                {step.description}
                            </p>
                        </div>

                        <Button
                            size="sm"
                            onPress={() => navigate(step.path)}
                            className={`font-black text-xs w-full py-2.5 rounded-xl shadow-xs ${step.btnClass}`}
                            endContent={<i className="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-0.5 transition-transform" />}
                        >
                            {step.cta}
                        </Button>
                    </div>
                ))}
            </div>
        </section>
    )
}
