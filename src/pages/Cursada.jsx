import { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Tabs, Tab, Spinner, Chip } from '@heroui/react';
import { CalendarDays, Clock, BookOpen } from 'lucide-react';
import { usePlanCapabilities } from '../context/PlanContext';
import useCursada from '../hooks/Cursada/useCursada';
import AgendaCalendarioTab from '../components/Cursada/AgendaCalendarioTab';
import HorariosTab from '../components/Cursada/HorariosTab';
import BitacoraTab from '../components/Cursada/BitacoraTab';
import InteractiveTourOverlay from '../components/Tutorial/InteractiveTourOverlay';
import { TOUR_IDS, TUTORIAL_TOURS } from '../config/tutorialTours';

export default function Cursada({ plan }) {
    const { policy } = usePlanCapabilities();
    const [activeTab, setActiveTab] = useState('agenda');

    const {
        activePlan,
        cargandoPlan,
        materiasAgrupadas,
        materiasPorCodigo,
        horarios,
        superposiciones,
        eventos,
        eventosProximos7Dias,
        bitacora,
        addEvento,
        updateEvento,
        deleteEvento,
        addHorario,
        deleteHorario,
        addBitacora,
        updateBitacora,
        deleteBitacora,
    } = useCursada(plan);

    const handleBeforeTourStep = useCallback(
        (step) => {
            if (step?.id === 'agenda_panel' && activeTab !== 'agenda') {
                setActiveTab('agenda');
            }
        },
        [activeTab],
    );

    if (cargandoPlan) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Spinner color="primary" size="lg" label="Cargando tu cursada..." />
            </div>
        );
    }

    const cantCursando = materiasAgrupadas.cursando.length;
    const sinMateriasActivas =
        cantCursando === 0 &&
        materiasAgrupadas.regulares.length === 0 &&
        materiasAgrupadas.libres.length === 0;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 pb-16 flex flex-col gap-5 animate-in fade-in duration-300">
            <InteractiveTourOverlay
                tour={TUTORIAL_TOURS[TOUR_IDS.MI_AGENDA]}
                ready={!cargandoPlan}
                triggerPlacement="inline"
                onBeforeStep={handleBeforeTourStep}
            />

            {/* Cabecera */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs sm:text-sm font-medium text-[#64748B] dark:text-[#94A3B8] truncate">
                            {policy.carrera}
                        </span>
                        <Chip
                            size="sm"
                            variant="flat"
                            className="bg-[#005A36]/10 text-[#005A36] dark:bg-[#2E8B63]/20 dark:text-[#6EE7B7] font-semibold"
                        >
                            Plan {activePlan}
                        </Chip>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E293B] dark:text-[#F1F5F9]">
                        Mi Agenda
                    </h1>
                    <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8]">
                        Organizá tus fechas de parciales, horarios semanales y el registro de temas vistos en clase.
                        {sinMateriasActivas && (
                            <>
                                {' '}
                                <Link
                                    to="/mis-materias"
                                    className="font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:underline"
                                >
                                    Marcá tus materias en curso en Mis Materias →
                                </Link>
                            </>
                        )}
                    </p>
                </div>

                {/* Resumen compacto de indicadores */}
                <div data-tour="agenda-indicadores" className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-xs font-medium text-[#334155] dark:text-[#E2E8F0] tabular-nums">
                        <span className="w-2 h-2 rounded-full bg-[#005A36] dark:bg-[#34D399]" aria-hidden="true" />
                        {cantCursando} en curso
                    </span>
                    <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium tabular-nums ${
                            eventosProximos7Dias.length > 0
                                ? 'bg-[#FFFBEB] dark:bg-[#2D2210] border-[#FDE68A] dark:border-[#5C4318] text-[#92400E] dark:text-[#FCD34D]'
                                : 'bg-white dark:bg-[#161D24] border-[#E2E8F0] dark:border-[#2A3540] text-[#334155] dark:text-[#E2E8F0]'
                        }`}
                    >
                        {eventosProximos7Dias.length} en próximos 7 días
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-xs font-medium text-[#334155] dark:text-[#E2E8F0] tabular-nums">
                        {bitacora.length} {bitacora.length === 1 ? 'clase anotada' : 'clases anotadas'}
                    </span>
                </div>
            </header>

            {/* Navegación interna de 3 vistas */}
            <div data-tour="agenda-tabs">
                <Tabs
                aria-label="Secciones de Mi Agenda"
                variant="bordered"
                selectedKey={activeTab}
                onSelectionChange={(key) => setActiveTab(String(key))}
                classNames={{
                    base: 'w-full',
                    tabList: 'w-full sm:w-auto bg-[#F1F5F9] dark:bg-[#1E2730] p-1 border border-[#E2E8F0] dark:border-[#2A3540] rounded-xl',
                    cursor: 'bg-white dark:bg-[#161D24] border border-[#005A36]/40 dark:border-[#4A9D68]/50 shadow-2xs rounded-lg',
                    tab: 'h-10 px-3 sm:px-4',
                    tabContent: 'text-[#475569] dark:text-[#94A3B8] group-data-[selected=true]:text-[#005A36] dark:group-data-[selected=true]:text-[#6EE7B7]',
                }}
            >
                <Tab
                    key="agenda"
                    title={
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                            <CalendarDays size={15} aria-hidden="true" />
                            <span>Calendario</span>
                        </div>
                    }
                />
                <Tab
                    key="horarios"
                    title={
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                            <Clock size={15} aria-hidden="true" />
                            <span>Horarios</span>
                            {superposiciones.size > 0 && (
                                <span className="w-2 h-2 rounded-full bg-[#D97706]" aria-label="Tiene superposición horaria" />
                            )}
                        </div>
                    }
                />
                <Tab
                    key="bitacora"
                    title={
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                            <BookOpen size={15} aria-hidden="true" />
                            <span>Bitácora</span>
                        </div>
                    }
                />
                </Tabs>
            </div>

            {/* Panel activo */}
            <div data-tour="agenda-panel">
            {activeTab === 'agenda' && (
                <AgendaCalendarioTab
                    eventos={eventos}
                    horarios={horarios}
                    bitacora={bitacora}
                    materiasAgrupadas={materiasAgrupadas}
                    materiasPorCodigo={materiasPorCodigo}
                    onAddEvento={addEvento}
                    onUpdateEvento={updateEvento}
                    onDeleteEvento={deleteEvento}
                />
            )}

            {activeTab === 'horarios' && (
                <HorariosTab
                    horarios={horarios}
                    superposiciones={superposiciones}
                    materiasAgrupadas={materiasAgrupadas}
                    materiasPorCodigo={materiasPorCodigo}
                    onAddHorario={addHorario}
                    onDeleteHorario={deleteHorario}
                />
            )}

            {activeTab === 'bitacora' && (
                <BitacoraTab
                    bitacora={bitacora}
                    materiasAgrupadas={materiasAgrupadas}
                    materiasPorCodigo={materiasPorCodigo}
                    onAddBitacora={addBitacora}
                    onUpdateBitacora={updateBitacora}
                    onDeleteBitacora={deleteBitacora}
                />
            )}
            </div>
        </div>
    );
}

Cursada.propTypes = {
    plan: PropTypes.string,
};
