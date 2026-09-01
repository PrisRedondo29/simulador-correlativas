import React, { useState, useEffect, useMemo } from 'react';
import { Button, Progress } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Inicio() {
    const navigate = useNavigate();
    const { user, userData } = useAuth();
    const [progresoGlobal, setProgresoGlobal] = useState({});
    const [planActivo, setPlanActivo] = useState('17.13');

    // Cargar progreso del almacenamiento local
    useEffect(() => {
        const cargarProgreso = () => {
            const pActivo = localStorage.getItem('plan_activo') || '17.13';
            setPlanActivo(pActivo);
            const pPlan = localStorage.getItem(`progreso+${pActivo}`);
            const p1713 = localStorage.getItem('progreso+17.13');
            const data = pPlan || p1713;
            if (data) {
                try {
                    setProgresoGlobal(JSON.parse(data));
                } catch {
                    setProgresoGlobal({});
                }
            } else {
                setProgresoGlobal({});
            }
        };

        cargarProgreso();
        window.addEventListener('storage', cargarProgreso);
        window.addEventListener('progress-hydrated', cargarProgreso);
        return () => {
            window.removeEventListener('storage', cargarProgreso);
            window.removeEventListener('progress-hydrated', cargarProgreso);
        };
    }, []);

    // Calcular estadísticas rápidas del estudiante
    const stats = useMemo(() => {
        const values = Object.values(progresoGlobal);
        const aprobadas = values.filter(v => v === 'Aprobado' || v === 'Promocionado').length;
        const regulares = values.filter(v => v === 'Regular' || v === 'Cursando').length;
        const totalEstimado = planActivo === '17.14' ? 36 : 37;
        const porcentaje = Math.min(100, Math.round((aprobadas / totalEstimado) * 100));
        return {
            aprobadas,
            regulares,
            porcentaje,
            tieneProgreso: values.length > 0 && (aprobadas > 0 || regulares > 0)
        };
    }, [progresoGlobal, planActivo]);

    // Obtener nombre para el saludo personalizado
    const nombreUsuario = useMemo(() => {
        if (userData?.config?.alias) return userData.config.alias;
        if (user?.displayName) return user.displayName.split(' ')[0];
        return null;
    }, [user, userData]);

    // 4 Módulos Core Principales
    const mainTools = [
        {
            title: "Cambio de Plan",
            subtitle: "Simulá la migración al nuevo Plan 17.14",
            tag: "Res. 89/25",
            badgeColor: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-400/40",
            icon: "fa-solid fa-arrows-rotate",
            iconBg: "bg-gradient-to-br from-[#F5B82E] to-amber-500 text-slate-950",
            borderHover: "hover:border-amber-400 dark:hover:border-amber-500/60",
            path: "/cambio-plan",
            highlight: true,
        },
        {
            title: "Simulador de Avance",
            subtitle: "Proyectá correlatividades y cuatrimestres",
            tag: "Estrategia",
            badgeColor: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-400/30",
            icon: "fa-solid fa-code-branch",
            iconBg: "bg-gradient-to-br from-[#005a36] to-emerald-700 text-white",
            borderHover: "hover:border-[#005a36]/50 dark:hover:border-emerald-500/60",
            path: "/simulador",
        },
        {
            title: "Mi Progreso",
            subtitle: "Materias aprobadas, finales y avance",
            tag: "Académico",
            badgeColor: "bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-400/30",
            icon: "fa-solid fa-arrow-trend-up",
            iconBg: "bg-gradient-to-br from-[#7e22ce] to-indigo-600 text-white",
            borderHover: "hover:border-purple-400 dark:hover:border-purple-500/60",
            path: "/progreso",
        },
        {
            title: "Equivalencias",
            subtitle: "Compará materias entre planes y carreras",
            tag: "Planes",
            badgeColor: "bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-400/30",
            icon: "fa-solid fa-book-open",
            iconBg: "bg-gradient-to-br from-[#1e40af] to-sky-600 text-white",
            borderHover: "hover:border-blue-400 dark:hover:border-blue-500/60",
            path: "/equivalencias",
        },
    ];

    // Recursos secundarios rápidos
    const quickResources = [
        {
            title: "Guía y Tutoriales",
            desc: "Cómo usar el simulador paso a paso",
            icon: "fa-solid fa-circle-question",
            iconColor: "text-amber-600 dark:text-amber-400",
            path: "/como-usar",
            isExternal: false
        },
        {
            title: "Centro de Estudiantes (CODES)",
            desc: "Comunidad, dudas y acompañamiento",
            icon: "fa-solid fa-users",
            iconColor: "text-emerald-600 dark:text-emerald-400",
            path: "https://www.codesunlu.tech/",
            isExternal: true
        },
        {
            title: "Configuración & Respaldos",
            desc: "Sincronización en la nube y preferencias",
            icon: "fa-solid fa-gear",
            iconColor: "text-indigo-600 dark:text-indigo-400",
            path: "/config",
            isExternal: false
        }
    ];

    return (
        <div className="flex flex-col gap-6 sm:gap-8 py-4 sm:py-8 px-3 sm:px-6 md:px-10 max-w-7xl mx-auto animate-in fade-in duration-300">

            {/* 1. Header de Bienvenida & Saludo */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#005a36] dark:text-emerald-400 font-bold text-[11px] uppercase tracking-wider border border-emerald-200/50">
                        <i className="fa-solid fa-graduation-cap text-xs" /> UNLu Sistemas de Información
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-zinc-50 tracking-tight">
                        {nombreUsuario ? `¡Hola, ${nombreUsuario}! 🐧` : "Portal Estudiantil"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm max-w-xl leading-relaxed">
                        Tu centro de control académico para proyectar cursadas, verificar correlatividades y simular escenarios.
                    </p>
                </div>

                {/* Micro-Widget de Progreso Rápido o CTA inicial */}
                {stats.tieneProgreso ? (
                    <div
                        onClick={() => navigate('/progreso')}
                        className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-4 shrink-0 group max-w-md"
                    >
                        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/60 text-[#005a36] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                            <i className="fa-solid fa-chart-pie text-lg" />
                        </div>
                        <div className="flex-1 min-w-[170px]">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                                    {stats.aprobadas} materias ({stats.porcentaje}%)
                                </span>
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    Plan {planActivo}
                                </span>
                            </div>
                            <Progress
                                size="sm"
                                value={stats.porcentaje}
                                color="success"
                                aria-label="Porcentaje de avance"
                                className="max-w-md"
                            />
                        </div>
                        <i className="fa-solid fa-chevron-right text-xs text-slate-400 dark:text-zinc-500 group-hover:text-[#005a36] dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                ) : (
                    <Button
                        size="md"
                        variant="flat"
                        color="success"
                        onPress={() => navigate('/progreso')}
                        className="font-bold text-xs sm:text-sm self-start md:self-center shrink-0 rounded-xl"
                        startContent={<i className="fa-solid fa-list-check" />}
                    >
                        Cargar mis materias aprobadas
                    </Button>
                )}
            </header>

            {/* 2. Banner Destacado Oficial: Transición de Plan Res. HCS 89/2025 */}
            <section className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-amber-950/20 border-2 border-[#F5B82E] rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 shadow-xs relative overflow-hidden">
                <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-[#F5B82E] to-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
                        <i className="fa-solid fa-scale-balanced text-xl sm:text-2xl" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-[#F5B82E] text-slate-950 px-2 py-0.5 rounded-full">
                                OFICIAL UNLu
                            </span>
                            <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">Resolución HCS 89/2025</span>
                        </div>
                        <h2 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 dark:text-zinc-50 tracking-tight leading-snug">
                            ¿Te conviene cambiar al nuevo Plan 17.14?
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 max-w-2xl leading-relaxed">
                            Analizá con tu avance real si el nuevo plan tiene oferta inmediata o si te conviene mantener el Plan 17.13 para evitar baches.
                        </p>
                    </div>
                </div>
                <Button
                    onPress={() => navigate('/cambio-plan')}
                    className="bg-[#005a36] hover:bg-[#004a2c] text-white font-black text-xs sm:text-sm px-5 py-5 sm:px-6 sm:py-6 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-all shrink-0 self-stretch md:self-center flex items-center justify-center gap-2"
                    startContent={<i className="fa-solid fa-arrows-rotate text-xs sm:text-sm text-[#F5B82E]" />}
                >
                    Simular Cambio de Plan
                </Button>
            </section>

            {/* 3. Módulos Principales (Grid 2x2 en móviles / 4 columnas en desktop) */}
            <section className="flex flex-col gap-3 sm:gap-4 w-full">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                        <span>Herramientas Académicas</span>
                    </h2>
                    <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium hidden sm:inline">
                        Acceso directo a tus simulaciones
                    </span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {mainTools.map((tool, idx) => (
                        <div
                            key={idx}
                            onClick={() => navigate(tool.path)}
                            className={`bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 ${tool.borderHover} rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden min-h-[140px] sm:min-h-[160px]`}
                        >
                            <div className="flex flex-col gap-2.5 sm:gap-3">
                                <div className="flex items-center justify-between">
                                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-xs ${tool.iconBg} group-hover:scale-105 transition-transform duration-200`}>
                                        <i className={`${tool.icon} text-base sm:text-lg`} />
                                    </div>
                                    <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tool.badgeColor}`}>
                                        {tool.tag}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-zinc-100 leading-snug group-hover:text-[#005a36] dark:group-hover:text-emerald-400 transition-colors">
                                        {tool.title}
                                    </h3>
                                    <p className="text-slate-500 dark:text-zinc-400 text-[11px] sm:text-xs leading-relaxed font-normal mt-1 line-clamp-2">
                                        {tool.subtitle}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 mt-auto border-t border-slate-100 dark:border-zinc-800/80">
                                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-500 group-hover:text-[#005a36] dark:group-hover:text-emerald-400 transition-colors">
                                    Abrir
                                </span>
                                <i className="fa-solid fa-arrow-right text-[10px] sm:text-xs text-slate-400 dark:text-zinc-500 group-hover:text-[#005a36] dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 4. Recursos y Enlaces Rápidos (3 Tarjetas Horizontales Limpias) */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 w-full">
                {quickResources.map((res, idx) => (
                    <div
                        key={idx}
                        onClick={() => {
                            if (res.isExternal) {
                                window.open(res.path, '_blank', 'noopener,noreferrer');
                            } else {
                                navigate(res.path);
                            }
                        }}
                        className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                <i className={`${res.icon} text-base ${res.iconColor}`} />
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-zinc-200 truncate group-hover:text-[#005a36] dark:group-hover:text-emerald-400 transition-colors">
                                    {res.title}
                                </h4>
                                <p className="text-[11px] text-slate-400 dark:text-zinc-400 truncate">
                                    {res.desc}
                                </p>
                            </div>
                        </div>
                        <i className={`text-xs text-slate-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-all ${res.isExternal ? 'fa-solid fa-arrow-up-right-from-square' : 'fa-solid fa-chevron-right'}`} />
                    </div>
                ))}
            </section>

            {/* 5. Banner Compacto de Soporte / Reportar Errores (Reemplaza el formulario gigante) */}
            <section className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <i className="fa-solid fa-comments text-lg sm:text-xl" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                            ¿Dudas con una correlativa o sugerencias de mejora?
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-normal">
                            Reportá errores en el plan o envianos tu mensaje a través del formulario de soporte.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
                    <Button
                        onPress={() => navigate('/contacto')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-5 h-10 sm:h-11 rounded-xl shadow-sm hover:scale-102 transition-transform flex-1 sm:flex-initial"
                        endContent={<i className="fa-solid fa-paper-plane text-xs" />}
                    >
                        Reportar / Contacto
                    </Button>
                </div>
            </section>

        </div>
    );
}

export default Inicio;