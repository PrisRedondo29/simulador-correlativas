/**
 * Utilidades para importar el progreso real del usuario al simulador.
 */

/** @typedef {import('../../types/domain').Materia} Materia */
/** @typedef {import('../../types/domain').MateriaDetalle} MateriaDetalle */
/** @typedef {import('../../types/domain').MateriaImportada} MateriaImportada */
/** @typedef {import('../../types/domain').ProgresoMap} ProgresoMap */
/** @typedef {import('../../types/domain').ProgresoDetallesMap} ProgresoDetallesMap */
/** @typedef {import('../../types/domain').ProgresoSimuladorMap} ProgresoSimuladorMap */
/** @typedef {import('../../types/domain').HistorialSemestre} HistorialSemestre */
/** @typedef {import('../../types/domain').ResultadoReconstruccionHistorial} ResultadoReconstruccionHistorial */

/**
 * Determina el cuatrimestre actual basándose en la fecha del sistema.
 * Marzo-Julio = C1, Agosto-Febrero = C2.
 * @returns {{ anio: number, cuatri: '1' | '2' }}
 */
const getCuatrimestreActual = () => {
    const now = new Date();
    const mes = now.getMonth(); // 0-indexed
    const anio = now.getFullYear();

    if (mes >= 2 && mes <= 6) {
        return { anio, cuatri: '1' };
    } else if (mes >= 7) {
        return { anio, cuatri: '2' };
    } else {
        return { anio, cuatri: '1' };
    }
};

/**
 * Reconstruye el historial de semestres basándose en el progreso real y sus detalles.
 *
 * @param {ProgresoMap | null | undefined} progresoReal - El objeto de progreso del usuario { codigo: estado }
 * @param {ProgresoDetallesMap | null | undefined} progresoDetalles - Detalles del progreso { codigo: { fechaRegularidad, intentosFinal, ... } }
 * @param {Materia[] | null | undefined} materias - Lista completa de materias del plan de estudios
 * @returns {ResultadoReconstruccionHistorial | null}
 */
export const reconstruirHistorial = (progresoReal, progresoDetalles, materias) => {
    if (!progresoReal || !materias) return null;

    const materiasCompletadas = materias.filter((m) => {
        const estado = progresoReal[m.codigo];
        return estado === 'Aprobado' || estado === 'Promocionado' || estado === 'Regular';
    });

    const materiasCursando = materias.filter((m) => progresoReal[m.codigo] === 'Cursando');

    if (materiasCompletadas.length === 0 && materiasCursando.length === 0) return null;

    const actual = getCuatrimestreActual();

    /** @type {ProgresoSimuladorMap} */
    const progresoAcumulado = {};
    materias.forEach((m) => {
        progresoAcumulado[m.codigo] = 'No Cursado';
    });

    if (materiasCompletadas.length === 0) {
        /** @type {ProgresoSimuladorMap} */
        const progresoBaseFinal = { ...progresoAcumulado };
        /** @type {ProgresoSimuladorMap} */
        const progresoFinal = { ...progresoAcumulado };
        materiasCursando.forEach((m) => {
            progresoFinal[m.codigo] = 'Cursado';
        });

        return {
            historial: [],
            progresoFinal,
            progresoBaseFinal,
            materiasCursandoCodigos: materiasCursando.map((m) => m.codigo),
            anioFinal: actual.anio,
            cuatriFinal: actual.cuatri,
        };
    }

    /** @type {MateriaImportada[]} */
    const cursadas = materiasCompletadas.map((m) => {
        /** @type {MateriaDetalle} */
        const detalles = progresoDetalles?.[m.codigo] || {};

        /** @type {number | null} */
        let anio = null;
        /** @type {string | null} */
        let cuatri = null;

        const fechaReg = detalles.fechaRegularidad;
        if (fechaReg && typeof fechaReg === 'object' && fechaReg.anio) {
            anio = fechaReg.anio;
            cuatri = String(fechaReg.cuatrimestre || '1');
        } else if (typeof fechaReg === 'string' && fechaReg.includes('-')) {
            const [year, month] = fechaReg.split('-').map(Number);
            if (!Number.isNaN(year) && !Number.isNaN(month)) {
                anio = year;
                cuatri = month <= 6 ? '1' : '2';
            }
        } else if (detalles.intentosFinal?.length) {
            const aprobado = detalles.intentosFinal.find((i) => i.estado === 'aprobado' && i.fecha);
            if (aprobado?.fecha) {
                const fecha = new Date(aprobado.fecha);
                if (!Number.isNaN(fecha.getTime())) {
                    const mes = fecha.getMonth();
                    anio = fecha.getFullYear();
                    cuatri = mes >= 2 && mes <= 7 ? '1' : '2';
                    if (mes <= 1) {
                        anio -= 1;
                        cuatri = '2';
                    }
                }
            }
        } else {
            const fechaStr = detalles.fechaRegularizacion || detalles.fechaAprobacion;
            if (fechaStr) {
                const fecha = new Date(fechaStr);
                if (!Number.isNaN(fecha.getTime())) {
                    const mes = fecha.getMonth();
                    anio = fecha.getFullYear();
                    cuatri = mes >= 2 && mes <= 7 ? '1' : '2';
                    if (mes <= 1) {
                        anio -= 1;
                        cuatri = '2';
                    }
                }
            }
        }

        return {
            ...m,
            anioReal: anio,
            cuatriReal: cuatri,
            anioPlan: Number(m.anio) || 1,
            cuatriPlan: Number(m.cuatrimestre) % 2 === 0 ? '2' : '1',
            esAproximado: false,
        };
    });

    const aniosRegistrados = cursadas
        .map((c) => c.anioReal)
        .filter(/** @returns {a is number} */ (a) => typeof a === 'number');
    const primerAnioReal = aniosRegistrados.length > 0 ? Math.min(...aniosRegistrados) : new Date().getFullYear() - 2;

    cursadas.forEach((c) => {
        if (!c.anioReal) {
            c.anioReal = primerAnioReal + (c.anioPlan - 1);
            c.cuatriReal = c.cuatriPlan;
            c.esAproximado = true;
        }
    });

    /** @type {Record<string, { anioActual: number, cuatri: string, materiasDelSemestre: MateriaImportada[] }>} */
    const semestresMap = {};
    cursadas.forEach((c) => {
        const anioItem = c.anioReal ?? primerAnioReal;
        const cuatriItem = c.cuatriReal ?? c.cuatriPlan;
        const key = `${anioItem}-${cuatriItem}`;
        if (!semestresMap[key]) {
            semestresMap[key] = {
                anioActual: anioItem,
                cuatri: cuatriItem,
                materiasDelSemestre: [],
            };
        }
        semestresMap[key].materiasDelSemestre.push(c);
    });

    const llavesOrdenadas = Object.keys(semestresMap).sort((a, b) => {
        const [anioA, cuatriA] = a.split('-').map(Number);
        const [anioB, cuatriB] = b.split('-').map(Number);
        if (anioA !== anioB) return anioA - anioB;
        return cuatriA - cuatriB;
    });

    /** @type {HistorialSemestre[]} */
    const historial = [];

    llavesOrdenadas.forEach((key) => {
        const semestre = semestresMap[key];
        const progresoBaseSnapshot = { ...progresoAcumulado };

        semestre.materiasDelSemestre.forEach((m) => {
            progresoAcumulado[m.codigo] = 'Cursado';
        });

        historial.push({
            anioActual: semestre.anioActual,
            cuatri: semestre.cuatri,
            materiasDelSemestre: semestre.materiasDelSemestre,
            progresoSnapshot: { ...progresoAcumulado },
            progresoBaseSnapshot,
            esImportado: true,
        });
    });

    const ultimoSemestre = historial[historial.length - 1];

    let anioFinal;
    let cuatriFinal;

    let siguienteAnio = ultimoSemestre.anioActual;
    let siguienteCuatri = ultimoSemestre.cuatri === '1' ? '2' : '1';
    if (ultimoSemestre.cuatri === '2') siguienteAnio += 1;

    const siguienteEsPasado =
        siguienteAnio < actual.anio ||
        (siguienteAnio === actual.anio && Number(siguienteCuatri) < Number(actual.cuatri));

    if (siguienteEsPasado) {
        let fillAnio = siguienteAnio;
        let fillCuatri = siguienteCuatri;

        while (fillAnio < actual.anio || (fillAnio === actual.anio && Number(fillCuatri) < Number(actual.cuatri))) {
            historial.push({
                anioActual: fillAnio,
                cuatri: fillCuatri,
                materiasDelSemestre: [],
                progresoSnapshot: { ...progresoAcumulado },
                progresoBaseSnapshot: { ...progresoAcumulado },
                esImportado: true,
                esVacio: true,
            });

            if (fillCuatri === '1') {
                fillCuatri = '2';
            } else {
                fillCuatri = '1';
                fillAnio += 1;
            }
        }

        anioFinal = actual.anio;
        cuatriFinal = actual.cuatri;
    } else if (materiasCursando.length > 0) {
        anioFinal = actual.anio;
        cuatriFinal = actual.cuatri;
    } else {
        anioFinal = siguienteAnio;
        cuatriFinal = siguienteCuatri;
    }

    /** @type {ProgresoSimuladorMap} */
    const progresoBaseFinal = { ...progresoAcumulado };
    /** @type {ProgresoSimuladorMap} */
    const progresoFinal = { ...progresoAcumulado };
    materiasCursando.forEach((m) => {
        progresoFinal[m.codigo] = 'Cursado';
    });

    return {
        historial,
        progresoFinal,
        progresoBaseFinal,
        materiasCursandoCodigos: materiasCursando.map((m) => m.codigo),
        anioFinal,
        cuatriFinal,
    };
};

export default {
    reconstruirHistorial,
};
