import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tab,
  Tabs,
} from "@heroui/react";
import { Check, FileDown, FileText, Sparkles } from "lucide-react";
import { downloadPlanillaPlanPDF } from "../../../hooks/Simulador/useSimuladorPDF";
import { calcularPromedioGeneral } from "../../../utils/Progreso/regularidadUtils";

function ChecklistPreview({
  plan,
  materias = [],
  progreso = {},
  progresoDetalles = {},
  kpis = null,
  includeProgress = false,
}) {
  const sampleMaterias = useMemo(
    () => (materias || []).filter((m) => !m.tesis && m.codigo !== "N/A").slice(0, 4),
    [materias],
  );
  const promedio = useMemo(
    () => (includeProgress ? calcularPromedioGeneral(progresoDetalles, progreso) : null),
    [includeProgress, progresoDetalles, progreso],
  );
  const totalCount = kpis?.totalMaterias ?? kpis?.totalCount ?? materias.length;
  const aprobadasCount =
    kpis?.aprobadasCount ??
    materias.filter(
      (m) => progreso?.[m.codigo] === "Aprobado" || progreso?.[m.codigo] === "Promocionado",
    ).length;
  const porcentaje =
    kpis?.porcentajeGeneral ??
    kpis?.porcentaje ??
    (totalCount > 0 ? Math.round((aprobadasCount / totalCount) * 100) : 0);

  return (
    <div className="rounded-xl border border-[#CBD5E1] dark:border-[#2A3540] bg-white dark:bg-[#0F1419] p-3.5 space-y-3 shadow-2xs">
      <div className="border-t-2 border-[#005A36] pt-2.5 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-[#1E293B] dark:text-[#F1F5F9]">
            {includeProgress
              ? `Planilla de Avance Académico · Plan ${plan || "-"}`
              : `Planilla del Plan de Estudios · Plan ${plan || "-"}`}
          </p>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            {includeProgress
              ? `Avance: ${aprobadasCount}/${totalCount} (${porcentaje}%)${
                  promedio?.promedioSinAplazos != null
                    ? ` · Promedio s/aplazos: ${Number(promedio.promedioSinAplazos).toFixed(2)}`
                    : ""
                }`
              : `${materias.length} materias organizadas por año y cuatrimestre para imprimir`}
          </p>
        </div>
        <Chip size="sm" variant="flat" color={includeProgress ? "success" : "default"} className="text-[10px]">
          {includeProgress ? "Pre-rellenada" : "En blanco"}
        </Chip>
      </div>

      {/* Muestra esquemática de tabla */}
      <div className="rounded-lg border border-[#E2E8F0] dark:border-[#24303C] overflow-hidden text-[11px]">
        <div className="grid grid-cols-12 bg-[#F1F5F9] dark:bg-[#1E2730] px-2.5 py-1.5 font-semibold text-[#475569] dark:text-[#CBD5E1] border-b border-[#E2E8F0] dark:border-[#24303C]">
          <span className="col-span-5">Seguimiento</span>
          <span className="col-span-2">Cód.</span>
          <span className="col-span-4">Materia</span>
          <span className="col-span-1 text-center">Nota</span>
        </div>
        <div className="divide-y divide-[#E2E8F0] dark:divide-[#24303C]">
          {sampleMaterias.map((m) => {
            const estado = includeProgress ? progreso?.[m.codigo] : null;
            const det = includeProgress ? progresoDetalles?.[m.codigo] : null;
            const checkedProm = includeProgress && estado === "Promocionado";
            const checkedApr = includeProgress && estado === "Aprobado";
            const checkedReg =
              includeProgress &&
              (estado === "Regular" ||
                (estado === "Aprobado" && !det?.rendidaLibre && !det?.esEquivalencia));
            const nota = includeProgress
              ? estado === "Promocionado"
                ? (det?.notaFinal ?? det?.notaRegularizacion ?? "")
                : estado === "Aprobado"
                  ? (det?.notaFinal ?? (det?.esEquivalencia ? "Eq." : ""))
                  : ""
              : "";

            return (
              <div
                key={m.codigo}
                className="grid grid-cols-12 items-center px-2.5 py-1.5 gap-1 text-[#334155] dark:text-[#E2E8F0]"
              >
                <div className="col-span-5 flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: "Reg.", checked: checkedReg },
                    { label: "Apr.", checked: checkedApr },
                    { label: "Prom.", checked: checkedProm },
                  ].map((box) => (
                    <span key={box.label} className="inline-flex items-center gap-0.5 text-[10px]">
                      <span
                        className={`w-3 h-3 rounded-[2px] border inline-flex items-center justify-center ${
                          box.checked
                            ? "bg-[#ECFDF5] border-[#005A36] text-[#005A36] dark:bg-[#102A20] dark:border-[#6EE7B7] dark:text-[#6EE7B7]"
                            : "border-[#94A3B8] dark:border-[#475569]"
                        }`}
                        aria-hidden="true"
                      >
                        {box.checked && <Check className="w-2 h-2 stroke-[3]" />}
                      </span>
                      <span className={box.checked ? "font-semibold text-[#005A36] dark:text-[#6EE7B7]" : ""}>
                        {box.label}
                      </span>
                    </span>
                  ))}
                </div>
                <span className="col-span-2 font-mono text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                  {m.mostrarCodigo === false ? "---" : m.codigo}
                </span>
                <span className="col-span-4 truncate">{m.nombre}</span>
                <span className="col-span-1 text-center font-semibold text-[#005A36] dark:text-[#6EE7B7] tabular-nums">
                  {nota !== "" ? nota : "___"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] italic">
        Vista previa ilustrativa · El PDF A4 incluye todas las materias del plan agrupadas por año y cuatrimestre.
      </p>
    </div>
  );
}

/**
 * Modal de descarga de planilla PDF en Mis Materias:
 * - Si el estudiante tiene progreso cargado, ofrece dos pestañas ("Con mi progreso actual" por defecto y "Planilla del Plan en blanco").
 * - Si no tiene progreso cargado, muestra directamente la planilla en blanco e invita a cargar su Analítico o progreso.
 */
export default function ExportarPlanillaPDFModal({
  isOpen,
  onOpenChange,
  plan,
  materias = [],
  progreso = {},
  progresoDetalles = {},
  kpis = null,
  onOpenSawebImport = null,
}) {
  const tieneProgreso = useMemo(
    () =>
      Object.values(progreso || {}).some(
        (estado) => estado && estado !== "Disponible" && estado !== "Bloqueado",
      ),
    [progreso],
  );

  const [selectedTab, setSelectedTab] = useState(
    () => (tieneProgreso ? "con_progreso" : "en_blanco"),
  );
  const [downloading, setDownloading] = useState(false);

  const effectiveTab = tieneProgreso ? selectedTab : "en_blanco";
  const includeProgress = effectiveTab === "con_progreso";

  const handleOpenChange = (nextOpen) => {
    if (nextOpen) {
      setSelectedTab(tieneProgreso ? "con_progreso" : "en_blanco");
    }
    onOpenChange(nextOpen);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadPlanillaPlanPDF({
        materias,
        plan,
        progreso,
        progresoDetalles,
        kpis,
        includeProgress,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange} size="xl" scrollBehavior="inside">
      <ModalContent className="bg-[#FFFFFF] dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C]">
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 border-b border-[#E2E8F0] dark:border-[#24303C]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#005A36] dark:text-[#6EE7B7]" />
                <span>Descargar Planilla PDF</span>
                {plan && (
                  <Chip size="sm" variant="flat" color="success" className="text-[11px]">
                    Plan {plan}
                  </Chip>
                )}
              </div>
              <p className="text-xs font-normal text-[#64748B] dark:text-[#94A3B8]">
                Generá una planilla A4 imprimible con casillas de Regular, Aprobada y Promocionada.
              </p>
            </ModalHeader>

            <ModalBody className="py-4 space-y-4">
              {tieneProgreso ? (
                <Tabs
                  aria-label="Formato de planilla PDF"
                  selectedKey={effectiveTab}
                  onSelectionChange={(key) => setSelectedTab(String(key))}
                  color="success"
                  variant="bordered"
                  classNames={{
                    tabList: "w-full bg-[#F8FAFC] dark:bg-[#11171D]",
                    tab: "font-medium text-xs",
                  }}
                >
                  <Tab key="con_progreso" title="Con mi progreso actual">
                    <div className="pt-2">
                      <ChecklistPreview
                        plan={plan}
                        materias={materias}
                        progreso={progreso}
                        progresoDetalles={progresoDetalles}
                        kpis={kpis}
                        includeProgress={true}
                      />
                    </div>
                  </Tab>
                  <Tab key="en_blanco" title="Planilla del Plan en blanco">
                    <div className="pt-2">
                      <ChecklistPreview
                        plan={plan}
                        materias={materias}
                        includeProgress={false}
                      />
                    </div>
                  </Tab>
                </Tabs>
              ) : (
                <div className="space-y-3">
                  <ChecklistPreview
                    plan={plan}
                    materias={materias}
                    includeProgress={false}
                  />

                  <div className="rounded-xl border border-[#A7F3D0] dark:border-[#1E4D38] bg-[#ECFDF5]/70 dark:bg-[#102A20]/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-[#005A36] dark:text-[#86EFAC]">
                        ¿Querés descargar la planilla ya marcada con tu avance?
                      </p>
                      <p className="text-[11px] text-[#166534] dark:text-[#A7F3D0]">
                        Podés importar tu Analítico PDF de SAWeb o marcar materias en Mis Materias para pre-rellenar tus casillas y notas.
                      </p>
                    </div>
                    {onOpenSawebImport && (
                      <Button
                        size="sm"
                        className="bg-[#005A36] text-white font-semibold shrink-0"
                        startContent={<Sparkles className="w-3.5 h-3.5" />}
                        onPress={() => {
                          onClose();
                          onOpenSawebImport();
                        }}
                      >
                        Cargar Analítico / Progreso
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </ModalBody>

            <ModalFooter className="border-t border-[#E2E8F0] dark:border-[#24303C]">
              <Button variant="light" onPress={onClose}>
                Cerrar
              </Button>
              <Button
                className="bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] text-white font-semibold"
                isLoading={downloading}
                isDisabled={!materias.length}
                startContent={!downloading && <FileDown className="w-4 h-4" />}
                onPress={handleDownload}
              >
                {includeProgress
                  ? "Descargar PDF con mi progreso"
                  : "Descargar planilla en blanco"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

ExportarPlanillaPDFModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  plan: PropTypes.string,
  materias: PropTypes.array,
  progreso: PropTypes.object,
  progresoDetalles: PropTypes.object,
  kpis: PropTypes.object,
  onOpenSawebImport: PropTypes.func,
};
