import React, { useEffect } from 'react';
import { useEquivalencias } from '../hooks/useEquivalencias';
import HeaderEquivalencias from '../components/Equivalencias/HeaderEquivalencias';
import ListaMaterias from '../components/Equivalencias/ListaMaterias';
import SearchMateria from '../components/Equivalencias/SearchMateria';
import InteractiveTourOverlay from '../components/Tutorial/InteractiveTourOverlay';
import { TOUR_IDS, TUTORIAL_TOURS } from '../config/tutorialTours';
import { trackSearch } from '../services/analyticsService';
import { Tabs, Tab } from '@heroui/react';

function Equivalencias() {
    const {
        planViejo,
        planNuevo,
        sourcePlan,
        targetPlan,
        progreso,
        materiasFiltradas,
        filtro,
        setFiltro,
        busqueda,
        setBusqueda,
        comparativaHoras,
        stats,
    } = useEquivalencias();

    useEffect(() => {
        if (!busqueda) return;
        const timer = setTimeout(() => {
            trackSearch({
                term: busqueda,
                resultsCount: materiasFiltradas.length,
                search_origen: 'equivalencias',
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [busqueda, materiasFiltradas.length]);

    if (!planViejo || !planNuevo) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 animate-in fade-in duration-300 pb-16 flex flex-col gap-5">
            <InteractiveTourOverlay
                tour={TUTORIAL_TOURS[TOUR_IDS.EQUIVALENCIAS]}
                ready={Boolean(planViejo && planNuevo)}
            />

            <HeaderEquivalencias
                sourcePlan={sourcePlan}
                targetPlan={targetPlan}
                progresoViejo={stats.porcentajeViejo}
                progresoNuevo={stats.porcentajeNuevo}
                totalMaterias={stats.totalNuevas}
                equivalenciasAprobadas={stats.aprobadasNuevas}
                comparativaHoras={comparativaHoras}
            />

            {/* Barra de Búsqueda y Filtros */}
            <div data-tour="equivalencias-filtros" className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl">
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
                        tabList: 'bg-[#F1F5F9] dark:bg-[#1E2730] p-1 rounded-xl w-full sm:w-auto',
                        tab: 'text-xs font-medium h-7',
                    }}
                >
                    <Tab key="todas" title="Todas" />
                    <Tab key="aprobadas" title="Aprobadas" />
                    <Tab key="pendientes" title="Pendientes" />
                </Tabs>
            </div>

            <div data-tour="equivalencias-lista">
                <ListaMaterias
                    sourcePlan={sourcePlan}
                    targetPlan={targetPlan}
                    materiasFiltradas={materiasFiltradas}
                    progreso={progreso}
                />
            </div>
        </div>
    );
}

export default Equivalencias;
