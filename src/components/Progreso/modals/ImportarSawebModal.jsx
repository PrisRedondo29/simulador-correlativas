import { useMemo, useState } from "react";
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
  Textarea,
} from "@heroui/react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  FileCheck2,
  FileUp,
  Sparkles,
  Trash2,
} from "lucide-react";
import { parseSawebTexts } from "../../../utils/sawebParser";

/**
 * Modal de importación rápida desde SAWeb (solo escritorio).
 * Permite pegar acumulativamente el texto del Analítico y/o tablas de Cursadas/Finales
 * mediante botón "Pegar texto", verificar el desglose exacto por estado y aplicar al progreso.
 */
export default function ImportarSawebModal({
  isOpen,
  onOpenChange,
  plan = null,
  materias = [],
  resolvePlanMaterias = null,
  onApplyImport,
}) {
  const [pastedChunks, setPastedChunks] = useState([]);
  const [manualText, setManualText] = useState("");
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const allChunks = useMemo(() => {
    const manualTrimmed = manualText.trim();
    return manualTrimmed ? [...pastedChunks, manualTrimmed] : pastedChunks;
  }, [pastedChunks, manualText]);

  const hasContent = allChunks.length > 0;

  const resetState = () => {
    setPastedChunks([]);
    setManualText("");
    setShowManualFallback(false);
    setVerifiedResult(null);
  };

  const handleClose = (nextOpen) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const handlePasteFromClipboard = async () => {
    if (!navigator?.clipboard?.readText) {
      setShowManualFallback(true);
      addToast({
        title: "Pegado manual habilitado",
        description: "Tu navegador no permite leer el portapapeles directo; pegá con Ctrl+V abajo.",
        color: "warning",
      });
      return;
    }

    try {
      const clipText = await navigator.clipboard.readText();
      const trimmed = clipText?.trim();
      if (!trimmed) {
        addToast({
          title: "Portapapeles vacío",
          description: "Copiá primero el texto de tu Analítico o Cursadas en SAWeb (Ctrl+A y Ctrl+C).",
          color: "warning",
        });
        return;
      }

      setPastedChunks((prev) => [...prev, trimmed]);
      setVerifiedResult(null);
      addToast({
        title: "Texto pegado",
        description: "Podés pegar otro bloque (ej. Cursadas) o presionar Verificar.",
        color: "success",
      });
    } catch {
      setShowManualFallback(true);
      addToast({
        title: "Permiso de portapapeles bloqueado",
        description: "Presioná Ctrl+V en el cuadro de texto que apareció abajo.",
        color: "warning",
      });
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      let targetPlan = plan;
      let targetMaterias = materias;

      if (resolvePlanMaterias) {
        const preliminary = parseSawebTexts(allChunks, []);
        const resolved = await resolvePlanMaterias(preliminary.detectedPlan);
        if (resolved?.targetPlan) targetPlan = resolved.targetPlan;
        if (Array.isArray(resolved?.materias)) targetMaterias = resolved.materias;
      }

      const parsed = parseSawebTexts(allChunks, targetMaterias);
      setVerifiedResult({ ...parsed, targetPlan });

      if (parsed.totalMatched === 0) {
        addToast({
          title: "No se detectaron materias del plan",
          description:
            "Revisá haber copiado el texto completo del PDF Analítico o de la tabla de Cursadas de SAWeb.",
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
          color: "bg-[#ECFDF5] text-[#005A36] border-[#A7F3D0] dark:bg-[#102A20] dark:text-[#6EE7B7] dark:border-[#1E4D38]",
        },
        {
          label: "Aprobadas (final / libre)",
          value: verifiedResult.counts.Aprobado,
          color: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE] dark:bg-[#172554]/50 dark:text-[#93C5FD] dark:border-[#1E3A8A]",
        },
        {
          label: "Equivalencias / Eximidas",
          value: verifiedResult.counts.Equivalencia,
          color: "bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE] dark:bg-[#2E1065]/50 dark:text-[#C4B5FD] dark:border-[#4C1D95]",
        },
        {
          label: "Regulares vigentes",
          value: verifiedResult.counts.Regular,
          color: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] dark:bg-[#451A03]/50 dark:text-[#FCD34D] dark:border-[#78350F]",
        },
        {
          label: "Libres / vencidas",
          value: verifiedResult.counts.Libre,
          color: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA] dark:bg-[#450A0A]/50 dark:text-[#FCA5A5] dark:border-[#7F1D1D]",
        },
        {
          label: "Aplazos en historial",
          value: verifiedResult.counts.Aplazos,
          color: "bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] dark:bg-[#1E2730] dark:text-[#CBD5E1] dark:border-[#334155]",
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
                <span>Importar desde SAWeb</span>
                {effectivePlan && (
                  <Chip size="sm" variant="flat" color="success" className="text-[11px]">
                    Plan {effectivePlan}
                  </Chip>
                )}
              </div>
              <p className="text-xs font-normal text-[#64748B] dark:text-[#94A3B8]">
                Cargá tu historial en segundos sin guardar DNI ni número de legajo.
              </p>
            </ModalHeader>

            <ModalBody className="py-5 space-y-4">
              {/* Instrucciones rápidas */}
              <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] p-3.5 space-y-2 text-xs text-[#334155] dark:text-[#CBD5E1]">
                <p className="font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                  ¿Cómo funciona?
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[#475569] dark:text-[#94A3B8]">
                  <li>
                    En SAWeb abrí el botón <strong>Analítico</strong>, seleccioná todo (
                    <kbd className="px-1 py-0.5 rounded bg-white dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#334155] text-[10px]">
                      Ctrl+A
                    </kbd>{" "}
                    y{" "}
                    <kbd className="px-1 py-0.5 rounded bg-white dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#334155] text-[10px]">
                      Ctrl+C
                    </kbd>
                    ) y tocá <strong>Pegar texto</strong>.
                  </li>
                  <li>
                    <em>Opcional:</em> si tenés materias <strong>Regulares</strong> sin final
                    rendido, copiá tus páginas de <strong>Cursadas</strong> y volvé a tocar{" "}
                    <strong>Pegar texto</strong> para sumarlas.
                  </li>
                  <li>
                    Tocá <strong>Verificar</strong> para corroborar las cantidades antes de importar.
                  </li>
                </ol>
              </div>

              {/* Botones principales de captura */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  color="success"
                  variant="solid"
                  className="bg-[#005A36] text-white font-semibold"
                  startContent={<ClipboardPaste className="w-4 h-4" />}
                  onPress={handlePasteFromClipboard}
                >
                  Pegar texto
                </Button>

                <Button
                  isDisabled
                  variant="bordered"
                  className="border-[#E2E8F0] dark:border-[#24303C] text-[#64748B] opacity-70"
                  startContent={<FileUp className="w-4 h-4" />}
                >
                  Subir PDF del analítico (pronto)
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

              {/* Estado de bloques acumulados */}
              {hasContent && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#A7F3D0] dark:border-[#1E4D38] bg-[#ECFDF5]/60 dark:bg-[#102A20]/50 px-3.5 py-2.5 text-xs">
                  <FileCheck2 className="w-4 h-4 text-[#005A36] dark:text-[#6EE7B7] shrink-0" />
                  <span className="font-medium text-[#065F46] dark:text-[#A7F3D0]">
                    {allChunks.length === 1
                      ? "1 bloque de texto listo en memoria"
                      : `${allChunks.length} bloques de texto acumulados en memoria`}
                  </span>
                  <span className="text-[#047857] dark:text-[#6EE7B7]/80">
                    — Podés seguir pegando páginas o presionar <strong>Verificar</strong>.
                  </span>
                </div>
              )}

              {/* Fallback manual si el navegador bloquea clipboard.readText() */}
              {showManualFallback && (
                <Textarea
                  label="Pegado manual (Ctrl+V)"
                  placeholder="Pegá acá el texto copiado desde el PDF Analítico o las tablas de SAWeb..."
                  minRows={4}
                  maxRows={7}
                  variant="bordered"
                  value={manualText}
                  onValueChange={(val) => {
                    setManualText(val);
                    setVerifiedResult(null);
                  }}
                />
              )}

              {/* Resultado de la verificación */}
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
                        El Analítico indica <strong>Plan {verifiedResult.detectedPlan}</strong>, pero
                        tenés seleccionado el <strong>Plan {effectivePlan}</strong>. Solo se importarán las
                        materias que coincidan con el plan activo.
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
