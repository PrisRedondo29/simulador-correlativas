import PropTypes from "prop-types";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { ArrowRight, CalendarRange, GitBranch } from "lucide-react";

/**
 * Modal de primera visita al Simulador de Avance:
 * explica los 2 modos disponibles y pide elegir con cuál comenzar
 * antes de iniciar el tutorial interactivo.
 */
export default function SimuladorModeModal({ isOpen, onSelectMode }) {
  return (
    <Modal
      isOpen={isOpen}
      hideCloseButton
      isDismissable={false}
      size="lg"
      backdrop="opaque"
      placement="center"
      classNames={{
        backdrop: "bg-slate-900/55 backdrop-blur-xs",
        wrapper: "p-4",
      }}
    >
      <ModalContent className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540]">
        <ModalHeader className="flex flex-col gap-1 border-b border-[#E2E8F0] dark:border-[#2A3540]">
          <span className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9]">
            ¿Cómo querés usar el Simulador?
          </span>
          <p className="text-xs font-normal text-[#64748B] dark:text-[#94A3B8]">
            Elegí un modo para empezar. Podés cambiar entre ambos en cualquier momento desde arriba.
          </p>
        </ModalHeader>

        <ModalBody className="py-5 space-y-3">
          <button
            type="button"
            onClick={() => onSelectMode("planificar")}
            className="w-full p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#2A3540] hover:border-[#005A36] dark:hover:border-[#4A9D68] transition-colors flex items-start justify-between gap-3 text-left cursor-pointer group"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] dark:bg-[#102A20] border border-[#A7F3D0] dark:border-[#1E4D38] text-[#005A36] dark:text-[#86EFAC] flex items-center justify-center shrink-0">
                <CalendarRange className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] group-hover:text-[#005A36] dark:group-hover:text-[#6EE7B7]">
                  Planificar avance
                </p>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  Elegí qué materias cursar cuatrimestre a cuatrimestre, avanzá en el tiempo y proyectá cuándo te recibís.
                </p>
              </div>
            </div>
            <ArrowRight
              className="w-4 h-4 text-[#64748B] group-hover:text-[#005A36] dark:group-hover:text-[#6EE7B7] shrink-0 mt-1 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={() => onSelectMode("explorar")}
            className="w-full p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#2A3540] hover:border-[#005A36] dark:hover:border-[#4A9D68] transition-colors flex items-start justify-between gap-3 text-left cursor-pointer group"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] dark:bg-[#2D2210] border border-[#FDE68A] dark:border-[#5C4318] text-[#B45309] dark:text-[#FCD34D] flex items-center justify-center shrink-0">
                <GitBranch className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] group-hover:text-[#005A36] dark:group-hover:text-[#6EE7B7]">
                  Explorar correlativas
                </p>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  Dejá fijada cualquier materia para visualizar sus requisitos previos (ámbar) y qué materias habilita (verde).
                </p>
              </div>
            </div>
            <ArrowRight
              className="w-4 h-4 text-[#64748B] group-hover:text-[#005A36] dark:group-hover:text-[#6EE7B7] shrink-0 mt-1 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

SimuladorModeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onSelectMode: PropTypes.func.isRequired,
};
