import React, { useState } from 'react';
import { Card, CardBody, Spinner, Button } from '@heroui/react';

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);

    // URL del reporte de Looker Studio
    const LOOKER_URL = "https://datastudio.google.com/embed/reporting/adf72036-79eb-499c-9554-67bcf3975dc9/page/vHJwF";

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Greeting Banner (Imagen 4) */}
            <div className="bg-linear-to-r from-[#005a36] to-[#004d2e] text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-emerald-200 text-xs font-semibold uppercase tracking-wider">
                        <i className="fa-solid fa-building-columns" /> UNLU SECRETARÍA DE PLANEAMIENTO · MÓDULO DE GESTIÓN
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                        Hola de nuevo, Administrador
                    </h1>
                    <p className="text-white/85 text-xs sm:text-sm max-w-2xl font-normal leading-relaxed">
                        Panel de control institucional. Desde aquí podés monitorear los indicadores clave del plan de estudios, consultas y autoevaluación.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <Button
                        size="md"
                        className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs sm:text-sm rounded-xl px-4 shadow-sm"
                        startContent={<i className="fa-solid fa-plus text-xs" />}
                    >
                        Nueva Autoevaluación
                    </Button>
                    <Button
                        size="md"
                        variant="flat"
                        className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm rounded-xl px-4"
                        startContent={<i className="fa-solid fa-upload text-xs" />}
                    >
                        Cargar Propuesta
                    </Button>
                </div>
            </div>

            {/* 4 Stat Metric Cards (Imagen 4) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                    <CardBody className="p-5 flex flex-col justify-between gap-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Proyectos Activos</span>
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#005a36] dark:text-emerald-400 flex items-center justify-center">
                                <i className="fa-solid fa-rocket text-sm" />
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black text-slate-800 dark:text-zinc-100">18</div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                                <i className="fa-solid fa-arrow-trend-up text-[10px]" /> +3 nuevos este mes
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                    <CardBody className="p-5 flex flex-col justify-between gap-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Propuestas en Revisión</span>
                            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                                <i className="fa-regular fa-clipboard text-sm" />
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black text-slate-800 dark:text-zinc-100">7</div>
                            <div className="text-xs text-slate-500 dark:text-zinc-400 font-semibold mt-1">
                                4 pendientes de dictamen
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                    <CardBody className="p-5 flex flex-col justify-between gap-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Dimensiones Evaluadas</span>
                            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                                <i className="fa-solid fa-circle-check text-sm" />
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black text-slate-800 dark:text-zinc-100">5 / 5</div>
                            <div className="text-xs text-teal-600 dark:text-teal-400 font-semibold mt-1">
                                100% completado
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                    <CardBody className="p-5 flex flex-col justify-between gap-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Horas Registradas</span>
                            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                <i className="fa-regular fa-clock text-sm" />
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black text-slate-800 dark:text-zinc-100">1.240 hs</div>
                            <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold mt-1">
                                +120 hs este período
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Looker Studio Report */}
            <Card className="w-full h-[800px] border border-slate-200/80 dark:border-zinc-800 shadow-sm rounded-3xl overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm z-10 gap-4">
                        <Spinner size="lg" color="primary" />
                        <p className="text-sm font-bold text-slate-500 dark:text-zinc-400 animate-pulse">Cargando reporte de Looker Studio...</p>
                    </div>
                )}
                <CardBody className="p-0">
                    <iframe
                        width="100%"
                        height="100%"
                        src={LOOKER_URL}
                        frameBorder="0"
                        style={{ border: 0 }}
                        allowFullScreen
                        onLoad={() => setLoading(false)}
                        title="Dashboard Académico"
                    />
                </CardBody>
            </Card>

            <footer className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <i className="fa-solid fa-users" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Tráfico</p>
                        <p className="text-sm font-black text-foreground">Google Analytics 4</p>
                    </div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <i className="fa-solid fa-database" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Base de Datos</p>
                        <p className="text-sm font-black text-foreground">Firebase Firestore</p>
                    </div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#005a36] dark:text-emerald-400">
                        <i className="fa-solid fa-shield-halved" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Seguridad</p>
                        <p className="text-sm font-black text-foreground">Acceso Restringido</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

