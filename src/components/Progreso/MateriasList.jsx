import {
  Accordion,
  AccordionItem,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { CheckCheck, CheckCircle2, RotateCcw, SearchX } from "lucide-react";
import MateriaCard from "./MateriaCard";
import ConfirmarCambioModal from "./modals/ConfirmarCambioModal";
import CapturaTransicionModal from "./modals/CapturaTransicionModal";
import { esMateriaIncompleta } from "../../utils/Progreso/materiasUtils";

function YearProgressBadge({ completedCount, totalCount }) {
  const isComplete = totalCount > 0 && completedCount === totalCount;
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium tabular-nums shrink-0">
      <span
        className={
          isComplete
            ? "text-[#166534] dark:text-[#86EFAC]"
            : "text-[#64748B] dark:text-[#94A3B8]"
        }
      >
        {completedCount}/{totalCount} materias
      </span>
      {isComplete ? (
        <CheckCircle2
          className="w-4 h-4 text-[#478559] dark:text-[#6EE7B7]"
          aria-hidden="true"
        />
      ) : (
        <span
          className="w-2 h-2 rounded-full bg-[#CBD5E1] dark:bg-[#334155]"
          aria-hidden="true"
        />
      )}
    </span>
  );
}

/**
 * Listado de materias organizado en acordeones por año (y talleres),
 * con cuatrimestres apilados verticalmente en móvil y lado a lado en escritorio,
 * vista plana al filtrar y modales de confirmación/captura compartidos.
 */
export default function MateriasList({
  progreso,
  progresoDetalles,
  vista,
  isFiltering,
  filteredMaterias,
  clearFilters,
  yearGroups,
  expandedYears,
  setExpandedYears,
  selectedCodigo,
  onSelectMateria,
  onRequestApproveGroup,
  // Modales desde useProgresoDashboard
  isResetOpen,
  onResetOpenChange,
  reestablecerProgreso,
  grupoAAprobar,
  isAprobarAnioOpen,
  onAprobarAnioOpenChange,
  confirmApproveGroup,
  isConfirmationOpen,
  onConfirmationOpenChange,
  onConfirmationClose,
  pendingBlockedTransition,
  confirmarCascada,
  setMostrarConfirmacionCascada,
  isCapturaOpen,
  onCapturaOpenChange,
  capturaConfig,
  handleCapturaConfirm,
}) {
  const renderCard = (materia) => {
    const estado = progreso[materia.codigo] || "Disponible";
    const detalles = progresoDetalles?.[materia.codigo];
    const isIncomplete = esMateriaIncompleta(materia, estado, detalles);

    return (
      <MateriaCard
        key={materia.codigo}
        materia={materia}
        estado={estado}
        isIncomplete={isIncomplete}
        isSelected={selectedCodigo === materia.codigo}
        vista={vista}
        onSelect={onSelectMateria}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Vista filtrada o vacía */}
      {isFiltering ? (
        filteredMaterias.length === 0 ? (
          <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C] p-8 sm:p-10 text-center space-y-3">
            <div className="w-11 h-11 rounded-full bg-[#F1F5F9] dark:bg-[#1E2730] text-[#64748B] dark:text-[#94A3B8] flex items-center justify-center mx-auto">
              <SearchX className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-base font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                Sin materias coincidentes
              </h2>
              <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
                No encontramos materias que cumplan con los filtros seleccionados.
              </p>
            </div>
            <Button
              size="sm"
              className="bg-[#005A36] text-white font-medium"
              onPress={clearFilters}
            >
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                Mostrando {filteredMaterias.length}{" "}
                {filteredMaterias.length === 1 ? "materia" : "materias"}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-[#005A36] dark:text-[#6EE7B7] hover:underline cursor-pointer"
              >
                Limpiar filtros
              </button>
            </div>

            <div
              className={
                vista === "list"
                  ? "grid grid-cols-1 gap-2.5"
                  : "grid grid-cols-1 md:grid-cols-2 gap-3"
              }
            >
              {filteredMaterias.map(renderCard)}
            </div>
          </div>
        )
      ) : (
        /* Vista normal: Acordeones por año */
        <Accordion
          variant="splitted"
          selectionMode="multiple"
          selectedKeys={new Set(expandedYears)}
          onSelectionChange={(keys) => {
            if (keys === "all") {
              setExpandedYears(yearGroups.map((g) => g.key));
            } else {
              setExpandedYears(Array.from(keys).map(String));
            }
          }}
          className="px-0 gap-3"
          itemClasses={{
            base: "bg-[#FFFFFF] dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C] shadow-xs rounded-xl px-4",
            trigger: "py-3.5 cursor-pointer",
            title: "text-base font-semibold text-[#1E293B] dark:text-[#F1F5F9]",
            indicator: "text-[#64748B] dark:text-[#94A3B8]",
            content: "pb-4 pt-1",
          }}
        >
          {yearGroups.map((group) => {
            const cuatri1 = group.materias.filter(
              (m) => Number(m.cuatrimestre) % 2 === 1,
            );
            const cuatri2 = group.materias.filter(
              (m) => Number(m.cuatrimestre) > 0 && Number(m.cuatrimestre) % 2 === 0,
            );
            const tieneCuatrimestres =
              !group.isTaller && (cuatri1.length > 0 || cuatri2.length > 0);
            const ambosCuatris = cuatri1.length > 0 && cuatri2.length > 0;
            const labelCuatriUnico =
              group.anioNum === 6 ? "Tramo de cierre" : "1° Cuatrimestre";

            return (
              <AccordionItem
                key={group.key}
                aria-label={`${group.label}, ${group.completedCount} de ${group.totalCount} materias aprobadas`}
                title={
                  <div className="flex items-center justify-between gap-3 pr-2 w-full">
                    <span className="truncate">{group.label}</span>
                    <YearProgressBadge
                      completedCount={group.completedCount}
                      totalCount={group.totalCount}
                    />
                  </div>
                }
              >
                <div className="space-y-3 border-t border-[#E2E8F0]/80 dark:border-[#24303C] pt-3">
                  {/* Barra de acción del grupo */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                      {group.completedCount} aprobadas o promocionadas de{" "}
                      {group.totalCount}
                    </span>

                    {group.completedCount < group.totalCount && (
                      <Button
                        size="sm"
                        variant="flat"
                        className="bg-[#005A36]/10 text-[#005A36] dark:bg-[#2E8B63]/20 dark:text-[#6EE7B7] font-medium min-h-8"
                        startContent={<CheckCheck className="w-3.5 h-3.5" />}
                        onPress={() =>
                          onRequestApproveGroup(group.label, group.materias)
                        }
                      >
                        Aprobar {group.isTaller ? "talleres" : "año"}
                      </Button>
                    )}
                  </div>

                  {/* Cuatrimestres: vertical en móvil (< md), lado a lado en escritorio (md+) */}
                  {tieneCuatrimestres ? (
                    ambosCuatris ? (
                      <div
                        className={
                          vista === "list"
                            ? "grid grid-cols-1 gap-4"
                            : "grid grid-cols-1 md:grid-cols-2 gap-4 items-start"
                        }
                      >
                        <div className="rounded-xl bg-[#F8FAFC]/80 dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] p-3 space-y-2.5">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] px-0.5">
                            1° Cuatrimestre
                          </h3>
                          <div className="grid grid-cols-1 gap-2">
                            {cuatri1.map(renderCard)}
                          </div>
                        </div>

                        <div className="rounded-xl bg-[#F8FAFC]/80 dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] p-3 space-y-2.5">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] px-0.5">
                            2° Cuatrimestre
                          </h3>
                          <div className="grid grid-cols-1 gap-2">
                            {cuatri2.map(renderCard)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-[#F8FAFC]/80 dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] p-3 space-y-2.5">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] px-0.5">
                          {cuatri1.length > 0 ? labelCuatriUnico : "2° Cuatrimestre"}
                        </h3>
                        <div
                          className={
                            vista === "list"
                              ? "grid grid-cols-1 gap-2"
                              : "grid grid-cols-1 md:grid-cols-2 gap-2.5"
                          }
                        >
                          {(cuatri1.length > 0 ? cuatri1 : cuatri2).map(renderCard)}
                        </div>
                      </div>
                    )
                  ) : (
                    <div
                      className={
                        vista === "list"
                          ? "grid grid-cols-1 gap-2"
                          : "grid grid-cols-1 md:grid-cols-2 gap-2.5"
                      }
                    >
                      {group.materias.map(renderCard)}
                    </div>
                  )}
                </div>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Modal confirmar reestablecer progreso */}
      <Modal isOpen={isResetOpen} onOpenChange={onResetOpenChange} size="sm">
        <ModalContent className="bg-[#FFFFFF] dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C]">
          {(onClose) => (
            <>
              <ModalHeader className="text-[#1E293B] dark:text-[#F1F5F9]">
                Reestablecer progreso
              </ModalHeader>
              <ModalBody className="text-sm text-[#475569] dark:text-[#94A3B8]">
                Esta acción volverá todas las materias de este plan a su estado
                inicial y eliminará las notas e historial cargados.
              </ModalBody>
              <ModalFooter>
                <Button size="sm" variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  color="danger"
                  startContent={<RotateCcw className="w-3.5 h-3.5" />}
                  onPress={reestablecerProgreso}
                >
                  Reestablecer
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal aprobar grupo o hasta año */}
      <Modal
        isOpen={isAprobarAnioOpen}
        onOpenChange={onAprobarAnioOpenChange}
        size="sm"
      >
        <ModalContent className="bg-[#FFFFFF] dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C]">
          {(onClose) => (
            <>
              <ModalHeader className="text-[#1E293B] dark:text-[#F1F5F9]">
                Aprobar materias
              </ModalHeader>
              <ModalBody className="text-sm text-[#475569] dark:text-[#94A3B8]">
                {grupoAAprobar
                  ? `Se marcarán como aprobadas ${grupoAAprobar.materias.length} materias correspondientes a "${grupoAAprobar.label}" y se recalcularán las correlativas.`
                  : "Se aprobarán las materias seleccionadas."}
              </ModalBody>
              <ModalFooter>
                <Button size="sm" variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-[#005A36] text-white font-medium"
                  onPress={confirmApproveGroup}
                >
                  Confirmar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal de confirmación de cascada sobre materias bloqueadas */}
      <ConfirmarCambioModal
        isOpen={isConfirmationOpen}
        onOpenChange={onConfirmationOpenChange}
        onClose={onConfirmationClose}
        onConfirm={confirmarCascada}
        setMostrar={setMostrarConfirmacionCascada}
        targetState={pendingBlockedTransition?.targetState}
      />

      {/* Modal de captura de notas / fechas en transiciones */}
      <CapturaTransicionModal
        isOpen={isCapturaOpen}
        onOpenChange={onCapturaOpenChange}
        tipo={capturaConfig.tipo}
        materia={capturaConfig.materia}
        config={capturaConfig}
        onConfirm={handleCapturaConfirm}
      />
    </div>
  );
}
