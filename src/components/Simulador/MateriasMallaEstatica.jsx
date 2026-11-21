import React, { useMemo, useRef, useState } from 'react';

/**
 * MateriasMallaEstatica: Malla Curricular Nativa en HTML/CSS.
 * Unificada con la paleta serena institucional UNLu.
 */
function MateriasMallaEstatica({
    materias,
    progreso,
    onNodeClick,
    projection,
    cambioDeEstado,
    marcarTodasEnPantalla,
    selectedCodigo = null,
    interactionMode = 'planificar',
}) {
    const items = useMemo(() => projection?.items || {}, [projection]);
    const labels = projection?.labels || {};
    const maxCol = projection?.maxCol || 0;

    const [hoveredCodigo, setHoveredCodigo] = useState(null);
    const activeCodigo = selectedCodigo || hoveredCodigo;
    const scrollContainerRef = useRef(null);

    const colActiva = useMemo(() => {
        if (!items) return null;
        for (const cod in items) {
            if (items[cod]?.estado === 'Presente') {
                return items[cod].columna;
            }
        }
        return null;
    }, [items]);

    const hoveredMateria = useMemo(() => {
        if (!activeCodigo || !materias) return null;
        return materias.find((m) => m.codigo === activeCodigo);
    }, [activeCodigo, materias]);

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
                    badgeClass: 'bg-[#005A36] text-white dark:bg-[#2E8B63]',
                    borderClass: 'border-2 border-[#005A36] dark:border-[#4A9D68] bg-[#F0FDF4] dark:bg-[#122D22]',
                };
            case 'Aprobado':
            case 'Aprobada':
            case 'Promocionado':
            case 'Promocionada':
                return {
                    label: 'Aprobada',
                    icon: 'fa-solid fa-circle-check',
                    badgeClass: 'bg-[#D1FAE5] text-[#166534] dark:bg-[#173A24] dark:text-[#86EFAC]',
                    borderClass: 'border border-[#A7F3D0] dark:border-[#1E4D38] bg-[#ECFDF5] dark:bg-[#102A20]/80',
                };
            case 'Regular':
                return {
                    label: 'Regular',
                    icon: 'fa-regular fa-clock',
                    badgeClass: 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#423115] dark:text-[#FCD34D]',
                    borderClass: 'border border-[#FDE68A] dark:border-[#5C4318] bg-[#FFFBEB] dark:bg-[#2D2210]/70',
                };
            case 'Proyectada':
            case 'Por Cursar':
                return {
                    label: 'Futuro cuatri',
                    icon: 'fa-regular fa-calendar',
                    badgeClass: 'bg-[#F1F5F9] text-[#475569] dark:bg-[#1E2730] dark:text-[#94A3B8]',
                    borderClass: 'border border-dashed border-[#CBD5E1] dark:border-[#2A3540] bg-white dark:bg-[#161D24]',
                };
            case 'Bloqueado':
            case 'Bloqueada':
                return {
                    label: 'Bloqueada',
                    icon: 'fa-solid fa-lock',
                    badgeClass: 'bg-[#E2E8F0]/80 text-[#475569] dark:bg-[#2A3540] dark:text-[#94A3B8]',
                    borderClass: 'border border-[#E2E8F0] dark:border-[#2D3743] bg-[#F1F5F9] dark:bg-[#1A2129]',
                };
            case 'Disponible':
            default:
                return {
                    label: 'Disponible',
                    icon: 'fa-solid fa-lock-open',
                    badgeClass: 'bg-[#E0F2FE] text-[#075985] dark:bg-[#16384F] dark:text-[#7DD3FC]',
                    borderClass: 'border border-[#BAE6FD] dark:border-[#1E4E6E] bg-[#F0F9FF] dark:bg-[#0F2636]/70 hover:border-[#7DD3FC]',
                };
        }
    };

    return (
        <div className="w-full h-full min-h-0 flex-1 flex flex-col bg-[#F8FAFC] dark:bg-[#0F1419]">
            <div
                ref={scrollContainerRef}
                className="w-full h-full flex-1 min-h-0 overflow-x-auto snap-x snap-mandatory flex gap-3 sm:gap-4 p-3 select-none touch-pan-x scrollbar-thin"
            >
            {colKeys.map((colNum) => {
                const materiasCol = columnasMap[colNum] || [];
                const anioCalculado = Math.ceil(colNum / 2);
                const cuatriCalculado = colNum % 2 === 0 ? 2 : 1;
                const colLabel = interactionMode === 'explorar'
                    ? `${anioCalculado}° Año · ${cuatriCalculado}° C`
                    : (labels?.[colNum] || `${colNum}° Cuatrimestre`);
                const esColActiva = interactionMode === 'planificar' && colActiva === colNum;

                const totalHorasSem = materiasCol.reduce((sum, m) => sum + (Number(m.horas_semanales) || 0), 0);

                const aprobadasCol = materiasCol.filter(m => {
                    const prog = progreso?.[m.codigo];
                    return prog === 'Aprobado' || prog === 'Aprobada' || prog === 'Promocionado' || prog === 'Promocionada';
                }).length;

                const materiasDisponiblesActivas = materiasCol.filter(m => items[m.codigo]?.estado === 'Presente');
                const todasInscriptasActivas = materiasDisponiblesActivas.length > 0 && materiasDisponiblesActivas.every(m => {
                    const prog = progreso?.[m.codigo];
                    return prog === 'Cursado' || prog === 'Aprobado';
                });

                return (
                    <div
                        key={`malla-col-${colNum}`}
                        data-malla-col={colNum}
                        className={`flex-none shrink-0 w-[calc(52vw-20px)] min-w-[165px] max-w-[220px] sm:max-w-none sm:w-[275px] h-full snap-start flex flex-col gap-2.5 p-2.5 rounded-2xl transition-colors ${
                            esColActiva
                                ? 'bg-white dark:bg-[#161D24] border-2 border-[#005A36] dark:border-[#4A9D68] shadow-xs'
                                : 'bg-white/80 dark:bg-[#161D24]/80 border border-[#E2E8F0] dark:border-[#2A3540]'
                        }`}
                    >
                        {/* Header del Cuatrimestre */}
                        <div
                            className={`flex-none shrink-0 p-3 rounded-xl flex flex-col gap-1 ${
                                esColActiva
                                    ? 'bg-[#005A36] dark:bg-[#1D5E43] text-white'
                                    : 'bg-[#F1F5F9] dark:bg-[#1E2730] text-[#1E293B] dark:text-[#F1F5F9] border border-[#E2E8F0] dark:border-[#2A3540]'
                            }`}
                        >
                            <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className={esColActiva ? 'text-white/85' : 'text-[#64748B] dark:text-[#94A3B8]'}>
                                    {anioCalculado}° Año · {cuatriCalculado}° C
                                </span>
                                <span
                                    className={`px-1.5 py-0.5 rounded font-semibold tabular-nums ${
                                        esColActiva
                                            ? 'bg-white/20 text-white'
                                            : 'bg-white dark:bg-[#161D24] text-[#475569] dark:text-[#CBD5E1]'
                                    }`}
                                >
                                    {aprobadasCol}/{materiasCol.length}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-1">
                                <h4 className="text-xs font-semibold truncate">{colLabel}</h4>
                                {totalHorasSem > 0 && (
                                    <span className={`text-[10px] font-mono tabular-nums shrink-0 ${esColActiva ? 'text-white/80' : 'text-[#64748B] dark:text-[#94A3B8]'}`}>
                                        {totalHorasSem}h/s
                                    </span>
                                )}
                            </div>

                            {esColActiva && (
                                <div className="mt-1.5 pt-2 border-t border-white/20 flex flex-col gap-1.5">
                                    <span className="text-[10px] font-medium text-white/90">
                                        En curso en la simulación
                                    </span>

                                    {marcarTodasEnPantalla && materiasDisponiblesActivas.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => marcarTodasEnPantalla(todasInscriptasActivas ? 'No Cursado' : 'Cursado')}
                                            className={`w-full py-1 px-2 rounded-lg font-semibold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                                                todasInscriptasActivas
                                                    ? 'bg-white/90 hover:bg-white text-[#991B1B]'
                                                    : 'bg-white hover:bg-[#F8FAFC] text-[#005A36]'
                                            }`}
                                        >
                                            <i className={todasInscriptasActivas ? 'fa-solid fa-rotate-left text-[10px]' : 'fa-solid fa-check-double text-[10px]'} />
                                            <span>{todasInscriptasActivas ? 'Quitar todas' : 'Seleccionar todas'}</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Lista Vertical de Materias del Cuatrimestre */}
                        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pb-2 pr-1 scrollbar-thin">
                            {materiasCol.map((materia) => {
                                const { label, icon, badgeClass, borderClass } = getEstadoStyles(materia);
                                const hasCorrelativas = materia.correlativas && materia.correlativas.length > 0;
                                const isDisponibleActiva = items[materia.codigo]?.estado === 'Presente';

                                const isHovered = activeCodigo === materia.codigo;
                                const isRequeridaPorHovered = hoveredMateria && hoveredMateria.correlativas?.includes(materia.codigo);
                                const isDesbloqueadaPorHovered = hoveredMateria && materia.correlativas?.includes(hoveredMateria.codigo);

                                let hoverHighlightClass = '';
                                if (isHovered) {
                                    hoverHighlightClass = '!border-2 !border-[#005A36] dark:!border-[#4A9D68]';
                                } else if (isRequeridaPorHovered) {
                                    hoverHighlightClass = '!border-2 !border-[#D97706] !bg-[#FFFBEB] dark:!bg-[#2D2210]';
                                } else if (isDesbloqueadaPorHovered) {
                                    hoverHighlightClass = '!border-2 !border-[#478559] !bg-[#ECFDF5] dark:!bg-[#102A20]';
                                }

                                const handleCardPress = () => {
                                    if (interactionMode === 'explorar' && onNodeClick) {
                                        onNodeClick(materia.codigo);
                                    } else if (isDisponibleActiva && cambioDeEstado) {
                                        cambioDeEstado(materia.codigo);
                                    } else if (onNodeClick) {
                                        onNodeClick(materia.codigo);
                                    }
                                };

                                return (
                                    <button
                                        key={materia.codigo}
                                        type="button"
                                        onClick={handleCardPress}
                                        onMouseEnter={() => setHoveredCodigo(materia.codigo)}
                                        onMouseLeave={() => setHoveredCodigo(null)}
                                        className={`flex-none shrink-0 w-full p-2.5 sm:p-3 rounded-xl transition-colors duration-150 cursor-pointer text-left box-border ${borderClass} ${hoverHighlightClass}`}
                                    >
                                        <div className="flex justify-between items-start gap-1.5 w-full">
                                            <h5 className="text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9] leading-snug flex-1 line-clamp-3 sm:line-clamp-2">
                                                {materia.nombre}
                                            </h5>
                                            <span className="text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8] shrink-0 tabular-nums">
                                                {materia.codigo}
                                            </span>
                                        </div>

                                        {isRequeridaPorHovered && (
                                            <div className="mt-1.5 text-[10px] font-medium text-[#92400E] dark:text-[#FCD34D]">
                                                Requisito previo
                                            </div>
                                        )}
                                        {isDesbloqueadaPorHovered && (
                                            <div className="mt-1.5 text-[10px] font-medium text-[#166534] dark:text-[#86EFAC]">
                                                Se habilita al aprobar
                                            </div>
                                        )}

                                        <div className="mt-2 flex items-center justify-between gap-1.5 flex-wrap pt-1.5 border-t border-[#E2E8F0]/70 dark:border-[#2A3540]">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 ${badgeClass}`}>
                                                <i className={`${icon} text-[9px]`} aria-hidden="true" />
                                                <span>{label}</span>
                                            </span>

                                            {hasCorrelativas && (
                                                <span className="text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8] truncate max-w-[95px]">
                                                    Req: {materia.correlativas.join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            </div>
        </div>
    );
}

export default MateriasMallaEstatica;
