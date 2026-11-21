import { ChevronRight } from "lucide-react";
import estadoUtils from "../../utils/Progreso/estadoUtils";

/**
 * Tarjeta mínima de materia para Mi Progreso.
 * Muestra únicamente nombre, código (con aviso discreto si hay datos incompletos)
 * y un único badge de estado para minimizar la carga visual.
 */
export default function MateriaCard({
  materia,
  estado = "Disponible",
  detalles = null,
  isIncomplete = false,
  isSelected = false,
  vista = "grid",
  onSelect,
}) {
  const config =
    estadoUtils.ESTADO_CONFIG[estado] || estadoUtils.ESTADO_CONFIG.Disponible;
  const isBlocked = estado === "Bloqueado";
  const displayTitle = detalles?.nombreOptativa
    ? `${materia.nombre}: ${detalles.nombreOptativa}`
    : materia.nombre;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(materia.codigo)}
      aria-pressed={isSelected}
      aria-label={`${displayTitle} (${materia.codigo}), estado ${estado}${
        isIncomplete ? ", datos académicos incompletos" : ""
      }`}
      className={`group w-full text-left rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 px-3.5 py-3 min-h-[60px] ${
        isSelected
          ? "border-2 border-[#005A36] dark:border-[#4A9D68] bg-[#F0FDF4]/85 dark:bg-[#122D22]/75 shadow-xs"
          : isBlocked
            ? "border border-[#E2E8F0] dark:border-[#24303C] bg-[#F8FAFC] dark:bg-[#131920] hover:border-[#CBD5E1] dark:hover:border-[#334155]"
            : "border border-[#E2E8F0] dark:border-[#24303C] bg-[#FFFFFF] dark:bg-[#161D24] hover:border-[#005A36]/50 dark:hover:border-[#4A9D68]/55 hover:bg-[#F8FAFC]/80 dark:hover:bg-[#1B242D]"
      }`}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <p
          className={`text-sm font-medium leading-snug ${
            vista === "list" ? "truncate" : "line-clamp-2"
          } ${
            isBlocked
              ? "text-[#475569] dark:text-[#94A3B8]"
              : "text-[#1E293B] dark:text-[#F1F5F9]"
          }`}
        >
          {displayTitle}
        </p>

        <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] tabular-nums">
          <span>
            {materia.codigo}
            {detalles?.codigoOptativa ? ` · Cód. ${detalles.codigoOptativa}` : ""}
          </span>
          {isIncomplete && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#B45309] dark:text-[#FBBF24]"
              title="Falta cargar año, nota o intentos"
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#D97706] dark:bg-[#FBBF24]"
                aria-hidden="true"
              />
              Incompleta
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${config.badgeClass}`}
        >
          <i className={`${config.icono} text-[11px]`} aria-hidden="true" />
          <span>{estado}</span>
        </span>

        {isSelected && (
          <ChevronRight
            className="w-4 h-4 text-[#005A36] dark:text-[#6EE7B7] shrink-0"
            aria-hidden="true"
          />
        )}
      </div>
    </button>
  );
}
