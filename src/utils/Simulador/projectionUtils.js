/**
 * projectionUtils.js
 * Lógica para calcular la proyección dinámica de la carrera.
 */

/** @typedef {import('../../types/domain').Materia} Materia */
/** @typedef {import('../../types/domain').HistorialSemestre} HistorialSemestre */
/** @typedef {import('../../types/domain').ProgresoSimuladorMap} ProgresoSimuladorMap */
/** @typedef {import('../../types/domain').ProyeccionCarrera} ProyeccionCarrera */
/** @typedef {import('../../types/domain').ProyeccionItem} ProyeccionItem */
/** @typedef {import('../../types/domain').ProyeccionSkippedItem} ProyeccionSkippedItem */

/**
 * Calcula la proyección temporal de cursadas pasadas, presentes y futuras.
 * @param {{
 *   materias: Materia[],
 *   historialSemestres: HistorialSemestre[],
 *   progresoBase?: ProgresoSimuladorMap,
 *   cuatriActual: string | number,
 *   anioActual: string | number,
 * }} params
 * @returns {ProyeccionCarrera}
 */
export const calculateProjection = ({
    materias,
    historialSemestres,
    cuatriActual,
    anioActual,
}) => {
    /** @type {Record<string, ProyeccionItem>} */
    const items = {};
    /** @type {ProyeccionSkippedItem[]} */
    const skippedItems = [];
    /** @type {Record<number, string>} */
    const labels = {};
    const materiasRestantes = [...materias];

    // 1. Mapear materias ya aprobadas (Pasado)
    /** @type {Set<string>} */
    const colocadas = new Set();
    historialSemestres.forEach((semestre, index) => {
        const col = index + 1;
        labels[col] = `C${semestre.cuatri} ${semestre.anioActual}`;

        semestre.materiasDelSemestre.forEach((m) => {
            const st = semestre.progresoSnapshot?.[m.codigo];
            const isCompleted = st === 'Cursado' || st === 'Aprobado' || st === 'Promocionado' || st === 'Regular';

            if (isCompleted) {
                items[m.codigo] = {
                    columna: col,
                    estado: 'Aprobada',
                };
                colocadas.add(m.codigo);
            } else if (
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

    const turn = historialSemestres.length + 1;
    const currentCuatri = String(cuatriActual);
    const currentAnio = Number(anioActual);

    // 2. Procesar el Cuatrimestre Actual (Presente)
    labels[turn] = `C${currentCuatri} ${currentAnio}`;
    /** @type {Set<string>} */
    const disponiblesAhora = new Set();

    materiasRestantes.forEach((m) => {
        if (colocadas.has(m.codigo)) return;

        const correlativasCumplidas = (m.correlativas || []).every((c) => colocadas.has(c));
        const paridadCorrecta = Number(m.cuatrimestre) % 2 === Number(currentCuatri) % 2;

        let cumpleTesina = true;
        if (m.tesis) {
            const otrasPendientes = materias.some((mat) => !mat.tesis && !colocadas.has(mat.codigo));
            if (otrasPendientes) cumpleTesina = false;
        }

        if (correlativasCumplidas && paridadCorrecta && cumpleTesina) {
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

        materiasRestantes.forEach((m) => {
            if (items[m.codigo]) return;

            const correlativasCumplidas = (m.correlativas || []).every((c) => proyectadasAprobadas.has(c));
            const paridadCorrecta = Number(m.cuatrimestre) % 2 === Number(fCuatri) % 2;

            let cumpleTesina = true;
            if (m.tesis) {
                const otrasPendientes = materias.some((mat) => !mat.tesis && !proyectadasAprobadas.has(mat.codigo));
                if (otrasPendientes) cumpleTesina = false;
            }

            if (correlativasCumplidas && paridadCorrecta && cumpleTesina) {
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

    return { items, skippedItems, labels, maxCol: Math.max(...Object.keys(labels).map(Number), 0) };
};
