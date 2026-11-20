import { DEFAULT_UNLU_ACADEMIC_RULES, getActiveTenantConfig } from '../../config/tenantConfig';

/** @typedef {import('../../types/domain').EstadoMateria} EstadoMateria */
/** @typedef {import('../../types/domain').FechaRegularidad} FechaRegularidad */
/** @typedef {import('../../types/domain').IntentoFinal} IntentoFinal */
/** @typedef {import('../../types/domain').ProgresoMap} ProgresoMap */
/** @typedef {import('../../types/domain').ProgresoDetallesMap} ProgresoDetallesMap */
/** @typedef {import('../../types/domain').PlanificacionRegularidad} PlanificacionRegularidad */
/** @typedef {import('../../types/domain').ResumenPromedio} ResumenPromedio */
/** @typedef {import('../../types/domain').AcademicRulesConfig} AcademicRulesConfig */

/**
 * Resuelve las reglas académicas efectivas (permitiendo inyectar reglas de otra institución).
 * @param {Partial<AcademicRulesConfig> | null | undefined} [rulesOverride]
 * @returns {AcademicRulesConfig}
 */
function resolveAcademicRules(rulesOverride) {
    const base = getActiveTenantConfig()?.academicRules || DEFAULT_UNLU_ACADEMIC_RULES;
    if (!rulesOverride) return base;
    return {
        ...base,
        ...rulesOverride,
    };
}

/**
 * Cuenta cuántos llamados de final consumieron intento según la política institucional
 * (`ausenteDescuentaIntento: false` en UNLu vs `true` en otras universidades).
 * @param {IntentoFinal[] | null | undefined} intentosFinal
 * @param {AcademicRulesConfig} rules
 * @returns {number}
 */
function contarIntentosConsumidos(intentosFinal, rules) {
    if (!intentosFinal || !Array.isArray(intentosFinal)) return 0;
    return intentosFinal.filter((i) => {
        if (i.estado === 'reprobado') return true;
        if (rules.ausenteDescuentaIntento && i.estado === 'ausente') return true;
        return false;
    }).length;
}

/**
 * Convierte {anio, cuatrimestre} a número de cuatrimestres desde el inicio de los tiempos.
 * Usado internamente para comparar distancias.
 * @param {number} anio
 * @param {number} cuatrimestre
 * @returns {number}
 */
function toCuatriIndex(anio, cuatrimestre) {
    return anio * 2 + cuatrimestre;
}

/**
 * Calcula cuántos cuatrimestres han pasado desde la fecha de regularidad hasta hoy.
 * @param {FechaRegularidad | null | undefined} fechaRegularidad
 * @returns {number}
 */
function getCuatrimestresTranscurridos(fechaRegularidad) {
    if (!fechaRegularidad) return 0;

    let anioReg;
    let cuatriReg;

    // Soportar el viejo formato "YYYY-MM" y el nuevo { anio, cuatrimestre }
    if (typeof fechaRegularidad === 'string') {
        const [year, month] = fechaRegularidad.split('-').map(Number);
        anioReg = year;
        cuatriReg = month <= 6 ? 1 : 2;
    } else {
        anioReg = fechaRegularidad.anio;
        cuatriReg = fechaRegularidad.cuatrimestre;
    }

    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();
    const cuatriActual = mesActual <= 6 ? 1 : 2;

    return Math.max(0, toCuatriIndex(anioActual, cuatriActual) - toCuatriIndex(anioReg, cuatriReg));
}

/**
 * Verifica si la regularidad venció por tiempo (> cuatrimestresRegularidad).
 * @param {FechaRegularidad | null | undefined} fechaRegularidad
 * @param {Partial<AcademicRulesConfig> | null} [rulesOverride]
 * @returns {boolean}
 */
export function verificarVencimientoTiempo(fechaRegularidad, rulesOverride = null) {
    if (!fechaRegularidad) return false;
    const rules = resolveAcademicRules(rulesOverride);
    const transcurridos = getCuatrimestresTranscurridos(fechaRegularidad);
    return transcurridos > rules.cuatrimestresRegularidad;
}

/**
 * Verifica si la regularidad venció por exceso de desaprobaciones (o ausentes si la institución los descuenta).
 * @param {IntentoFinal[] | null | undefined} intentosFinal
 * @param {Partial<AcademicRulesConfig> | null} [rulesOverride]
 * @returns {boolean}
 */
export function verificarVencimientoIntentos(intentosFinal, rulesOverride = null) {
    if (!intentosFinal || !Array.isArray(intentosFinal)) return false;
    const rules = resolveAcademicRules(rulesOverride);
    const consumidos = contarIntentosConsumidos(intentosFinal, rules);
    return consumidos >= rules.intentosFinal;
}

/**
 * Determina si una materia 'Regular' debe pasar a 'Libre'.
 * @param {EstadoMateria} actualEstado
 * @param {FechaRegularidad | null | undefined} fechaRegularidad
 * @param {IntentoFinal[] | null | undefined} intentosFinal
 * @param {Partial<AcademicRulesConfig> | null} [rulesOverride]
 * @returns {EstadoMateria}
 */
export function calcularEstadoConsolidado(
    actualEstado,
    fechaRegularidad,
    intentosFinal,
    rulesOverride = null,
) {
    if (actualEstado !== 'Regular' && actualEstado !== 'Libre') return actualEstado;

    if (
        verificarVencimientoTiempo(fechaRegularidad, rulesOverride) ||
        verificarVencimientoIntentos(intentosFinal, rulesOverride)
    ) {
        return 'Libre';
    }
    return 'Regular';
}

/**
 * Retorna cuántos cuatrimestres e intentos le quedan al alumno.
 * @param {FechaRegularidad | null | undefined} fechaRegularidad
 * @param {IntentoFinal[] | null | undefined} intentosFinal
 * @param {Partial<AcademicRulesConfig> | null} [rulesOverride]
 * @returns {PlanificacionRegularidad}
 */
export function obtenerPlanificacionInstancias(
    fechaRegularidad,
    intentosFinal,
    rulesOverride = null,
) {
    const rules = resolveAcademicRules(rulesOverride);
    const consumidos = contarIntentosConsumidos(intentosFinal, rules);
    const intentosRestantes = Math.max(0, rules.intentosFinal - consumidos);

    if (!fechaRegularidad) {
        return {
            cuatrimestresRestantes: rules.cuatrimestresRegularidad,
            intentosRestantes,
        };
    }

    const transcurridos = getCuatrimestresTranscurridos(fechaRegularidad);
    const cuatrimestresRestantes = Math.max(0, rules.cuatrimestresRegularidad - transcurridos);

    return { cuatrimestresRestantes, intentosRestantes };
}

/**
 * Calcula el promedio general de un alumno usando los detalles de progreso.
 * Solo incluye materias con nota final cargada.
 * @param {ProgresoDetallesMap | null | undefined} progresoDetalles
 * @param {ProgresoMap | null | undefined} progreso
 * @returns {ResumenPromedio}
 */
export function calcularPromedioGeneral(progresoDetalles, progreso) {
    if (!progresoDetalles || !progreso) {
        return {
            promedio: null,
            promedioConAplazos: null,
            promedioSinAplazos: null,
            materiasContadas: 0,
            totalNotas: 0,
        };
    }

    let sumaAprobados = 0;
    let cantAprobados = 0;
    let sumaTodos = 0;
    let cantTodos = 0;

    Object.entries(progresoDetalles).forEach(([codigo, detalles]) => {
        if (!detalles) return;
        const estado = progreso[codigo];

        /** @type {IntentoFinal[]} */
        const intentos = [];
        if (detalles.historial) {
            detalles.historial.forEach((cursada) => {
                if (cursada.intentosFinal) {
                    intentos.push(...cursada.intentosFinal);
                }
            });
        }
        if (detalles.intentosFinal) {
            intentos.push(...detalles.intentosFinal);
        }

        let notaAprobadaCounted = false;

        intentos.forEach((intento) => {
            if (intento.nota != null && (intento.estado === 'aprobado' || intento.estado === 'reprobado')) {
                const notaNum = Number(intento.nota);
                sumaTodos += notaNum;
                cantTodos++;

                if (intento.estado === 'aprobado') {
                    sumaAprobados += notaNum;
                    cantAprobados++;
                    notaAprobadaCounted = true;
                }
            }
        });

        if ((estado === 'Aprobado' || estado === 'Promocionado') && detalles.notaFinal != null && !notaAprobadaCounted) {
            const notaNum = Number(detalles.notaFinal);
            sumaTodos += notaNum;
            cantTodos++;
            sumaAprobados += notaNum;
            cantAprobados++;
        }
    });

    const promedioSinAplazos = cantAprobados > 0 ? Math.round((sumaAprobados / cantAprobados) * 100) / 100 : null;
    const promedioConAplazos = cantTodos > 0 ? Math.round((sumaTodos / cantTodos) * 100) / 100 : null;

    return {
        promedio: promedioSinAplazos,
        promedioSinAplazos,
        promedioConAplazos,
        materiasContadas: cantAprobados,
        totalNotas: sumaAprobados,
    };
}

/**
 * Calcula la fecha de vencimiento legible basada en el año y cuatrimestre de regularización.
 * @param {FechaRegularidad | null | undefined} fechaRegularidad
 * @param {Partial<AcademicRulesConfig> | null} [rulesOverride]
 * @returns {string | null}
 */
export function obtenerFechaVencimientoLabel(fechaRegularidad, rulesOverride = null) {
    if (!fechaRegularidad) return null;
    const rules = resolveAcademicRules(rulesOverride);

    let anioReg;
    let cuatriReg;
    if (typeof fechaRegularidad === 'string') {
        const [year, month] = fechaRegularidad.split('-').map(Number);
        anioReg = year;
        cuatriReg = month <= 6 ? 1 : 2;
    } else {
        anioReg = fechaRegularidad.anio;
        cuatriReg = fechaRegularidad.cuatrimestre;
    }

    const totalCuatris = cuatriReg + rules.cuatrimestresRegularidad;
    const anioVenc = anioReg + Math.floor((totalCuatris - 1) / 2);
    const cuatriVenc = ((totalCuatris - 1) % 2) + 1;

    const mesExp = cuatriVenc === 1 ? 'Jul' : 'Dic';
    return `${mesExp} ${anioVenc}`;
}

export default {
    verificarVencimientoTiempo,
    verificarVencimientoIntentos,
    calcularEstadoConsolidado,
    obtenerPlanificacionInstancias,
    calcularPromedioGeneral,
    obtenerFechaVencimientoLabel,
};
