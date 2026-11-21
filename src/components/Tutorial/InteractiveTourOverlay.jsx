import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useLocation, useNavigate } from "react-router-dom";
import { addToast, Button } from "@heroui/react";
import { ChevronLeft, ChevronRight, Compass, X } from "lucide-react";
import storageRepository, { subscribeStorageChanges } from "../../services/storageRepository";
import { trackTutorial } from "../../services/analyticsService";

/**
 * Motor liviano de tutoriales interactivos versionados (mobile-first + desktop).
 * - Se inicia automáticamente la primera vez que el usuario entra a la pantalla
 *   (o cuando sube la versión del tour) salvo que haya desactivado guías automáticas.
 * - Cuando está cerrado, ofrece un acceso discreto "Recorrido rápido" que puede ocultarse
 *   y relanzarse en cualquier momento desde /como-usar.
 */
export default function InteractiveTourOverlay({
  tour,
  ready = true,
  triggerPlacement = "inline",
  onBeforeStep = null,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [prefs, setPrefs] = useState(() => storageRepository.getTutorialPrefs());

  useEffect(() => {
    return subscribeStorageChanges(() => {
      setPrefs(storageRepository.getTutorialPrefs());
    });
  }, []);

  const steps = useMemo(() => tour?.steps || [], [tour?.steps]);
  const currentStep = steps[stepIndex] || null;

  const startTour = useCallback(
    (initialIndex = 0) => {
      if (!steps.length) return;
      setStepIndex(initialIndex);
      setIsOpen(true);
      trackTutorial({
        action: "start",
        stepIndex: initialIndex,
        stepTitle: steps[initialIndex]?.title,
      });
    },
    [steps],
  );

  // Arranque automático en primera visita (o nueva versión) o por navegación desde /como-usar
  useEffect(() => {
    if (!ready || !tour?.id || !steps.length) return undefined;

    if (location.state?.startTour === tour.id) {
      const timer = setTimeout(() => {
        startTour(0);
        navigate(location.pathname, { replace: true, state: {} });
      }, 50);
      return () => clearTimeout(timer);
    }

    const seenVersion = storageRepository.getTutorialVersionSeen(tour.id);
    const currentPrefs = storageRepository.getTutorialPrefs();
    if (seenVersion < tour.version && !currentPrefs.autoDisabled) {
      const timer = setTimeout(() => startTour(0), 450);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [ready, tour, steps.length, location.state, location.pathname, navigate, startTour]);

  const finishTour = useCallback(
    (action = "complete") => {
      if (tour?.id) {
        storageRepository.setTutorialVersionSeen(tour.id, tour.version);
      }
      trackTutorial({
        action,
        stepIndex,
        stepTitle: currentStep?.title,
      });
      setIsOpen(false);
    },
    [tour, stepIndex, currentStep],
  );

  const handleDisableAuto = () => {
    storageRepository.setTutorialPrefs({ autoDisabled: true, pillHidden: true });
    finishTour("skip");
    addToast({
      title: "Guías automáticas desactivadas",
      description: "Podés volver a iniciar cualquier recorrido desde Cómo usar.",
      color: "default",
    });
  };

  const handleHidePill = () => {
    storageRepository.setTutorialPrefs({ pillHidden: true });
    addToast({
      title: "Acceso ocultado",
      description: "Podés volver a ver el recorrido cuando quieras desde Cómo usar.",
      color: "default",
    });
  };

  // Medir y seguir al elemento resaltado
  useLayoutEffect(() => {
    if (!isOpen || !currentStep?.target) {
      return undefined;
    }

    onBeforeStep?.(currentStep);

    const findVisibleTarget = () => {
      const candidates = Array.from(document.querySelectorAll(currentStep.target));
      return (
        candidates.find((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        }) || null
      );
    };

    const updateRect = () => {
      const el = findVisibleTarget();
      if (!el) {
        setTargetRect(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    const focusTarget = () => {
      const targetEl = findVisibleTarget();
      if (targetEl && typeof targetEl.scrollIntoView === "function") {
        targetEl.scrollIntoView({ behavior: "auto", block: "center" });
      }
      updateRect();
    };

    const rafInit = requestAnimationFrame(focusTarget);
    const rafTimer = setTimeout(focusTarget, 140);

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, { passive: true });
    return () => {
      cancelAnimationFrame(rafInit);
      clearTimeout(rafTimer);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, [isOpen, currentStep, onBeforeStep]);

  // Navegación por teclado
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        finishTour("skip");
      } else if (e.key === "ArrowRight") {
        if (stepIndex < steps.length - 1) {
          const next = stepIndex + 1;
          setStepIndex(next);
          trackTutorial({ action: "step_view", stepIndex: next, stepTitle: steps[next]?.title });
        } else {
          finishTour("complete");
        }
      } else if (e.key === "ArrowLeft" && stepIndex > 0) {
        setStepIndex((prev) => prev - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, stepIndex, steps, finishTour]);

  if (!ready || !tour) return null;

  if (!isOpen) {
    if (prefs.pillHidden) return null;

    const pillContent = (
      <div className="inline-flex items-center rounded-full bg-white/95 dark:bg-[#161D24]/95 border border-[#E2E8F0] dark:border-[#2A3540] shadow-xs">
        <button
          type="button"
          onClick={() => startTour(0)}
          className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 text-xs font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:opacity-80 cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Ver tutorial</span>
        </button>
        <button
          type="button"
          onClick={handleHidePill}
          aria-label="Ocultar acceso de tutorial"
          title="Ocultar"
          className="pr-2.5 pl-1 py-1.5 text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#F1F5F9] cursor-pointer"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    );

    if (triggerPlacement === "floating") {
      return <div className="fixed bottom-4 left-4 z-30">{pillContent}</div>;
    }

    return <div className="flex justify-end">{pillContent}</div>;
  }

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  // Posición inteligente en escritorio; en móvil queda fijo abajo como bottom-sheet
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const isDesktop = viewportWidth >= 640;

  let desktopStyle = {};
  if (isDesktop && targetRect) {
    const spaceBelow = viewportHeight - (targetRect.top + targetRect.height);
    const placeAbove = spaceBelow < 220 && targetRect.top > 220;
    const clampedLeft = Math.max(16, Math.min(targetRect.left, viewportWidth - 360));
    const computedTop = placeAbove
      ? Math.max(16, targetRect.top - 210)
      : Math.max(16, Math.min(viewportHeight - 220, targetRect.top + targetRect.height + 12));

    desktopStyle = {
      left: `${clampedLeft}px`,
      top: `${computedTop}px`,
    };
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Recorrido rápido: ${tour.title}`}
      className="fixed inset-0 z-50"
    >
      {/* Fondo atenuado / Spotlight real */}
      {targetRect ? (
        <div
          aria-hidden="true"
          className="fixed rounded-xl ring-2 ring-[#10B981] pointer-events-none transition-all duration-200"
          style={{
            top: `${Math.max(4, targetRect.top - 4)}px`,
            left: `${Math.max(4, targetRect.left - 4)}px`,
            width: `${targetRect.width + 8}px`,
            height: `${targetRect.height + 8}px`,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.58)",
          }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-slate-900/60" />
      )}

      {/* Tarjeta del paso actual */}
      <div
        style={isDesktop && targetRect ? desktopStyle : undefined}
        className={`fixed z-10 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl shadow-xl p-4 space-y-3 ${
          isDesktop && targetRect
            ? "w-[344px]"
            : "bottom-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[380px] sm:top-1/2 sm:-translate-y-1/2 sm:bottom-auto"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#005A36] dark:text-[#6EE7B7]">
            Paso {stepIndex + 1} de {steps.length} · {tour.title}
          </span>
          <button
            type="button"
            onClick={() => finishTour("skip")}
            aria-label="Omitir recorrido"
            className="text-xs font-medium text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#F1F5F9] inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Omitir</span>
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-bold text-[#1E293B] dark:text-[#F1F5F9]">
            {currentStep?.title}
          </h3>
          <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
            {currentStep?.description}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={handleDisableAuto}
            className="text-[11px] text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#F1F5F9] underline underline-offset-2 cursor-pointer"
          >
            No volver a mostrar
          </button>

          <div className="flex items-center gap-1.5">
            {!isFirst && (
              <Button
                size="sm"
                variant="bordered"
                className="min-h-8 border-[#E2E8F0] dark:border-[#2A3540]"
                startContent={<ChevronLeft className="w-3.5 h-3.5" />}
                onPress={() => setStepIndex((prev) => Math.max(0, prev - 1))}
              >
                Anterior
              </Button>
            )}
            <Button
              size="sm"
              color="success"
              className="min-h-8 bg-[#005A36] text-white font-semibold"
              endContent={!isLast && <ChevronRight className="w-3.5 h-3.5" />}
              onPress={() => {
                if (isLast) {
                  finishTour("complete");
                } else {
                  const next = stepIndex + 1;
                  setStepIndex(next);
                  trackTutorial({
                    action: "step_view",
                    stepIndex: next,
                    stepTitle: steps[next]?.title,
                  });
                }
              }}
            >
              {isLast ? "Finalizar" : "Siguiente"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

InteractiveTourOverlay.propTypes = {
  tour: PropTypes.shape({
    id: PropTypes.string.isRequired,
    version: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    steps: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        target: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
      }),
    ).isRequired,
  }),
  ready: PropTypes.bool,
  triggerPlacement: PropTypes.oneOf(["inline", "floating"]),
  onBeforeStep: PropTypes.func,
};
