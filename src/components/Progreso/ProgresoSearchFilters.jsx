import { useEffect, useRef } from "react";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Switch,
} from "@heroui/react";
import {
  CheckCheck,
  ChevronsDownUp,
  ChevronsUpDown,
  ClipboardPaste,
  LayoutGrid,
  List,
  MoreVertical,
  RotateCcw,
  Search,
} from "lucide-react";
import SyncCloud from "./SyncCloud";

const STATUS_FILTERS = [
  { key: "todas", label: "Todas" },
  { key: "Disponible", label: "Disponibles" },
  { key: "Cursando", label: "Cursando" },
  { key: "Regular", label: "Regulares" },
  { key: "Aprobado", label: "Aprobadas" },
  { key: "Promocionado", label: "Promocionadas" },
  { key: "Bloqueado", label: "Bloqueadas" },
  { key: "Libre", label: "Libres" },
];

/**
 * Barra unificada de búsqueda, filtros por estado y acciones de gestión de Mi Progreso.
 */
export default function ProgresoSearchFilters({
  busqueda,
  setBusqueda,
  estadoFiltro,
  setEstadoFiltro,
  soloIncompletas,
  setSoloIncompletas,
  incompletasCount = 0,
  vista,
  setVista,
  areAllExpanded,
  toggleExpandAll,
  isFiltering,
  yearGroups = [],
  plan,
  onRequestApproveGroup,
  onRequestReset,
  onOpenSawebImport,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <section
      aria-label="Filtros y acciones de materias"
      className="rounded-xl bg-[#FFFFFF] dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C] p-3 sm:p-4 space-y-3 shadow-xs"
    >
      {/* Fila superior: buscador + acciones */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1 min-w-0">
          <Input
            ref={inputRef}
            aria-label="Buscar materia por nombre o código"
            placeholder="Buscar materia o código..."
            value={busqueda}
            onValueChange={setBusqueda}
            isClearable
            onClear={() => setBusqueda("")}
            size="sm"
            variant="bordered"
            startContent={<Search className="w-4 h-4 text-[#64748B] shrink-0" />}
            endContent={
              !busqueda && (
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] bg-[#F1F5F9] dark:bg-[#1E2730] rounded border border-[#E2E8F0] dark:border-[#334155]">
                  Ctrl+K
                </kbd>
              )
            }
            classNames={{
              inputWrapper:
                "bg-[#F8FAFC] dark:bg-[#11171D] border-[#E2E8F0] dark:border-[#24303C] min-h-10",
            }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 shrink-0">
          {/* Solo incompletas */}
          <div
            data-tour="progreso-solo-incompletas"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C]"
          >
            <Switch
              size="sm"
              isSelected={soloIncompletas}
              onValueChange={setSoloIncompletas}
              aria-label="Mostrar solo materias con datos incompletos"
              classNames={{
                wrapper:
                  "group-data-[selected=true]:bg-[#005A36] dark:group-data-[selected=true]:bg-[#2E8B63]",
              }}
            >
              <span className="text-xs font-medium text-[#334155] dark:text-[#CBD5E1] whitespace-nowrap">
                Solo incompletas
                {incompletasCount > 0 ? ` (${incompletasCount})` : ""}
              </span>
            </Switch>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Segmented Grid / List */}
            <div
              role="group"
              aria-label="Modo de visualización"
              className="inline-flex items-center rounded-lg border border-[#E2E8F0] dark:border-[#24303C] bg-[#F8FAFC] dark:bg-[#11171D] p-0.5"
            >
              <button
                type="button"
                onClick={() => setVista("grid")}
                aria-label="Vista en grilla"
                aria-pressed={vista === "grid"}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer ${
                  vista === "grid"
                    ? "bg-[#FFFFFF] dark:bg-[#1E2730] text-[#005A36] dark:text-[#6EE7B7] shadow-xs"
                    : "text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#F1F5F9]"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setVista("list")}
                aria-label="Vista en lista"
                aria-pressed={vista === "list"}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer ${
                  vista === "list"
                    ? "bg-[#FFFFFF] dark:bg-[#1E2730] text-[#005A36] dark:text-[#6EE7B7] shadow-xs"
                    : "text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#F1F5F9]"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Mostrar todo / Ocultar todo */}
            <Button
              size="sm"
              variant="bordered"
              isDisabled={isFiltering || yearGroups.length === 0}
              onPress={toggleExpandAll}
              className="border-[#E2E8F0] dark:border-[#24303C] text-[#334155] dark:text-[#CBD5E1] font-medium min-h-9"
              startContent={
                areAllExpanded ? (
                  <ChevronsDownUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronsUpDown className="w-3.5 h-3.5" />
                )
              }
            >
              {areAllExpanded ? "Ocultar todo" : "Mostrar todo"}
            </Button>

            {/* Aprobar hasta... */}
            {yearGroups.length > 0 && (
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    data-tour="progreso-aprobar-hasta"
                    size="sm"
                    variant="flat"
                    className="bg-[#005A36]/10 text-[#005A36] dark:bg-[#2E8B63]/20 dark:text-[#6EE7B7] font-medium min-h-9"
                    startContent={<CheckCheck className="w-3.5 h-3.5" />}
                  >
                    <span className="hidden sm:inline">Aprobar hasta...</span>
                    <span className="sm:hidden">Aprobar</span>
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Aprobar materias hasta el año seleccionado"
                  onAction={(key) => {
                    const idx = yearGroups.findIndex((g) => g.key === String(key));
                    if (idx !== -1) {
                      const targetGroup = yearGroups[idx];
                      const materiasHasta = yearGroups
                        .slice(0, idx + 1)
                        .flatMap((g) => g.materias);
                      onRequestApproveGroup(`Hasta ${targetGroup.label}`, materiasHasta);
                    }
                  }}
                >
                  {yearGroups.map((group) => (
                    <DropdownItem key={group.key}>
                      Hasta {group.label}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
            )}

            {/* Importar desde Analítico SAWeb (disponible en celular y escritorio) */}
            {onOpenSawebImport && (
              <Button
                data-tour="progreso-import-analitico"
                size="sm"
                variant="flat"
                onPress={onOpenSawebImport}
                className="inline-flex bg-[#005A36]/10 text-[#005A36] dark:bg-[#2E8B63]/20 dark:text-[#6EE7B7] font-semibold min-h-9 border border-[#A7F3D0]/70 dark:border-[#1E4D38]"
                startContent={<ClipboardPaste className="w-3.5 h-3.5" />}
              >
                <span className="hidden sm:inline">Importar Analítico</span>
                <span className="sm:hidden">Analítico</span>
              </Button>
            )}

            {/* Sincronización manual si corresponde */}
            <SyncCloud plan={plan} />

            {/* Menú secundario (Reestablecer) */}
            <Dropdown>
              <DropdownTrigger>
                <Button
                  isIconOnly
                  size="sm"
                  variant="bordered"
                  aria-label="Más opciones de progreso"
                  className="border-[#E2E8F0] dark:border-[#24303C] text-[#475569] dark:text-[#CBD5E1] min-w-9 h-9"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Acciones adicionales">
                <DropdownItem
                  key="reset"
                  color="danger"
                  className="text-danger"
                  startContent={<RotateCcw className="w-4 h-4" />}
                  onPress={onRequestReset}
                >
                  Reestablecer progreso
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Fila inferior: pills de estado en una sola línea desplazable horizontalmente */}
      <div
        role="group"
        aria-label="Filtrar por estado"
        className="flex items-center gap-1.5 flex-nowrap overflow-x-auto pb-1 -mb-1"
      >
        {STATUS_FILTERS.map((item) => {
          const isActive = estadoFiltro === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setEstadoFiltro(item.key)}
              aria-pressed={isActive}
              className={`shrink-0 whitespace-nowrap min-h-8 px-3 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? "bg-[#005A36] text-white dark:bg-[#2E8B63] shadow-xs"
                  : "bg-[#F1F5F9] dark:bg-[#1E2730] text-[#475569] dark:text-[#CBD5E1] hover:bg-[#E2E8F0] dark:hover:bg-[#283440]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
