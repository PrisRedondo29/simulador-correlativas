import React, { useMemo } from 'react';
import { Card, CardBody, Accordion, AccordionItem, Button, Chip } from '@heroui/react';
import { ArrowRight, Info, ChevronDown, Repeat, GraduationCap, ChevronUp } from 'lucide-react';
import MateriaCard from '../Equivalencias/MateriaCard';

function ListaMaterias({ materiasFiltradas, progreso }) {

  // Agrupación de las materias por año académico
  const materiasPorAnio = useMemo(() => {
    const grupos = {};
    materiasFiltradas.forEach(grupo => {
      const anio = grupo.anio || "6"; // Usamos la propiedad anio del grupo
      if (!grupos[anio]) grupos[anio] = [];
      grupos[anio].push(grupo);
    });
    return Object.entries(grupos).sort(([a], [b]) => parseInt(a) - parseInt(b));
  }, [materiasFiltradas]);

  if (materiasFiltradas.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-default-400 bg-default-50 rounded-3xl border-2 border-dashed border-default-200 animate-in fade-in duration-500">
        <Info size={48} strokeWidth={1} className="mb-4 text-default-300" />
        <p className="text-sm font-bold uppercase tracking-widest">No se encontraron resultados</p>
        <p className="text-xs mt-1">Prueba ajustando los filtros o la búsqueda</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Encabezados de Columna (Móvil y Desktop) */}
      <div className="grid grid-cols-[1fr_20px_1fr] sm:grid-cols-11 gap-1.5 sm:gap-4 px-2.5 sm:px-6 py-2 items-center bg-default-100/50 rounded-xl">
        <div className="sm:col-span-5 text-[10px] sm:text-xs font-black uppercase text-default-700 dark:text-default-400 text-center tracking-wider flex items-center justify-center gap-1 sm:gap-2 truncate">
          <Repeat size={12} className="shrink-0" />
          <span className="truncate">Plan 17.13 <span className="hidden sm:inline">(Origen)</span></span>
        </div>
        <div className="sm:col-span-1 flex justify-center">
          <ArrowRight size={14} className="text-default-400" />
        </div>
        <div className="sm:col-span-5 text-[10px] sm:text-xs font-black uppercase text-primary-700 dark:text-primary-400 text-center tracking-wider flex items-center justify-center gap-1 sm:gap-2 truncate">
          <ArrowRight size={12} className="shrink-0" />
          <span className="truncate">Plan 17.14 <span className="hidden sm:inline">(Destino)</span></span>
        </div>
      </div>

      {/* Acordeón por Años */}
      <Accordion
        variant="light"
        className="px-0"
        selectionMode="multiple"
        defaultExpandedKeys={["1"]} // Expandir primer año por defecto
        itemClasses={{
          base: "py-0 w-full mb-4",
          title: "font-black text-foreground text-sm uppercase tracking-widest",
          trigger: "px-3 sm:px-4 py-3 sm:py-4 bg-default-100/50 hover:bg-default-200/50 rounded-2xl transition-all border border-default-200/50",
          content: "pt-4 px-0 sm:px-1",
          indicator: "text-primary font-bold"
        }}
      >
        {materiasPorAnio.map(([anio, materias]) => (
          <AccordionItem
            key={anio}
            aria-label={`Materias de ${anio}º Año`}
            startContent={
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <span className="font-black text-xs">{anio}º</span>
              </div>
            }
            title={`${anio}º Año`}
            subtitle={
              <div className="flex gap-2 mt-0.5">
                <span className="text-[11px] sm:text-xs text-default-700 dark:text-default-500 font-black uppercase">
                  {materias.length} equivalencias
                </span>
              </div>
            }
          >
            <div className="flex flex-col gap-8 sm:gap-10 py-2">
              {[1, 2].map((cuatri) => {
                // Agrupamos por cuatrimestre usando el año/cuatri definido en el hook
                const gruposCuatri = materias.filter(
                  (grupo) => (Number(grupo.cuatrimestre) % 2 === 0 ? 2 : 1) === cuatri
                );

                if (gruposCuatri.length === 0) return null;

                return (
                  <div key={cuatri} className="flex flex-col gap-4 sm:gap-8">
                    {/* Cabecera del Cuatrimestre */}
                    <div className="flex items-center justify-between bg-default-100/30 border border-default-200/50 rounded-2xl px-3.5 sm:px-5 py-2.5 sm:py-3 shadow-2xs">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-1.5 h-4 sm:h-6 bg-primary/40 rounded-full"></div>
                        <h3 className="text-xs sm:text-[13px] font-black text-foreground uppercase tracking-wider sm:tracking-widest">
                          {cuatri}° Cuatrimestre
                        </h3>
                      </div>
                      <Chip
                        size="sm"
                        variant="flat"
                        className="bg-background/80 border border-default-300 text-default-700 dark:text-foreground font-black text-[10px] sm:text-xs uppercase px-2 sm:px-3 h-5 sm:h-6"
                      >
                        {gruposCuatri.length} {gruposCuatri.length === 1 ? 'grupo' : 'grupos'}
                      </Chip>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:gap-16">
                      {gruposCuatri.map((grupo, index) => {
                        // Un grupo está aprobado si TODAS sus materias viejas lo están
                        const todasAprobadas = grupo.materiasViejas.length > 0 &&
                          grupo.materiasViejas.every(m => progreso[m.codigo] === "Aprobado");

                        const estadoNuevo = grupo.esEquivalente
                          ? (todasAprobadas ? "Aprobado" : "Disponible")
                          : "Sin equivalencia";

                        return (
                          <React.Fragment key={grupo.id}>
                            <div className="grid grid-cols-[1fr_20px_1fr] sm:grid-cols-11 gap-1 sm:gap-6 items-center w-full">

                              {/* Lado Izquierdo: Materias Viejas (Origen) */}
                              <div className="sm:col-span-5 flex flex-col gap-2 min-w-0">
                                {grupo.materiasViejas.map((mVieja) => (
                                  <MateriaCard
                                    key={mVieja.codigo}
                                    materia={mVieja}
                                    estado={progreso[mVieja.codigo]}
                                  />
                                ))}
                                {grupo.materiasViejas.length === 0 && (
                                  <div className="p-3 sm:p-8 rounded-xl sm:rounded-2xl border-2 border-dashed border-default-200 flex items-center justify-center text-default-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-default-50/50 text-center leading-tight">
                                    Materia nueva
                                  </div>
                                )}
                              </div>

                              {/* Centro: Flecha / Conector */}
                              <div className="sm:col-span-1 flex justify-center items-center">
                                <ArrowRight className="text-default-400 sm:text-primary/30" size={14} strokeWidth={2.5} />
                              </div>

                              {/* Lado Derecho: Materia Nueva (Destino) */}
                              <div className="sm:col-span-5 min-w-0">
                                <MateriaCard
                                  isNewPlan
                                  materia={grupo.materiaNueva}
                                  estado={estadoNuevo}
                                />
                              </div>
                            </div>

                            {/* Separador entre grupos - Solo visible en mobile */}
                            {index < gruposCuatri.length - 1 && (
                              <div className="sm:hidden flex items-center justify-center py-1">
                                <div className="w-full h-px bg-gradient-to-r from-transparent via-default-200 to-transparent" />
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export default ListaMaterias;
