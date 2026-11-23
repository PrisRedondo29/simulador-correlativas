import React, { useEffect, useRef } from 'react';
import { useEquivalencias } from '../hooks/useEquivalencias';
import HeaderEquivalencias from '../components/Equivalencias/HeaderEquivalencias';
import ListaMaterias from '../components/Equivalencias/ListaMaterias';
import SearchMateria from '../components/Equivalencias/SearchMateria';
import InteractiveTourOverlay from '../components/Tutorial/InteractiveTourOverlay';
import { TOUR_IDS, TUTORIAL_TOURS } from '../config/tutorialTours';
import { trackEquivalenciasChecked } from '../services/analyticsService';
import { Tabs, Tab } from '@heroui/react';
import { AlertTriangle } from 'lucide-react';

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
    const lastTrackedPairRef = useRef(null);

    useEffect(() => {
        if (!planViejo || !planNuevo || !sourcePlan || !targetPlan) return;
        const pairKey = `${sourcePlan}->${targetPlan}`;
        if (lastTrackedPairRef.current === pairKey) return;
        lastTrackedPairRef.current = pairKey;
        trackEquivalenciasChecked({ planSource: sourcePlan, planTarget: targetPlan });
    }, [planViejo, planNuevo, sourcePlan, targetPlan]);

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
                posiblesEquivalencias={stats.posiblesEquivalencias}
                comparativaHoras={comparativaHoras}
            />

            {stats.posiblesEquivalencias > 0 && (
                <div
                    role="status"
                    className="flex items-start gap-2.5 rounded-2xl border border-[#FDE68A] dark:border-[#5C4318] bg-[#FFFBEB] dark:bg-[#2D2210]/70 px-4 py-3 text-xs sm:text-sm text-[#92400E] dark:text-[#FCD34D]"
                >
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                    <p>
                        Tenés{' '}
                        <strong>
                            {stats.posiblesEquivalencias}{' '}
                            {stats.posiblesEquivalencias === 1 ? 'posible equivalencia' : 'posibles equivalencias'}
                        </strong>{' '}
                        marcada en amarillo (<em>Posible equivalencia · confirmar con UNLu</em>). No se acreditan en tu progreso consolidado hasta confirmación administrativa.
                    </p>
                </div>
            )}

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
