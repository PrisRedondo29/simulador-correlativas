import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Divider } from '@heroui/react'
import QuickStartStepper from '../components/Tutorial/sections/QuickStartStepper'
import FeatureGuideCard from '../components/Tutorial/sections/FeatureGuideCard'
import FAQSection from '../components/Tutorial/sections/FAQSection'
import InteractiveMateriaDemo from '../components/Tutorial/sections/InteractiveMateriaDemo'

export default function ComoUsar() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-background py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">

                {/* ─── HERO HEADER ─── */}
                <header className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#005a36] dark:text-emerald-400 bg-[#005a36]/10 dark:bg-emerald-950/30 px-4 py-1.5 rounded-full mb-5">
                        <i className="fa-solid fa-book-open-reader text-[9px]" />
                        Centro de Ayuda
                    </div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight mb-3">
                        Dominá el simulador{' '}
                        <span className="bg-gradient-to-r from-[#005a36] to-[#F5B82E] bg-clip-text text-transparent">
                            en minutos
                        </span>
                    </h1>
                    <p className="text-foreground/50 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                        Todo lo que necesitás saber para aprovechar al máximo cada herramienta del simulador.
                    </p>

                    {/* Mini stat cards */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                        <div className="flex items-center gap-2 px-3.5 py-2 bg-default-100 dark:bg-default-50/50 rounded-xl border border-default-200">
                            <i className="fa-solid fa-toolbox text-xs text-[#005a36] dark:text-emerald-400" />
                            <span className="text-xs font-bold text-foreground/70">4 herramientas</span>
                        </div>
                        <div className="flex items-center gap-2 px-3.5 py-2 bg-default-100 dark:bg-default-50/50 rounded-xl border border-default-200">
                            <i className="fa-solid fa-bolt text-xs text-amber-500" />
                            <span className="text-xs font-bold text-foreground/70">A tu ritmo</span>
                        </div>
                        <div className="flex items-center gap-2 px-3.5 py-2 bg-default-100 dark:bg-default-50/50 rounded-xl border border-default-200">
                            <i className="fa-solid fa-bullseye text-xs text-indigo-500 dark:text-indigo-400" />
                            <span className="text-xs font-bold text-foreground/70">Decisiones informadas</span>
                        </div>
                    </div>
                </header>

                {/* ─── QUICK START STEPPER ─── */}
                <QuickStartStepper />

                <Divider className="my-4 opacity-30" />

                {/* ─── GUÍAS POR HERRAMIENTA ─── */}
                <section className="py-10">
                    <div className="text-center mb-8">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50 bg-default-100 px-3 py-1 rounded-full mb-3">
                            <i className="fa-solid fa-compass text-[9px]" />
                            Guías detalladas
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-foreground">
                            Cada herramienta en detalle
                        </h2>
                        <p className="text-sm text-foreground/50 mt-2">
                            Hacé clic en cada sección para expandir la guía completa.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {/* Mi Progreso */}
                        <FeatureGuideCard
                            icon="fa-chart-line"
                            title="Mi Progreso"
                            subtitle="Tu tablero académico personal"
                            accentColor="emerald"
                            defaultOpen={true}
                            navigateTo="/progreso"
                            ctaLabel="Ir a Mi Progreso"
                            features={[
                                'Cambiá el estado de cada materia entre Libre, Regular, Aprobada o Promocionada con un clic.',
                                'Las tarjetas de resumen superiores (Disponibles, Regulares, etc.) son interactivas: hacé clic para ver el listado de materias con ese estado.',
                                'Registrá notas de cursada y finales. El sistema calcula tu promedio automáticamente.',
                                'El vencimiento de regularidad se calcula solo cuando cargás el año y cuatrimestre de cursada.',
                                'Usá los filtros por año y el buscador para encontrar materias rápidamente.',
                            ]}
                            proTip={{
                                title: '¡Tip para avanzados!',
                                description: '¿Ya tenés muchos años cursados? Usá el botón "Aprobar hasta..." para aprobar años completos con un solo clic. Además, si marcás tus últimas materias aprobadas, el sistema actualizará automáticamente todas sus correlativas previas en cascada.',
                            }}
                        >
                            <div className="p-3.5 bg-default-100/60 dark:bg-default-50/40 rounded-2xl border border-default-200/80 mb-4">
                                <span className="text-[10px] font-black uppercase tracking-wider text-foreground/50 block mb-2">
                                    Estados disponibles en cada materia
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200">
                                        <i className="fa-solid fa-lock-open text-[10px]" /> Libre / Disponible
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                        <i className="fa-solid fa-clock text-[10px]" /> Regular
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-xs">
                                        <i className="fa-solid fa-check text-[10px]" /> Aprobada
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-xs">
                                        <i className="fa-solid fa-star text-[10px]" /> Promocionada
                                    </span>
                                </div>
                            </div>
                        </FeatureGuideCard>

                        {/* Simulador de Avance */}
                        <FeatureGuideCard
                            icon="fa-wand-magic-sparkles"
                            title="Simulador de Avance"
                            subtitle="Planificá tu recorrido cuatrimestre a cuatrimestre"
                            accentColor="amber"
                            navigateTo="/simulador"
                            ctaLabel="Ir al Simulador"
                            features={[
                                'Proyectá qué materias cursar en cada cuatrimestre sin afectar tu progreso real.',
                                'El sistema desbloquea automáticamente las materias que podés cursar según tus correlatividades.',
                                'Simulá cuántos cuatrimestres te quedan para egresar.',
                                'Llevá un historial de cada paso: qué materias aprobaste en cada cuatrimestre simulado.',
                                'Descargá tu cronograma planificado como documento PDF.',
                            ]}
                            proTip={{
                                title: 'Dato clave',
                                description: 'El simulador no modifica tu progreso real. Es un espacio separado donde podés experimentar libremente. Podés reiniciar la simulación las veces que quieras.',
                            }}
                        >
                            <div className="p-3.5 bg-amber-500/5 dark:bg-amber-950/20 rounded-2xl border border-amber-500/20 mb-4">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 block mb-2">
                                    Flujo de simulación cuatrimestral
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                    <div className="flex items-center gap-2 p-2 bg-background rounded-xl border border-amber-500/20">
                                        <span className="w-5 h-5 rounded-full bg-[#F5B82E] text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0">1</span>
                                        <span className="font-bold text-foreground/80">Elegí cursadas</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-background rounded-xl border border-amber-500/20">
                                        <span className="w-5 h-5 rounded-full bg-[#F5B82E] text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0">2</span>
                                        <span className="font-bold text-foreground/80">Avanzá semestre</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-background rounded-xl border border-amber-500/20">
                                        <span className="w-5 h-5 rounded-full bg-[#F5B82E] text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0">3</span>
                                        <span className="font-bold text-foreground/80">Exportá en PDF</span>
                                    </div>
                                </div>
                            </div>
                        </FeatureGuideCard>

                        {/* Equivalencias */}
                        <FeatureGuideCard
                            icon="fa-right-left"
                            title="Equivalencias entre Planes"
                            subtitle="Compará el Plan 17.13 con el 17.14"
                            accentColor="indigo"
                            navigateTo="/equivalencias"
                            ctaLabel="Ver Equivalencias"
                            features={[
                                'Visualizá qué materias del plan viejo "cubren" a las del nuevo. A veces, una materia aprobada te libera varias del nuevo plan.',
                                'Compará horas totales de cada plan para saber si ganás o perdés carga horaria.',
                                'Revisá el mapeo completo materia por materia con sus códigos nuevos.',
                            ]}
                            proTip={{
                                title: 'Sobre las regularidades',
                                description: 'Si tenés una materia regularizada en el plan viejo, no la perdés al cambiarte. Pero cuidado: en el plan nuevo tiene otro código, así que figurará como "Pendiente" hasta que des el final. Si no lo das antes de que venza tu regularidad original, ahí sí la perdés.',
                            }}
                        >
                            <div className="p-3.5 bg-indigo-500/5 dark:bg-indigo-950/20 rounded-2xl border border-indigo-500/20 mb-4">
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block mb-2">
                                    Mapeo Directo de Planes
                                </span>
                                <div className="flex items-center justify-between gap-2 p-2.5 bg-background rounded-xl border border-indigo-500/20 text-xs">
                                    <span className="font-black text-slate-900 dark:text-zinc-100">Plan 17.13</span>
                                    <i className="fa-solid fa-arrow-right text-indigo-500 text-xs shrink-0" />
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-[11px]">Mapeo Oficial UNLu</span>
                                    <i className="fa-solid fa-arrow-right text-indigo-500 text-xs shrink-0" />
                                    <span className="font-black text-[#005a36] dark:text-emerald-400">Plan 17.14</span>
                                </div>
                            </div>
                        </FeatureGuideCard>

                        {/* Cambio de Plan */}
                        <FeatureGuideCard
                            icon="fa-arrows-rotate"
                            title="Cambio de Plan"
                            subtitle="Simulá cómo quedaría tu carrera con el plan nuevo"
                            accentColor="rose"
                            badge="Res. 89/25"
                            navigateTo="/cambio-plan"
                            ctaLabel="Simular Cambio de Plan"
                            features={[
                                'Seleccioná tu estado actual en el Plan 17.13 y observá cómo se traduce al Plan 17.14.',
                                'La Resolución HCS 89/2025 establece un calendario gradual de transición de 2024 a 2029.',
                                'Revisá indicadores de "Horas a favor" o "Materias ganadas" para evaluar si te conviene migrar.',
                                'Tomá una decisión informada basada en tu avance real.',
                            ]}
                            proTip={{
                                title: 'Antes de decidir',
                                description: 'Evaluá con tu avance real si te conviene migrar hoy o si tendrías baches de cursada. Esta herramienta es informativa — siempre consultá con el Departamento de Alumnos antes de realizar el trámite oficial.',
                            }}
                        />
                    </div>
                </section>

                <Divider className="my-4 opacity-30" />

                {/* ─── DEMO INTERACTIVA ─── */}
                <section className="py-10">
                    <div className="text-center mb-2">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-950/30 px-3 py-1 rounded-full mb-3">
                            <i className="fa-solid fa-hand-pointer text-[9px]" />
                            Zona interactiva
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-foreground">
                            Probá una tarjeta real
                        </h2>
                        <p className="text-sm text-foreground/50 mt-2 max-w-xl mx-auto">
                            Interactuá con esta materia de ejemplo para entender cómo funcionan los estados, los indicadores y el panel de detalles.
                        </p>
                    </div>
                    <InteractiveMateriaDemo />
                </section>

                <Divider className="my-4 opacity-30" />

                {/* ─── FAQ ─── */}
                <FAQSection />

                {/* ─── CTA FINAL ─── */}
                <section className="mt-6 mb-4">
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#005a36] via-[#005a36] to-emerald-800 p-8 sm:p-10 text-center shadow-xl">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-[#F5B82E]/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-300/10 rounded-full blur-3xl" />

                        <div className="relative z-10">
                            <i className="fa-solid fa-graduation-cap text-3xl text-[#F5B82E]/80 mb-4 block" />
                            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
                                ¿Listo para empezar?
                            </h2>
                            <p className="text-white/70 text-sm sm:text-base max-w-md mx-auto mb-6">
                                Cargá tu progreso y comenzá a planificar el resto de tu carrera.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                <Button
                                    size="lg"
                                    onPress={() => navigate('/progreso')}
                                    className="bg-[#F5B82E] text-slate-900 font-black px-8 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-shadow"
                                    startContent={<i className="fa-solid fa-rocket" />}
                                >
                                    Cargar mi progreso
                                </Button>
                                <Button
                                    size="lg"
                                    variant="bordered"
                                    onPress={() => navigate('/')}
                                    className="text-white/90 border-white/30 font-bold hover:bg-white/10"
                                >
                                    Volver al inicio
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
