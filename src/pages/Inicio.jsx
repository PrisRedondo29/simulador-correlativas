import React, { useState, useEffect, useMemo } from 'react';
import { Button, Progress } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlanCapabilities } from '../context/PlanContext';
import { DEFAULT_PLAN } from '../config/planPolicies';

function Inicio() {
    const navigate = useNavigate();
    const { user, userData } = useAuth();
    const { plan, policy, canSimulateTransition, transitionInfo } = usePlanCapabilities();
    const [progresoGlobal, setProgresoGlobal] = useState({});
    const planActivo = plan || DEFAULT_PLAN;

    useEffect(() => {
        const cargarProgreso = () => {
            const pPlan = localStorage.getItem(`progreso+${planActivo}`);
            const data = pPlan || (planActivo === '17.13' ? localStorage.getItem('progreso+17.13') : null);
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
    }, [planActivo]);

    const stats = useMemo(() => {
        const values = Object.values(progresoGlobal);
        const aprobadas = values.filter(v => v === 'Aprobado' || v === 'Promocionado').length;
        const regulares = values.filter(v => v === 'Regular' || v === 'Cursando').length;
        const totalEstimado = policy?.estimatedSubjects || 36;
        const porcentaje = Math.min(100, Math.round((aprobadas / totalEstimado) * 100));
        return {
            aprobadas,
            regulares,
            porcentaje,
            tieneProgreso: values.length > 0 && (aprobadas > 0 || regulares > 0),
        };
    }, [progresoGlobal, policy]);

    const nombreUsuario = useMemo(() => {
        if (userData?.config?.alias) return userData.config.alias;
        if (user?.displayName) return user.displayName.split(' ')[0];
        return null;
    }, [user, userData]);

    const mainTools = useMemo(() => {
        const base = [
            {
                title: 'Mi Progreso',
                subtitle: 'Registrá materias aprobadas, finales, intentos y correlativas',
                tag: 'Núcleo',
                icon: 'fa-solid fa-graduation-cap',
                path: '/progreso',
            },
            {
                title: 'Simulador de Avance',
                subtitle: 'Proyectá tus próximos cuatrimestres y exportá tu plan en PDF',
                tag: 'Proyección',
                icon: 'fa-solid fa-route',
                path: '/simulador',
            },
            {
                title: 'Equivalencias',
                subtitle: 'Compará materias y carga horaria entre los planes 17.13 y 17.14',
                tag: 'Planes',
                icon: 'fa-solid fa-right-left',
                path: '/equivalencias',
            },
        ];

        if (canSimulateTransition && transitionInfo) {
            base.push({
                title: 'Cambio de Plan',
                subtitle: `Evaluá si te conviene migrar al Plan ${transitionInfo.targetPlan} según tu avance real`,
                tag: transitionInfo.shortBadge,
                isAmberTag: true,
                icon: 'fa-solid fa-arrows-rotate',
                path: transitionInfo.route,
            });
        }

        return base;
    }, [canSimulateTransition, transitionInfo]);

    const quickResources = [
        {
            title: 'Guía y Tutoriales',
            desc: 'Cómo usar el simulador paso a paso',
            icon: 'fa-solid fa-circle-question',
            path: '/como-usar',
            isExternal: false,
        },
        {
            title: 'Centro de Estudiantes (CODES)',
            desc: 'Comunidad, consultas y acompañamiento',
            icon: 'fa-solid fa-users',
            path: 'https://www.codesunlu.tech/',
            isExternal: true,
        },
        {
            title: 'Configuración y Respaldos',
            desc: 'Plan de estudios, tema y sincronización',
            icon: 'fa-solid fa-gear',
            path: '/config',
            isExternal: false,
        },
    ];

    return (
        <div className="flex flex-col gap-6 py-6 sm:py-8 px-4 sm:px-6 md:px-10 max-w-6xl mx-auto animate-in fade-in duration-300">
            {/* 1. Bienvenida y Resumen de Avance */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#005A36] dark:text-[#86EFAC]">
                        <i className="fa-solid fa-building-columns text-[11px]" aria-hidden="true" />
                        Licenciatura en Sistemas de Información · UNLu
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
                        {nombreUsuario ? `Hola, ${nombreUsuario}` : 'Portal Estudiantil'}
                    </h1>
                    <p className="text-[#64748B] dark:text-[#94A3B8] text-sm max-w-xl leading-relaxed">
                        Organizá tu recorrido académico, controlá correlatividades y simulá tus próximos cuatrimestres en un entorno claro.
                    </p>
                </div>

                {stats.tieneProgreso ? (
                    <button
                        type="button"
                        onClick={() => navigate('/progreso')}
                        className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] hover:border-[#478559] dark:hover:border-[#4A9D68] rounded-2xl p-4 shadow-2xs transition-colors cursor-pointer flex items-center gap-4 shrink-0 group text-left w-full md:w-auto md:min-w-[290px]"
                    >
                        <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] dark:bg-[#102A20] text-[#478559] dark:text-[#86EFAC] flex items-center justify-center shrink-0 border border-[#A7F3D0] dark:border-[#1E4D38]">
                            <i className="fa-solid fa-chart-pie text-base" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                                    {stats.aprobadas} materias aprobadas ({stats.porcentaje}%)
                                </span>
                                <span className="text-[11px] font-medium text-[#478559] dark:text-[#86EFAC] shrink-0">
                                    Plan {planActivo}
                                </span>
                            </div>
                            <Progress
                                size="sm"
                                value={stats.porcentaje}
                                aria-label="Porcentaje de avance"
                                classNames={{
                                    track: 'bg-[#E2E8F0] dark:bg-[#2A3540]',
                                    indicator: 'bg-[#478559] dark:bg-[#4A9D68]',
                                }}
                            />
                        </div>
                        <i className="fa-solid fa-chevron-right text-xs text-[#64748B] group-hover:text-[#005A36] dark:group-hover:text-[#6EE7B7] transition-colors" aria-hidden="true" />
                    </button>
                ) : (
                    <Button
                        size="md"
                        onPress={() => navigate('/progreso')}
                        className="bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] dark:hover:bg-[#246B4E] text-white font-semibold text-sm self-start md:self-center shrink-0 rounded-xl px-5"
                        startContent={<i className="fa-solid fa-list-check text-xs" />}
                    >
                        Cargar mis materias
                    </Button>
                )}
            </header>

            {/* 2. Aviso Institucional: Transición (solo planes con transición habilitada) */}
            {canSimulateTransition && transitionInfo && (
                <section className="bg-[#FFFBEB] dark:bg-[#2B2111]/70 border border-[#FDE68A] dark:border-[#5C4318] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] dark:bg-[#423115] text-[#92400E] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#5C4318] flex items-center justify-center shrink-0 mt-0.5">
                            <i className="fa-solid fa-scale-balanced text-base" aria-hidden="true" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-semibold text-[#92400E] dark:text-[#FCD34D] bg-[#FEF3C7] dark:bg-[#423115] px-2 py-0.5 rounded-md border border-[#FDE68A] dark:border-[#5C4318]">
                                    {transitionInfo.resolution}
                                </span>
                                <span className="text-xs font-medium text-[#92400E]/85 dark:text-[#FCD34D]/85">
                                    Transición Plan {planActivo} → {transitionInfo.targetPlan}
                                </span>
                            </div>
                            <h2 className="text-base sm:text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] leading-snug">
                                ¿Te conviene cambiar al nuevo Plan {transitionInfo.targetPlan}?
                            </h2>
                            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] max-w-2xl leading-relaxed">
                                Evaluá con tu avance real si el nuevo plan tiene oferta inmediata o si conviene mantener el Plan {planActivo} para evitar baches.
                            </p>
                        </div>
                    </div>
                    <Button
                        onPress={() => navigate(transitionInfo.route)}
                        className="bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] dark:hover:bg-[#246B4E] text-white font-semibold text-xs sm:text-sm px-5 h-10 rounded-xl shrink-0 self-stretch md:self-center"
                        endContent={<i className="fa-solid fa-arrow-right text-xs" />}
                    >
                        Simular cambio de plan
                    </Button>
                </section>
            )}

            {/* 3. Módulos Principales (Identidad visual unificada) */}
            <section className="flex flex-col gap-3.5 w-full">
                <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
                        Herramientas académicas
                    </h2>
                    <span className="text-xs text-[#64748B] dark:text-[#94A3B8] hidden sm:inline">
                        Elegí una sección para comenzar
                    </span>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 ${mainTools.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
                    {mainTools.map((tool) => (
                        <button
                            key={tool.path}
                            type="button"
                            onClick={() => navigate(tool.path)}
                            className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] hover:border-[#005A36]/50 dark:hover:border-[#4A9D68]/60 rounded-2xl p-4 sm:p-5 shadow-2xs transition-colors duration-150 cursor-pointer flex flex-col justify-between group text-left min-h-[146px]"
                        >
                            <div className="flex flex-col gap-3 w-full">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#D1FAE5] dark:border-[#1E4D38] flex items-center justify-center shrink-0">
                                        <i className={`${tool.icon} text-base`} aria-hidden="true" />
                                    </div>
                                    <span
                                        className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                                            tool.isAmberTag
                                                ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] dark:bg-[#2D2210] dark:text-[#FCD34D] dark:border-[#5C4318]'
                                                : 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0] dark:bg-[#1E2730] dark:text-[#94A3B8] dark:border-[#2A3540]'
                                        }`}
                                    >
                                        {tool.tag}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm sm:text-base text-[#1E293B] dark:text-[#F1F5F9] group-hover:text-[#005A36] dark:group-hover:text-[#6EE7B7] transition-colors">
                                        {tool.title}
                                    </h3>
                                    <p className="text-[#64748B] dark:text-[#94A3B8] text-xs leading-relaxed mt-1">
                                        {tool.subtitle}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#F1F5F9] dark:border-[#2A3540] w-full">
                                <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8] group-hover:text-[#005A36] dark:group-hover:text-[#6EE7B7] transition-colors">
                                    Abrir módulo
                                </span>
                                <i className="fa-solid fa-arrow-right text-[11px] text-[#64748B] group-hover:text-[#005A36] dark:group-hover:text-[#6EE7B7] transition-colors" aria-hidden="true" />
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {/* 4. Recursos Rápidos */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                {quickResources.map((res) => (
                    <button
                        key={res.title}
                        type="button"
                        onClick={() => {
                            if (res.isExternal) {
                                window.open(res.path, '_blank', 'noopener,noreferrer');
                            } else {
                                navigate(res.path);
                            }
                        }}
                        className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] hover:border-[#005A36]/40 dark:hover:border-[#4A9D68]/50 rounded-2xl p-3.5 transition-colors cursor-pointer flex items-center justify-between gap-3 group text-left"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-[#F1F5F9] dark:bg-[#1E2730] text-[#475569] dark:text-[#CBD5E1] flex items-center justify-center shrink-0">
                                <i className={`${res.icon} text-sm`} aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-semibold text-xs sm:text-sm text-[#1E293B] dark:text-[#F1F5F9] truncate group-hover:text-[#005A36] dark:group-hover:text-[#6EE7B7] transition-colors">
                                    {res.title}
                                </h3>
                                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] truncate">
                                    {res.desc}
                                </p>
                            </div>
                        </div>
                        <i
                            className={`text-xs text-[#64748B] dark:text-[#94A3B8] shrink-0 ${
                                res.isExternal ? 'fa-solid fa-arrow-up-right-from-square' : 'fa-solid fa-chevron-right'
                            }`}
                            aria-hidden="true"
                        />
                    </button>
                ))}
            </section>

            {/* 5. Nota discreta de soporte */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-[#F1F5F9] dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540]">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1]">
                    <i className="fa-regular fa-comment-dots text-[#005A36] dark:text-[#6EE7B7]" aria-hidden="true" />
                    <span>¿Encontraste un error en las correlativas o querés enviar una sugerencia?</span>
                </div>
                <Button
                    size="sm"
                    variant="flat"
                    onPress={() => navigate('/contacto')}
                    className="bg-white dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540] text-[#1E293B] dark:text-[#F1F5F9] font-medium text-xs rounded-xl shrink-0"
                    endContent={<i className="fa-solid fa-arrow-right text-[10px]" />}
                >
                    Ir a Contacto
                </Button>
            </div>
        </div>
    );
}

export default Inicio;
