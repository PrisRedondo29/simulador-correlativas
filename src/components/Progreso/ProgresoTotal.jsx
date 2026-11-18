import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  Chip,
  CircularProgress,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Progress,
  useDisclosure,
} from "@heroui/react";
import {
  ArrowRightLeft,
  Award,
  BookOpenCheck,
  ChevronRight,
  Clock,
  GraduationCap,
} from "lucide-react";
import { usePlanCapabilities } from "../../context/PlanContext";

/**
 * Cabecera y KPIs de Mi Progreso.
 * Jerarquiza el avance general como métrica protagonista y presenta
 * tres indicadores secundarios sin duplicar información.
 */
export default function ProgresoTotal({ carrera, plan, kpis }) {
  const { canSimulateTransition, transitionInfo } = usePlanCapabilities();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 240);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const horasRestantes = Math.max(
    0,
    (kpis?.totalHorasCarrera || 0) - (kpis?.totalHorasProgreso || 0),
  );
  const tieneIntermedio =
    Boolean(kpis?.tituloIntermedioNombre) && (kpis?.materiasIntermedio || 0) > 0;

  return (
    <>
      {/* Barra compacta contextual al hacer scroll */}
      {showStickyBar && (
        <div
          className="sticky top-14 lg:top-0 z-20 -mx-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#24303C] bg-[#FFFFFF]/95 dark:bg-[#161D24]/95 backdrop-blur-md shadow-sm flex flex-wrap items-center justify-between gap-3 transition-all"
          role="region"
          aria-label="Resumen rápido de progreso"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Chip
              size="sm"
              variant="flat"
              className="bg-[#005A36]/10 text-[#005A36] dark:bg-[#2E8B63]/20 dark:text-[#6EE7B7] font-semibold shrink-0"
            >
              Plan {plan}
            </Chip>
            <div className="flex items-center gap-2.5 min-w-0 flex-1 max-w-md">
              <span className="text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums shrink-0">
                {kpis.porcentajeGeneral}%
              </span>
              <Progress
                size="sm"
                aria-label="Porcentaje general"
                value={kpis.porcentajeGeneral}
                classNames={{
                  indicator: "bg-[#478559] dark:bg-[#4A9D68]",
                  track: "bg-[#E2E8F0] dark:bg-[#24303C]",
                }}
              />
              <span className="hidden sm:inline text-xs text-[#64748B] dark:text-[#94A3B8] tabular-nums shrink-0">
                {kpis.aprobadasCount}/{kpis.totalMaterias} aprobadas
              </span>
            </div>
          </div>

          {canSimulateTransition && transitionInfo && (
            <Button
              as={Link}
              to={transitionInfo.route}
              size="sm"
              className="bg-[#005A36] hover:bg-[#00462A] dark:bg-[#2E8B63] text-white font-medium shrink-0"
              startContent={<ArrowRightLeft className="w-3.5 h-3.5" />}
            >
              Simular cambio
            </Button>
          )}
        </div>
      )}

      {/* Encabezado de página */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-[#64748B] dark:text-[#94A3B8] truncate">
              {carrera || "Licenciatura en Sistemas de Información"}
            </span>
            <Chip
              size="sm"
              variant="flat"
              className="bg-[#005A36]/10 text-[#005A36] dark:bg-[#2E8B63]/20 dark:text-[#6EE7B7] font-semibold"
            >
              Plan {plan}
            </Chip>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E293B] dark:text-[#F1F5F9]">
            Mi Progreso Académico
          </h1>
          <p className="text-sm text-[#475569] dark:text-[#94A3B8]">
            Seguimiento de tu avance en la carrera, correlativas y estado de materias.
          </p>
        </div>

        {canSimulateTransition && transitionInfo && (
          <Button
            as={Link}
            to={transitionInfo.route}
            className="bg-[#005A36] hover:bg-[#00462A] dark:bg-[#2E8B63] dark:hover:bg-[#247250] text-white font-medium shadow-sm shrink-0 min-h-10"
            startContent={<ArrowRightLeft className="w-4 h-4" />}
          >
            Simular cambio de plan
          </Button>
        )}
      </header>

      {/* Bloque KPI: 1 Protagonista + 3 Secundarios livianos */}
      <section
        aria-label="Indicadores de avance académico"
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
      >
        {/* KPI Protagonista: Progreso general */}
        <Card
          shadow="none"
          className="lg:col-span-5 bg-[#FFFFFF] dark:bg-[#161D24] border border-[#478559]/30 dark:border-[#4A9D68]/35 shadow-sm"
        >
          <CardBody className="p-4 sm:p-5 flex flex-row items-center gap-4">
            <CircularProgress
              aria-label="Progreso general de la carrera"
              value={kpis.porcentajeGeneral}
              showValueLabel={true}
              classNames={{
                svg: "w-20 h-20 sm:w-22 sm:h-22 shrink-0",
                indicator: "stroke-[#478559] dark:stroke-[#4A9D68]",
                track: "stroke-[#E2E8F0] dark:stroke-[#24303C]",
                value:
                  "text-lg sm:text-xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums",
              }}
            />

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <BookOpenCheck className="w-4 h-4 text-[#005A36] dark:text-[#6EE7B7] shrink-0" />
                <h2 className="text-sm font-semibold text-[#005A36] dark:text-[#6EE7B7]">
                  Progreso general
                </h2>
              </div>

              <p className="text-sm sm:text-base text-[#334155] dark:text-[#CBD5E1] leading-snug">
                <span className="font-bold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                  {kpis.aprobadasCount} de {kpis.totalMaterias}
                </span>{" "}
                materias aprobadas o promocionadas
              </p>

              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] tabular-nums pt-0.5">
                {kpis.regularesCount} regulares · {kpis.cursandoCount} cursando ·{" "}
                {kpis.disponiblesCount} disponibles
              </p>
            </div>
          </CardBody>
        </Card>

        {/* 3 KPIs secundarios subordinados */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Secundario 1: Materias restantes */}
          <Card
            shadow="none"
            className="bg-[#FFFFFF] dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C]"
          >
            <CardBody className="p-4 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                  Restantes
                </span>
                <Clock className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24] shrink-0" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-semibold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                  {kpis.restantesCount}
                </p>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 tabular-nums">
                  {horasRestantes} hs por completar
                </p>
              </div>
            </CardBody>
          </Card>

          {/* Secundario 2: Título intermedio o Carga horaria */}
          <Card
            shadow="none"
            className="bg-[#FFFFFF] dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C]"
          >
            <CardBody className="p-4 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8] truncate">
                  {tieneIntermedio ? kpis.tituloIntermedioNombre : "Carga horaria"}
                </span>
                <GraduationCap className="w-4 h-4 text-[#005A36] dark:text-[#6EE7B7] shrink-0" />
              </div>

              {tieneIntermedio ? (
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xl sm:text-2xl font-semibold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                      {kpis.progresoIntermedio.porcentaje}%
                    </p>
                    <span className="text-xs text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                      {kpis.progresoIntermedio.completadas}/
                      {kpis.progresoIntermedio.totales}
                    </span>
                  </div>
                  <Progress
                    size="sm"
                    aria-label={`Progreso de ${kpis.tituloIntermedioNombre}`}
                    value={kpis.progresoIntermedio.porcentaje}
                    classNames={{
                      indicator: "bg-[#478559] dark:bg-[#4A9D68]",
                      track: "bg-[#E2E8F0] dark:bg-[#24303C]",
                    }}
                  />
                </div>
              ) : (
                <div>
                  <p className="text-xl sm:text-2xl font-semibold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                    {kpis.totalHorasProgreso} hs
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 tabular-nums">
                    de {kpis.totalHorasCarrera} hs totales
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Secundario 3: Promedio (botón interactivo para detalle de promedios y horas) */}
          <button
            type="button"
            onClick={onOpen}
            className="text-left rounded-xl bg-[#FFFFFF] dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C] hover:border-[#005A36]/50 dark:hover:border-[#4A9D68]/60 transition-colors p-4 flex flex-col justify-between gap-2 cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                Promedio s/aplazos
              </span>
              <Award className="w-4 h-4 text-[#1E3A8A] dark:text-[#60A5FA] shrink-0" />
            </div>

            <div className="w-full">
              <p className="text-xl sm:text-2xl font-semibold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                {kpis.promedios.promedioSinAplazos ?? "—"}
              </p>
              <div className="flex items-center justify-between gap-1 mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                <span className="tabular-nums truncate">
                  Con aplazos: {kpis.promedios.promedioConAplazos ?? "—"}
                </span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Modal de detalle de promedios y horas */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
        <ModalContent className="bg-[#FFFFFF] dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C]">
          {(onClose) => (
            <>
              <ModalHeader className="text-[#1E293B] dark:text-[#F1F5F9] border-b border-[#E2E8F0] dark:border-[#24303C]">
                Detalle académico del Plan {plan}
              </ModalHeader>
              <ModalBody className="py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#24303C]">
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                      Promedio sin aplazos
                    </p>
                    <p className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums mt-1">
                      {kpis.promedios.promedioSinAplazos ?? "—"}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#24303C]">
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                      Promedio con aplazos
                    </p>
                    <p className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums mt-1">
                      {kpis.promedios.promedioConAplazos ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#24303C] space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[#334155] dark:text-[#CBD5E1]">
                      Carga horaria aprobada
                    </span>
                    <span className="font-semibold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                      {kpis.totalHorasProgreso} / {kpis.totalHorasCarrera} hs
                    </span>
                  </div>
                  <Progress
                    size="sm"
                    aria-label="Carga horaria aprobada"
                    value={
                      kpis.totalHorasCarrera > 0
                        ? Math.round(
                            (kpis.totalHorasProgreso / kpis.totalHorasCarrera) * 100,
                          )
                        : 0
                    }
                    classNames={{
                      indicator: "bg-[#005A36] dark:bg-[#4A9D68]",
                      track: "bg-[#E2E8F0] dark:bg-[#24303C]",
                    }}
                  />
                </div>

                {tieneIntermedio && (
                  <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#24303C] flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                        Título intermedio
                      </p>
                      <p className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                        {kpis.tituloIntermedioNombre}
                      </p>
                    </div>
                    <Chip
                      size="sm"
                      variant="flat"
                      className={
                        kpis.isIntermedioCompletado
                          ? "bg-[#478559]/15 text-[#478559] dark:text-[#6EE7B7]"
                          : "bg-[#F1F5F9] dark:bg-[#24303C] text-[#475569] dark:text-[#CBD5E1]"
                      }
                    >
                      {kpis.progresoIntermedio.completadas}/
                      {kpis.progresoIntermedio.totales} (
                      {kpis.progresoIntermedio.porcentaje}%)
                    </Chip>
                  </div>
                )}

                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Los promedios se calculan únicamente con las materias que tienen nota
                  final o promocionada cargada.
                </p>
              </ModalBody>
              <ModalFooter className="border-t border-[#E2E8F0] dark:border-[#24303C]">
                <Button
                  size="sm"
                  className="bg-[#005A36] text-white font-medium"
                  onPress={onClose}
                >
                  Cerrar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
