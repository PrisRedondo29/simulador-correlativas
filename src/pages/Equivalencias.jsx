import React, { useEffect } from 'react';
import { useEquivalencias } from '../hooks/useEquivalencias';
import HeaderEquivalencias from '../components/Equivalencias/HeaderEquivalencias';
import ListaMaterias from '../components/Equivalencias/ListaMaterias';
import SearchMateria from '../components/Equivalencias/SearchMateria';
import { trackSearch } from '../services/analyticsService';
import { Tabs, Tab, Card, CardBody, Button, Progress, Chip } from "@heroui/react";
import { Clock } from "lucide-react";
import { useNavigate } from 'react-router-dom';

function Equivalencias() {
    const navigate = useNavigate();
    const {
        planViejo,
        planNuevo,
        progreso,
        materiasFiltradas,
        filtro,
        setFiltro,
        busqueda,
        setBusqueda,
        comparativaHoras,
        stats
    } = useEquivalencias();

    // Trackear búsquedas con debounce (evitar ruido en analytics)
    useEffect(() => {
        if (!busqueda) return;
        const timer = setTimeout(() => {
            trackSearch({ 
                term: busqueda, 
                resultsCount: materiasFiltradas.length, 
                search_origen: 'equivalencias' 
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [busqueda, materiasFiltradas.length]);

    if (!planViejo || !planNuevo) return null;

    const horasDiferencia = Math.abs((comparativaHoras?.viejo?.restantes || 0) - (comparativaHoras?.nuevo?.restantes || 0));
    const esMasEficiente = (comparativaHoras?.nuevo?.restantes || 0) < (comparativaHoras?.viejo?.restantes || 0);

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 animate-in fade-in duration-500 pb-24 lg:pb-8 flex flex-col gap-4 sm:gap-6">
            <HeaderEquivalencias
                progresoViejo={stats.porcentajeViejo}
                progresoNuevo={stats.porcentajeNuevo}
                totalMaterias={stats.totalNuevas}
                equivalenciasAprobadas={stats.aprobadasNuevas}
            />

            {/* Banner Compacto de Transición (Res. 89/2025) */}
            <div className="p-3 sm:p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 border border-[#F5B82E]/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#F5B82E]/20 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-scale-balanced text-sm" />
                    </div>
                    <div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 leading-tight">
                            ¿Te conviene cambiar de plan en este momento?
                        </h4>
                        <p className="text-[11px] text-slate-600 dark:text-zinc-400 hidden sm:block">
                            Verificá la oferta académica activa según la Res. HCS 89/2025 antes de solicitar el trámite formal.
                        </p>
                    </div>
                </div>
                <Button
                    size="sm"
                    onPress={() => navigate('/cambio-plan')}
                    className="bg-[#F5B82E] hover:bg-[#e2a825] text-slate-900 font-extrabold text-xs px-3.5 py-1.5 rounded-xl shrink-0 shadow-2xs w-full sm:w-auto"
                    endContent={<i className="fa-solid fa-arrow-right text-xs" />}
                >
                    Simular cambio de plan
                </Button>
            </div>

            {/* Comparativa de Carga Horaria Unificada */}
            <Card className="border border-default-200/70 dark:border-zinc-800 shadow-2xs bg-default-50/50 dark:bg-zinc-900/40">
                <CardBody className="p-3 sm:p-4 gap-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-primary" />
                            <h3 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-foreground">
                                Carga Horaria Restante
                            </h3>
                        </div>
                        <Chip 
                            size="sm" 
                            variant="flat" 
                            color={esMasEficiente ? "success" : "primary"}
                            className="font-bold text-[10px] sm:text-xs h-6 shadow-2xs"
                        >
                            {esMasEficiente 
                                ? `⚡ ${horasDiferencia}h menos en Plan Nuevo` 
                                : 'Carga horaria equivalente'}
                        </Chip>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 pt-0.5">
                        <div>
                            <div className="flex justify-between text-[11px] font-bold text-default-600 dark:text-default-400 mb-1">
                                <span>Plan 17.13 (Actual)</span>
                                <span className="font-mono">{comparativaHoras?.viejo?.restantes}h / {comparativaHoras?.viejo?.totales}h</span>
                            </div>
                            <Progress 
                                aria-label="Progreso de horas restantes plan 17.13"
                                size="sm" 
                                value={(comparativaHoras?.viejo?.restantes * 100) / (comparativaHoras?.viejo?.totales || 1)} 
                                color="default"
                                className="rotate-180"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-[11px] font-bold text-primary-700 dark:text-primary-400 mb-1">
                                <span>Plan 17.14 (Nuevo)</span>
                                <span className="font-mono">{comparativaHoras?.nuevo?.restantes}h / {comparativaHoras?.nuevo?.totales}h</span>
                            </div>
                            <Progress 
                                aria-label="Progreso de horas restantes plan 17.14"
                                size="sm" 
                                value={(comparativaHoras?.nuevo?.restantes * 100) / (comparativaHoras?.nuevo?.totales || 1)} 
                                color="primary"
                                className="rotate-180"
                            />
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Barra de Búsqueda y Filtros */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-default-100/50 dark:bg-zinc-900/60 border border-default-200/80 rounded-2xl shadow-2xs">
                <div className="flex-1 min-w-0">
                    <SearchMateria busqueda={busqueda} setBusqueda={setBusqueda} />
                </div>
                <Tabs 
                    aria-label="Filtros de estado de materias" 
                    color="primary" 
                    variant="flat" 
                    selectedKey={filtro} 
                    onSelectionChange={setFiltro}
                    size="sm"
                    className="shrink-0"
                    classNames={{
                        tabList: "bg-default-200/60 dark:bg-zinc-800/80 p-1 rounded-xl w-full sm:w-auto",
                        tab: "text-[11px] sm:text-xs font-bold h-7"
                    }}
                >
                    <Tab key="todas" title="Todas" />
                    <Tab key="aprobadas" title="Aprobadas" />
                    <Tab key="pendientes" title="Pendientes" />
                </Tabs>
            </div>

            {/* Lista Principal de Equivalencias */}
            <main>
                <ListaMaterias
                    materiasFiltradas={materiasFiltradas}
                    progreso={progreso}
                />
            </main>
        </div>
    );
}

export default Equivalencias;

