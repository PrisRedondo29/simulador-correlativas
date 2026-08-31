import React, { useMemo, useState } from 'react';

/**
 * MateriasMallaEstatica: Componente de Malla Curricular Nativa en HTML/CSS
 * Diseñado con Scroll en el Eje X (horizontal) nativo táctil para celulares.
 */
function MateriasMallaEstatica({ materias, progreso, onNodeClick, projection, cambioDeEstado, marcarTodasEnPantalla }) {
  const items = projection?.items || {};
  const labels = projection?.labels || {};
  const maxCol = projection?.maxCol || 0;

  // Estado local para resaltado interactivo de correlativas al pasar el cursor / tocar
  const [hoveredCodigo, setHoveredCodigo] = useState(null);

  // Determinar la columna que se está simulando activamente
  const colActiva = useMemo(() => {
    if (!items) return null;
    for (const cod in items) {
      if (items[cod]?.estado === 'Presente') {
        return items[cod].columna;
      }
    }
    return null;
  }, [items]);

  // Obtener la materia hovered y sus correlativas para el resaltado
  const hoveredMateria = useMemo(() => {
    if (!hoveredCodigo || !materias) return null;
    return materias.find((m) => m.codigo === hoveredCodigo);
  }, [hoveredCodigo, materias]);

  // Agrupar materias por cuatrimestre/columna
  const columnasMap = useMemo(() => {
    const map = {};
    if (!materias) return map;

    materias.forEach((m) => {
      let col;
      if (items[m.codigo]) {
        col = items[m.codigo].columna;
      } else {
        col = (Number(m.anio) - 1) * 2 + (Number(m.cuatrimestre) % 2 === 0 ? 2 : 1);
      }
      if (!map[col]) map[col] = [];
      map[col].push(m);
    });

    return map;
  }, [materias, items]);

  const colKeys = useMemo(() => {
    const keys = Object.keys(columnasMap).map(Number).sort((a, b) => a - b);
    if (maxCol && maxCol > Math.max(...keys, 0)) {
      const all = [];
      for (let i = 1; i <= maxCol; i++) all.push(i);
      return all;
    }
    return keys;
  }, [columnasMap, maxCol]);

  // Helper de badges y estilos por estado de la materia (todos usan border-2 para evitar layout shifts)
  const getEstadoStyles = (materia) => {
    const proj = items[materia.codigo];
    const prog = progreso?.[materia.codigo];

    let estadoFinal = 'Disponible';
    if (proj) {
      if (proj.estado === 'Presente') {
        estadoFinal = (prog === 'Cursado' || prog === 'Aprobado' || prog === 'Promocionado') ? 'Seleccionada' : 'Disponible';
      } else {
        estadoFinal = proj.estado;
      }
    } else {
      estadoFinal = prog || 'Disponible';
    }

    switch (estadoFinal) {
      case 'Seleccionada':
      case 'Cursando':
      case 'Cursado':
        return {
          label: 'Cursando',
          icon: 'fa-solid fa-play',
          badgeClass: 'bg-blue-600 text-white font-bold',
          borderClass: 'border-2 border-blue-500 bg-blue-50/90 dark:bg-blue-950/70 shadow-xs'
        };
      case 'Aprobado':
      case 'Aprobada':
      case 'Promocionado':
      case 'Promocionada':
        return {
          label: 'Aprobada',
          icon: 'fa-solid fa-circle-check',
          badgeClass: 'bg-emerald-600 text-white font-bold',
          borderClass: 'border-2 border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/50 shadow-xs'
        };
      case 'Regular':
        return {
          label: 'Regular',
          icon: 'fa-solid fa-clock',
          badgeClass: 'bg-amber-500 text-white font-bold',
          borderClass: 'border-2 border-amber-400 bg-amber-50/60 dark:bg-amber-950/40 shadow-xs'
        };
      case 'Proyectada':
      case 'Por Cursar':
        return {
          label: 'Futuro Cuatri',
          icon: 'fa-solid fa-calendar-days',
          badgeClass: 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700',
          borderClass: 'border-2 border-slate-200 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-900/30'
        };
      case 'Bloqueado':
      case 'Bloqueada':
        return {
          label: 'Bloqueada',
          icon: 'fa-solid fa-lock',
          badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700',
          borderClass: 'border-2 border-rose-200/80 dark:border-rose-950/60 bg-rose-50/30 dark:bg-rose-950/20 opacity-70'
        };
      case 'Disponible':
      default:
        return {
          label: 'Disponible',
          icon: 'fa-solid fa-unlock',
          badgeClass: 'bg-sky-500 text-white font-bold shadow-xs',
          borderClass: 'border-2 border-sky-400 dark:border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 hover:border-sky-500 shadow-xs'
        };
    }
  };

  return (
    <div className="w-full overflow-x-auto snap-x snap-mandatory flex gap-4 p-3.5 sm:p-6 select-none touch-pan-x scrollbar-thin scrollbar-thumb-default-300 dark:scrollbar-thumb-zinc-700 min-h-[600px] max-h-[840px] pb-36 rounded-3xl bg-slate-100/60 dark:bg-zinc-950/60 border border-default-200">
      {colKeys.map((colNum) => {
        const materiasCol = columnasMap[colNum] || [];
        const anioCalculado = Math.ceil(colNum / 2);
        const cuatriCalculado = colNum % 2 === 0 ? 2 : 1;
        const colLabel = labels?.[colNum] || `${colNum}° Cuatrimestre`;
        const esColActiva = colActiva === colNum;

        // Horas semanales totales de la columna
        const totalHorasSem = materiasCol.reduce((sum, m) => sum + (Number(m.horas_semanales) || 0), 0);

        // Métricas de aprobación en la columna
        const aprobadasCol = materiasCol.filter(m => {
          const prog = progreso?.[m.codigo];
          return prog === 'Aprobado' || prog === 'Aprobada' || prog === 'Promocionado' || prog === 'Promocionada';
        }).length;

        // Materias disponibles actualmente en la columna activa
        const materiasDisponiblesActivas = materiasCol.filter(m => items[m.codigo]?.estado === 'Presente');
        const todasInscriptasActivas = materiasDisponiblesActivas.length > 0 && materiasDisponiblesActivas.every(m => {
          const prog = progreso?.[m.codigo];
          return prog === 'Cursado' || prog === 'Aprobado';
        });

        return (
          <div
            key={`malla-col-${colNum}`}
            className={`flex-none shrink-0 w-[265px] sm:w-[285px] snap-start flex flex-col gap-3 p-3 rounded-2xl transition-all duration-150 ${
              esColActiva
                ? 'bg-white dark:bg-zinc-900 border-2 border-emerald-600 dark:border-emerald-500 shadow-md'
                : 'bg-white/80 dark:bg-zinc-900/80 border border-slate-200/90 dark:border-zinc-800 shadow-xs'
            }`}
          >
            {/* Header del Cuatrimestre */}
            <div
              className={`flex-none shrink-0 p-3.5 rounded-xl shadow-xs flex flex-col gap-1.5 transition-colors ${
                esColActiva
                  ? 'bg-emerald-700 text-white dark:bg-emerald-800 shadow-sm'
                  : 'bg-slate-800 text-white dark:bg-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-90">
                  {anioCalculado}° Año · {cuatriCalculado}° Cuatri
                </span>
                <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                  {aprobadasCol}/{materiasCol.length}
                </span>
              </div>

              <div className="flex items-center justify-between gap-1">
                <h4 className="text-xs font-black tracking-wide truncate">
                  {colLabel}
                </h4>
                {totalHorasSem > 0 && (
                  <span className="text-[10px] font-mono opacity-80 shrink-0">
                    {totalHorasSem}h/sem
                  </span>
                )}
              </div>

              {/* Pill resaltado + Botón de selección masiva en la columna activa */}
              {esColActiva && (
                <div className="mt-2 pt-2 border-t border-white/20 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest bg-white text-emerald-900 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                      CONFIGURANDO AHORA
                    </span>
                  </div>

                  {marcarTodasEnPantalla && materiasDisponiblesActivas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        marcarTodasEnPantalla(todasInscriptasActivas ? 'No Cursado' : 'Cursado');
                      }}
                      className={`w-full py-1.5 px-3 rounded-lg font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ${
                        todasInscriptasActivas
                          ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300'
                          : 'bg-white hover:bg-slate-100 text-emerald-900 border border-white/80'
                      }`}
                      title={todasInscriptasActivas ? "Quitar todas las materias del cuatrimestre" : "Seleccionar todas las materias disponibles"}
                    >
                      <i className={todasInscriptasActivas ? "fa-solid fa-rotate-left text-xs text-rose-600" : "fa-solid fa-check-double text-xs text-emerald-700"} />
                      <span>{todasInscriptasActivas ? 'Quitar todas' : 'Seleccionar todas'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Lista Vertical de Materias del Cuatrimestre */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 p-0.5 pb-32 scrollbar-none">
              {materiasCol.map((materia) => {
                const { label, icon, badgeClass, borderClass } = getEstadoStyles(materia);
                const hasCorrelativas = materia.correlativas && materia.correlativas.length > 0;
                const isEsDisponiblenColActiva = items[materia.codigo]?.estado === 'Presente';

                // Lógica de resaltado interactivo de correlativas (utilizando bordes INSET para cero desborde)
                const isHovered = hoveredCodigo === materia.codigo;
                const isRequeridaPorHovered = hoveredMateria && hoveredMateria.correlativas?.includes(materia.codigo);
                const isDesbloqueadaPorHovered = hoveredMateria && materia.correlativas?.includes(hoveredMateria.codigo);

                let hoverHighlightClass = '';
                if (isHovered) {
                  hoverHighlightClass = '!border-2 !border-primary-600 bg-primary-50/90 dark:bg-primary-950/80 shadow-sm';
                } else if (isRequeridaPorHovered) {
                  hoverHighlightClass = '!border-2 !border-amber-500 bg-amber-50 dark:bg-amber-950/80 shadow-sm';
                } else if (isDesbloqueadaPorHovered) {
                  hoverHighlightClass = '!border-2 !border-emerald-500 bg-emerald-50 dark:bg-emerald-950/80 shadow-sm';
                }

                const handleCardPress = () => {
                  if (isEsDisponiblenColActiva && cambioDeEstado) {
                    cambioDeEstado(materia.codigo);
                  } else if (onNodeClick) {
                    onNodeClick(materia.codigo);
                  }
                };

                return (
                  <div
                    key={materia.codigo}
                    onClick={handleCardPress}
                    onMouseEnter={() => setHoveredCodigo(materia.codigo)}
                    onMouseLeave={() => setHoveredCodigo(null)}
                    className={`flex-none shrink-0 w-full p-3 rounded-xl border-2 transition-colors duration-150 cursor-pointer select-none box-border ${borderClass} ${hoverHighlightClass}`}
                  >
                    {/* Fila Superior: Nombre + Código */}
                    <div className="flex justify-between items-start gap-1.5 w-full">
                      <h5 className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 leading-snug text-left flex-1">
                        {materia.nombre}
                      </h5>
                      <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md shrink-0 border border-slate-200 dark:border-zinc-700">
                        {materia.codigo}
                      </span>
                    </div>

                    {/* Fila Media: Horas semanal / totales */}
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                      <span>{materia.horas_semanales ? `${materia.horas_semanales}h/sem` : ''}</span>
                      {materia.horas_totales && <span>{materia.horas_totales}h tot</span>}
                    </div>

                    {/* Indicador interactivo de correlativa */}
                    {isRequeridaPorHovered && (
                      <div className="mt-1.5 text-[9px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                        ⚠️ Requisito necesario
                      </div>
                    )}
                    {isDesbloqueadaPorHovered && (
                      <div className="mt-1.5 text-[9px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                        🔓 Se habilita con la seleccionada
                      </div>
                    )}

                    {/* Fila Inferior: Badge de Estado + Correlativas */}
                    <div className="mt-2.5 flex items-center justify-between gap-1 flex-wrap pt-2 border-t border-slate-100 dark:border-zinc-800/80 w-full">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${badgeClass}`}>
                        <i className={`${icon} text-[9px]`} />
                        {label}
                      </span>

                      {hasCorrelativas && (
                        <span className="text-[9px] font-mono text-slate-400 dark:text-zinc-500 truncate max-w-[110px]">
                          Req: {materia.correlativas.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MateriasMallaEstatica;
