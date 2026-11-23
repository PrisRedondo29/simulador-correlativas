import React, { useState, useMemo } from 'react';
import { Accordion, AccordionItem } from '@heroui/react';
import { usePlanCapabilities } from '../../../context/PlanContext';

const faqData = [
    {
        id: 'datos-guardado',
        category: 'progreso',
        question: '¿Cómo se guarda mi progreso en Mis Materias?',
        answer: 'Cada cambio que hacés se guarda automáticamente de forma local en el almacenamiento de tu navegador (localStorage). Si limpiás los datos del navegador o cambiás de dispositivo, ese almacenamiento local se pierde; por eso podés iniciar sesión con Google y sincronizar manualmente tu avance con Cloud Firestore o descargar un respaldo JSON.',
        icon: 'fa-floppy-disk',
    },
    {
        id: 'vencimiento-regularidad',
        category: 'progreso',
        question: '¿Cómo funciona el vencimiento de la regularidad y los intentos de final?',
        answer: 'Cuando marcás una materia como "Regular" y cargás su año y cuatrimestre de cursada, el sistema calcula la vigencia de 5 cuatrimestres consecutivos conforme al Reglamento General de Estudios (RGE) de la UNLu y muestra alertas preventivas. También podés registrar intentos de final (Art. 32° RGE: hasta 4 desaprobaciones; los ausentes no restan intentos).',
        icon: 'fa-clock',
    },
    {
        id: 'aprobar-hasta',
        category: 'progreso',
        question: '¿Qué es "Aprobar hasta..." y cómo se cargan las optativas?',
        answer: '"Aprobar hasta..." es un atajo para marcar rápidamente años completos o hasta el título intermedio, respetando correlativas previas. Para las materias optativas, podés seleccionar la optativa específica aprobada desde el panel de detalle de la materia.',
        icon: 'fa-forward-fast',
    },
    {
        id: 'saweb-import',
        category: 'progreso',
        question: '¿Cómo funciona la importación desde SAWeb y qué pasa con mis datos personales?',
        answer: 'Podés importar tu certificado analítico o listado de cursadas de SAWeb (PDF o texto copiado). El procesamiento ocurre localmente en tu navegador con pdfjs-dist: el parser descarta Nombre, Apellido, DNI y Legajo antes de procesar, no sube el archivo a ningún servidor ni pide tu contraseña de SAWeb, y fusiona las materias sin borrar tus notas previas.',
        icon: 'fa-file-arrow-up',
    },
    {
        id: 'mi-agenda',
        category: 'herramientas',
        question: '¿Qué puedo gestionar en Mi Agenda y cuándo avisan las notificaciones?',
        answer: 'En Mi Agenda podés armar tu grilla horaria semanal (con detección de superposiciones), agendar fechas de parciales, entregas o finales y llevar una bitácora por materia. El centro de notificaciones en la barra superior muestra recordatorios de eventos próximos, vencimientos de regularidad y avisos académicos calculados desde tus datos locales.',
        icon: 'fa-calendar-days',
    },
    {
        id: 'estadisticas-promedio',
        category: 'herramientas',
        question: '¿Qué muestra la sección Estadísticas y cómo calcula el promedio?',
        answer: 'Estadísticas reúne tu promedio general (con y sin aplazos, excluyendo equivalencias sin nota numérica), histograma de calificaciones, evolución por cuatrimestre, efectividad en finales y una tabla desagregada materia por materia.',
        icon: 'fa-chart-column',
    },
    {
        id: 'exportacion-pdf',
        category: 'herramientas',
        question: '¿Qué planillas PDF puedo descargar y tienen validez oficial?',
        answer: 'Desde Mis Materias podés descargar la planilla A4 de tu plan en blanco o pre-rellenada con tu avance, notas y resumen de diplomaturas. Desde el Simulador podés exportar tu cronograma proyectado hasta finalizar la carrera. Todos los PDFs incluyen un pie orientativo no oficial UNLu.',
        icon: 'fa-file-pdf',
    },
    {
        id: 'afecta-progreso',
        category: 'planes',
        question: '¿El Simulador de Avance modifica las materias que ya cargué?',
        answer: 'No. El Simulador trabaja sobre una proyección aislada sin alterar tus datos de Mis Materias. Al importar tu progreso real al Simulador, las materias aprobadas/promocionadas/regulares forman la base del historial y las que tenés marcadas como "Cursando" se ubican en el cuatrimestre actual sin darse por aprobadas.',
        icon: 'fa-shield-halved',
    },
    {
        id: 'cambio-plan-info',
        category: 'planes',
        question: '¿Cómo funcionan Equivalencias y Cambio de Plan (17.13 → 17.14)?',
        answer: 'Las equivalencias directas se basan en el Anexo VI de la Res. HCS 260/24 y su rectificatoria Res. HCS 836/24, mientras que el cronograma de dictado progresivo corresponde al Plan de Transición 2025–2029 (Res. HCS 89/2025). Cuando una equivalencia figura como orientativa o pendiente de confirmación, se señaliza para que la valides administrativamente en la UNLu.',
        icon: 'fa-arrows-rotate',
    },
    {
        id: 'diplomaturas-info',
        category: 'planes',
        question: '¿Qué son las Diplomaturas Intracurriculares y dónde veo mi avance?',
        answer: 'Son certificaciones parciales intracurriculares aprobadas por Res. HCS 726/24 para el Plan 17.14 (no equivalen a un título de grado independiente). Actualmente podés consultar el resumen de avance de tus diplomaturas al exportar la planilla PDF.',
        icon: 'fa-award',
    },
    {
        id: 'pwa-offline',
        category: 'cuenta',
        question: '¿Puedo instalar la app y usarla sin conexión a internet?',
        answer: 'Sí. Podés instalarla como aplicación web progresiva (PWA) desde tu navegador en PC o celular (si tu navegador soporta instalación). Una vez cargados los recursos en el dispositivo, podés consultar y editar tu progreso localmente sin conexión; herramientas pesadas bajo demanda (como el lector PDF) requieren haberse cargado al menos una vez con internet.',
        icon: 'fa-mobile-screen-button',
    },
    {
        id: 'sync-manual',
        category: 'cuenta',
        question: '¿La sincronización con la nube es automática?',
        answer: 'No. La sincronización con Cloud Firestore es manual y transaccional (controlada por versión): cuando iniciás sesión con Google, podés guardar o descargar tus datos desde el menú en la nube. Si editaste en dos dispositivos distintos, el sistema detecta el conflicto y te deja elegir qué copia conservar antes de sobrescribir.',
        icon: 'fa-cloud-arrow-up',
    },
    {
        id: 'respaldos-recuperacion',
        category: 'cuenta',
        question: '¿Cómo hago un respaldo manual o recupero datos si algo falla?',
        answer: 'Desde Configuración podés exportar e importar un archivo JSON con tus planes, notas, regularidades y Mi Agenda. Además, antes de sobrescribir datos locales en una conciliación en la nube o en un nuevo onboarding, la app guarda una copia de recuperación local temporal.',
        icon: 'fa-box-archive',
    },
    {
        id: 'privacidad-posthog',
        category: 'cuenta',
        question: '¿Qué datos de uso recopila la aplicación y cómo funciona el consentimiento?',
        answer: 'Las métricas de uso con PostHog (alojado en PostHog Cloud EU) son opcionales y funcionan bajo consentimiento explícito (opt-in): si rechazás o no aceptás, no se envían eventos analíticos. Nunca se envían notas, DNI, legajos ni grabaciones de pantalla, y podés activar o desactivar esta preferencia en cualquier momento desde Configuración o revisar el detalle en Aviso legal y privacidad.',
        icon: 'fa-user-shield',
    },
    {
        id: 'eliminacion-cuenta',
        category: 'cuenta',
        question: '¿Cómo elimino mi cuenta y mis datos?',
        answer: 'Desde Configuración podés eliminar tu cuenta (requiere reautenticación reciente con Google), lo que borra tu documento en Cloud Firestore, da de baja tu usuario en Firebase Auth y, si lo elegís, limpia los datos locales del navegador. Si habías aceptado métricas en PostHog y querés solicitar también la supresión de esos registros agregados, podés escribir desde Contacto o al correo indicado en /legal.',
        icon: 'fa-trash-can',
    },
    {
        id: 'herramienta-oficial',
        category: 'cuenta',
        question: '¿Es una herramienta oficial de la UNLu?',
        answer: 'No. Es un proyecto estudiantil independiente y de código abierto con fines exclusivamente orientativos. Para inscripciones, equivalencias definitivas, títulos o trámites administrativos, consultá siempre los canales oficiales de la UNLu.',
        icon: 'fa-graduation-cap',
    },
];

const categories = [
    { id: 'todas', label: 'Todas las preguntas', icon: 'fa-layer-group' },
    { id: 'progreso', label: 'Mis Materias y SAWeb', icon: 'fa-graduation-cap' },
    { id: 'herramientas', label: 'Agenda, Estadísticas y PDF', icon: 'fa-calendar-days' },
    { id: 'planes', label: 'Simulador y Planes', icon: 'fa-arrows-rotate' },
    { id: 'cuenta', label: 'Cuenta, PWA y Privacidad', icon: 'fa-shield-halved' },
];

export default function FAQSection() {
    const [selectedCategory, setSelectedCategory] = useState('todas');
    const { canSimulateTransition } = usePlanCapabilities();

    const visibleCategories = categories;

    const effectiveCategory = visibleCategories.some((c) => c.id === selectedCategory)
        ? selectedCategory
        : 'todas';

    const filteredFaq = useMemo(() => {
        const visibleFaq = canSimulateTransition
            ? faqData
            : faqData.filter((item) => item.id !== 'cambio-plan-info');
        if (effectiveCategory === 'todas') return visibleFaq;
        return visibleFaq.filter((item) => item.category === effectiveCategory);
    }, [effectiveCategory, canSimulateTransition]);

    return (
        <section className="py-6">
            <div className="text-center mb-5 space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                    Preguntas frecuentes
                </h2>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-lg mx-auto">
                    Respuestas claras sobre el funcionamiento real del portal, sincronización, normativa y privacidad.
                </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-5 max-w-3xl mx-auto">
                {visibleCategories.map((cat) => {
                    const isSelected = effectiveCategory === cat.id;
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
                            <i
                                className={`fa-solid ${cat.icon} text-[11px] ${isSelected ? 'text-white' : 'opacity-65'}`}
                                aria-hidden="true"
                            />
                            <span>{cat.label}</span>
                        </button>
                    );
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
                    {filteredFaq.map((item) => (
                        <AccordionItem
                            key={item.id}
                            aria-label={item.question}
                            title={
                                <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-lg bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] flex items-center justify-center shrink-0">
                                        <i className={`fa-solid ${item.icon} text-[10px]`} aria-hidden="true" />
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
    );
}
