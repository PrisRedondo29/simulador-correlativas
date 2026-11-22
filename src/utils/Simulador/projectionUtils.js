/**
 * projectionUtils.js
 * Lógica para calcular la proyección dinámica de la carrera.
 */

/** @typedef {import('../../types/domain').Materia} Materia */
/** @typedef {import('../../types/domain').HistorialSemestre} HistorialSemestre */
/** @typedef {import('../../types/domain').ProgresoMap} ProgresoMap */
/** @typedef {import('../../types/domain').ProgresoSimuladorMap} ProgresoSimuladorMap */
/** @typedef {import('../../types/domain').ProyeccionCarrera} ProyeccionCarrera */
/** @typedef {import('../../types/domain').ProyeccionItem} ProyeccionItem */
/** @typedef {import('../../types/domain').ProyeccionSkippedItem} ProyeccionSkippedItem */

import {
    ESTADOS_MATERIA,
    evaluarElegibilidadMateria,
} from '../Progreso/materiaStateMachine';

/**
 * Construye un mapa de progreso sintético donde los códigos en `codigosAprobados`
 * figuran como `'Aprobado'`, permitiendo reutilizar el evaluador canónico v2.
 * @param {Materia[]} materias
 * @param {Set<string>} codigosAprobados
 * @returns {ProgresoMap}
 */
function crearProgresoSintetico(materias, codigosAprobados) {
    /** @type {ProgresoMap} */
    const mapa = {};
    materias.forEach((mat) => {
        mapa[mat.codigo] = codigosAprobados.has(mat.codigo)
            ? ESTADOS_MATERIA.APROBADO
            : ESTADOS_MATERIA.BLOQUEADO;
    });
    return mapa;
}

/**
 * Las actividades de tramo final / Tesina (`tesis === true` o `cuatrimestre > 10`)
 * no están atadas a paridad fija 1°/2° cuatrimestre: se habilitan en cualquier
 * cuatrimestre en cuanto se cumplen sus requisitos.
 * @param {Materia} materia
 * @returns {boolean}
 */
function esActividadFlexible(materia) {
    return Boolean(materia?.tesis || Number(materia?.cuatrimestre) > 10);
}

/**
 * Calcula la proyección temporal de cursadas pasadas, presentes y futuras.
 * @param {{
 *   materias: Materia[],
 *   historialSemestres: HistorialSemestre[],
 *   progresoBase?: ProgresoSimuladorMap,
 *   cuatriActual: string | number,
 *   anioActual: string | number,
 *   equivalenciasMap?: import('../../types/domain').EquivalenciasMap | null,
 * }} params
 * @returns {ProyeccionCarrera}
 */
export const calculateProjection = ({
    materias,
    historialSemestres,
    progresoBase = {},
    cuatriActual,
    anioActual,
    equivalenciasMap = null,
}) => {
    /** @type {Record<string, ProyeccionItem>} */
    const items = {};
    /** @type {ProyeccionSkippedItem[]} */
    const skippedItems = [];
    /** @type {Record<number, string>} */
    const labels = {};
    const materiasRestantes = [...materias];
    const materiasSet = new Set(materias.map((m) => m.codigo));

    // 1. Mapear materias ya aprobadas (Pasado)
    /** @type {Set<string>} */
    const colocadas = new Set();
    /** @type {Map<string, number>} */
    const completedColByCode = new Map();

    historialSemestres.forEach((semestre, index) => {
        const col = index + 1;
        labels[col] = `C${semestre.cuatri} ${semestre.anioActual}`;

        semestre.materiasDelSemestre.forEach((m) => {
            const st = semestre.progresoSnapshot?.[m.codigo];
            const isCompleted = st === 'Cursado' || st === 'Aprobado' || st === 'Promocionado' || st === 'Regular';

            if (isCompleted) {
                if (!completedColByCode.has(m.codigo)) {
                    completedColByCode.set(m.codigo, col);
                }
                if (materiasSet.has(m.codigo)) {
                    items[m.codigo] = {
                        columna: col,
                        estado: 'Aprobada',
                    };
                    colocadas.add(m.codigo);
                }
            } else if (
                materiasSet.has(m.codigo) &&
                semestre.progresoBaseSnapshot?.[m.codigo] !== 'Cursado' &&
                semestre.progresoBaseSnapshot?.[m.codigo] !== 'Aprobado'
            ) {
                skippedItems.push({
                    codigo: m.codigo,
                    materia: m,
                    columna: col,
                    estado: 'NoCursada',
                });
            }
        });
    });

    // Homologadas en progresoBase (ej. transición 17.13 -> 17.14): ubicarlas en el cuatrimestre real donde aprobaron su origen
    if (progresoBase) {
        const fallbackCol = historialSemestres.length === 0 ? 0 : historialSemestres.length;
        materias.forEach((m) => {
            if (colocadas.has(m.codigo)) return;
            const st = progresoBase[m.codigo];
            if (st === 'Cursado' || st === 'Aprobado' || st === 'Promocionado') {
                let targetCol = completedColByCode.get(m.codigo) ?? null;

                if (targetCol == null && equivalenciasMap) {
                    const reqs = equivalenciasMap[m.codigo];
                    if (Array.isArray(reqs) && reqs.length > 0) {
                        const sourceCols = reqs
                            .map((reqCode) => completedColByCode.get(reqCode))
                            .filter(/** @returns {c is number} */ (c) => typeof c === 'number');
                        if (sourceCols.length > 0) {
                            targetCol = Math.max(...sourceCols);
                        }
                    }
                }

                const resolvedCol = targetCol ?? fallbackCol;
                if (resolvedCol === 0 && !labels[0]) {
                    labels[0] = 'Equiv.';
                }
                items[m.codigo] = {
                    columna: resolvedCol,
                    estado: 'Aprobada',
                };
                colocadas.add(m.codigo);
            }
        });
    }

    // Si ya se completaron todas las materias del plan, no agregamos una columna vacía futura.
    if (materias.length > 0 && colocadas.size >= materias.length) {
        return {
            items,
            skippedItems,
            labels,
            maxCol: Math.max(...Object.keys(labels).map(Number), 0),
            currentCol: null,
        };
    }

    const turn = historialSemestres.length + 1;
    const currentCuatri = String(cuatriActual);
    const currentAnio = Number(anioActual);

    // 2. Procesar el Cuatrimestre Actual (Presente)
    labels[turn] = `C${currentCuatri} ${currentAnio}`;
    /** @type {Set<string>} */
    const disponiblesAhora = new Set();
    const progresoPresente = crearProgresoSintetico(materias, colocadas);

    materiasRestantes.forEach((m) => {
        if (colocadas.has(m.codigo)) return;

        const elegibilidad = evaluarElegibilidadMateria(m, progresoPresente, materias);
        const paridadCorrecta =
            esActividadFlexible(m) || Number(m.cuatrimestre) % 2 === Number(currentCuatri) % 2;

        if (elegibilidad.puedeCursar && paridadCorrecta) {
            disponiblesAhora.add(m.codigo);
            items[m.codigo] = {
                columna: turn,
                estado: 'Presente',
            };
        }
    });

    // 3. Proyectar el Futuro
    const proyectadasAprobadas = new Set([...colocadas, ...disponiblesAhora]);
    let turnFuturo = turn + 1;
    let fCuatri = currentCuatri === '1' ? '2' : '1';
    let fAnio = currentCuatri === '2' ? currentAnio + 1 : currentAnio;

    let loopSafety = 0;
    while (proyectadasAprobadas.size < materias.length && loopSafety < 50) {
        loopSafety++;
        labels[turnFuturo] = `C${fCuatri} ${fAnio}*`;
        /** @type {string[]} */
        const nuevasEnEsteTurno = [];
        const progresoTurno = crearProgresoSintetico(materias, proyectadasAprobadas);

        materiasRestantes.forEach((m) => {
            if (items[m.codigo]) return;

            const elegibilidad = evaluarElegibilidadMateria(m, progresoTurno, materias);
            const paridadCorrecta =
                esActividadFlexible(m) || Number(m.cuatrimestre) % 2 === Number(fCuatri) % 2;

            if (elegibilidad.puedeCursar && paridadCorrecta) {
                items[m.codigo] = {
                    columna: turnFuturo,
                    estado: 'Proyectada',
                };
                nuevasEnEsteTurno.push(m.codigo);
            }
        });

        nuevasEnEsteTurno.forEach((c) => proyectadasAprobadas.add(c));

        turnFuturo++;
        fCuatri = fCuatri === '1' ? '2' : '1';
        if (fCuatri === '1') fAnio++;

        if (nuevasEnEsteTurno.length === 0 && loopSafety > 20) break;
    }

    // 4. Postergadas
    materias.forEach((m) => {
        if (!items[m.codigo]) {
            items[m.codigo] = {
                columna: turnFuturo,
                estado: 'Bloqueado',
            };
            labels[turnFuturo] = 'Postergado';
        }
    });

    return {
        items,
        skippedItems,
        labels,
        maxCol: Math.max(...Object.keys(labels).map(Number), 0),
        currentCol: turn,
    };
};
