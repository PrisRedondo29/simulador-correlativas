import { Button, addToast } from '@heroui/react'
import { Card, CardBody, CardHeader } from '@heroui/card'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import ContactForm from '../components/Shared/ContactForm'

function Inicio() {
    const navigate = useNavigate()

    const portalCards = [
        {
            title: "Simulador de Avances",
            description: "Proyectá tu trayectoria académica y explorá distintos escenarios de cursado",
            icon: "fa-solid fa-code-branch",
            iconBg: "bg-[#005a36] text-white",
            titleColor: "text-[#005a36] dark:text-emerald-400",
            path: "/simulador",
        },
        {
            title: "Equivalencias",
            description: "Consultá equivalencias entre materias y carreras dentro de la institución",
            icon: "fa-solid fa-book-open",
            iconBg: "bg-[#1e40af] text-white",
            titleColor: "text-[#1e40af] dark:text-blue-400",
            path: "/equivalencias",
        },
        {
            title: "Progreso",
            description: "Visualizá tu avance en la carrera, materias aprobadas y créditos acumulados",
            icon: "fa-solid fa-arrow-trend-up",
            iconBg: "bg-[#7e22ce] text-white",
            titleColor: "text-[#7e22ce] dark:text-purple-400",
            path: "/progreso",
        },
        {
            title: "Ayuda / FAQs",
            description: "Encontrá respuestas a las preguntas más frecuentes y recursos de soporte",
            icon: "fa-solid fa-circle-question",
            iconBg: "bg-[#c2410c] text-white",
            titleColor: "text-[#c2410c] dark:text-amber-500",
            path: "/como-usar",
        },
        {
            title: "Calendario Académico",
            description: "Fechas clave, exámenes, inscripciones y eventos institucionales",
            icon: "fa-solid fa-calendar-days",
            iconBg: "bg-[#d97706] text-white",
            titleColor: "text-[#d97706] dark:text-yellow-500",
            isInfoModal: true,
        },
        {
            title: "Documentos",
            description: "Certificados, constancias y trámites administrativos en un solo lugar",
            icon: "fa-solid fa-file-lines",
            iconBg: "bg-[#991b1b] text-white",
            titleColor: "text-[#991b1b] dark:text-rose-400",
            isInfoModal: true,
        },
        {
            title: "Comunidad",
            description: "Grupos de estudio, foros y recursos colaborativos entre estudiantes",
            icon: "fa-solid fa-users",
            iconBg: "bg-[#0e7490] text-white",
            titleColor: "text-[#0e7490] dark:text-teal-400",
            path: "https://www.codesunlu.tech/",
            isExternal: true,
        },
        {
            title: "Configuración",
            description: "Personalizá tu perfil, notificaciones y preferencias de la plataforma",
            icon: "fa-solid fa-gear",
            iconBg: "bg-[#4338ca] text-white",
            titleColor: "text-[#4338ca] dark:text-indigo-400",
            path: "/config",
        },
    ];

    const buttonItems = [
        { name: 'Ver mi progreso', icon: 'fa-graduation-cap', path: '/progreso', isDeactivated: false, color: 'primary' },
        { name: 'Simulador de Avance', icon: 'fa-route', path: '/simulador', isDeactivated: false, color: 'secondary' },
        { name: 'Consultar Equivalencias', icon: 'fa-right-left', path: '/equivalencias', isDeactivated: false, color: 'success' },
    ]

    const infoItems = [
        {
            title: "Adiós al Laberinto Académico",
            description: 'Una interfaz gráfica dinámica reemplaza los PDFs estáticos, mostrando el impacto instantáneo de escenarios "What-If" en futuros semestres. Navega tu plan de estudios de forma visual e intuitiva.',
            icon: "fa-solid fa-sitemap text-[#005a36]",
            color: "bg-background border-slate-200/80 hover:border-emerald-500/40"
        },
        {
            title: "Automatización de Correlativas",
            description: "Un motor inteligente gestiona automáticamente la cadena compleja de requisitos previos con actualizaciones en cascada. Olvídate de verificar manualmente cada correlatividad.",
            icon: "fa-solid fa-gears text-emerald-600",
            color: "bg-background border-slate-200/80 hover:border-emerald-500/40"
        },
        {
            title: "Persistencia sin Logins",
            description: "Experiencia de usuario rápida usando el almacenamiento local del navegador. Tu progreso se mantiene guardado incluso si cierras la pestaña, sin necesidad de cuentas complejas.",
            icon: "fa-solid fa-floppy-disk text-amber-600",
            color: "bg-background border-slate-200/80 hover:border-amber-500/40"
        }
    ]

    const handleClick = (item) => {
        if (item.isDeactivated) {
            addToast({ title: "En progreso", description: "Esta página aún no está disponible", color: "warning" })
        } else {
            navigate(item.path)
        }
    }

    const handlePortalClick = (card) => {
        if (card.isExternal) {
            window.open(card.path, '_blank', 'noopener,noreferrer');
        } else if (card.isInfoModal) {
            addToast({ title: card.title, description: "Próximamente disponible en el portal estudiantil.", color: "primary" });
        } else if (card.path) {
            navigate(card.path);
        }
    }

    return (
        <div className="flex flex-col gap-12 md:gap-16 py-6 md:py-10 px-4 md:px-10 max-w-7xl mx-auto animate-in fade-in duration-500 overflow-hidden">
            {/* Sección Portal Estudiantil - Grid de Accesos Rápidos (Imagen 1) */}
            <section className="flex flex-col gap-6 w-full">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#005a36] dark:text-emerald-400 tracking-tight">
                        ¿A dónde querés ir hoy?
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base font-medium">
                        Seleccioná una sección para comenzar
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {portalCards.map((card, idx) => (
                        <div
                            key={idx}
                            onClick={() => handlePortalClick(card)}
                            className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 hover:border-[#005a36]/40 dark:hover:border-emerald-500/40 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between group min-h-[160px] relative overflow-hidden"
                        >
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${card.iconBg} group-hover:scale-105 transition-transform duration-300`}>
                                        <i className={`${card.icon} text-lg`} />
                                    </div>
                                </div>
                                <h3 className={`font-bold text-base ${card.titleColor} leading-snug`}>
                                    {card.title}
                                </h3>
                                <p className="text-slate-500 dark:text-zinc-400 text-xs leading-relaxed font-normal">
                                    {card.description}
                                </p>
                            </div>
                            <div className="flex justify-end mt-3 pt-2">
                                <i className="fa-solid fa-chevron-right text-slate-300 dark:text-zinc-600 text-xs group-hover:text-[#005a36] dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all duration-200" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Hero Section Banner */}
            <section className="bg-linear-to-br from-[#005a36] to-[#004227] text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden flex flex-col items-center text-center gap-6">
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-emerald-200 text-xs font-semibold uppercase tracking-wider">
                    <i className="fa-solid fa-graduation-cap" /> UNLu Sistemas de Información
                </div>

                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight max-w-4xl leading-tight">
                    Planificá tu carrera en Sistemas <br className="hidden md:block" />
                    <span className="text-emerald-300">sin errores ni sorpresas</span>
                </h2>
                
                <p className="text-base md:text-xl text-white/85 max-w-2xl leading-relaxed">
                    Visualizá tu progreso, simula correlatividades automáticamente y tomá decisiones informadas sobre tu futuro académico.
                </p>

                <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-2 w-full">
                    {buttonItems.map((item, index) => (
                        <Button
                            key={index}
                            color={item.isDeactivated ? "default" : item.color}
                            variant={index === 0 ? "solid" : "flat"}
                            size="lg"
                            className={`font-bold rounded-xl px-6 sm:px-8 shadow-sm ${index === 0 ? "bg-white text-[#005a36] hover:bg-emerald-50" : "bg-white/15 text-white hover:bg-white/25 border border-white/20"} ${item.isDeactivated ? "opacity-60" : "hover:scale-105 transition-transform"}`}
                            onPress={() => handleClick(item)}
                            startContent={<i className={`fa-solid ${item.icon}`}></i>}
                        >
                            {item.name}
                        </Button>
                    ))}
                </div>
            </section>

            {/* Features Section */}
            <section className="flex flex-col gap-8 w-full">
                <div className="text-center space-y-2">
                    <div className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-[#005a36] dark:text-emerald-400 font-bold text-xs uppercase tracking-widest rounded-md border border-emerald-200/50">
                        Características
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
                        ¿Cómo te ayuda esta herramienta?
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
                        Resolvemos los problemas más comunes que enfrentan los estudiantes al planificar su carrera universitaria.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {infoItems.map((item, index) => (
                        <Card
                            key={index}
                            className={`bg-white dark:bg-zinc-900 shadow-xs border border-slate-200/80 dark:border-zinc-800 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md group ${item.color}`}
                        >
                            <CardHeader className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 px-6 pt-6 pb-2">
                                <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 group-hover:scale-110 transition-transform duration-300">
                                    <i className={`${item.icon} text-xl`}></i>
                                </div>
                                <h3 className="text-lg font-bold text-foreground leading-tight">
                                    {item.title}
                                </h3>
                            </CardHeader>
                            <CardBody className="px-6 pb-6 pt-2 text-slate-500 dark:text-zinc-400 text-sm leading-relaxed font-normal">
                                {item.description}
                            </CardBody>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Promo CODES Section */}
            <section className="flex flex-col items-center w-full">
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 max-w-5xl w-full shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
                    <div className="shrink-0 bg-slate-50 dark:bg-zinc-800 p-3 rounded-2xl shadow-xs border border-slate-200 dark:border-zinc-700 z-10 transform group-hover:scale-105 transition-transform duration-500">
                        <img src="/imgs/logo-codes.png" alt="Logo CODES" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-1.5 z-10">
                        <div className="inline-block text-[10px] font-bold text-[#005a36] dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/40">
                            Comunidad Estudiantil
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-foreground">Centro de Estudiantes (CODES)</h3>
                        <p className="text-slate-500 dark:text-zinc-400 text-sm leading-relaxed">
                            ¿Tenés dudas sobre correlativas, inscripciones o trámites? ¡Acercate al CODES! El centro de estudiantes de Sistemas está para ayudarte y guiarte en tu camino universitario.
                        </p>
                    </div>
                    <div className="z-10 shrink-0">
                        <Button
                            as="a"
                            href="https://www.codesunlu.tech/"
                            target="_blank"
                            rel="noopener noreferrer"
                            color="primary"
                            variant="shadow"
                            className="font-bold rounded-xl px-6 h-11 shadow-sm hover:scale-105 transition-transform"
                            endContent={<i className="fa-solid fa-arrow-up-right-from-square text-xs ml-1" />}
                        >
                            Visitar Página
                        </Button>
                    </div>
                </div>
            </section>

            {/* Contact Form Section */}
            <section className="flex flex-col items-center gap-8 mb-6 w-full">
                <div className="text-center space-y-2">
                    <div className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-[#005a36] dark:text-emerald-400 font-bold text-xs uppercase tracking-widest rounded-md border border-emerald-200/50">
                        Soporte y Consultas
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
                        ¿Dudas, sugerencias o problemas?
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
                        Ayudanos a mejorar la herramienta o reportá un error enviando un mensaje directo.
                    </p>
                </div>

                <ContactForm />
            </section>
        </div>
    )
}

export default Inicio