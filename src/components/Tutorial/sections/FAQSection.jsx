import React, { useState, useMemo } from 'react'
import { Accordion, AccordionItem, Button } from '@heroui/react'

const faqData = [
    {
        id: 'datos-guardado',
        category: 'progreso',
        question: '¿Mis datos se guardan automáticamente?',
        answer: 'Sí. Tu progreso se guarda en el almacenamiento local de tu navegador cada vez que hacés un cambio. Pero si cambiás de dispositivo o borrás los datos del navegador, se pierden. Por eso recomendamos iniciar sesión con Google para guardar y sincronizar tu copia en la nube con un solo clic.',
        icon: 'fa-floppy-disk',
    },
    {
        id: 'afecta-progreso',
        category: 'general',
        question: '¿El simulador afecta mi progreso real?',
        answer: 'No. El Simulador de Avance y el Cambio de Plan son herramientas de proyección 100% aisladas. Podés simular libremente cualquier camino o combinación sin que se modifique lo que cargaste en "Mi Progreso".',
        icon: 'fa-shield-halved',
    },
    {
        id: 'cambio-plan-info',
        category: 'planes',
        question: '¿Qué pasa si cambio de plan de estudios?',
        answer: 'Podés usar la sección de Equivalencias y Cambio de Plan para ver exactamente cómo se trasladan tus materias. Las materias aprobadas se mapean automáticamente según la tabla de equivalencias oficial aprobada por la UNLu (Res. HCS 89/25).',
        icon: 'fa-arrows-rotate',
    },
    {
        id: 'vencimiento-regularidad',
        category: 'progreso',
        question: '¿Cómo funciona el vencimiento de la regularidad?',
        answer: 'Cuando marcás una materia como "Regular" y cargás el año y cuatrimestre de cursada, el sistema calcula automáticamente la fecha límite de validez (3 años y medio). Te mostrará un indicador visible en la tarjeta para avisarte.',
        icon: 'fa-clock',
    },
    {
        id: 'aprobar-hasta',
        category: 'progreso',
        question: '¿Qué es y cómo funciona "Aprobar hasta..."?',
        answer: 'Es un atajo inteligente para estudiantes avanzados. En lugar de marcar materia por materia, podés aprobar años completos o hasta el título intermedio con un solo clic. Además, si marcás tus últimas materias, el sistema aprueba en cascada todas las correlativas previas requeridas.',
        icon: 'fa-forward-fast',
    },
    {
        id: 'mobile-support',
        category: 'general',
        question: '¿Puedo usar el simulador en el celular?',
        answer: 'Sí, la plataforma está 100% optimizada para celulares y tablets. En pantallas pequeñas el menú lateral se convierte en una barra colapsable para maximizar el espacio de lectura.',
        icon: 'fa-mobile-screen-button',
    },
    {
        id: 'herramienta-oficial',
        category: 'general',
        question: '¿Es una herramienta oficial de la UNLu?',
        answer: 'No. Es un proyecto estudiantil independiente y de código abierto desarrollado para la comunidad de la Licenciatura en Sistemas de Información. Para trámites académicos oficiales, consultá siempre por los canales oficiales y la Secretaría Académica de la UNLu.',
        icon: 'fa-graduation-cap',
    },
]

const categories = [
    { id: 'todas', label: 'Todas las preguntas', icon: 'fa-layer-group' },
    { id: 'progreso', label: 'Progreso y Notas', icon: 'fa-chart-line' },
    { id: 'planes', label: 'Planes y Transición', icon: 'fa-arrows-rotate' },
    { id: 'general', label: 'General y Cuenta', icon: 'fa-circle-info' },
]

export default function FAQSection() {
    const [selectedCategory, setSelectedCategory] = useState('todas')

    const filteredFaq = useMemo(() => {
        if (selectedCategory === 'todas') return faqData
        return faqData.filter(item => item.category === selectedCategory)
    }, [selectedCategory])

    return (
        <section className="py-8">
            <div className="text-center mb-6">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50 bg-default-100 px-3 py-1 rounded-full mb-2">
                    <i className="fa-solid fa-circle-question text-[9px]" />
                    FAQ
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-foreground">
                    Preguntas frecuentes
                </h2>
                <p className="text-xs sm:text-sm text-foreground/50 mt-1 max-w-lg mx-auto">
                    Respuestas rápidas a las dudas más comunes sobre el funcionamiento del simulador.
                </p>
            </div>

            {/* Categorías de Filtro */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6 max-w-2xl mx-auto">
                {categories.map(cat => {
                    const isSelected = selectedCategory === cat.id
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                                isSelected
                                    ? 'bg-[#005a36] text-white shadow-xs scale-105'
                                    : 'bg-default-100 dark:bg-default-50 text-foreground/70 hover:bg-default-200/80 hover:text-foreground'
                            }`}
                        >
                            <i className={`fa-solid ${cat.icon} text-[10px] ${isSelected ? 'text-[#F5B82E]' : 'opacity-60'}`} />
                            <span>{cat.label}</span>
                        </button>
                    )
                })}
            </div>

            <div className="max-w-3xl mx-auto">
                <Accordion
                    variant="splitted"
                    className="px-0 gap-3"
                    itemClasses={{
                        base: 'rounded-2xl border border-default-200 bg-background shadow-xs px-4',
                        title: 'text-sm font-bold text-foreground',
                        trigger: 'py-4 data-[hover=true]:opacity-80',
                        content: 'pb-4 pt-0 text-xs sm:text-sm text-foreground/70 leading-relaxed',
                        indicator: 'text-foreground/40',
                    }}
                >
                    {filteredFaq.map(item => (
                        <AccordionItem
                            key={item.id}
                            aria-label={item.question}
                            title={
                                <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-lg bg-[#005a36]/10 dark:bg-emerald-500/20 text-[#005a36] dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <i className={`fa-solid ${item.icon} text-[10px]`} />
                                    </div>
                                    <span className="text-xs sm:text-sm">{item.question}</span>
                                </div>
                            }
                        >
                            {item.answer}
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    )
}
