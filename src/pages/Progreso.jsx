import { Spinner } from "@heroui/react";
import { useActivePlan, usePlanCapabilities } from "../context/PlanContext";
import usePlanData from "../hooks/usePlanData";
import useProgresoDashboard from "../hooks/Progreso/useProgresoDashboard";
import ProgresoTotal from "../components/Progreso/ProgresoTotal";
import ProgresoSearchFilters from "../components/Progreso/ProgresoSearchFilters";
import MateriasList from "../components/Progreso/MateriasList";
import MateriaContextPanel from "../components/Progreso/MateriaContextPanel";
import LeyendaEstados from "../components/Progreso/LeyendaEstados";
import PlanSelectionModal from "../components/Progreso/modals/PlanSelectionModal";
import ImportarSawebModal from "../components/Progreso/modals/ImportarSawebModal";
import InteractiveTourOverlay from "../components/Tutorial/InteractiveTourOverlay";
import { TOUR_IDS, TUTORIAL_TOURS } from "../config/tutorialTours";

/**
 * Pantalla principal "Mis Materias".
 * Estructura: Cabecera + KPIs jerarquizados -> Barra única de búsqueda/filtros ->
 * Master-Detail (acordeones por año + panel contextual con divulgación progresiva) -> Leyenda.
 */
export default function Progreso() {
  const { plan, setPlan } = useActivePlan();
  const { policy } = usePlanCapabilities();

  const {
    materias,
    progreso,
    setProgreso,
    progresoDetalles,
    setProgresoDetalles,
    cargandoPlan,
  } = usePlanData(plan);

  const dashboard = useProgresoDashboard({
    plan,
    materias,
    progreso,
    setProgreso,
    progresoDetalles,
    setProgresoDetalles,
  });

  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-3">
        <PlanSelectionModal isOpen={true} onSelect={setPlan} />
        <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
          Seleccioná tu plan de estudios para consultar y registrar tu progreso.
        </p>
      </div>
    );
  }

  if (cargandoPlan) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center gap-3">
        <Spinner color="success" size="lg" />
        <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
          Cargando plan de estudios {plan}...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
      <InteractiveTourOverlay
        tour={TUTORIAL_TOURS[TOUR_IDS.MIS_MATERIAS]}
        ready={!cargandoPlan && materias.length > 0}
        triggerPlacement="inline"
      />

      <ProgresoTotal
        carrera={policy?.carrera}
        plan={plan}
        kpis={dashboard.kpis}
      />

      <ProgresoSearchFilters
        busqueda={dashboard.busqueda}
        setBusqueda={dashboard.setBusqueda}
        estadoFiltro={dashboard.estadoFiltro}
        setEstadoFiltro={dashboard.setEstadoFiltro}
        soloIncompletas={dashboard.soloIncompletas}
        setSoloIncompletas={dashboard.setSoloIncompletas}
        incompletasCount={dashboard.kpis.incompletasCount}
        vista={dashboard.vista}
        setVista={dashboard.setVista}
        areAllExpanded={dashboard.areAllExpanded}
        toggleExpandAll={dashboard.toggleExpandAll}
        isFiltering={dashboard.isFiltering}
        yearGroups={dashboard.yearGroups}
        plan={plan}
        onRequestApproveGroup={dashboard.requestApproveGroup}
        onRequestReset={dashboard.onResetOpen}
        onOpenSawebImport={dashboard.onSawebImportOpen}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div data-tour="progreso-materias-list" className="lg:col-span-8 min-w-0">
          <MateriasList
            progreso={progreso}
            progresoDetalles={progresoDetalles}
            vista={dashboard.vista}
            isFiltering={dashboard.isFiltering}
            filteredMaterias={dashboard.filteredMaterias}
            clearFilters={dashboard.clearFilters}
            yearGroups={dashboard.yearGroups}
            expandedYears={dashboard.expandedYears}
            setExpandedYears={dashboard.setExpandedYears}
            selectedCodigo={dashboard.selectedCodigo}
            onSelectMateria={(codigo) =>
              dashboard.setSelectedCodigo(
                dashboard.selectedCodigo === codigo ? null : codigo,
              )
            }
            onRequestApproveGroup={dashboard.requestApproveGroup}
            isResetOpen={dashboard.isResetOpen}
            onResetOpenChange={dashboard.onResetOpenChange}
            reestablecerProgreso={dashboard.reestablecerProgreso}
            grupoAAprobar={dashboard.grupoAAprobar}
            isAprobarAnioOpen={dashboard.isAprobarAnioOpen}
            onAprobarAnioOpenChange={dashboard.onAprobarAnioOpenChange}
            confirmApproveGroup={dashboard.confirmApproveGroup}
            isConfirmationOpen={dashboard.isConfirmationOpen}
            onConfirmationOpenChange={dashboard.onConfirmationOpenChange}
            onConfirmationClose={dashboard.onConfirmationClose}
            pendingBlockedTransition={dashboard.pendingBlockedTransition}
            confirmarCascada={dashboard.confirmarCascada}
            setMostrarConfirmacionCascada={dashboard.setMostrarConfirmacionCascada}
          />
        </div>

        <div
          className={`lg:col-span-4 min-w-0 lg:sticky lg:top-[124px] ${
            dashboard.selectedMateria ? "" : "hidden lg:block"
          }`}
        >
          <MateriaContextPanel
            materia={dashboard.selectedMateria}
            materias={materias}
            progreso={progreso}
            progresoDetalles={progresoDetalles}
            setProgresoDetalles={setProgresoDetalles}
            plan={plan}
            cambioDeEstado={dashboard.cambioDeEstado}
            onChangeEstado={dashboard.handleCambioDeEstado}
            solicitarConfirmacionCascada={dashboard.solicitarConfirmacionCascada}
            onSelectMateria={dashboard.setSelectedCodigo}
            onClose={() => dashboard.setSelectedCodigo(null)}
          />
        </div>
      </div>

      <LeyendaEstados materias={materias} />

      <ImportarSawebModal
        isOpen={dashboard.isSawebImportOpen}
        onOpenChange={dashboard.onSawebImportOpenChange}
        plan={plan}
        materias={materias}
        onApplyImport={dashboard.importarDesdeSaweb}
      />
    </div>
  );
}
