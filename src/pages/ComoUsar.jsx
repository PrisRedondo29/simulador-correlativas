import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Divider } from '@heroui/react';
import QuickStartStepper from '../components/Tutorial/sections/QuickStartStepper';
import FeatureGuideCard from '../components/Tutorial/sections/FeatureGuideCard';
import FAQSection from '../components/Tutorial/sections/FAQSection';
import InteractiveMateriaDemo from '../components/Tutorial/sections/InteractiveMateriaDemo';
import { usePlanCapabilities } from '../context/PlanContext';

export default function ComoUsar() {
    const navigate = useNavigate();
    const { canSimulateTransition, transitionInfo } = usePlanCapabilities();

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F1419] py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                {/* ─── CABECERA SOBRIA ─── */}
                <header className="text-center mb-6 space-y-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#005A36] dark:text-[#86EFAC] bg-[#ECFDF5] dark:bg-[#102A20] border border-[#A7F3D0] dark:border-[#1E4D38] px-3 py-1 rounded-full">
                        <i className="fa-solid fa-book-open-reader text-[11px]" aria-hidden="true" />
                        Centro de Ayuda
                    </span>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
                        Guía de uso del Simulador
                    </h1>
                    <p className="text-[#64748B] dark:text-[#94A3B8] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                        Todo lo que necesitás saber para registrar tu avance y proyectar tus cuatrimestres sin complicaciones.
                    </p>
                </header>

                <QuickStartStepper />

                <Divider className="my-4 bg-[#E2E8F0] dark:bg-[#2A3540]" />

                {/* ─── GUÍAS POR HERRAMIENTA ─── */}
                <section className="py-8">
                    <div className="text-center mb-6 space-y-1">
                        <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                            Cada herramienta en detalle
                        </h2>
                        <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                            Tocá cada sección para desplegar las funciones principales.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <FeatureGuideCard
                            icon="fa-chart-line"
                            title="Mi Progreso"
                            subtitle="Tu tablero académico personal"
                            accentColor="emerald"
                            defaultOpen={true}
                            navigateTo="/progreso"
                            ctaLabel="Ir a Mi Progreso"
                            features={[
                                'Cambiá el estado de cada materia entre Libre, Regular, Aprobado o Promocionado con un clic.',
                                'El resumen superior por estado te permite abrir el listado filtrado de cada categoría.',
                                'Registrá notas de cursada y finales; el sistema calcula tu promedio con y sin aplazos.',
                                'El vencimiento de regularidad se proyecta automáticamente al cargar el año de cursada.',
                                'Usá el buscador (Ctrl+K) y los filtros para ubicar cualquier materia.',
                            ]}
                            proTip={{
                                title: 'Atajo para avanzados',
                                description: 'Usá "Aprobar hasta..." para aprobar años completos o hasta el título intermedio con un clic, o marcá tus últimas materias aprobadas para completar sus correlativas previas automáticamente.',
                            }}
                        >
                            <div className="p-3 bg-[#F8FAFC] dark:bg-[#1E2730] rounded-xl border border-[#E2E8F0] dark:border-[#2A3540] mb-3">
                                <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] block mb-2">
                                    Estados de materias
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#E0F2FE] text-[#075985] dark:bg-[#0F2636] dark:text-[#7DD3FC]">
                                        <i className="fa-solid fa-lock-open text-[10px]" /> Disponible
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#FEF3C7] text-[#92400E] dark:bg-[#2D2210] dark:text-[#FCD34D]">
                                        <i className="fa-regular fa-clock text-[10px]" /> Regular
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#ECFDF5] text-[#166534] dark:bg-[#102A20] dark:text-[#86EFAC]">
                                        <i className="fa-regular fa-circle-check text-[10px]" /> Aprobada
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#478559] text-white">
                                        <i className="fa-solid fa-award text-[10px]" /> Promocionada
                                    </span>
                                </div>
                            </div>
                        </FeatureGuideCard>

                        <FeatureGuideCard
                            icon="fa-route"
                            title="Simulador de Avance"
                            subtitle="Planificá tu recorrido cuatrimestre a cuatrimestre"
                            accentColor="emerald"
                            navigateTo="/simulador"
                            ctaLabel="Ir al Simulador"
                            features={[
                                'Proyectá qué materias cursar en cada cuatrimestre sin alterar tu avance real.',
                                'Desbloquea automáticamente nuevas asignaturas según tus correlativas.',
                                'Elegí entre vista Malla, Grafo interactivo o Lista.',
                                'Llevá un historial por cuatrimestre y descargá tu cronograma en PDF.',
                            ]}
                            proTip={{
                                title: 'Dato clave',
                                description: 'El simulador trabaja en un entorno separado de Mi Progreso para que puedas probar distintos escenarios con tranquilidad.',
                            }}
                        />

                        <FeatureGuideCard
                            icon="fa-right-left"
                            title="Equivalencias entre Planes"
                            subtitle="Compará el Plan 17.13 con el Plan 17.14"
                            accentColor="neutral"
                            navigateTo="/equivalencias"
                            ctaLabel="Ver Equivalencias"
                            features={[
                                'Visualizá qué materias del Plan 17.13 cubren materias del Plan 17.14.',
                                'Compará la carga horaria restante de ambos planes lado a lado.',
                                'Filtrá por todas, aprobadas o pendientes.',
                            ]}
                            proTip={{
                                title: 'Sobre las regularidades',
                                description: 'Las materias regularizadas sin final no otorgan equivalencia automática directa en el Plan 17.14 hasta que rindas el examen final correspondiente.',
                            }}
                        />

                        {canSimulateTransition && transitionInfo && (
                            <FeatureGuideCard
                                icon="fa-arrows-rotate"
                                title="Cambio de Plan"
                                subtitle={`Evaluá la transición según ${transitionInfo.resolution}`}
                                accentColor="amber"
                                badge={transitionInfo.shortBadge}
                                navigateTo={transitionInfo.route}
                                ctaLabel="Simular Cambio de Plan"
                                features={[
                                    'Calculá en qué año te conviene solicitar el cambio de plan sin sufrir baches de cursada.',
                                    `Visualizá las materias disponibles en el Plan ${transitionInfo.targetPlan} para cada ciclo lectivo (2025–2029).`,
                                    'Tomá decisiones basadas en tu avance real registrado.',
                                ]}
                                proTip={{
                                    title: 'Antes de decidir',
                                    description: 'Esta herramienta es orientativa; confirmá siempre los plazos y trámites en el Departamento de Alumnos de la UNLu.',
                                }}
                            />
                        )}
                    </div>
                </section>

                <Divider className="my-4 bg-[#E2E8F0] dark:bg-[#2A3540]" />

                {/* ─── DEMO INTERACTIVA ─── */}
                <section className="py-8">
                    <div className="text-center mb-4 space-y-1">
                        <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                            Probá una tarjeta de materia
                        </h2>
                        <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-xl mx-auto">
                            Interactuá con esta materia de ejemplo para ver cómo funcionan los estados y el panel de detalles.
                        </p>
                    </div>
                    <InteractiveMateriaDemo />
                </section>

                <Divider className="my-4 bg-[#E2E8F0] dark:bg-[#2A3540]" />

                <FAQSection />

                {/* ─── CTA FINAL SOBRIO ─── */}
                <section className="mt-6 mb-2">
                    <div className="rounded-2xl bg-[#005A36] dark:bg-[#11221B] border border-[#00472B] dark:border-[#24382F] p-6 sm:p-8 text-center">
                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                            ¿Listo para organizar tu carrera?
                        </h2>
                        <p className="text-white/80 text-xs sm:text-sm max-w-md mx-auto mb-5">
                            Cargá tus materias aprobadas o regulares y empezá a proyectar tu recorrido.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Button
                                size="md"
                                onPress={() => navigate('/progreso')}
                                className="bg-white text-[#005A36] hover:bg-[#F8FAFC] font-semibold px-6 rounded-xl"
                            >
                                Ir a Mi Progreso
                            </Button>
                            <Button
                                size="md"
                                variant="bordered"
                                onPress={() => navigate('/')}
                                className="text-white border-white/30 font-medium hover:bg-white/10 rounded-xl"
                            >
                                Volver al inicio
                            </Button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
