import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  addToast,
  Button,
  Card,
  CardBody,
  Chip,
  Spinner,
  Tab,
  Tabs,
  useDisclosure,
} from "@heroui/react";
import {
  Award,
  BarChart3,
  BookOpenCheck,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileUp,
  Layers,
  ListFilter,
  Search,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { useActivePlan, usePlanCapabilities } from "../context/PlanContext";
import { useAuth } from "../context/AuthContext";
import usePlanData from "../hooks/usePlanData";
import calcularEstadisticasAcademicas from "../utils/Estadisticas/estadisticasUtils";
import PlanSelectionModal from "../components/Progreso/modals/PlanSelectionModal";
import ImportarSawebModal from "../components/Progreso/modals/ImportarSawebModal";
import storageRepository from "../services/storageRepository";
import { mergeSawebImportWithExisting } from "../utils/sawebParser";
import { trackImportarSaweb } from "../services/analyticsService";

const MODALIDAD_STYLES = {
  Promoción:
    "bg-[#ECFDF5] text-[#005A36] border-[#A7F3D0] dark:bg-[#102A20] dark:text-[#6EE7B7] dark:border-[#1E4D38]",
  "Final Regular":
    "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE] dark:bg-[#172554]/50 dark:text-[#93C5FD] dark:border-[#1E3A8A]",
  "Final Libre":
    "bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE] dark:bg-[#2E1065]/50 dark:text-[#C4B5FD] dark:border-[#4C1D95]",
  Aplazo:
    "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA] dark:bg-[#450A0A]/50 dark:text-[#FCA5A5] dark:border-[#7F1D1D]",
  Equivalencia:
    "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1] dark:bg-[#1E2730] dark:text-[#CBD5E1] dark:border-[#334155]",
  Cursada:
    "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] dark:bg-[#451A03]/50 dark:text-[#FCD34D] dark:border-[#78350F]",
  "En Curso":
    "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0] dark:bg-[#14532D]/50 dark:text-[#86EFAC] dark:border-[#166534]",
  Pendiente:
    "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] dark:bg-[#1E293B]/40 dark:text-[#94A3B8] dark:border-[#334155]",
};

function formatTwoDecimals(value) {
  return value != null ? Number(value).toFixed(2) : "—";
}

function formatFechaDisplay(fechaStr) {
  if (!fechaStr || typeof fechaStr !== "string") return "—";
  const trimmed = fechaStr.trim();
  const matchFull = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (matchFull) {
    const [, y, m, d] = matchFull;
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }
  const matchMonth = trimmed.match(/^(\d{4})-(\d{1,2})/);
  if (matchMonth) {
    const [, y, m] = matchMonth;
    return `${m.padStart(2, "0")}/${y}`;
  }
  return trimmed;
}

/**
 * Tabla colapsable con el listado detallado de todas las materias desagregadas,
 * con buscador en tiempo real, filtros rápidos y ordenamiento múltiple.
 */
function TablaDesgloseMaterias({ items }) {
  const [isOpen, setIsOpen] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [orden, setOrden] = useState("periodo-desc");

  const counts = useMemo(() => {
    let aprobadas = 0;
    let regulares = 0;
    let pendientes = 0;
    let conAplazos = 0;
    items.forEach((item) => {
      if (item.esAprobada) aprobadas += 1;
      else if (item.esRegular || item.esCursando) regulares += 1;
      else pendientes += 1;

      if (item.aplazosCount > 0) conAplazos += 1;
    });
    return {
      total: items.length,
      aprobadas,
      regulares,
      pendientes,
      conAplazos,
    };
  }, [items]);

  const filteredAndSortedItems = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    const filtered = items.filter((item) => {
      if (filtroEstado === "aprobadas" && !item.esAprobada) return false;
      if (
        filtroEstado === "regulares" &&
        !item.esRegular &&
        !item.esCursando
      )
        return false;
      if (filtroEstado === "pendientes" && !item.esPendiente) return false;
      if (filtroEstado === "aplazos" && item.aplazosCount <= 0) return false;

      if (q) {
        const matchesNombre = item.nombre.toLowerCase().includes(q);
        const matchesCodigo = item.codigo.toLowerCase().includes(q);
        const matchesOptativa = item.optativaNombre?.toLowerCase().includes(q);
        if (!matchesNombre && !matchesCodigo && !matchesOptativa) return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (orden === "periodo-desc") {
        const aVal = a.periodo ? a.periodo.anio * 10 + a.periodo.cuatri : -1;
        const bVal = b.periodo ? b.periodo.anio * 10 + b.periodo.cuatri : -1;
        if (aVal !== bVal) return bVal - aVal;
        if (a.esAprobada !== b.esAprobada) return a.esAprobada ? -1 : 1;
        return (
          (a.anio ?? 99) - (b.anio ?? 99) ||
          (a.cuatrimestre ?? 99) - (b.cuatrimestre ?? 99)
        );
      }
      if (orden === "plan") {
        const aTaller = a.taller ? 1 : 0;
        const bTaller = b.taller ? 1 : 0;
        if (aTaller !== bTaller) return aTaller - bTaller;
        if ((a.anio ?? 99) !== (b.anio ?? 99))
          return (a.anio ?? 99) - (b.anio ?? 99);
        if ((a.cuatrimestre ?? 99) !== (b.cuatrimestre ?? 99)) {
          return (a.cuatrimestre ?? 99) - (b.cuatrimestre ?? 99);
        }
        return a.nombre.localeCompare(b.nombre);
      }
      if (orden === "nota-desc") {
        const aNota = a.nota ?? -1;
        const bNota = b.nota ?? -1;
        if (aNota !== bNota) return bNota - aNota;
        return a.nombre.localeCompare(b.nombre);
      }
      if (orden === "nota-asc") {
        const aNota = a.nota ?? 99;
        const bNota = b.nota ?? 99;
        if (aNota !== bNota) return aNota - bNota;
        return a.nombre.localeCompare(b.nombre);
      }
      if (orden === "nombre") {
        return a.nombre.localeCompare(b.nombre);
      }
      return 0;
    });
  }, [items, busqueda, filtroEstado, orden]);

  if (items.length === 0) return null;

  return (
    <Card
      shadow="none"
      className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C]"
    >
      <CardBody className="p-5 space-y-4">
        {/* Cabecera del bloque */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0] dark:border-[#24303C]">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-[#005A36] dark:text-[#6EE7B7]" />
              Detalle Completo de Cursadas
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Desglose materia por materia de tu trayectoria académica con nota, condición y fecha.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Chip
              size="sm"
              variant="flat"
              className="text-xs bg-[#F1F5F9] text-[#475569] dark:bg-[#1E2730] dark:text-[#CBD5E1]"
            >
              {counts.total} materias
            </Chip>
            <Button
              size="sm"
              variant="flat"
              onPress={() => setIsOpen((prev) => !prev)}
              className="h-8 text-xs font-semibold rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] dark:bg-[#1E2730] dark:hover:bg-[#2A3746] text-[#334155] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#24303C]"
              endContent={
                isOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )
              }
            >
              {isOpen ? "Ocultar listado" : "Ver listado completo"}
            </Button>
          </div>
        </div>

        {isOpen && (
          <div className="space-y-4">
            {/* Barra de herramientas: Búsqueda, Filtros y Ordenamiento */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Buscador */}
              <div className="relative flex-1 max-w-md">
                <label htmlFor="desglose-buscar" className="sr-only">
                  Buscar por nombre o código de materia
                </label>
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="desglose-buscar"
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por materia o código..."
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full h-9 pl-9 pr-8 rounded-xl text-xs bg-[#F8FAFC] dark:bg-[#11171D] text-[#1E293B] dark:text-[#F1F5F9] placeholder:text-[#64748B] border border-[#E2E8F0] dark:border-[#2A3540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005A36]"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda("")}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#F1F5F9]"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Selector de orden */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                <span className="text-xs text-[#64748B] dark:text-[#94A3B8] shrink-0">
                  Ordenar:
                </span>
                <select
                  value={orden}
                  onChange={(e) => setOrden(e.target.value)}
                  aria-label="Ordenar listado de materias"
                  className="h-9 px-2.5 rounded-xl text-xs bg-[#F8FAFC] dark:bg-[#11171D] text-[#1E293B] dark:text-[#F1F5F9] border border-[#E2E8F0] dark:border-[#2A3540] focus-visible:outline-2 focus-visible:outline-[#005A36]"
                >
                  <option value="periodo-desc">Período cursado (reciente)</option>
                  <option value="plan">Plan de estudio (Año · Cuatri)</option>
                  <option value="nota-desc">Nota (mayor a menor)</option>
                  <option value="nota-asc">Nota (menor a mayor)</option>
                  <option value="nombre">Nombre (A - Z)</option>
                </select>
              </div>
            </div>

            {/* Chips de filtro rápido */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { key: "todas", label: `Todas (${counts.total})` },
                { key: "aprobadas", label: `Aprobadas (${counts.aprobadas})` },
                {
                  key: "regulares",
                  label: `Regulares / Cursando (${counts.regulares})`,
                },
                { key: "pendientes", label: `Pendientes (${counts.pendientes})` },
                ...(counts.conAplazos > 0
                  ? [
                      {
                        key: "aplazos",
                        label: `Con aplazos (${counts.conAplazos})`,
                      },
                    ]
                  : []),
              ].map((btn) => {
                const isActive = filtroEstado === btn.key;
                return (
                  <button
                    key={btn.key}
                    type="button"
                    onClick={() => setFiltroEstado(btn.key)}
                    className={`h-7 px-3 rounded-lg font-medium transition-colors ${
                      isActive
                        ? "bg-[#005A36] text-white font-semibold"
                        : "bg-[#F8FAFC] dark:bg-[#11171D] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#24303C]"
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>

            {/* Tabla de materias */}
            {filteredAndSortedItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B] dark:text-[#94A3B8] border border-dashed border-[#E2E8F0] dark:border-[#24303C] rounded-xl space-y-2">
                <p>No se encontraron materias con los filtros seleccionados.</p>
                {(busqueda || filtroEstado !== "todas") && (
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => {
                      setBusqueda("");
                      setFiltroEstado("todas");
                    }}
                    className="h-7 text-xs"
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] dark:border-[#24303C]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] dark:bg-[#11171D] border-b border-[#E2E8F0] dark:border-[#24303C] text-[#64748B] dark:text-[#94A3B8] font-semibold">
                      <th scope="col" className="py-3 px-3.5 min-w-[200px]">
                        Materia
                      </th>
                      <th scope="col" className="py-3 px-3.5 whitespace-nowrap">
                        Plan
                      </th>
                      <th scope="col" className="py-3 px-3.5 whitespace-nowrap">
                        Período
                      </th>
                      <th scope="col" className="py-3 px-3.5 whitespace-nowrap">
                        Condición
                      </th>
                      <th scope="col" className="py-3 px-3.5 text-right whitespace-nowrap">
                        Nota
                      </th>
                      <th scope="col" className="py-3 px-3.5 text-right whitespace-nowrap">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#24303C]">
                    {filteredAndSortedItems.map((item) => {
                      const modStyle =
                        MODALIDAD_STYLES[item.modalidad] ||
                        MODALIDAD_STYLES.Pendiente;

                      return (
                        <tr
                          key={item.codigo}
                          className="hover:bg-[#F8FAFC] dark:hover:bg-[#141B22] transition-colors"
                        >
                          <td className="py-3 px-3.5">
                            <div className="font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                              {item.nombre}
                            </div>
                            <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5 mt-0.5">
                              <span>Cód. {item.codigo}</span>
                              {item.taller && (
                                <span className="bg-[#EFF6FF] text-[#1D4ED8] dark:bg-[#1E3A8A]/40 dark:text-[#93C5FD] px-1.5 py-0.2 rounded-xs text-[10px]">
                                  Taller
                                </span>
                              )}
                              {item.horas > 0 && (
                                <span className="hidden sm:inline">
                                  · {item.horas}h
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap text-[#475569] dark:text-[#CBD5E1]">
                            {item.taller ? (
                              "Taller"
                            ) : item.anio ? (
                              <span>
                                {item.anio >= 6 ? "Tramo Final" : `${item.anio}° Año`}
                                {item.cuatrimestre && (
                                  <span className="text-[#64748B] dark:text-[#94A3B8]">
                                    {" "}
                                    · {item.cuatrimestre}° C
                                  </span>
                                )}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap text-[#1E293B] dark:text-[#F1F5F9] font-medium">
                            {item.periodo?.label || "—"}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${modStyle}`}
                            >
                              {item.modalidad}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-right whitespace-nowrap">
                            {item.nota != null ? (
                              <div>
                                <span className="font-bold text-sm text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                                  {Number(item.nota).toFixed(
                                    item.nota % 1 === 0 ? 0 : 2,
                                  )}
                                </span>
                                {item.aplazosCount > 0 && (
                                  <span className="text-[10px] text-[#DC2626] dark:text-[#F87171] font-medium block">
                                    {item.aplazosCount}{" "}
                                    {item.aplazosCount === 1
                                      ? "aplazo"
                                      : "aplazos"}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#94A3B8]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-right whitespace-nowrap text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                            {formatFechaDisplay(item.fecha)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pie de tabla con resumen de registros visibles */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B] dark:text-[#94A3B8] pt-1">
              <span>
                Mostrando {filteredAndSortedItems.length} de {items.length}{" "}
                materias
              </span>
              {busqueda && (
                <span>Filtrado por: &quot;{busqueda}&quot;</span>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/**
 * Gráfica SVG + barras para evolución cronológica del promedio por cuatrimestre
 * y promedio acumulado (criterio UNLu).
 */
function PromedioTimelineChart({ items, includeAplazos }) {
  const [selectedKey, setSelectedKey] = useState(
    () => items[items.length - 1]?.key || null,
  );

  const effectiveSelectedKey = items.some((i) => i.key === selectedKey)
    ? selectedKey
    : items[items.length - 1]?.key || null;

  const selectedItem =
    items.find((i) => i.key === effectiveSelectedKey) ||
    items[items.length - 1] ||
    null;

  const points = items.map((item, idx) => {
    const promCuatri = includeAplazos
      ? item.promedioCuatriConAplazos
      : item.promedioCuatriSinAplazos;
    const promAcum = includeAplazos
      ? item.promedioAcumuladoConAplazos
      : item.promedioAcumuladoSinAplazos;
    return { item, idx, promCuatri, promAcum };
  });

  const anyValue = points.some((p) => p.promCuatri != null || p.promAcum != null);
  if (!anyValue) {
    return (
      <div className="py-10 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
        No hay notas registradas con fecha suficiente para trazar la evolución del promedio.
      </div>
    );
  }

  const colW = 62;
  const chartW = Math.max(360, points.length * colW);
  const padX = 28;
  const padTop = 22;
  const padBottom = 34;
  const plotH = 112;
  const svgH = padTop + plotH + padBottom;
  const stepX =
    points.length > 1 ? (chartW - padX * 2) / (points.length - 1) : 0;

  const getX = (idx) => (points.length === 1 ? chartW / 2 : padX + idx * stepX);
  const getY = (grade) => {
    const clamped = Math.min(10, Math.max(1, Number(grade) || 1));
    return padTop + ((10 - clamped) / 9) * plotH;
  };

  const validAcumPoints = points
    .filter((p) => p.promAcum != null)
    .map((p) => ({
      ...p,
      x: getX(p.idx),
      y: getY(p.promAcum),
    }));

  const polylineStr = validAcumPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-xs bg-[#93C5FD] dark:bg-[#3B82F6]"
            aria-hidden="true"
          />
          Promedio del cuatrimestre
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-3 h-0.5 bg-[#005A36] dark:bg-[#6EE7B7] inline-block"
            aria-hidden="true"
          />
          Promedio acumulado
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <svg
          width={chartW}
          height={svgH}
          viewBox={`0 0 ${chartW} ${svgH}`}
          className="block min-w-full"
          role="img"
          aria-label="Evolución cronológica del promedio por cuatrimestre y promedio acumulado"
        >
          {/* Líneas de referencia (4, 7 y 10) */}
          {[4, 7, 10].map((refGrade) => {
            const ry = getY(refGrade);
            return (
              <g key={refGrade}>
                <line
                  x1={padX - 10}
                  x2={chartW - padX + 10}
                  y1={ry}
                  y2={ry}
                  stroke="currentColor"
                  className="text-[#E2E8F0] dark:text-[#24303C]"
                  strokeDasharray={refGrade === 4 ? "3 3" : undefined}
                  strokeWidth={1}
                />
                <text
                  x={4}
                  y={ry + 3}
                  fontSize="9"
                  fill="currentColor"
                  className="text-[#94A3B8]"
                >
                  {refGrade}
                </text>
              </g>
            );
          })}

          {/* Barras de promedio puntual de cada cuatrimestre */}
          {points.map((p) => {
            const x = getX(p.idx);
            const isSel = p.item.key === effectiveSelectedKey;
            const barY = p.promCuatri != null ? getY(p.promCuatri) : null;
            const baseZeroY = getY(1);
            return (
              <g
                key={p.item.key}
                className="cursor-pointer"
                onClick={() => setSelectedKey(p.item.key)}
              >
                {barY != null && (
                  <rect
                    x={x - 10}
                    y={barY}
                    width={20}
                    height={Math.max(2, baseZeroY - barY)}
                    rx={3}
                    fill="currentColor"
                    className={
                      isSel
                        ? "text-[#3B82F6] dark:text-[#60A5FA]"
                        : "text-[#BFDBFE] dark:text-[#1E3A8A]"
                    }
                  />
                )}
                <text
                  x={x}
                  y={svgH - 12}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight={isSel ? "700" : "500"}
                  fill="currentColor"
                  className={
                    isSel
                      ? "text-[#005A36] dark:text-[#6EE7B7]"
                      : "text-[#64748B] dark:text-[#94A3B8]"
                  }
                >
                  {p.item.shortLabel}
                </text>
              </g>
            );
          })}

          {/* Curva continua del promedio acumulado */}
          {validAcumPoints.length >= 2 && (
            <polyline
              fill="none"
              stroke="currentColor"
              className="text-[#005A36] dark:text-[#6EE7B7]"
              strokeWidth={2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={polylineStr}
            />
          )}

          {/* Puntos interactivos del promedio acumulado */}
          {validAcumPoints.map((p) => {
            const isSel = p.item.key === effectiveSelectedKey;
            return (
              <g
                key={`pt-${p.item.key}`}
                className="cursor-pointer"
                onClick={() => setSelectedKey(p.item.key)}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSel ? 5 : 3.5}
                  fill="currentColor"
                  className="text-[#005A36] dark:text-[#6EE7B7]"
                  stroke="white"
                  strokeWidth={1.5}
                />
                {isSel && (
                  <text
                    x={p.x}
                    y={Math.max(11, p.y - 8)}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="currentColor"
                    className="text-[#005A36] dark:text-[#6EE7B7]"
                  >
                    {formatTwoDecimals(p.promAcum)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {selectedItem && (
        <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
            {selectedItem.label}
          </span>
          <div className="flex flex-wrap items-center gap-3 tabular-nums text-[#475569] dark:text-[#CBD5E1]">
            <span>
              Cuatrimestre:{" "}
              <strong className="text-[#1D4ED8] dark:text-[#93C5FD]">
                {formatTwoDecimals(
                  includeAplazos
                    ? selectedItem.promedioCuatriConAplazos
                    : selectedItem.promedioCuatriSinAplazos,
                )}
              </strong>
            </span>
            <span>
              Acumulado:{" "}
              <strong className="text-[#005A36] dark:text-[#6EE7B7]">
                {formatTwoDecimals(
                  includeAplazos
                    ? selectedItem.promedioAcumuladoConAplazos
                    : selectedItem.promedioAcumuladoSinAplazos,
                )}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Página de Estadísticas Académicas (`/estadisticas`).
 * Presenta 4 bloques visuales claros sobre el historial cargado del estudiante.
 */
export default function Estadisticas() {
  const { plan, setPlan } = useActivePlan();
  const { policy } = usePlanCapabilities();
  const { updateAuthProgreso } = useAuth();
  const {
    materias,
    progreso,
    setProgreso,
    progresoDetalles,
    setProgresoDetalles,
    cargandoPlan,
  } = usePlanData(plan);

  const {
    isOpen: isSawebOpen,
    onOpen: onSawebOpen,
    onOpenChange: onSawebOpenChange,
  } = useDisclosure();

  const [incluirAplazosHist, setIncluirAplazosHist] = useState(false);
  const [selectedNotaBin, setSelectedNotaBin] = useState(null);
  const [cuatriTab, setCuatriTab] = useState("materias");
  const [cuatriMetrica, setCuatriMetrica] = useState("materias");
  const [incluirAplazosCurva, setIncluirAplazosCurva] = useState(false);
  const [selectedCuatriKey, setSelectedCuatriKey] = useState(null);

  const stats = useMemo(
    () =>
      calcularEstadisticasAcademicas({
        materias,
        progreso,
        progresoDetalles,
      }),
    [materias, progreso, progresoDetalles],
  );

  const handleApplySawebImport = (parsedResult) => {
    const targetPlan = parsedResult?.targetPlan || parsedResult?.detectedPlan || plan;
    if (!parsedResult || !targetPlan) return;

    if (storageRepository.hasExistingAcademicData()) {
      storageRepository.saveRecoveryBackup(storageRepository.readAcademicBundle(), {
        reason: "pre_saweb_import",
      });
    }

    const isSamePlan = targetPlan === plan;
    const targetMaterias =
      !isSamePlan &&
      Array.isArray(parsedResult.targetMaterias) &&
      parsedResult.targetMaterias.length > 0
        ? parsedResult.targetMaterias
        : materias;
    const baseProgreso = isSamePlan
      ? progreso
      : storageRepository.getProgreso(targetPlan, {});
    const baseDetalles = isSamePlan
      ? progresoDetalles
      : storageRepository.getProgresoDetalles(targetPlan, {});

    const { progreso: nextProgreso, progresoDetalles: nextDetalles } =
      mergeSawebImportWithExisting(
        parsedResult,
        baseProgreso,
        baseDetalles,
        targetMaterias,
      );

    if (isSamePlan) {
      setProgreso(nextProgreso);
      setProgresoDetalles(nextDetalles);
    }
    updateAuthProgreso(targetPlan, nextProgreso, nextDetalles);

    if (!isSamePlan && typeof setPlan === "function") {
      setPlan(targetPlan);
    }

    trackImportarSaweb({
      plan: targetPlan,
      detectedPlan: parsedResult.detectedPlan,
      totalImported: parsedResult.totalMatched,
      usedAnalitico: Boolean(parsedResult.sourcesDetected?.analitico),
      usedCursadas: Boolean(parsedResult.sourcesDetected?.cursadas),
    });

    addToast({
      title: "Analítico importado desde SAWeb",
      description: `Se actualizaron ${parsedResult.totalMatched} materias en el Plan ${targetPlan}.`,
      color: "success",
    });
  };

  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-3">
        <PlanSelectionModal isOpen={true} onSelect={setPlan} />
        <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
          Seleccioná tu plan de estudios para consultar tus estadísticas académicas.
        </p>
      </div>
    );
  }

  if (cargandoPlan) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center gap-3">
        <Spinner color="success" size="lg" />
        <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
          Cargando estadísticas del Plan {plan}...
        </p>
      </div>
    );
  }

  const vistaHist = incluirAplazosHist
    ? stats.histograma.conAplazos
    : stats.histograma.sinAplazos;
  const activeNotaBin =
    vistaHist.bins.find((b) => b.nota === selectedNotaBin && b.total > 0) ||
    null;

  const modaResumen =
    stats.histograma.sinAplazos.moda || stats.histograma.conAplazos.moda;
  const { modalidades, finales } = stats.modalidadesYFinales;

  const cuatriItems = stats.cuatrimestres.items;
  const effectiveCuatriKey = cuatriItems.some((c) => c.key === selectedCuatriKey)
    ? selectedCuatriKey
    : stats.cuatrimestres.mejorCuatrimestre?.key ||
      cuatriItems[cuatriItems.length - 1]?.key ||
      null;
  const selectedCuatriItem =
    cuatriItems.find((c) => c.key === effectiveCuatriKey) || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Cabecera */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-[#64748B] dark:text-[#94A3B8] truncate">
              {policy?.carrera}
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
            Estadísticas Académicas
          </h1>
          <p className="text-sm text-[#475569] dark:text-[#94A3B8]">
            Distribución de tus notas, ritmo por cuatrimestre, efectividad en finales y cobertura del plan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            size="sm"
            onPress={onSawebOpen}
            className="bg-[#005A36] hover:bg-[#00462A] dark:bg-[#2E8B63] dark:hover:bg-[#247250] text-white font-semibold"
            startContent={<FileUp className="w-4 h-4" />}
          >
            Importar Analítico SAWeb
          </Button>
          <Button
            as={Link}
            to="/mis-materias"
            size="sm"
            variant="bordered"
            className="border-[#E2E8F0] dark:border-[#2A3540] font-medium"
          >
            Ir a Mis Materias
          </Button>
        </div>
      </header>

      {!stats.resumen.tieneDatos ? (
        <Card
          shadow="none"
          className="bg-white dark:bg-[#161D24] border border-dashed border-[#CBD5E1] dark:border-[#2A3540]"
        >
          <CardBody className="py-12 px-6 text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#6EE7B7] flex items-center justify-center">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-lg">
              <h2 className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                Todavía no hay datos para graficar
              </h2>
              <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
                Importá el PDF oficial de tu Analítico desde SAWeb o cargá tus materias aprobadas y notas en Mis Materias para ver tu histograma, evolución de promedios y rendimiento en finales.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2.5 pt-1">
              <Button
                className="bg-[#005A36] hover:bg-[#00462A] dark:bg-[#2E8B63] text-white font-semibold"
                onPress={onSawebOpen}
                startContent={<FileUp className="w-4 h-4" />}
              >
                Importar Analítico SAWeb
              </Button>
              <Button
                as={Link}
                to="/mis-materias"
                variant="flat"
                className="font-medium"
              >
                Cargar en Mis Materias
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Banda superior de 4 KPIs */}
          <section
            aria-label="Resumen de métricas académicas"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
          >
            <Card
              shadow="none"
              className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C]"
            >
              <CardBody className="p-4 flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                    Promedio s/aplazos
                  </span>
                  <Award className="w-4 h-4 text-[#005A36] dark:text-[#6EE7B7]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                    {formatTwoDecimals(stats.resumen.promedios.promedioSinAplazos)}
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 tabular-nums">
                    Con aplazos (UNLu):{" "}
                    {formatTwoDecimals(stats.resumen.promedios.promedioConAplazos)}
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card
              shadow="none"
              className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C]"
            >
              <CardBody className="p-4 flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                    Nota más frecuente
                  </span>
                  <BarChart3 className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                    {modaResumen ? modaResumen.nota : "—"}
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 tabular-nums">
                    {modaResumen
                      ? `Se repite ${modaResumen.count} ${
                          modaResumen.count === 1 ? "vez" : "veces"
                        } (moda)`
                      : "Sin calificaciones cargadas"}
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card
              shadow="none"
              className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C]"
            >
              <CardBody className="p-4 flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                    Ritmo por cuatrimestre
                  </span>
                  <TrendingUp className="w-4 h-4 text-[#005A36] dark:text-[#6EE7B7]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                    {stats.cuatrimestres.cuatrimestresConMateriasCount > 0
                      ? `${stats.cuatrimestres.ritmoPromedioMaterias} mat/cuatri`
                      : "—"}
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 tabular-nums truncate">
                    {stats.cuatrimestres.mejorCuatrimestre
                      ? `Mejor: ${stats.cuatrimestres.mejorCuatrimestre.label} (${stats.cuatrimestres.mejorCuatrimestre.materiasCount} mat.)`
                      : "Sin fechas registradas"}
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card
              shadow="none"
              className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C]"
            >
              <CardBody className="p-4 flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                    Efectividad en finales
                  </span>
                  <Target className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                    {finales.tasaEfectividad != null
                      ? `${finales.tasaEfectividad}%`
                      : "—"}
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 tabular-nums">
                    {finales.finalesAprobados} aprob. · {finales.aplazosTotales}{" "}
                    aplazos
                  </p>
                </div>
              </CardBody>
            </Card>
          </section>

          {/* Grilla 2x2 de Bloques Principales */}
          <section
            aria-label="Gráficos y análisis detallado"
            className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch"
          >
            {/* BLOQUE 1: Histograma de Notas */}
            <Card
              shadow="none"
              className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C]"
            >
              <CardBody className="p-5 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[#005A36] dark:text-[#6EE7B7]" />
                        Histograma de Notas
                      </h2>
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                        Tocá una barra para ver qué materias obtuvieron esa calificación ({vistaHist.totalActas} actas).
                      </p>
                    </div>

                    <div className="inline-flex rounded-xl bg-[#F1F5F9] dark:bg-[#1E2730] p-0.5 border border-[#E2E8F0] dark:border-[#24303C]">
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => {
                          setIncluirAplazosHist(false);
                          setSelectedNotaBin(null);
                        }}
                        className={`h-7 text-[11px] rounded-lg px-2.5 ${
                          !incluirAplazosHist
                            ? "bg-[#005A36] text-white font-semibold shadow-2xs"
                            : "bg-transparent text-[#64748B] dark:text-[#94A3B8]"
                        }`}
                      >
                        Solo aprobadas (4–10)
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => {
                          setIncluirAplazosHist(true);
                          setSelectedNotaBin(null);
                        }}
                        className={`h-7 text-[11px] rounded-lg px-2.5 ${
                          incluirAplazosHist
                            ? "bg-[#005A36] text-white font-semibold shadow-2xs"
                            : "bg-transparent text-[#64748B] dark:text-[#94A3B8]"
                        }`}
                      >
                        Con aplazos (1–10)
                      </Button>
                    </div>
                  </div>

                  {/* Leyenda de colores */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#475569] dark:text-[#CBD5E1]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#005A36] dark:bg-[#4A9D68]" />
                      Promoción
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB] dark:bg-[#60A5FA]" />
                      Final Regular
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#7C3AED] dark:bg-[#A78BFA]" />
                      Final Libre
                    </span>
                    {incluirAplazosHist && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#DC2626] dark:bg-[#F87171]" />
                        Aplazo
                      </span>
                    )}
                  </div>
                </div>

                {vistaHist.totalActas === 0 ? (
                  <div className="py-10 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Todavía no hay notas numéricas cargadas en este plan.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div
                      className="grid gap-1.5 sm:gap-2 items-end pt-5 pb-1 border-b border-[#E2E8F0] dark:border-[#24303C]"
                      style={{
                        gridTemplateColumns: `repeat(${vistaHist.bins.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {vistaHist.bins.map((bin) => {
                        const isModa =
                          vistaHist.moda && vistaHist.moda.nota === bin.nota;
                        const isSelected = activeNotaBin?.nota === bin.nota;
                        const heightPct =
                          vistaHist.maxCount > 0 && bin.total > 0
                            ? Math.max(8, Math.round((bin.total / vistaHist.maxCount) * 100))
                            : 0;
                        const promoPct =
                          bin.total > 0 ? (bin.promocion / bin.total) * 100 : 0;
                        const regularPct =
                          bin.total > 0 ? (bin.finalRegular / bin.total) * 100 : 0;
                        const librePct =
                          bin.total > 0 ? (bin.finalLibre / bin.total) * 100 : 0;
                        const aplazoPct =
                          bin.total > 0 ? (bin.aplazo / bin.total) * 100 : 0;

                        return (
                          <button
                            key={bin.nota}
                            type="button"
                            disabled={bin.total === 0}
                            onClick={() =>
                              setSelectedNotaBin(
                                isSelected ? null : bin.nota,
                              )
                            }
                            aria-label={`Nota ${bin.nota}: ${bin.total} ${
                              bin.total === 1 ? "acta" : "actas"
                            }`}
                            className={`group flex flex-col items-center gap-1 focus:outline-none ${
                              bin.total > 0 ? "cursor-pointer" : "cursor-default opacity-60"
                            }`}
                          >
                            <span
                              className={`text-[11px] font-bold tabular-nums ${
                                isSelected || isModa
                                  ? "text-[#005A36] dark:text-[#6EE7B7]"
                                  : "text-[#64748B] dark:text-[#94A3B8]"
                              }`}
                            >
                              {bin.total > 0 ? bin.total : ""}
                            </span>
                            <div className="w-full max-w-[34px] h-36 flex flex-col justify-end">
                              {bin.total > 0 ? (
                                <div
                                  style={{ height: `${heightPct}%` }}
                                  className={`w-full rounded-t-md overflow-hidden flex flex-col-reverse transition-all ${
                                    isSelected
                                      ? "ring-2 ring-[#005A36] dark:ring-[#6EE7B7] ring-offset-1"
                                      : "group-hover:opacity-90"
                                  }`}
                                >
                                  {aplazoPct > 0 && (
                                    <div
                                      style={{ height: `${aplazoPct}%` }}
                                      className="w-full bg-[#DC2626] dark:bg-[#F87171]"
                                    />
                                  )}
                                  {librePct > 0 && (
                                    <div
                                      style={{ height: `${librePct}%` }}
                                      className="w-full bg-[#7C3AED] dark:bg-[#A78BFA]"
                                    />
                                  )}
                                  {regularPct > 0 && (
                                    <div
                                      style={{ height: `${regularPct}%` }}
                                      className="w-full bg-[#2563EB] dark:bg-[#60A5FA]"
                                    />
                                  )}
                                  {promoPct > 0 && (
                                    <div
                                      style={{ height: `${promoPct}%` }}
                                      className="w-full bg-[#005A36] dark:bg-[#4A9D68]"
                                    />
                                  )}
                                </div>
                              ) : (
                                <div className="w-full h-1 rounded bg-[#E2E8F0] dark:bg-[#24303C]" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Eje X: Notas + insignia Moda */}
                    <div
                      className="grid gap-1.5 sm:gap-2 text-center"
                      style={{
                        gridTemplateColumns: `repeat(${vistaHist.bins.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {vistaHist.bins.map((bin) => {
                        const isModa =
                          vistaHist.moda && vistaHist.moda.nota === bin.nota;
                        const isAplazoZone = bin.nota < 4;
                        return (
                          <div
                            key={`lbl-${bin.nota}`}
                            className="flex flex-col items-center gap-0.5"
                          >
                            <span
                              className={`text-xs font-bold tabular-nums ${
                                isAplazoZone
                                  ? "text-[#DC2626] dark:text-[#F87171]"
                                  : isModa
                                    ? "text-[#005A36] dark:text-[#6EE7B7]"
                                    : "text-[#334155] dark:text-[#E2E8F0]"
                              }`}
                            >
                              {bin.nota}
                            </span>
                            {isModa && (
                              <span className="text-[9px] font-semibold uppercase tracking-wide px-1 py-0.2 rounded bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#6EE7B7]">
                                Moda
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {activeNotaBin ? (
                      <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                            Nota {activeNotaBin.nota} · {activeNotaBin.total}{" "}
                            {activeNotaBin.total === 1 ? "acta" : "actas"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedNotaBin(null)}
                            className="text-[11px] text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F1F5F9] cursor-pointer"
                          >
                            Ocultar detalle
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                          {activeNotaBin.materias.map((m, idx) => (
                            <span
                              key={`${m.codigo}-${m.modalidad}-${idx}`}
                              className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md border ${
                                MODALIDAD_STYLES[m.modalidad] || MODALIDAD_STYLES["Final Regular"]
                              }`}
                            >
                              <span className="font-medium truncate max-w-[200px]">
                                {m.nombre}
                              </span>
                              <span className="opacity-75">· {m.modalidad}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] italic">
                        Hacé clic sobre cualquiera de las columnas con datos para inspeccionar esas materias.
                      </p>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* BLOQUE 2: Rendimiento por Cuatrimestre (con 2 pestañas) */}
            <Card
              shadow="none"
              className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C]"
            >
              <CardBody className="p-5 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
                        <CalendarRange className="w-4 h-4 text-[#005A36] dark:text-[#6EE7B7]" />
                        Rendimiento por Cuatrimestre
                      </h2>
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                        Alterná entre ritmo de aprobación y evolución de tu promedio en el tiempo.
                      </p>
                    </div>

                    {stats.cuatrimestres.cuatrimestresConMateriasCount > 0 && (
                      <Chip
                        size="sm"
                        variant="flat"
                        className="bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] text-[11px] font-semibold"
                      >
                        Ritmo: {stats.cuatrimestres.ritmoPromedioMaterias} mat/cuatri
                      </Chip>
                    )}
                  </div>

                  <Tabs
                    aria-label="Vistas por cuatrimestre"
                    selectedKey={cuatriTab}
                    onSelectionChange={(k) => setCuatriTab(String(k))}
                    size="sm"
                    variant="bordered"
                    color="success"
                    classNames={{
                      tabList: "w-full bg-[#F8FAFC] dark:bg-[#11171D]",
                      tab: "font-medium text-xs",
                    }}
                  >
                    <Tab key="materias" title="Materias por cuatri">
                      <div className="pt-3 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                            Promedio por período:{" "}
                            <strong className="text-[#1E293B] dark:text-[#F1F5F9]">
                              {cuatriMetrica === "horas"
                                ? `${stats.cuatrimestres.ritmoPromedioHoras} hs`
                                : `${stats.cuatrimestres.ritmoPromedioMaterias} materias`}
                            </strong>
                          </span>
                          <div className="inline-flex rounded-lg bg-[#F1F5F9] dark:bg-[#1E2730] p-0.5 border border-[#E2E8F0] dark:border-[#24303C]">
                            <Button
                              size="sm"
                              variant="flat"
                              onPress={() => setCuatriMetrica("materias")}
                              className={`h-6 min-w-0 text-[11px] rounded-md px-2 ${
                                cuatriMetrica === "materias"
                                  ? "bg-[#005A36] text-white font-semibold"
                                  : "bg-transparent text-[#64748B] dark:text-[#94A3B8]"
                              }`}
                            >
                              Materias
                            </Button>
                            <Button
                              size="sm"
                              variant="flat"
                              onPress={() => setCuatriMetrica("horas")}
                              className={`h-6 min-w-0 text-[11px] rounded-md px-2 ${
                                cuatriMetrica === "horas"
                                  ? "bg-[#005A36] text-white font-semibold"
                                  : "bg-transparent text-[#64748B] dark:text-[#94A3B8]"
                              }`}
                            >
                              Horas
                            </Button>
                          </div>
                        </div>

                        {cuatriItems.length === 0 ? (
                          <div className="py-10 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
                            No hay fechas de aprobación o cursada registradas para agrupar por cuatrimestre.
                          </div>
                        ) : (
                          <>
                            <div className="overflow-x-auto pb-1">
                              <div
                                className="flex items-end gap-2 pt-3 pb-1 border-b border-[#E2E8F0] dark:border-[#24303C]"
                                style={{
                                  minWidth: `${Math.max(320, cuatriItems.length * 46)}px`,
                                }}
                              >
                                {cuatriItems.map((item) => {
                                  const valor =
                                    cuatriMetrica === "horas"
                                      ? item.horasCount
                                      : item.materiasCount;
                                  const maxVal =
                                    cuatriMetrica === "horas"
                                      ? stats.cuatrimestres.maxHorasCuatri
                                      : stats.cuatrimestres.maxMateriasCuatri;
                                  const pct =
                                    maxVal > 0 && valor > 0
                                      ? Math.max(10, Math.round((valor / maxVal) * 100))
                                      : 0;
                                  const isSel = selectedCuatriItem?.key === item.key;

                                  return (
                                    <button
                                      key={item.key}
                                      type="button"
                                      onClick={() => setSelectedCuatriKey(item.key)}
                                      className="flex-1 min-w-[38px] flex flex-col items-center gap-1 cursor-pointer focus:outline-none"
                                      aria-label={`${item.label}: ${valor} ${
                                        cuatriMetrica === "horas" ? "horas" : "materias"
                                      }`}
                                    >
                                      <span
                                        className={`text-[10px] font-bold tabular-nums ${
                                          isSel
                                            ? "text-[#005A36] dark:text-[#6EE7B7]"
                                            : "text-[#475569] dark:text-[#CBD5E1]"
                                        }`}
                                      >
                                        {valor > 0
                                          ? cuatriMetrica === "horas"
                                            ? `${valor}h`
                                            : valor
                                          : "—"}
                                      </span>
                                      <div className="w-6 h-32 flex flex-col justify-end">
                                        {valor > 0 ? (
                                          <div
                                            style={{ height: `${pct}%` }}
                                            className={`w-full rounded-t-md transition-all ${
                                              isSel
                                                ? "bg-[#005A36] dark:bg-[#6EE7B7]"
                                                : "bg-[#478559]/75 dark:bg-[#2E8B63]/80 hover:bg-[#005A36]"
                                            }`}
                                          />
                                        ) : (
                                          <div className="w-full h-1 rounded bg-[#E2E8F0] dark:bg-[#24303C]" />
                                        )}
                                      </div>
                                      <span
                                        className={`text-[10px] tabular-nums whitespace-nowrap ${
                                          isSel
                                            ? "font-bold text-[#005A36] dark:text-[#6EE7B7]"
                                            : "text-[#64748B] dark:text-[#94A3B8]"
                                        }`}
                                      >
                                        {item.shortLabel}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {selectedCuatriItem && (
                              <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] p-3 space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                                    {selectedCuatriItem.label}
                                  </span>
                                  <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                                    {selectedCuatriItem.materiasCount}{" "}
                                    {selectedCuatriItem.materiasCount === 1
                                      ? "materia"
                                      : "materias"}{" "}
                                    · {selectedCuatriItem.horasCount} hs
                                  </span>
                                </div>
                                {selectedCuatriItem.materias.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                    {selectedCuatriItem.materias.map((m) => (
                                      <span
                                        key={`${selectedCuatriItem.key}-${m.codigo}`}
                                        className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-[#334155] dark:text-[#E2E8F0]"
                                      >
                                        {m.nombre}
                                        {m.nota != null ? ` (${m.nota})` : ""}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                    Solo se registraron rendiciones sin aprobación en este período.
                                  </p>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </Tab>

                    <Tab key="promedio" title="Promedio por cuatri">
                      <div className="pt-3 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                            Curva según actas cronológicas
                          </span>
                          <div className="inline-flex rounded-lg bg-[#F1F5F9] dark:bg-[#1E2730] p-0.5 border border-[#E2E8F0] dark:border-[#24303C]">
                            <Button
                              size="sm"
                              variant="flat"
                              onPress={() => setIncluirAplazosCurva(false)}
                              className={`h-6 min-w-0 text-[11px] rounded-md px-2 ${
                                !incluirAplazosCurva
                                  ? "bg-[#005A36] text-white font-semibold"
                                  : "bg-transparent text-[#64748B] dark:text-[#94A3B8]"
                              }`}
                            >
                              Sin aplazos
                            </Button>
                            <Button
                              size="sm"
                              variant="flat"
                              onPress={() => setIncluirAplazosCurva(true)}
                              className={`h-6 min-w-0 text-[11px] rounded-md px-2 ${
                                incluirAplazosCurva
                                  ? "bg-[#005A36] text-white font-semibold"
                                  : "bg-transparent text-[#64748B] dark:text-[#94A3B8]"
                              }`}
                            >
                              Con aplazos
                            </Button>
                          </div>
                        </div>

                        <PromedioTimelineChart
                          items={cuatriItems}
                          includeAplazos={incluirAplazosCurva}
                        />
                      </div>
                    </Tab>
                  </Tabs>
                </div>

                {stats.cuatrimestres.sinFechaCount > 0 && (
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    Nota: {stats.cuatrimestres.sinFechaCount}{" "}
                    {stats.cuatrimestres.sinFechaCount === 1
                      ? "materia aprobada sin fecha registrada no figura"
                      : "materias aprobadas sin fecha registrada no figuran"}{" "}
                    en la línea temporal.
                  </p>
                )}
              </CardBody>
            </Card>

            {/* BLOQUE 3: Finales y Modalidades */}
            <Card
              shadow="none"
              className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C]"
            >
              <CardBody className="p-5 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
                    <BookOpenCheck className="w-4 h-4 text-[#005A36] dark:text-[#6EE7B7]" />
                    Finales y Modalidades
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    Cómo aprobaste tus materias y tu rendimiento en mesas de examen final.
                  </p>
                </div>

                {/* Barra apilada de modalidades */}
                <div className="space-y-2">
                  <div className="w-full h-3 rounded-full overflow-hidden bg-[#E2E8F0] dark:bg-[#24303C] flex">
                    {modalidades.promocion.porcentaje > 0 && (
                      <div
                        style={{ width: `${modalidades.promocion.porcentaje}%` }}
                        className="h-full bg-[#005A36] dark:bg-[#4A9D68]"
                        title={`Promoción: ${modalidades.promocion.count}`}
                      />
                    )}
                    {modalidades.finalRegular.porcentaje > 0 && (
                      <div
                        style={{ width: `${modalidades.finalRegular.porcentaje}%` }}
                        className="h-full bg-[#2563EB] dark:bg-[#60A5FA]"
                        title={`Final Regular: ${modalidades.finalRegular.count}`}
                      />
                    )}
                    {modalidades.finalLibre.porcentaje > 0 && (
                      <div
                        style={{ width: `${modalidades.finalLibre.porcentaje}%` }}
                        className="h-full bg-[#7C3AED] dark:bg-[#A78BFA]"
                        title={`Final Libre: ${modalidades.finalLibre.count}`}
                      />
                    )}
                    {modalidades.equivalencia.porcentaje > 0 && (
                      <div
                        style={{ width: `${modalidades.equivalencia.porcentaje}%` }}
                        className="h-full bg-[#94A3B8] dark:bg-[#64748B]"
                        title={`Equivalencia: ${modalidades.equivalencia.count}`}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      {
                        label: "Promoción",
                        data: modalidades.promocion,
                        dot: "bg-[#005A36] dark:bg-[#4A9D68]",
                      },
                      {
                        label: "Final Regular",
                        data: modalidades.finalRegular,
                        dot: "bg-[#2563EB] dark:bg-[#60A5FA]",
                      },
                      {
                        label: "Final Libre",
                        data: modalidades.finalLibre,
                        dot: "bg-[#7C3AED] dark:bg-[#A78BFA]",
                      },
                      {
                        label: "Equivalencia",
                        data: modalidades.equivalencia,
                        dot: "bg-[#94A3B8] dark:bg-[#64748B]",
                      },
                    ].map((mod) => (
                      <div
                        key={mod.label}
                        className="rounded-xl bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] p-3 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${mod.dot}`} />
                          <span className="text-xs font-medium text-[#334155] dark:text-[#CBD5E1] truncate">
                            {mod.label}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums shrink-0">
                          {mod.data.count}{" "}
                          <span className="text-[11px] font-normal text-[#64748B] dark:text-[#94A3B8]">
                            ({mod.data.porcentaje}%)
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-bloque Efectividad en Mesas de Final */}
                <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#24303C] space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                    Efectividad en Mesas de Final
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-xl bg-[#ECFDF5]/60 dark:bg-[#102A20]/50 border border-[#A7F3D0] dark:border-[#1E4D38] p-2.5">
                      <span className="text-[11px] text-[#065F46] dark:text-[#A7F3D0] block">
                        Efectividad
                      </span>
                      <span className="text-base font-bold text-[#005A36] dark:text-[#6EE7B7] tabular-nums">
                        {finales.tasaEfectividad != null
                          ? `${finales.tasaEfectividad}%`
                          : "—"}
                      </span>
                    </div>

                    <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] p-2.5">
                      <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block">
                        En 1° intento
                      </span>
                      <span className="text-base font-bold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                        {finales.aprobadasPrimerIntento}
                        <span className="text-[11px] font-normal text-[#64748B] dark:text-[#94A3B8] ml-1">
                          / {finales.aprobadasConReintento} reint.
                        </span>
                      </span>
                    </div>

                    <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] p-2.5">
                      <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block">
                        Aplazos / Aus.
                      </span>
                      <span className="text-base font-bold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                        {finales.aplazosTotales}
                        <span className="text-[11px] font-normal text-[#64748B] dark:text-[#94A3B8] ml-1">
                          / {finales.ausentesTotales} aus.
                        </span>
                      </span>
                    </div>

                    <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] p-2.5">
                      <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block">
                        Prom. intentos
                      </span>
                      <span className="text-base font-bold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                        {finales.promedioIntentosPorFinal != null
                          ? finales.promedioIntentosPorFinal
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* BLOQUE 4: Avance por Año de la Carrera */}
            <Card
              shadow="none"
              className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C]"
            >
              <CardBody className="p-5 flex flex-col justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#005A36] dark:text-[#6EE7B7]" />
                    Avance por Año de la Carrera
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    Estado de materias aprobadas, regulares y pendientes por año del Plan {plan}.
                  </p>
                </div>

                <div className="space-y-3">
                  {stats.avancePorAnio.map((group) => (
                    <div key={group.key} className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                            {group.label}
                          </span>
                          {group.completado && (
                            <Chip
                              size="sm"
                              variant="flat"
                              className="h-5 text-[10px] bg-[#ECFDF5] text-[#005A36] dark:bg-[#102A20] dark:text-[#6EE7B7] font-semibold"
                              startContent={<CheckCircle2 className="w-3 h-3" />}
                            >
                              Completado
                            </Chip>
                          )}
                        </div>
                        <div className="flex items-center gap-2 tabular-nums text-[#475569] dark:text-[#CBD5E1]">
                          <span className="font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                            {group.aprobadas}/{group.total}
                          </span>
                          <span>({group.porcentajeAprobado}%)</span>
                          {group.horasTotales > 0 && (
                            <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] hidden sm:inline">
                              · {group.horasAprobadas}/{group.horasTotales}h
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-[#E2E8F0] dark:bg-[#24303C] overflow-hidden flex">
                        {group.porcentajeAprobado > 0 && (
                          <div
                            style={{ width: `${group.porcentajeAprobado}%` }}
                            className="h-full bg-[#478559] dark:bg-[#4A9D68] transition-all duration-300"
                          />
                        )}
                        {group.porcentajeRegular > 0 && (
                          <div
                            style={{ width: `${group.porcentajeRegular}%` }}
                            className="h-full bg-[#F59E0B] dark:bg-[#FBBF24] transition-all duration-300"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[#E2E8F0] dark:border-[#24303C] text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#478559] dark:bg-[#4A9D68]" />
                    Aprobadas ({stats.resumen.aprobadasCount})
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] dark:bg-[#FBBF24]" />
                    Regulares / Cursando ({stats.resumen.regularesCount})
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E2E8F0] dark:bg-[#24303C]" />
                    Pendientes (
                    {Math.max(
                      0,
                      stats.resumen.totalMaterias -
                        stats.resumen.aprobadasCount -
                        stats.resumen.regularesCount,
                    )}
                    )
                  </span>
                </div>
              </CardBody>
            </Card>
          </section>

          {/* SECCIÓN DESAGREGADA: Detalle Completo de Cursadas */}
          <section
            aria-label="Detalle desagregado de materias"
            className="mt-6"
          >
            <TablaDesgloseMaterias items={stats.listadoDesagregado || []} />
          </section>
        </>
      )}

      <ImportarSawebModal
        isOpen={isSawebOpen}
        onOpenChange={onSawebOpenChange}
        plan={plan}
        materias={materias}
        onApplyImport={handleApplySawebImport}
      />
    </div>
  );
}
