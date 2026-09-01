import { useNavigate } from 'react-router-dom'

export default function EquivalenciasHelp() {
    const navigate = useNavigate()

    return (
        <div className="py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Explicación General */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Banner de Resolución HCS 89/2025 */}
                    <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent dark:from-amber-950/40 border-2 border-[#F5B82E] rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-[#F5B82E]/20 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-scale-balanced text-base" />
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                                    NUEVO MARCO OFICIAL
                                </span>
                                <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-zinc-100">
                                    Resolución HCS 89/2025: Transición Progresiva de Planes
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-zinc-300">
                                    La universidad dispuso un calendario gradual de 2024 a 2029. Evaluá con tu avance real si te conviene migrar hoy o si tendrías baches de cursada.
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onPress={() => navigate('/cambio-plan')}
                            className="bg-[#005a36] hover:bg-[#004a2c] text-white font-black text-xs px-4 py-5 rounded-xl shrink-0 shadow-sm"
                            startContent={<i className="fa-solid fa-arrows-rotate text-xs text-[#F5B82E]" />}
                        >
                            Simular cambio de plan
                        </Button>
                    </div>

                    <div>
                        <h3 className="text-2xl font-bold text-foreground mb-4">Transición entre Planes (17.13 → 17.14)</h3>
                        <p className="text-foreground/70 leading-relaxed mb-4">
                            Esta herramienta está diseñada para los alumnos que están evaluando pasarse del <b>Plan 17.13 al Plan 17.14</b>. Te permite ver exactamente cómo quedaría tu carrera tras el cambio.
                        </p>
                    </div>

                    {/* El punto crítico: Regularidades */}
                    <div className="p-8 bg-warning/10 border-2 border-warning/20 rounded-4xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <i className="fa-solid fa-triangle-exclamation text-8xl text-warning"></i>
                        </div>

                        <h4 className="text-xl font-black text-warning-800 mb-4 flex items-center gap-2">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            ¿Qué pasa con mis Regularidades?
                        </h4>

                        <div className="space-y-4 text-warning-900/80 relative z-10">
                            <p className="font-medium">
                                Es muy importante entender este punto para no entrar en pánico:
                            </p>
                            <ul className="space-y-4">
                                <li className="flex gap-3">
                                    <i className="fa-solid fa-check-double mt-1 shrink-0 text-warning-600"></i>
                                    <span><b>No perdés la regularidad:</b> Si tenés una materia regularizada en el plan viejo, seguís manteniéndola.</span>
                                </li>
                                <li className="flex gap-3">
                                    <i className="fa-solid fa-link-slash mt-1 shrink-0 text-warning-600"></i>
                                    <span><b>Códigos distintos:</b> En el plan nuevo la materia tiene otro código. Por eso te figurará como <b>"Pendiente"</b> hasta que des el final.</span>
                                </li>
                                <li className="flex gap-3 text-danger-600 font-bold">
                                    <i className="fa-solid fa-clock mt-1 shrink-0"></i>
                                    <span><b>Atención:</b> Si no das el final antes de que venza tu regularidad original, ahí sí la perdés y deberás anotarte en la materia del Plan Nuevo.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-default-100 border-none shadow-none">
                            <CardBody className="p-6">
                                <h5 className="font-bold mb-2 flex items-center gap-2">
                                    <i className="fa-solid fa-scale-balanced text-primary"></i>
                                    Balance de Carga
                                </h5>
                                <p className="text-sm text-foreground/60">
                                    Compará las horas totales de cada plan y descubrí si con el cambio ganás o perdés carga horaria total.
                                </p>
                            </CardBody>
                        </Card>
                        <Card className="bg-default-100 border-none shadow-none">
                            <CardBody className="p-6">
                                <h5 className="font-bold mb-2 flex items-center gap-2">
                                    <i className="fa-solid fa-diagram-project text-secondary"></i>
                                    Mapeo de Materias
                                </h5>
                                <p className="text-sm text-foreground/60">
                                    Visualizá qué materias del plan viejo "cubren" a las del nuevo. A veces, una sola materia aprobada te libera varias del nuevo plan.
                                </p>
                            </CardBody>
                        </Card>
                    </div>
                </div>

                {/* Sidebar de Tips */}
                <div className="space-y-6">
                    <div className="p-6 bg-primary text-white rounded-3xl shadow-xl shadow-primary/20">
                        <h4 className="font-bold text-lg mb-4">¿Cómo simular?</h4>
                        <ol className="space-y-4 text-sm list-decimal list-inside">
                            <li>Seleccioná tu estado actual en el <b>Plan 17.13</b>.</li>
                            <li>Observá la columna del <b>Plan 17.14</b> a la derecha.</li>
                            <li>Revisá los indicadores de "Horas a favor" o "Materias ganadas".</li>
                            <li>Tomá una decisión informada sobre tu pase.</li>
                        </ol>
                    </div>

                    <div className="p-6 bg-default-100 rounded-3xl border border-default-200">
                        <h4 className="font-bold text-foreground mb-4">Aclaración Legal</h4>
                        <p className="text-xs text-foreground/50 leading-relaxed italic">
                            Esta herramienta es informativa y se basa en las tablas de equivalencias vigentes de la UNLu. Siempre consultá con el Departamento de Alumnos antes de realizar cualquier trámite oficial de cambio de plan.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
