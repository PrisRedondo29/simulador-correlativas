/**
 * Motor puro de cálculo para la sección de Estadísticas Académicas (`/estadisticas`).
 * Consolida histograma de notas, rendimiento cronológico por cuatrimestre,
 * radiografía de finales/modalidades y avance por año curricular.
 */

import regularidadUtils from '../Progreso/regularidadUtils';

/** @typedef {import('../../types/domain').Materia} Materia */
/** @typedef {import('../../types/domain').MateriaDetalle} MateriaDetalle */
/** @typedef {import('../../types/domain').IntentoFinal} IntentoFinal */
/** @typedef {import('../../types/domain').EstadoMateria} EstadoMateria */
/** @typedef {import('../../types/domain').ProgresoMap} ProgresoMap */
/** @typedef {import('../../types/domain').ProgresoDetallesMap} ProgresoDetallesMap */

/**
 * Trunca a dos decimales siguiendo el criterio oficial SAWeb UNLu.
 * @param {number} valor
 * @returns {number}
 */
function truncarCentesimos(valor) {
    return Math.trunc((valor + 1e-9) * 100) / 100;
}

/**
 * Extrae todos los intentos finales (históricos + actuales) de una materia sin mutar detalles.
 * @param {MateriaDetalle | null | undefined} detalles
 * @returns {IntentoFinal[]}
 */
function collectAllIntentos(detalles) {
    /** @type {IntentoFinal[]} */
    const intentos = [];
    if (!detalles) return intentos;
    if (Array.isArray(detalles.historial)) {
        detalles.historial.forEach((cursada) => {
            if (Array.isArray(cursada?.intentosFinal)) {
                intentos.push(...cursada.intentosFinal);
            }
        });
    }
    if (Array.isArray(detalles.intentosFinal)) {
        intentos.push(...detalles.intentosFinal);
    }
    return intentos;
}

/**
 * Infere año lectivo y cuatrimestre (1 o 2) a partir de una fecha ISO (`YYYY-MM-DD` o `YYYY-MM`).
 * Las mesas de enero/febrero (mes 1..2) se atribuyen al 2° cuatrimestre del año anterior.
 * @param {string | null | undefined} fechaStr
 * @returns {{ anio: number, cuatri: 1 | 2 } | null}
 */
export function inferirPeriodoDesdeFechaIso(fechaStr) {
    if (typeof fechaStr !== 'string') return null;
    const match = fechaStr.trim().match(/^(\d{4})-(\d{1,2})/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) return null;

    if (month <= 2) {
        return { anio: year - 1, cuatri: 2 };
    }
    if (month <= 8) {
        return { anio: year, cuatri: 1 };
    }
    return { anio: year, cuatri: 2 };
}

/**
 * Infere el período académico en que el estudiante completó o rindió una materia.
 * Prioriza fecha de aprobación / intento aprobado, luego fecha de regularidad y finalmente año de examen.
 * @param {Materia | null | undefined} materia
 * @param {EstadoMateria | string | null | undefined} _estado
 * @param {MateriaDetalle | null | undefined} detalles
 * @returns {{ anio: number, cuatri: 1 | 2 } | null}
 */
export function inferirPeriodoMateria(materia, _estado, detalles) {
    if (!detalles) return null;

    if (detalles.fechaAprobacion) {
        const parsed = inferirPeriodoDesdeFechaIso(detalles.fechaAprobacion);
        if (parsed) return parsed;
    }

    const intentos = collectAllIntentos(detalles);
    const intentoAprobado = [...intentos]
        .reverse()
        .find((i) => i?.estado === 'aprobado' && typeof i.fecha === 'string' && i.fecha.length > 0);
    if (intentoAprobado?.fecha) {
        const parsed = inferirPeriodoDesdeFechaIso(intentoAprobado.fecha);
        if (parsed) return parsed;
    }

    const fechaReg = detalles.fechaRegularidad;
    if (fechaReg && typeof fechaReg === 'object' && typeof fechaReg.anio === 'number') {
        return {
            anio: Number(fechaReg.anio),
            cuatri: Number(fechaReg.cuatrimestre) === 2 ? 2 : 1,
        };
    }
    if (typeof fechaReg === 'string') {
        const match = fechaReg.trim().match(/^(\d{4})-(\d{1,2})/);
        if (match) {
            const year = Number(match[1]);
            const month = Number(match[2]);
            if (!Number.isNaN(year) && !Number.isNaN(month)) {
                return { anio: year, cuatri: month <= 6 ? 1 : 2 };
            }
        }
    }

    if (detalles.anioExamen != null && !Number.isNaN(Number(detalles.anioExamen))) {
        return {
            anio: Number(detalles.anioExamen),
            cuatri: Number(materia?.cuatrimestre) % 2 === 0 ? 2 : 1,
        };
    }

    return null;
}

/**
 * Construye una vista del histograma para el rango de notas indicado (`[4..10]` o `[1..10]`).
 * @param {Array<{ codigo: string, nombre: string, nota: number, modalidad: 'Promoción' | 'Final Regular' | 'Final Libre' | 'Aplazo', fecha: string | null }>} registros
 * @param {number[]} rangoNotas
 */
function buildHistogramaVista(registros, rangoNotas) {
    const bins = rangoNotas.map((nota) => ({
        nota,
        total: 0,
        promocion: 0,
        finalRegular: 0,
        finalLibre: 0,
        aplazo: 0,
        /** @type {Array<{ codigo: string, nombre: string, nota: number, modalidad: string, fecha: string | null }>} */
        materias: [],
    }));

    const binByNota = new Map(bins.map((b) => [b.nota, b]));

    registros.forEach((reg) => {
        const bucket = Math.min(10, Math.max(1, Math.round(reg.nota)));
        const bin = binByNota.get(bucket);
        if (!bin) return;
        bin.total += 1;
        if (reg.modalidad === 'Promoción') bin.promocion += 1;
        else if (reg.modalidad === 'Final Regular') bin.finalRegular += 1;
        else if (reg.modalidad === 'Final Libre') bin.finalLibre += 1;
        else if (reg.modalidad === 'Aplazo') bin.aplazo += 1;
        bin.materias.push(reg);
    });

    const maxCount = bins.reduce((max, b) => Math.max(max, b.total), 0);
    const totalActas = bins.reduce((sum, b) => sum + b.total, 0);

    /** @type {{ nota: number, count: number } | null} */
    let moda = null;
    if (totalActas > 0) {
        bins.forEach((b) => {
            if (b.total <= 0) return;
            if (!moda || b.total > moda.count || (b.total === moda.count && b.nota >= moda.nota)) {
                moda = { nota: b.nota, count: b.total };
            }
        });
    }

    return {
        bins,
        maxCount,
        totalActas,
        moda,
    };
}

/**
 * Calcula todos los bloques estadísticos del dashboard `/estadisticas`.
 *
 * @param {{
 *   materias?: Materia[],
 *   progreso?: ProgresoMap,
 *   progresoDetalles?: ProgresoDetallesMap,
 * }} [params]
 */
export function calcularEstadisticasAcademicas({
    materias = [],
    progreso = {},
    progresoDetalles = {},
} = {}) {
    const listaMaterias = Array.isArray(materias) ? materias : [];
    const safeProgreso = progreso || {};
    const safeDetalles = progresoDetalles || {};

    /** @type {Array<{ codigo: string, nombre: string, nota: number, modalidad: 'Promoción' | 'Final Regular' | 'Final Libre' | 'Aplazo', fecha: string | null }>} */
    const registrosNotas = [];

    /** @type {Map<string, {
     *   anio: number,
     *   cuatri: 1 | 2,
     *   materiasCount: number,
     *   horasCount: number,
     *   materias: Array<{ codigo: string, nombre: string, nota: number | null, modalidad: string, horas: number }>,
     *   sumaNotasAprobadas: number,
     *   cantNotasAprobadas: number,
     *   sumaNotasTodas: number,
     *   cantNotasTodas: number,
     * }>} */
    const periodosMap = new Map();

    /**
     * @param {{ anio: number, cuatri: 1 | 2 }} periodo
     */
    const ensurePeriodoBucket = (periodo) => {
        const key = `${periodo.anio}-${periodo.cuatri}`;
        const existing = periodosMap.get(key);
        if (existing) return existing;
        const created = {
            anio: periodo.anio,
            cuatri: periodo.cuatri,
            materiasCount: 0,
            horasCount: 0,
            materias: [],
            sumaNotasAprobadas: 0,
            cantNotasAprobadas: 0,
            sumaNotasTodas: 0,
            cantNotasTodas: 0,
        };
        periodosMap.set(key, created);
        return created;
    };

    let aprobadasCount = 0;
    let regularesCount = 0;
    let promocionCount = 0;
    let finalRegularCount = 0;
    let finalLibreCount = 0;
    let equivalenciaCount = 0;

    let aplazosTotales = 0;
    let ausentesTotales = 0;
    let aprobadasPrimerIntento = 0;
    let aprobadasConReintento = 0;
    let sumaIntentosEnFinalesAprobados = 0;
    let sinFechaCount = 0;

    /** @type {Array<{
     *   codigo: string,
     *   nombre: string,
     *   nombreBase: string,
     *   optativaNombre: string | null,
     *   anio: number | null,
     *   cuatrimestre: number | null,
     *   taller: boolean,
     *   horas: number,
     *   estado: string,
     *   esAprobada: boolean,
     *   esRegular: boolean,
     *   esCursando: boolean,
     *   esPendiente: boolean,
     *   modalidad: 'Promoción' | 'Final Regular' | 'Final Libre' | 'Equivalencia' | 'Cursada' | 'En Curso' | 'Pendiente',
     *   nota: number | null,
     *   fecha: string | null,
     *   periodo: { anio: number, cuatri: 1 | 2, label: string } | null,
     *   aplazosCount: number,
     *   ausentesCount: number,
     *   intentosFinalCount: number,
     * }>} */
    const listadoDesagregado = [];

    listaMaterias.forEach((materia) => {
        const codigo = materia.codigo;
        const estado = safeProgreso[codigo];
        const detalles = safeDetalles[codigo];
        const displayNombre = detalles?.nombreOptativa
            ? `${materia.nombre}: ${detalles.nombreOptativa}`
            : materia.nombre;

        const intentos = collectAllIntentos(detalles);
        const reprobadosMateria = intentos.filter((i) => i?.estado === 'reprobado');
        const ausentesMateria = intentos.filter((i) => i?.estado === 'ausente');
        const intentoAprobado = [...intentos]
            .reverse()
            .find((i) => i?.estado === 'aprobado' && i.nota != null);

        aplazosTotales += reprobadosMateria.length;
        ausentesTotales += ausentesMateria.length;

        reprobadosMateria.forEach((intento) => {
            if (intento.nota == null) return;
            const notaNum = Number(intento.nota);
            if (!Number.isFinite(notaNum) || notaNum < 1 || notaNum > 10) return;

            registrosNotas.push({
                codigo,
                nombre: displayNombre,
                nota: notaNum,
                modalidad: 'Aplazo',
                fecha: intento.fecha || null,
            });

            const periodoAplazo = inferirPeriodoDesdeFechaIso(intento.fecha);
            if (periodoAplazo) {
                const bucket = ensurePeriodoBucket(periodoAplazo);
                bucket.sumaNotasTodas += notaNum;
                bucket.cantNotasTodas += 1;
            }
        });

        if (estado === 'Regular') {
            regularesCount += 1;
        }

        const esAprobada = estado === 'Promocionado' || estado === 'Aprobado';
        const rawNotaAprobada =
            intentoAprobado?.nota ??
            detalles?.notaFinal ??
            (estado === 'Promocionado' ? detalles?.notaRegularizacion : null);
        const notaAprobada =
            rawNotaAprobada != null &&
            Number.isFinite(Number(rawNotaAprobada)) &&
            Number(rawNotaAprobada) >= 1 &&
            Number(rawNotaAprobada) <= 10
                ? Number(rawNotaAprobada)
                : null;

        // Modalidad completa para listado desagregado
        /** @type {'Promoción' | 'Final Regular' | 'Final Libre' | 'Equivalencia' | 'Cursada' | 'En Curso' | 'Pendiente'} */
        let modalidadCompleta = 'Pendiente';
        if (estado === 'Promocionado') {
            modalidadCompleta = 'Promoción';
        } else if (estado === 'Aprobado') {
            if (detalles?.esEquivalencia) {
                modalidadCompleta = 'Equivalencia';
            } else if (detalles?.rendidaLibre) {
                modalidadCompleta = 'Final Libre';
            } else {
                modalidadCompleta = 'Final Regular';
            }
        } else if (estado === 'Regular') {
            modalidadCompleta = 'Cursada';
        } else if (estado === 'Cursando') {
            modalidadCompleta = 'En Curso';
        }

        /** @type {string | null} */
        let fechaRegistro = null;
        if (detalles?.fechaAprobacion) {
            fechaRegistro = detalles.fechaAprobacion;
        } else if (intentoAprobado?.fecha) {
            fechaRegistro = intentoAprobado.fecha;
        } else if (detalles?.fechaRegularidad) {
            if (typeof detalles.fechaRegularidad === 'object' && detalles.fechaRegularidad.anio) {
                fechaRegistro = `${detalles.fechaRegularidad.anio}-${String(detalles.fechaRegularidad.cuatrimestre || 1).padStart(2, '0')}`;
            } else if (typeof detalles.fechaRegularidad === 'string') {
                fechaRegistro = detalles.fechaRegularidad;
            }
        }

        const periodoMateria = inferirPeriodoMateria(materia, estado, detalles);

        listadoDesagregado.push({
            codigo,
            nombre: displayNombre,
            nombreBase: materia.nombre,
            optativaNombre: detalles?.nombreOptativa || null,
            anio: materia.anio != null ? Number(materia.anio) : null,
            cuatrimestre: materia.cuatrimestre != null ? Number(materia.cuatrimestre) : null,
            taller: Boolean(materia.taller),
            horas: Number(materia.horas_totales) || 0,
            estado: estado || 'Pendiente',
            esAprobada,
            esRegular: estado === 'Regular',
            esCursando: estado === 'Cursando',
            esPendiente: !esAprobada && estado !== 'Regular' && estado !== 'Cursando',
            modalidad: modalidadCompleta,
            nota: esAprobada
                ? notaAprobada
                : detalles?.notaRegularizacion != null && !Number.isNaN(Number(detalles.notaRegularizacion))
                  ? Number(detalles.notaRegularizacion)
                  : null,
            fecha: fechaRegistro,
            periodo: periodoMateria
                ? {
                      anio: periodoMateria.anio,
                      cuatri: periodoMateria.cuatri,
                      label: `${periodoMateria.cuatri}°C ${periodoMateria.anio}`,
                  }
                : null,
            aplazosCount: reprobadosMateria.length,
            ausentesCount: ausentesMateria.length,
            intentosFinalCount: intentos.length,
        });

        if (!esAprobada) return;

        aprobadasCount += 1;

        /** @type {'Promoción' | 'Final Regular' | 'Final Libre' | 'Equivalencia'} */
        let modalidadResumen = 'Final Regular';
        if (estado === 'Promocionado') {
            promocionCount += 1;
            modalidadResumen = 'Promoción';
        } else if (detalles?.esEquivalencia) {
            equivalenciaCount += 1;
            modalidadResumen = 'Equivalencia';
        } else if (detalles?.rendidaLibre) {
            finalLibreCount += 1;
            modalidadResumen = 'Final Libre';
            if (reprobadosMateria.length === 0) aprobadasPrimerIntento += 1;
            else aprobadasConReintento += 1;
            sumaIntentosEnFinalesAprobados += 1 + reprobadosMateria.length;
        } else {
            finalRegularCount += 1;
            modalidadResumen = 'Final Regular';
            if (reprobadosMateria.length === 0) aprobadasPrimerIntento += 1;
            else aprobadasConReintento += 1;
            sumaIntentosEnFinalesAprobados += 1 + reprobadosMateria.length;
        }

        if (notaAprobada !== null) {
            /** @type {'Promoción' | 'Final Regular' | 'Final Libre'} */
            const modalidadHistograma =
                estado === 'Promocionado'
                    ? 'Promoción'
                    : detalles?.rendidaLibre
                      ? 'Final Libre'
                      : 'Final Regular';

            registrosNotas.push({
                codigo,
                nombre: displayNombre,
                nota: notaAprobada,
                modalidad: modalidadHistograma,
                fecha: detalles?.fechaAprobacion || intentoAprobado?.fecha || null,
            });
        }

        if (periodoMateria) {
            const bucket = ensurePeriodoBucket(periodoMateria);
            const horas = Number(materia.horas_totales) || 0;
            bucket.materiasCount += 1;
            bucket.horasCount += horas;
            bucket.materias.push({
                codigo,
                nombre: displayNombre,
                nota: notaAprobada,
                modalidad: modalidadResumen,
                horas,
            });
            if (notaAprobada !== null) {
                bucket.sumaNotasAprobadas += notaAprobada;
                bucket.cantNotasAprobadas += 1;
                bucket.sumaNotasTodas += notaAprobada;
                bucket.cantNotasTodas += 1;
            }
        } else {
            sinFechaCount += 1;
        }
    });

    // Bloque 1: Histograma de Notas
    const soloAprobadasRegistros = registrosNotas.filter(
        (r) => r.modalidad !== 'Aplazo' && r.nota >= 4 && r.nota <= 10,
    );
    const histograma = {
        sinAplazos: buildHistogramaVista(soloAprobadasRegistros, [4, 5, 6, 7, 8, 9, 10]),
        conAplazos: buildHistogramaVista(registrosNotas, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    };

    // Bloque 2: Rendimiento cronológico por cuatrimestre
    const bucketsOrdenados = Array.from(periodosMap.values()).sort(
        (a, b) => a.anio - b.anio || a.cuatri - b.cuatri,
    );

    let acumSumaAprobadas = 0;
    let acumCantAprobadas = 0;
    let acumSumaTodas = 0;
    let acumCantTodas = 0;
    /** @type {number | null} */
    let ultimoAcumSinAplazos = null;
    /** @type {number | null} */
    let ultimoAcumConAplazos = null;

    const itemsCuatrimestres = bucketsOrdenados.map((b) => {
        acumSumaAprobadas += b.sumaNotasAprobadas;
        acumCantAprobadas += b.cantNotasAprobadas;
        acumSumaTodas += b.sumaNotasTodas;
        acumCantTodas += b.cantNotasTodas;

        const promedioCuatriSinAplazos =
            b.cantNotasAprobadas > 0
                ? truncarCentesimos(b.sumaNotasAprobadas / b.cantNotasAprobadas)
                : null;
        const promedioAcumuladoSinAplazos =
            acumCantAprobadas > 0
                ? truncarCentesimos(acumSumaAprobadas / acumCantAprobadas)
                : ultimoAcumSinAplazos;
        ultimoAcumSinAplazos = promedioAcumuladoSinAplazos;

        const promedioCuatriConAplazos =
            b.cantNotasTodas > 0 ? truncarCentesimos(b.sumaNotasTodas / b.cantNotasTodas) : null;
        const promedioAcumuladoConAplazos =
            acumCantTodas > 0
                ? truncarCentesimos(acumSumaTodas / acumCantTodas)
                : ultimoAcumConAplazos;
        ultimoAcumConAplazos = promedioAcumuladoConAplazos;

        return {
            key: `${b.anio}-C${b.cuatri}`,
            anio: b.anio,
            cuatri: b.cuatri,
            label: `${b.cuatri}°C ${b.anio}`,
            shortLabel: `${b.cuatri}°C '${String(b.anio).slice(-2)}`,
            materiasCount: b.materiasCount,
            horasCount: b.horasCount,
            materias: b.materias,
            promedioCuatriSinAplazos,
            promedioAcumuladoSinAplazos,
            promedioCuatriConAplazos,
            promedioAcumuladoConAplazos,
        };
    });

    const cuatrimestresConMaterias = itemsCuatrimestres.filter((item) => item.materiasCount > 0);
    const totalMateriasConPeriodo = cuatrimestresConMaterias.reduce(
        (sum, item) => sum + item.materiasCount,
        0,
    );
    const totalHorasConPeriodo = cuatrimestresConMaterias.reduce(
        (sum, item) => sum + item.horasCount,
        0,
    );

    const ritmoPromedioMaterias =
        cuatrimestresConMaterias.length > 0
            ? Math.round((totalMateriasConPeriodo / cuatrimestresConMaterias.length) * 10) / 10
            : 0;
    const ritmoPromedioHoras =
        cuatrimestresConMaterias.length > 0
            ? Math.round(totalHorasConPeriodo / cuatrimestresConMaterias.length)
            : 0;

    /** @type {(typeof itemsCuatrimestres)[number] | null} */
    let mejorCuatrimestre = null;
    cuatrimestresConMaterias.forEach((item) => {
        if (
            !mejorCuatrimestre ||
            item.materiasCount > mejorCuatrimestre.materiasCount ||
            (item.materiasCount === mejorCuatrimestre.materiasCount &&
                item.horasCount > mejorCuatrimestre.horasCount)
        ) {
            mejorCuatrimestre = item;
        }
    });

    const maxMateriasCuatri = itemsCuatrimestres.reduce(
        (max, item) => Math.max(max, item.materiasCount),
        0,
    );
    const maxHorasCuatri = itemsCuatrimestres.reduce(
        (max, item) => Math.max(max, item.horasCount),
        0,
    );

    const cuatrimestres = {
        items: itemsCuatrimestres,
        cuatrimestresConMateriasCount: cuatrimestresConMaterias.length,
        ritmoPromedioMaterias,
        ritmoPromedioHoras,
        mejorCuatrimestre,
        maxMateriasCuatri,
        maxHorasCuatri,
        sinFechaCount,
    };

    // Bloque 3: Finales y Modalidades
    const toPct = (count) => (aprobadasCount > 0 ? Math.round((count * 100) / aprobadasCount) : 0);
    const finalesAprobados = finalRegularCount + finalLibreCount;
    const totalRendiciones = finalesAprobados + aplazosTotales;

    const modalidadesYFinales = {
        modalidades: {
            promocion: { count: promocionCount, porcentaje: toPct(promocionCount) },
            finalRegular: { count: finalRegularCount, porcentaje: toPct(finalRegularCount) },
            finalLibre: { count: finalLibreCount, porcentaje: toPct(finalLibreCount) },
            equivalencia: { count: equivalenciaCount, porcentaje: toPct(equivalenciaCount) },
        },
        finales: {
            finalesAprobados,
            aplazosTotales,
            ausentesTotales,
            totalRendiciones,
            tasaEfectividad:
                totalRendiciones > 0 ? Math.round((finalesAprobados * 100) / totalRendiciones) : null,
            aprobadasPrimerIntento,
            aprobadasConReintento,
            promedioIntentosPorFinal:
                finalesAprobados > 0
                    ? Math.round((sumaIntentosEnFinalesAprobados / finalesAprobados) * 100) / 100
                    : null,
        },
    };

    // Bloque 4: Avance por Año del Plan + Talleres
    const nonTalleres = listaMaterias.filter((m) => !m.taller);
    const aniosUnicos = [...new Set(nonTalleres.map((m) => Number(m.anio)))]
        .filter((n) => !Number.isNaN(n))
        .sort((a, b) => a - b);

    /**
     * @param {string} key
     * @param {string} label
     * @param {Materia[]} groupMaterias
     */
    const buildAnioGroup = (key, label, groupMaterias) => {
        const total = groupMaterias.length;
        const aprobadas = groupMaterias.filter(
            (m) => safeProgreso[m.codigo] === 'Aprobado' || safeProgreso[m.codigo] === 'Promocionado',
        ).length;
        const regulares = groupMaterias.filter(
            (m) => safeProgreso[m.codigo] === 'Regular' || safeProgreso[m.codigo] === 'Cursando',
        ).length;
        const pendientes = Math.max(0, total - aprobadas - regulares);
        const horasTotales = groupMaterias.reduce((acc, m) => acc + (Number(m.horas_totales) || 0), 0);
        const horasAprobadas = groupMaterias.reduce((acc, m) => {
            const st = safeProgreso[m.codigo];
            if (st === 'Aprobado' || st === 'Promocionado') {
                return acc + (Number(m.horas_totales) || 0);
            }
            return acc;
        }, 0);

        return {
            key,
            label,
            total,
            aprobadas,
            regulares,
            pendientes,
            porcentajeAprobado: total > 0 ? Math.round((aprobadas * 100) / total) : 0,
            porcentajeRegular: total > 0 ? Math.round((regulares * 100) / total) : 0,
            horasAprobadas,
            horasTotales,
            completado: total > 0 && aprobadas === total,
        };
    };

    const avancePorAnio = aniosUnicos
        .map((anio) => {
            const list = nonTalleres.filter((m) => Number(m.anio) === anio);
            const label = anio >= 6 ? 'Tramo Final' : `${anio}° Año`;
            return buildAnioGroup(String(anio), label, list);
        })
        .filter((g) => g.total > 0);

    const talleres = listaMaterias.filter((m) => m.taller === true);
    if (talleres.length > 0) {
        avancePorAnio.push(buildAnioGroup('talleres', 'Talleres', talleres));
    }

    const totalMaterias = listaMaterias.length;
    const porcentajeCarrera =
        totalMaterias > 0 ? Math.round((aprobadasCount * 100) / totalMaterias) : 0;
    const promedios = regularidadUtils.calcularPromedioGeneral(safeDetalles, safeProgreso);

    const resumen = {
        tieneDatos:
            aprobadasCount > 0 || regularesCount > 0 || histograma.conAplazos.totalActas > 0,
        aprobadasCount,
        regularesCount,
        totalMaterias,
        porcentajeCarrera,
        promedios,
    };

    return {
        resumen,
        histograma,
        cuatrimestres,
        modalidadesYFinales,
        avancePorAnio,
        listadoDesagregado,
    };
}

export default calcularEstadisticasAcademicas;
