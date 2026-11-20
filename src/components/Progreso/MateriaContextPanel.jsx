import { useState, useSyncExternalStore } from "react";
import {
  Button,
  Chip,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  Input,
  Progress,
  Select,
  SelectItem,
  Switch,
} from "@heroui/react";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Edit2,
  History,
  Lock,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import useDetalleMateria from "../../hooks/Progreso/useDetalleMateria";
import estadoUtils from "../../utils/Progreso/estadoUtils";
import {
  evaluarElegibilidadMateria,
  obtenerCodigosCorrelativasMateria,
} from "../../utils/Progreso/materiaStateMachine";
import materiasUtils, { esMateriaIncompleta } from "../../utils/Progreso/materiasUtils";
import regularidadUtils from "../../utils/Progreso/regularidadUtils";
import reglas from "../../utils/Progreso/reglas_universidad.json";
import ConsejoMateria from "./modals/ConsejoMateria";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  ...Array.from({ length: CURRENT_YEAR - 1999 }, (_, i) => {
    const y = String(CURRENT_YEAR - i);
    return { value: y, label: y };
  }),
  { value: "1999", label: "Anterior a 2000" },
];

const QUICK_STATES = [
  { target: "Reiniciar", label: "Pendiente", matchStates: ["Disponible", "Bloqueado"] },
  { target: "Cursando", label: "Cursando", matchStates: ["Cursando"] },
  { target: "Regular", label: "Regular", matchStates: ["Regular"] },
  { target: "Aprobado", label: "Aprobado", matchStates: ["Aprobado"] },
  { target: "Promocionado", label: "Promocionado", matchStates: ["Promocionado"] },
  { target: "Libre", label: "Libre", matchStates: ["Libre"] },
];

function subscribeMobileDrawer(callback) {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia("(max-width: 1023px)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getMobileDrawerSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

function IntentoInlineEditor({ intento, index, onSave, onCancel }) {
  const [estado, setEstado] = useState(
    intento.estado === "ausente" ? "ausente" : "rendido",
  );
  const [nota, setNota] = useState(
    intento.nota != null ? String(intento.nota) : "",
  );
  const [fecha, setFecha] = useState(
    intento.fecha || new Date().toISOString().split("T")[0],
  );
  const [error, setError] = useState("");

  const handleSave = () => {
    if (estado === "rendido") {
      const n = Number(nota);
      if (nota === "" || Number.isNaN(n) || n < 0 || n > 10) {
        setError("Ingresá una nota entre 0 y 10");
        return;
      }
      const parsed = parseInt(nota, 10);
      onSave(index, {
        nota: parsed,
        estado: parsed >= 4 ? "aprobado" : "reprobado",
        fecha,
      });
      return;
    }

    onSave(index, {
      nota: null,
      estado: "ausente",
      fecha,
    });
  };

  return (
    <div className="p-3 rounded-lg bg-[#FFFFFF] dark:bg-[#161D24] border border-[#005A36]/40 dark:border-[#4A9D68]/50 space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Select
          size="sm"
          label="Condición"
          selectedKeys={[estado]}
          onChange={(e) => setEstado(e.target.value || "rendido")}
        >
          <SelectItem key="rendido">Rendido</SelectItem>
          <SelectItem key="ausente">Ausente</SelectItem>
        </Select>

        {estado === "rendido" && (
          <Input
            size="sm"
            type="number"
            min={0}
            max={10}
            label="Nota"
            value={nota}
            onValueChange={(v) => {
              setError("");
              setNota(v);
            }}
          />
        )}
      </div>

      <Input
        size="sm"
        type="date"
        label="Fecha"
        value={fecha}
        onValueChange={setFecha}
      />

      {error && <p className="text-xs text-[#DC2626]">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="light" onPress={onCancel}>
          Cancelar
        </Button>
        <Button
          size="sm"
          className="bg-[#005A36] text-white"
          startContent={<Check className="w-3.5 h-3.5" />}
          onPress={handleSave}
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}

function HistorialInlineEditor({ cursada, index, onSave, onCancel }) {
  const [anio, setAnio] = useState(
    String(cursada?.fechaRegularidad?.anio || CURRENT_YEAR),
  );
  const [cuatrimestre, setCuatrimestre] = useState(
    String(cursada?.fechaRegularidad?.cuatrimestre || 1),
  );
  const [nota, setNota] = useState(
    cursada?.notaRegularizacion != null ? String(cursada.notaRegularizacion) : "",
  );

  const handleSave = () => {
    onSave(index, {
      ...cursada,
      fechaRegularidad: {
        anio: Number(anio),
        cuatrimestre: Number(cuatrimestre),
      },
      notaRegularizacion: nota === "" ? null : Number(nota),
    });
  };

  return (
    <div className="p-2.5 rounded-lg bg-[#FFFFFF] dark:bg-[#161D24] border border-[#005A36]/40 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <Select
          size="sm"
          label="Año"
          selectedKeys={[anio]}
          onChange={(e) => setAnio(e.target.value || String(CURRENT_YEAR))}
        >
          {YEAR_OPTIONS.map((opt) => (
            <SelectItem key={opt.value}>{opt.label}</SelectItem>
          ))}
        </Select>
        <Select
          size="sm"
          label="Cuatri"
          selectedKeys={[cuatrimestre]}
          onChange={(e) => setCuatrimestre(e.target.value || "1")}
        >
          <SelectItem key="1">1°C</SelectItem>
          <SelectItem key="2">2°C</SelectItem>
        </Select>
        <Input
          size="sm"
          type="number"
          min={4}
          max={10}
          label="Nota"
          value={nota}
          onValueChange={setNota}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="light" onPress={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" className="bg-[#005A36] text-white" onPress={handleSave}>
          Guardar
        </Button>
      </div>
    </div>
  );
}

/**
 * Contenido reutilizable del panel contextual con divulgación progresiva en 3 niveles:
 * 1) Estado + correlativas (siempre visible)
 * 2) Cursada e intentos de final (para materias en regularidad o aprobadas)
 * 3) Opciones avanzadas, historial y recomendación (colapsado por defecto)
 */
export function MateriaContextContent({
  materia,
  materias,
  progreso,
  progresoDetalles,
  setProgresoDetalles,
  plan,
  cambioDeEstado,
  onChangeEstado,
  solicitarConfirmacionCascada,
  onSelectMateria,
  onClose,
}) {
  const estadoActual = materia ? progreso[materia.codigo] || "Disponible" : "Disponible";
  const detalles = (materia && progresoDetalles?.[materia.codigo]) || {};

  const {
    showNotaForm,
    setShowNotaForm,
    notaVal,
    setNotaVal,
    estadoVal,
    setEstadoVal,
    fechaIntento,
    setFechaIntento,
    notaError,
    editingHistorialIndex,
    setEditingHistorialIndex,
    editingIntentoIndex,
    setEditingIntentoIndex,
    handleCambioAnio,
    handleCambioNotaCursada,
    handleGuardarIntento,
    handleEliminarIntento,
    handleUpdateIntento,
    handleUpdateCursadaHistorial,
    handleEliminarCursadaHistorial,
    handleToggleLibre,
    handleToggleEquivalencia,
    handleCambioNotaEquivalencia,
  } = useDetalleMateria(
    materia,
    progresoDetalles,
    setProgresoDetalles,
    plan,
    progreso,
    cambioDeEstado,
    estadoActual,
  );

  if (!materia) return null;

  const estadoConfig =
    estadoUtils.ESTADO_CONFIG[estadoActual] || estadoUtils.ESTADO_CONFIG.Disponible;

  const elegibilidad = evaluarElegibilidadMateria(materia, progreso, materias);
  const codigosCorrelativas = obtenerCodigosCorrelativasMateria(materia);
  const correlativas = materiasUtils.buscarMateriasCorrelativas(
    codigosCorrelativas,
    materias,
  );
  const mapaCondicionCursada = new Map(
    elegibilidad.requisitosCursada.map((r) => [r.codigo, r.condicion]),
  );
  const codigosSoloFinal = new Set(
    elegibilidad.requisitosFinal
      .map((r) => r.codigo)
      .filter((c) => !mapaCondicionCursada.has(c)),
  );

  const habilitaA = materias.filter((m) =>
    obtenerCodigosCorrelativasMateria(m).includes(materia.codigo),
  );

  const esEstadoAcademico = ["Regular", "Libre", "Aprobado", "Promocionado"].includes(
    estadoActual,
  );
  const esRendidaLibre = Boolean(detalles.rendidaLibre);
  const esEquivalencia = Boolean(detalles.esEquivalencia);
  const anioSeleccionado = esEquivalencia
    ? detalles.anioExamen != null
      ? String(detalles.anioExamen)
      : ""
    : detalles.fechaRegularidad?.anio != null
      ? String(detalles.fechaRegularidad.anio)
      : "";

  const statusPlan = regularidadUtils.obtenerPlanificacionInstancias(
    detalles.fechaRegularidad,
    detalles.intentosFinal,
  );
  const fechaVencimiento = regularidadUtils.obtenerFechaVencimientoLabel(
    detalles.fechaRegularidad,
  );
  const intentosFinal = Array.isArray(detalles.intentosFinal)
    ? detalles.intentosFinal
    : [];
  const maxDesaprobaciones = reglas.limites.intentos_final;
  const desaprobadosCount = intentosFinal.filter(
    (i) => i.estado === "reprobado",
  ).length;
  const tieneIntentoAprobado = intentosFinal.some((i) => i.estado === "aprobado");
  const isTesinaBloqueada = Boolean(materia.tesis) && estadoActual === "Bloqueado";
  const faltaInfo = esMateriaIncompleta(materia, estadoActual, detalles);

  const handleConfirmarNuevoIntento = () => {
    const notaNum = Number(notaVal);
    const esIntentoAprobado =
      estadoVal === "rendido" &&
      notaVal !== "" &&
      !Number.isNaN(notaNum) &&
      notaNum >= 4 &&
      notaNum <= 10;

    if (esIntentoAprobado && typeof solicitarConfirmacionCascada === "function") {
      solicitarConfirmacionCascada({
        codigo: materia.codigo,
        targetState: "Aprobado",
        onConfirmAction: () => handleGuardarIntento(),
      });
      return;
    }
    handleGuardarIntento();
  };

  const handleConfirmarEdicionIntento = (idx, updatedIntento) => {
    if (
      updatedIntento?.estado === "aprobado" &&
      typeof solicitarConfirmacionCascada === "function"
    ) {
      solicitarConfirmacionCascada({
        codigo: materia.codigo,
        targetState: "Aprobado",
        onConfirmAction: () => handleUpdateIntento(idx, updatedIntento),
      });
      return;
    }
    handleUpdateIntento(idx, updatedIntento);
  };

  return (
    <div className="space-y-4">
      {/* Encabezado contextual */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E2E8F0] dark:border-[#24303C]">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] tabular-nums">
              {materia.codigo}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoConfig.badgeClass}`}
            >
              <i className={`${estadoConfig.icono} text-[11px]`} aria-hidden="true" />
              {estadoActual}
            </span>
            {detalles.notaFinal != null &&
              (estadoActual === "Aprobado" || estadoActual === "Promocionado") && (
                <Chip
                  size="sm"
                  variant="flat"
                  className="bg-[#005A36]/10 text-[#005A36] dark:bg-[#2E8B63]/20 dark:text-[#6EE7B7] font-semibold tabular-nums"
                >
                  Nota final: {detalles.notaFinal}
                </Chip>
              )}
          </div>

          <h2 className="text-base sm:text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] leading-snug">
            {materia.nombre}
          </h2>

          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            {materia.taller
              ? "Taller"
              : `${materia.anio}° Año · ${materia.cuatrimestre}° Cuatrimestre`}
            {materia.horas_totales ? ` · ${materia.horas_totales} hs totales` : ""}
          </p>
        </div>

        {onClose && (
          <Button
            isIconOnly
            size="sm"
            variant="light"
            aria-label="Cerrar panel de materia"
            onPress={onClose}
            className="text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#F1F5F9] shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* NIVEL 1: Estado y Correlativas */}
      <section aria-label="Estado de la materia" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            Cambiar estado
          </h3>
          {isTesinaBloqueada && (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              <Lock className="w-3 h-3" />
              Requisito de cierre
            </span>
          )}
        </div>

        {isTesinaBloqueada && (
          <div className="p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] text-xs text-[#475569] dark:text-[#94A3B8]">
            La Tesina se desbloquea automáticamente cuando regularizás o aprobás todas las materias del plan.
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {QUICK_STATES.map((item) => {
            const isActive = item.matchStates.includes(estadoActual);
            const isDisabled =
              isTesinaBloqueada ||
              (item.target === "Reiniciar" &&
                (estadoActual === "Disponible" || estadoActual === "Bloqueado"));

            return (
              <button
                key={item.target}
                type="button"
                disabled={isDisabled}
                aria-pressed={isActive}
                onClick={() => onChangeEstado(materia.codigo, item.target)}
                className={`min-h-9 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-center ${
                  isActive
                    ? "bg-[#005A36] text-white dark:bg-[#2E8B63] shadow-xs"
                    : isDisabled
                      ? "bg-[#F1F5F9] dark:bg-[#1A2129] text-[#94A3B8] dark:text-[#475569] cursor-not-allowed"
                      : "bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] text-[#334155] dark:text-[#CBD5E1] hover:border-[#005A36]/50 dark:hover:border-[#4A9D68]/60 cursor-pointer"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Correlativas" className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            Correlativas requeridas
          </h3>
          {habilitaA.length > 0 && (
            <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              Habilita a {habilitaA.length}{" "}
              {habilitaA.length === 1 ? "materia" : "materias"}
            </span>
          )}
        </div>

        {correlativas.length === 0 ? (
          <p className="text-xs text-[#475569] dark:text-[#94A3B8] bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] rounded-lg px-3 py-2">
            No requiere correlativas previas.
          </p>
        ) : (
          <div className="space-y-1.5">
            {correlativas.map((corr) => {
              const estCorr = progreso[corr.codigo] || "Bloqueado";
              const cfgCorr =
                estadoUtils.ESTADO_CONFIG[estCorr] || estadoUtils.ESTADO_CONFIG.Bloqueado;
              const condCursada = mapaCondicionCursada.get(corr.codigo);
              const esSoloFinal = codigosSoloFinal.has(corr.codigo);
              const etiquetaRequisito = esSoloFinal
                ? "Final: Aprobada"
                : condCursada === "aprobada"
                  ? "Cursar: Aprobada"
                  : elegibilidad.tieneReglasDiferenciadas
                    ? "Cursar: Regular"
                    : null;

              return (
                <button
                  key={corr.codigo}
                  type="button"
                  onClick={() => onSelectMateria?.(corr.codigo)}
                  className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] hover:border-[#005A36]/50 dark:hover:border-[#4A9D68]/50 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#1E293B] dark:text-[#F1F5F9] truncate">
                      {corr.nombre}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                        {corr.codigo}
                      </span>
                      {etiquetaRequisito && (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-[#E2E8F0]/70 dark:bg-[#24303C] text-[#334155] dark:text-[#CBD5E1]">
                          {etiquetaRequisito}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfgCorr.badgeClass}`}
                    >
                      <i className={`${cfgCorr.icono} text-[10px]`} aria-hidden="true" />
                      {estCorr}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {elegibilidad.requisitosEspecialesFaltantes.length > 0 && !materia.tesis && (
          <div
            role="status"
            className="p-2.5 rounded-lg bg-[#FEF3C7]/60 dark:bg-[#2D2210] border border-[#F59E0B]/30 text-xs text-[#92400E] dark:text-[#FCD34D] space-y-1"
          >
            <p className="font-semibold">Requisitos adicionales pendientes:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {elegibilidad.requisitosEspecialesFaltantes.map((req, idx) => (
                <li key={`${req.tipo}-${idx}`}>{req.mensaje}</li>
              ))}
            </ul>
          </div>
        )}

        {["Disponible", "Cursando", "Regular"].includes(estadoActual) &&
          elegibilidad.puedeCursar &&
          !elegibilidad.puedeRendirFinal &&
          elegibilidad.faltantesParaFinal.length > 0 && (
            <div
              role="status"
              className="p-2.5 rounded-lg bg-[#F0FDF4] dark:bg-[#11241B] border border-[#005A36]/25 dark:border-[#2E8B63]/40 text-xs text-[#166534] dark:text-[#A7F3D0]"
            >
              <span className="font-semibold">Habilitada para cursar.</span> Para rendir final o
              promocionar necesitás aprobar el final de:{" "}
              <span className="font-medium">
                {elegibilidad.faltantesParaFinal.map((f) => f.nombre).join(", ")}
              </span>
              .
            </div>
          )}
      </section>

      {/* NIVEL 2: Información académica (cursada e intentos de final) */}
      {esEstadoAcademico && (
        <section
          aria-label="Información académica de cursada y examen final"
          className="space-y-3 pt-3 border-t border-[#E2E8F0] dark:border-[#24303C]"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Datos de cursada y final
            </h3>
            {estadoActual === "Regular" && !esRendidaLibre && fechaVencimiento && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#92400E] dark:text-[#FCD34D] bg-[#FEF3C7]/70 dark:bg-[#423115] px-2 py-0.5 rounded-full">
                <Calendar className="w-3 h-3" />
                Vence: {fechaVencimiento}
              </span>
            )}
          </div>

          {faltaInfo && (
            <div
              role="status"
              className="p-2.5 rounded-lg bg-[#FFFBEB] dark:bg-[#2D2210] border border-[#FDE68A] dark:border-[#5C4318] text-xs text-[#92400E] dark:text-[#FCD34D] flex items-start gap-2"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                {estadoActual === "Regular"
                  ? "Falta info: completá abajo el año y la nota de cursada para calcular tu promedio y vencimiento de regularidad."
                  : estadoActual === "Promocionado"
                    ? "Falta info: completá la nota final de promoción para incluir esta materia en tu promedio general."
                    : esEquivalencia
                      ? "Falta info: completá la nota en «Opciones avanzadas» para incluir esta equivalencia en tu promedio."
                      : "Falta info: registrá tu examen final aprobado abajo para incluir la nota en tu promedio general."}
              </span>
            </div>
          )}

          {!esRendidaLibre && !esEquivalencia && (
            <div className="grid grid-cols-2 gap-2.5">
              <Select
                size="sm"
                label="Año regularidad"
                placeholder="Seleccionar"
                selectedKeys={anioSeleccionado ? [anioSeleccionado] : []}
                onChange={handleCambioAnio}
                variant="bordered"
              >
                {YEAR_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value}>{opt.label}</SelectItem>
                ))}
              </Select>

              <Input
                size="sm"
                type="number"
                min={4}
                max={10}
                label="Nota cursada"
                placeholder="4 a 10"
                variant="bordered"
                value={
                  detalles.notaRegularizacion != null
                    ? String(detalles.notaRegularizacion)
                    : ""
                }
                onValueChange={handleCambioNotaCursada}
              />
            </div>
          )}

          {estadoActual === "Promocionado" && !esEquivalencia && (
            <Input
              size="sm"
              type="number"
              min={4}
              max={10}
              label="Nota final (promoción)"
              placeholder="7 a 10"
              variant="bordered"
              value={detalles.notaFinal != null ? String(detalles.notaFinal) : ""}
              onValueChange={handleCambioNotaEquivalencia}
            />
          )}

          {!esEquivalencia && (
            <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                    Intentos de examen final
                  </p>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                    {desaprobadosCount} de {maxDesaprobaciones} desaprobaciones
                    {estadoActual === "Regular"
                      ? ` · ${statusPlan.cuatrimestresRestantes} cuatris restantes`
                      : ""}
                  </p>
                </div>

                {desaprobadosCount < maxDesaprobaciones &&
                  !tieneIntentoAprobado &&
                  estadoActual !== "Promocionado" && (
                  <Button
                    size="sm"
                    variant="flat"
                    className="bg-[#005A36]/10 text-[#005A36] dark:bg-[#2E8B63]/20 dark:text-[#6EE7B7] font-medium"
                    startContent={<Plus className="w-3.5 h-3.5" />}
                    onPress={() => setShowNotaForm((prev) => !prev)}
                  >
                    {showNotaForm ? "Cerrar" : "Agregar"}
                  </Button>
                )}
              </div>

              <Progress
                size="sm"
                aria-label="Desaprobaciones de final acumuladas"
                value={(desaprobadosCount / maxDesaprobaciones) * 100}
                classNames={{
                  indicator:
                    desaprobadosCount >= maxDesaprobaciones
                      ? "bg-[#DC2626]"
                      : desaprobadosCount >= Math.ceil(maxDesaprobaciones / 2)
                        ? "bg-[#D97706]"
                        : "bg-[#478559]",
                  track: "bg-[#E2E8F0] dark:bg-[#24303C]",
                }}
              />

              {showNotaForm && (
                <div className="p-3 rounded-lg bg-[#FFFFFF] dark:bg-[#161D24] border border-[#005A36]/35 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      size="sm"
                      label="Resultado"
                      selectedKeys={[estadoVal]}
                      onChange={(e) => setEstadoVal(e.target.value || "rendido")}
                    >
                      <SelectItem key="rendido">Rendido</SelectItem>
                      <SelectItem key="ausente">Ausente</SelectItem>
                    </Select>

                    {estadoVal === "rendido" && (
                      <Input
                        size="sm"
                        type="number"
                        min={0}
                        max={10}
                        label="Nota (0-10)"
                        value={notaVal}
                        onValueChange={setNotaVal}
                      />
                    )}
                  </div>

                  <Input
                    size="sm"
                    type="date"
                    label="Fecha del examen"
                    value={fechaIntento}
                    onValueChange={setFechaIntento}
                  />

                  {notaError && (
                    <p className="text-xs text-[#DC2626] dark:text-[#F87171]">
                      {notaError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="light"
                      onPress={() => setShowNotaForm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[#005A36] text-white"
                      onPress={handleConfirmarNuevoIntento}
                    >
                      Guardar intento
                    </Button>
                  </div>
                </div>
              )}

              {intentosFinal.length > 0 ? (
                <div className="space-y-1.5">
                  {intentosFinal.map((intento, idx) =>
                    editingIntentoIndex === idx ? (
                      <IntentoInlineEditor
                        key={`${idx}-${intento.fecha || "edit"}`}
                        intento={intento}
                        index={idx}
                        onSave={handleConfirmarEdicionIntento}
                        onCancel={() => setEditingIntentoIndex(null)}
                      />
                    ) : (
                      <div
                        key={`${idx}-${intento.fecha || "item"}`}
                        className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-[#FFFFFF] dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C] text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                            {idx + 1}° llamado
                          </span>
                          <span className="mx-1.5 text-[#94A3B8]">·</span>
                          <span
                            className={`font-medium ${
                              intento.estado === "aprobado"
                                ? "text-[#166534] dark:text-[#86EFAC]"
                                : intento.estado === "ausente"
                                  ? "text-[#64748B] dark:text-[#94A3B8]"
                                  : "text-[#B91C1C] dark:text-[#FCA5A5]"
                            }`}
                          >
                            {intento.estado === "ausente"
                              ? "Ausente"
                              : `${intento.estado === "aprobado" ? "Aprobado" : "Desaprobado"} (${intento.nota ?? "-"})`}
                          </span>
                          {intento.fecha && (
                            <span className="ml-1.5 text-[11px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                              {intento.fecha}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            aria-label={`Editar intento ${idx + 1}`}
                            onClick={() => setEditingIntentoIndex(idx)}
                            className="p-1.5 rounded text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#F1F5F9] cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Eliminar intento ${idx + 1}`}
                            onClick={() => handleEliminarIntento(idx)}
                            className="p-1.5 rounded text-[#64748B] hover:text-[#DC2626] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Sin llamados de final registrados.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* NIVEL 3: Opciones avanzadas, historial y recomendación (divulgación progresiva colapsada) */}
      <details className="group rounded-xl border border-[#E2E8F0] dark:border-[#24303C] bg-[#F8FAFC]/70 dark:bg-[#11171D]">
        <summary className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-semibold text-[#334155] dark:text-[#CBD5E1] cursor-pointer select-none list-none">
          <span className="flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-[#64748B]" />
            Opciones avanzadas e historial
          </span>
          <ChevronDown className="w-4 h-4 text-[#64748B] transition-transform group-open:rotate-180" />
        </summary>

        <div className="px-3.5 pb-3.5 pt-2 space-y-3 border-t border-[#E2E8F0] dark:border-[#24303C]">
          {esEstadoAcademico && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#334155] dark:text-[#CBD5E1]">
                  Rendida en condición libre
                </span>
                <Switch
                  size="sm"
                  isSelected={esRendidaLibre}
                  onValueChange={handleToggleLibre}
                  classNames={{
                    wrapper: "group-data-[selected=true]:bg-[#005A36]",
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#334155] dark:text-[#CBD5E1]">
                  Aprobada por equivalencia
                </span>
                <Switch
                  size="sm"
                  isSelected={esEquivalencia}
                  onValueChange={handleToggleEquivalencia}
                  classNames={{
                    wrapper: "group-data-[selected=true]:bg-[#005A36]",
                  }}
                />
              </div>

              {esEquivalencia && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Select
                    size="sm"
                    label="Año equivalencia"
                    selectedKeys={anioSeleccionado ? [anioSeleccionado] : []}
                    onChange={handleCambioAnio}
                    variant="bordered"
                  >
                    {YEAR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </Select>
                  <Input
                    size="sm"
                    type="number"
                    min={4}
                    max={10}
                    label="Nota"
                    variant="bordered"
                    value={detalles.notaFinal != null ? String(detalles.notaFinal) : ""}
                    onValueChange={handleCambioNotaEquivalencia}
                  />
                </div>
              )}
            </div>
          )}

          {/* Historial de cursadas anteriores */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
              Historial de cursadas anteriores
            </p>
            {Array.isArray(detalles.historial) && detalles.historial.length > 0 ? (
              <div className="space-y-1.5">
                {detalles.historial.map((cursada, idx) =>
                  editingHistorialIndex === idx ? (
                    <HistorialInlineEditor
                      key={`hist-edit-${idx}`}
                      cursada={cursada}
                      index={idx}
                      onSave={handleUpdateCursadaHistorial}
                      onCancel={() => setEditingHistorialIndex(null)}
                    />
                  ) : (
                    <div
                      key={`hist-${idx}`}
                      className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-[#FFFFFF] dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C] text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                          {cursada.fechaRegularidad
                            ? `${cursada.fechaRegularidad.anio} · ${cursada.fechaRegularidad.cuatrimestre}°C`
                            : "Cursada anterior"}
                        </span>
                        {cursada.notaRegularizacion != null && (
                          <span className="ml-2 text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                            Nota: {cursada.notaRegularizacion}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-label={`Editar cursada anterior ${idx + 1}`}
                          onClick={() => setEditingHistorialIndex(idx)}
                          className="p-1 text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#F1F5F9] cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Eliminar cursada anterior ${idx + 1}`}
                          onClick={() => handleEliminarCursadaHistorial(idx)}
                          className="p-1 text-[#64748B] hover:text-[#DC2626] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Sin cursadas previas archivadas.
              </p>
            )}
          </div>

          <ConsejoMateria
            estadoActual={estadoActual}
            statusPlan={statusPlan}
            detallesLocales={detalles}
            infoMateria={materia}
          />
        </div>
      </details>
    </div>
  );
}

/**
 * Panel contextual adaptativo:
 * - Escritorio (lg+): panel lateral sticky integrado junto a los acordeones.
 * - Móvil / Tablet (< lg): Drawer inferior con acceso completo sin saturar el flujo principal.
 */
export default function MateriaContextPanel(props) {
  const { materia, onClose } = props;
  const isCompactViewport = useSyncExternalStore(
    subscribeMobileDrawer,
    getMobileDrawerSnapshot,
    () => false,
  );

  if (isCompactViewport) {
    if (!materia) return null;
    return (
      <Drawer
        isOpen={Boolean(materia)}
        onOpenChange={(open) => {
          if (!open) onClose?.();
        }}
        placement="bottom"
        size="lg"
        hideCloseButton
      >
        <DrawerContent className="bg-[#FFFFFF] dark:bg-[#161D24] border-t border-[#E2E8F0] dark:border-[#24303C] max-h-[88vh]">
          <DrawerHeader className="sr-only">
            Detalle de {materia.nombre}
          </DrawerHeader>
          <DrawerBody className="p-4 overflow-y-auto">
            <MateriaContextContent key={materia.codigo} {...props} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  if (!materia) {
    return (
      <aside
        aria-label="Panel de detalle de materia"
        className="rounded-xl bg-[#FFFFFF] dark:bg-[#161D24] border border-dashed border-[#CBD5E1] dark:border-[#2A3540] p-6 text-center space-y-2.5"
      >
        <div className="w-10 h-10 rounded-full bg-[#F1F5F9] dark:bg-[#1E2730] text-[#005A36] dark:text-[#6EE7B7] flex items-center justify-center mx-auto">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
            Detalle de materia
          </p>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            Seleccioná cualquier materia para ver sus correlativas, cambiar su estado o cargar notas de cursada y final.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label={`Detalle de ${materia.nombre}`}
      className="rounded-xl bg-[#FFFFFF] dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C] p-4 shadow-sm max-h-[calc(100vh-5.5rem)] overflow-y-auto"
    >
      <MateriaContextContent key={materia.codigo} {...props} />
    </aside>
  );
}
