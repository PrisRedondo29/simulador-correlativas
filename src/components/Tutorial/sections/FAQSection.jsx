import React, { useState, useMemo } from 'react'
import { Accordion, AccordionItem } from '@heroui/react'
import { usePlanCapabilities } from '../../../context/PlanContext'

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
        question: '¿El simulador afecta las materias que ya cargué?',
        answer: 'No. El Simulador de Avance y el Cambio de Plan son herramientas de proyección 100% aisladas. Podés simular libremente cualquier camino o combinación sin que se modifique lo que cargaste en "Mis Materias".',
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
    { id: 'progreso', label: 'Mis Materias y Notas', icon: 'fa-graduation-cap' },
    { id: 'planes', label: 'Planes y Transición', icon: 'fa-arrows-rotate' },
    { id: 'general', label: 'General y Cuenta', icon: 'fa-circle-info' },
]

export default function FAQSection() {
    const [selectedCategory, setSelectedCategory] = useState('todas')
    const { canSimulateTransition } = usePlanCapabilities()

    const visibleCategories = useMemo(
        () => (canSimulateTransition ? categories : categories.filter(c => c.id !== 'planes')),
        [canSimulateTransition]
    )

    const effectiveCategory = visibleCategories.some(c => c.id === selectedCategory) ? selectedCategory : 'todas'

    const filteredFaq = useMemo(() => {
        const visibleFaq = canSimulateTransition
            ? faqData
            : faqData.filter(item => item.id !== 'cambio-plan-info')
        if (effectiveCategory === 'todas') return visibleFaq
        return visibleFaq.filter(item => item.category === effectiveCategory)
    }, [effectiveCategory, canSimulateTransition])

    return (
        <section className="py-6">
            <div className="text-center mb-5 space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                    Preguntas frecuentes
                </h2>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-lg mx-auto">
                    Respuestas rápidas a las dudas más comunes sobre el funcionamiento del simulador.
                </p>
            </div>

            {/* Categorías de Filtro */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-5 max-w-2xl mx-auto">
                {visibleCategories.map(cat => {
                    const isSelected = effectiveCategory === cat.id
                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                                isSelected
                                    ? 'bg-[#005A36] dark:bg-[#2E8B63] text-white font-semibold'
                                    : 'bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F1F5F9] dark:hover:bg-[#1E2730]'
                            }`}
                        >
                            <i className={`fa-solid ${cat.icon} text-[11px] ${isSelected ? 'text-white' : 'opacity-65'}`} />
                            <span>{cat.label}</span>
                        </button>
                    )
                })}
            </div>

            <div className="max-w-3xl mx-auto">
                <Accordion
                    variant="splitted"
                    className="px-0 gap-2.5"
                    itemClasses={{
                        base: 'rounded-xl border border-[#E2E8F0] dark:border-[#2A3540] bg-white dark:bg-[#161D24] shadow-none px-4',
                        title: 'text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]',
                        trigger: 'py-3.5 data-[hover=true]:opacity-85',
                        content: 'pb-4 pt-0 text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed',
                        indicator: 'text-[#64748B]',
                    }}
                >
                    {filteredFaq.map(item => (
                        <AccordionItem
                            key={item.id}
                            aria-label={item.question}
                            title={
                                <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-lg bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] flex items-center justify-center shrink-0">
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
