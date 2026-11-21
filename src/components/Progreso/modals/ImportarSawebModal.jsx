import { useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  addToast,
  Button,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileUp,
  Sparkles,
  Trash2,
} from "lucide-react";
import { parseSawebTexts } from "../../../utils/sawebParser";
import { extractTextFromPdfFile } from "../../../utils/pdfTextExtractor";

/**
 * Modal de importación desde el Analítico oficial en PDF de SAWeb (disponible en celular y PC).
 * Lee el PDF 100% local en el navegador, descarta DNI/Legajo y muestra las cantidades por estado
 * antes de aplicar los cambios sin pisar notas de cursada previas.
 */
export default function ImportarSawebModal({
  isOpen,
  onOpenChange,
  plan = null,
  materias = [],
  resolvePlanMaterias = null,
  onApplyImport,
}) {
  const [pdfText, setPdfText] = useState("");
  const [pdfInfo, setPdfInfo] = useState(null);
  const [verifiedResult, setVerifiedResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [readingPdf, setReadingPdf] = useState(false);
  const fileInputRef = useRef(null);

  const hasContent = Boolean(pdfText);

  const resetState = () => {
    setPdfText("");
    setPdfInfo(null);
    setVerifiedResult(null);
  };

  const handleClose = (nextOpen) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const runVerification = async (rawText) => {
    if (!rawText) return;
    setVerifying(true);
    try {
      let targetPlan = plan;
      let targetMaterias = materias;

      if (resolvePlanMaterias) {
        const preliminary = parseSawebTexts([rawText], []);
        const resolved = await resolvePlanMaterias(preliminary.detectedPlan);
        if (resolved?.targetPlan) targetPlan = resolved.targetPlan;
        if (Array.isArray(resolved?.materias)) targetMaterias = resolved.materias;
      }

      const parsed = parseSawebTexts([rawText], targetMaterias);
      setVerifiedResult({ ...parsed, targetPlan, targetMaterias });

      if (parsed.totalMatched === 0) {
        addToast({
          title: "No se detectaron materias del plan",
          description:
            "Revisá que el archivo sea el Certificado Analítico oficial descargado desde SAWeb.",
          color: "warning",
        });
      }
    } catch {
      addToast({
        title: "No se pudo verificar el plan",
        description: "Intentá nuevamente o seleccioná tu plan manualmente.",
        color: "danger",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleVerify = () => runVerification(pdfText);

  const handlePdfSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setReadingPdf(true);
    try {
      const { text, numPages } = await extractTextFromPdfFile(file);
      const trimmed = text.trim();
      if (!trimmed) {
        addToast({
          title: "PDF sin texto legible",
          description:
            "No pudimos extraer texto de este archivo. Descargá el Analítico directo desde SAWeb.",
          color: "warning",
        });
        return;
      }

      setPdfText(trimmed);
      setPdfInfo({ name: file.name, numPages });
      await runVerification(trimmed);
    } catch {
      addToast({
        title: "Error al leer el PDF",
        description: "Verificá que el archivo no esté dañado e intentá nuevamente.",
        color: "danger",
      });
    } finally {
      setReadingPdf(false);
    }
  };

  const handleConfirmImport = () => {
    if (!verifiedResult || verifiedResult.totalMatched === 0) return;

    onApplyImport(verifiedResult);
    resetState();
    onOpenChange(false);
  };

  const summaryItems = verifiedResult
    ? [
        {
          label: "Promocionadas",
          value: verifiedResult.counts.Promocionado,
          color:
            "bg-[#ECFDF5] text-[#005A36] border-[#A7F3D0] dark:bg-[#102A20] dark:text-[#6EE7B7] dark:border-[#1E4D38]",
        },
        {
          label: "Aprobadas (final / libre)",
          value: verifiedResult.counts.Aprobado,
          color:
            "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE] dark:bg-[#172554]/50 dark:text-[#93C5FD] dark:border-[#1E3A8A]",
        },
        {
          label: "Equivalencias / Eximidas",
          value: verifiedResult.counts.Equivalencia,
          color:
            "bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE] dark:bg-[#2E1065]/50 dark:text-[#C4B5FD] dark:border-[#4C1D95]",
        },
        {
          label: "Libres / vencidas",
          value: verifiedResult.counts.Libre,
          color:
            "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA] dark:bg-[#450A0A]/50 dark:text-[#FCA5A5] dark:border-[#7F1D1D]",
        },
        {
          label: "Aplazos en historial",
          value: verifiedResult.counts.Aplazos,
          color:
            "bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] dark:bg-[#1E2730] dark:text-[#CBD5E1] dark:border-[#334155]",
        },
      ]
    : [];

  const effectivePlan = verifiedResult?.targetPlan || plan;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleClose}
      size="2xl"
      scrollBehavior="inside"
      backdrop="blur"
    >
      <ModalContent className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C]">
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 border-b border-[#E2E8F0] dark:border-[#24303C]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#005A36] dark:text-[#6EE7B7]" />
                <span>Importar Analítico SAWeb</span>
                {effectivePlan && (
                  <Chip size="sm" variant="flat" color="success" className="text-[11px]">
                    Plan {effectivePlan}
                  </Chip>
                )}
              </div>
              <p className="text-xs font-normal text-[#64748B] dark:text-[#94A3B8]">
                Lectura 100% local en tu dispositivo. Nunca guardamos tu DNI ni legajo, y
                conservamos tus notas y registros previos.
              </p>
            </ModalHeader>

            <ModalBody className="py-5 space-y-4">
              <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] p-3.5 space-y-2 text-xs text-[#334155] dark:text-[#CBD5E1]">
                <p className="font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                  ¿Cómo funciona?
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[#475569] dark:text-[#94A3B8]">
                  <li>
                    Ingresá a{" "}
                    <a
                      href="https://www.unlu.edu.ar/acceso-inf-acad.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#005A36] dark:text-[#6EE7B7] underline underline-offset-2 hover:opacity-80"
                    >
                      SAWeb (Acceso a Información Académica)
                      <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                    </a>
                    , entrá al botón <strong>Analítico</strong> y descargá el archivo{" "}
                    <strong>.pdf</strong>.
                  </li>
                  <li>
                    Subilo acá abajo con <strong>Subir PDF del analítico</strong>.
                  </li>
                  <li>
                    Corroborá las cantidades detectadas antes de confirmar. Se actualizan tus
                    materias rendidas manteniendo compatibilidad con tus notas y registros previos,
                    sin perder ni pisar información.
                  </li>
                </ol>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handlePdfSelected}
              />

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  color="success"
                  variant="solid"
                  isLoading={readingPdf}
                  className="bg-[#005A36] text-white font-semibold"
                  startContent={!readingPdf && <FileUp className="w-4 h-4" />}
                  onPress={() => fileInputRef.current?.click()}
                >
                  {hasContent ? "Elegir otro PDF" : "Subir PDF del analítico"}
                </Button>

                {hasContent && (
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    startContent={<Trash2 className="w-3.5 h-3.5" />}
                    onPress={resetState}
                    className="ml-auto"
                  >
                    Limpiar
                  </Button>
                )}
              </div>

              {pdfInfo && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#A7F3D0] dark:border-[#1E4D38] bg-[#ECFDF5]/60 dark:bg-[#102A20]/50 px-3.5 py-2.5 text-xs">
                  <FileCheck2 className="w-4 h-4 text-[#005A36] dark:text-[#6EE7B7] shrink-0" />
                  <span className="font-medium text-[#065F46] dark:text-[#A7F3D0] truncate">
                    {pdfInfo.name} ({pdfInfo.numPages}{" "}
                    {pdfInfo.numPages === 1 ? "página" : "páginas"})
                  </span>
                </div>
              )}

              {verifiedResult && (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                      <CheckCircle2 className="w-4 h-4 text-[#005A36] dark:text-[#6EE7B7]" />
                      <span>Resumen verificado ({verifiedResult.totalMatched} materias)</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {verifiedResult.detectedPlan && (
                        <Chip size="sm" variant="flat" color="primary">
                          Plan detectado: {verifiedResult.detectedPlan}
                        </Chip>
                      )}
                      {verifiedResult.anioIngreso && (
                        <Chip size="sm" variant="flat">
                          Ingreso {verifiedResult.anioIngreso}
                        </Chip>
                      )}
                    </div>
                  </div>

                  {verifiedResult.detectedPlan &&
                    effectivePlan &&
                    verifiedResult.detectedPlan !== effectivePlan && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-[#FDE68A] dark:border-[#5C4318] bg-[#FFFBEB] dark:bg-[#2D2210] p-3 text-xs text-[#92400E] dark:text-[#FCD34D]">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>
                          El Analítico indica <strong>Plan {verifiedResult.detectedPlan}</strong>,
                          pero tenés seleccionado el <strong>Plan {effectivePlan}</strong>. Solo se
                          importarán las materias que coincidan con el plan activo.
                        </p>
                      </div>
                    )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {summaryItems.map((item) => (
                      <div
                        key={item.label}
                        className={`rounded-xl border px-3 py-2.5 flex flex-col gap-0.5 ${item.color}`}
                      >
                        <span className="text-lg font-bold leading-tight">{item.value}</span>
                        <span className="text-[11px] font-medium opacity-90">{item.label}</span>
                      </div>
                    ))}
                  </div>

                  {verifiedResult.counts.Omitidas > 0 && (
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      Se omitieron {verifiedResult.counts.Omitidas} materia(s) de otro plan que no
                      forman parte del Plan {effectivePlan || "activo"} (
                      {verifiedResult.omittedCodes.map((o) => o.codigo).join(", ")}).
                    </p>
                  )}
                </div>
              )}
            </ModalBody>

            <ModalFooter className="border-t border-[#E2E8F0] dark:border-[#24303C]">
              <Button variant="light" onPress={onClose}>
                Cancelar
              </Button>
              <Button
                variant="bordered"
                color="success"
                isDisabled={!hasContent || verifying}
                isLoading={verifying}
                onPress={handleVerify}
              >
                Verificar
              </Button>
              <Button
                color="success"
                className="bg-[#005A36] text-white font-semibold"
                isDisabled={!verifiedResult || verifiedResult.totalMatched === 0}
                onPress={handleConfirmImport}
              >
                Importar progreso
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

ImportarSawebModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  plan: PropTypes.string,
  materias: PropTypes.array,
  resolvePlanMaterias: PropTypes.func,
  onApplyImport: PropTypes.func.isRequired,
};
