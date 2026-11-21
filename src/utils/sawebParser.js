import regularidadUtils from './Progreso/regularidadUtils';
import {
    calcularEstadoBaseMateria,
    ESTADOS_MATERIA,
} from './Progreso/materiaStateMachine';

/** @typedef {import('../types/domain').Materia} Materia */
/** @typedef {import('../types/domain').FechaRegularidad} FechaRegularidad */
/** @typedef {import('../types/domain').ProgresoMap} ProgresoMap */
/** @typedef {import('../types/domain').ProgresoDetallesMap} ProgresoDetallesMap */
/** @typedef {import('../types/domain').IntentoFinal} IntentoFinal */

const ANALITICO_ROW_REGEX =
    /^(\d{4,6})\s+([PRL])-([^\r\n]+?)\s+(\d{1,2})\([A-ZÁÉÍÓÚÑ\s]+\)\s+(\d{3,5}-\d{2,4})\s+(\d{2}-\d{2}-\d{4})\s*$/i;

const EQUIV_ROW_REGEX =
    /^(\d{4,6})-([^\r\n]+?)\s+([EX])\s+(\d{2}-\d{2}-\d{4})\s*$/i;

const CURSADA_ROW_REGEX =
    /^(\d{4,6})\s+(.+?)\s+(20\d{2})\s+([12])\s+(Promovido|Regular|Libre|Ausente)\s+(\d{1,2}|-)\s+\d+\s+.+$/i;

const FINAL_TABLE_ROW_REGEX =
    /^(\d{4,6})\s+(.+?)\s+(\d{4}-\d{2}-\d{2})\s+(Promovido|Regular|Libre)\s+\d{3,5}\s+\d{2,4}\s+(\d{1,2}|Ausente)\b/i;

const PLAN_REGEX = /Plan\s+(\d{4}|\d{2}\.\d{2})/i;
const INGRESO_REGEX = /ingres[oó]\s+a\s+la\s+Universidad\s+en\s+el(?:\s+a[nñ]o)?\s+(\d{4})/i;

/**
 * Normaliza un número de plan de SAWeb (`1713` -> `17.13`, `17.14` -> `17.14`).
 * @param {string | null | undefined} rawPlan
 * @returns {string | null}
 */
export function normalizeSawebPlan(rawPlan) {
    if (!rawPlan) return null;
    const trimmed = String(rawPlan).trim();
    const fourDigits = trimmed.match(/^(\d{2})(\d{2})$/);
    if (fourDigits) return `${fourDigits[1]}.${fourDigits[2]}`;
    if (/^\d{2}\.\d{2}$/.test(trimmed)) return trimmed;
    return trimmed;
}

/**
 * Convierte fecha DD-MM-YYYY a YYYY-MM-DD.
 * @param {string} ddmmyyyy
 * @returns {string}
 */
function toIsoDate(ddmmyyyy) {
    const match = ddmmyyyy.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) return ddmmyyyy;
    return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * Infiere el año y cuatrimestre de cursada a partir de una fecha ISO YYYY-MM-DD.
 * @param {string | null | undefined} isoDate
 * @returns {{ anio: number, cuatrimestre: 1 | 2 } | null}
 */
function inferFechaCursadaFromIso(isoDate) {
    if (typeof isoDate !== 'string') return null;
    const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const anio = Number(match[1]);
    const mes = Number(match[2]);
    if (mes <= 2) {
        return { anio: anio - 1, cuatrimestre: 2 };
    }
    if (mes <= 8) {
        return { anio, cuatrimestre: 1 };
    }
    return { anio, cuatrimestre: 2 };
}

/**
 * Extrae el año numérico de una fecha de regularidad (objeto o string legado).
 * @param {FechaRegularidad | null | undefined} fechaReg
 * @returns {number | null}
 */
function getAnioFromFechaRegularidad(fechaReg) {
    if (!fechaReg) return null;
    if (typeof fechaReg === 'string') {
        const match = fechaReg.match(/^(\d{4})/);
        return match ? Number(match[1]) : null;
    }
    return typeof fechaReg.anio === 'number' ? fechaReg.anio : null;
}

/**
 * Limpia espacios múltiples y tabulaciones en una línea sin conservar PII.
 * @param {string} line
 * @returns {string}
 */
function normalizeLine(line) {
    return line.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Descarta líneas con datos personales (DNI, Legajo, Apellido y Nombre) antes de procesar.
 * @param {string} line
 * @returns {boolean}
 */
function isPiiLine(line) {
    return /(?:DNI\s*:|N[º°]\s*de\s*Legajo|Legajo\s*:|Apellido\s*y\s*Nombre\s*:)/i.test(line);
}

/**
 * Parsea uno o más bloques de texto copiados desde SAWeb (PDF Analítico, Equivalencias,
 * tablas de Cursadas y/o Finales) y construye un preview consolidado sobre las materias del plan.
 *
 * @param {string[] | string} rawInputs
 * @param {Materia[]} materiasPlan
 */
export function parseSawebTexts(rawInputs, materiasPlan = []) {
    const chunks = Array.isArray(rawInputs) ? rawInputs : [rawInputs];
    const validChunks = chunks.filter((c) => typeof c === 'string' && c.trim().length > 0);

    const materiasByCode = new Map(
        (materiasPlan || []).map((m) => [String(m.codigo).trim(), m]),
    );

    /** @type {string | null} */
    let detectedPlan = null;
    /** @type {number | null} */
    let anioIngreso = null;

    const sourcesDetected = {
        analitico: false,
        equivalencias: false,
        cursadas: false,
        finales: false,
    };

    const seenKeys = new Set();

    /** @type {Map<string, {
     *   nombre: string,
     *   intentos: Array<{ tipo: 'P'|'R'|'L', nota: number, fecha: string }>,
     *   ausentes: Array<{ fecha: string }>,
     *   equivalencia: { tipo: 'E'|'X', fecha: string } | null,
     *   cursadas: Array<{ anio: number, cuatrimestre: number, condicion: string, nota: number | null }>
     * }>} */
    const recordsByCode = new Map();

    /**
     * @param {string} codigo
     * @param {string} nombre
     * @returns {{
     *   nombre: string,
     *   intentos: Array<{ tipo: 'P'|'R'|'L', nota: number, fecha: string }>,
     *   ausentes: Array<{ fecha: string }>,
     *   equivalencia: { tipo: 'E'|'X', fecha: string } | null,
     *   cursadas: Array<{ anio: number, cuatrimestre: number, condicion: string, nota: number | null }>
     * }}
     */
    const ensureRecord = (codigo, nombre) => {
        const existing = recordsByCode.get(codigo);
        if (existing) return existing;
        /** @type {{
         *   nombre: string,
         *   intentos: Array<{ tipo: 'P'|'R'|'L', nota: number, fecha: string }>,
         *   ausentes: Array<{ fecha: string }>,
         *   equivalencia: { tipo: 'E'|'X', fecha: string } | null,
         *   cursadas: Array<{ anio: number, cuatrimestre: number, condicion: string, nota: number | null }>
         * }} */
        const created = {
            nombre: nombre.trim(),
            intentos: [],
            ausentes: [],
            equivalencia: null,
            cursadas: [],
        };
        recordsByCode.set(codigo, created);
        return created;
    };

    for (const chunk of validChunks) {
        if (!detectedPlan) {
            const planMatch = chunk.match(PLAN_REGEX);
            if (planMatch) detectedPlan = normalizeSawebPlan(planMatch[1]);
        }
        if (!anioIngreso) {
            const ingresoMatch = chunk.match(INGRESO_REGEX);
            if (ingresoMatch) anioIngreso = Number(ingresoMatch[1]);
        }

        const lines = chunk.split(/\r?\n/);
        for (const rawLine of lines) {
            const line = normalizeLine(rawLine);
            if (!line || isPiiLine(line)) continue;

            const analiticoMatch = line.match(ANALITICO_ROW_REGEX);
            if (analiticoMatch) {
                sourcesDetected.analitico = true;
                const [, codigo, tipoRaw, nombre, notaStr, , fechaRaw] = analiticoMatch;
                const tipo = /** @type {'P'|'R'|'L'} */ (tipoRaw.toUpperCase());
                const nota = Number(notaStr);
                const fecha = toIsoDate(fechaRaw);
                const dedupKey = `A|${codigo}|${tipo}|${nota}|${fecha}`;
                if (seenKeys.has(dedupKey)) continue;
                seenKeys.add(dedupKey);

                const rec = ensureRecord(codigo, nombre);
                rec.intentos.push({ tipo, nota, fecha });
                continue;
            }

            const equivMatch = line.match(EQUIV_ROW_REGEX);
            if (equivMatch) {
                sourcesDetected.equivalencias = true;
                const [, codigo, nombre, tipoRaw, fechaRaw] = equivMatch;
                const tipo = /** @type {'E'|'X'} */ (tipoRaw.toUpperCase());
                const fecha = toIsoDate(fechaRaw);
                const dedupKey = `E|${codigo}|${tipo}|${fecha}`;
                if (seenKeys.has(dedupKey)) continue;
                seenKeys.add(dedupKey);

                const rec = ensureRecord(codigo, nombre);
                rec.equivalencia = { tipo, fecha };
                continue;
            }

            const cursadaMatch = line.match(CURSADA_ROW_REGEX);
            if (cursadaMatch) {
                sourcesDetected.cursadas = true;
                const [, codigo, nombre, anioStr, cuatriStr, condicionRaw, notaStr] = cursadaMatch;
                const anio = Number(anioStr);
                const cuatrimestre = Number(cuatriStr);
                const condicion = condicionRaw.charAt(0).toUpperCase() + condicionRaw.slice(1).toLowerCase();
                const nota = notaStr === '-' ? null : Number(notaStr);
                const dedupKey = `C|${codigo}|${anio}|${cuatrimestre}|${condicion}|${nota ?? '-'}`;
                if (seenKeys.has(dedupKey)) continue;
                seenKeys.add(dedupKey);

                const rec = ensureRecord(codigo, nombre);
                rec.cursadas.push({ anio, cuatrimestre, condicion, nota });
                continue;
            }

            const finalMatch = line.match(FINAL_TABLE_ROW_REGEX);
            if (finalMatch) {
                sourcesDetected.finales = true;
                const [, codigo, nombre, fecha, condicionRaw, notaStr] = finalMatch;
                const isAusente = /^ausente$/i.test(notaStr);
                const nota = isAusente ? null : Number(notaStr);
                const condicion = condicionRaw.charAt(0).toUpperCase() + condicionRaw.slice(1).toLowerCase();
                const tipo = /** @type {'P'|'R'|'L'} */ (
                    condicion === 'Promovido' ? 'P' : condicion === 'Libre' ? 'L' : 'R'
                );
                const dedupKey = isAusente
                    ? `FA|${codigo}|${fecha}`
                    : `A|${codigo}|${tipo}|${nota}|${fecha}`;

                if (seenKeys.has(dedupKey)) continue;
                seenKeys.add(dedupKey);

                const rec = ensureRecord(codigo, nombre);
                if (isAusente) {
                    rec.ausentes.push({ fecha });
                } else if (nota !== null) {
                    rec.intentos.push({ tipo, nota, fecha });
                }
            }
        }
    }

    /** @type {ProgresoMap} */
    const progreso = {};
    /** @type {ProgresoDetallesMap} */
    const progresoDetalles = {};

    const counts = {
        Promocionado: 0,
        Aprobado: 0,
        Equivalencia: 0,
        Regular: 0,
        Libre: 0,
        Aplazos: 0,
        Omitidas: 0,
    };

    /** @type {Array<{ codigo: string, nombre: string }>} */
    const omittedCodes = [];

    for (const [codigo, rec] of recordsByCode.entries()) {
        if (materiasByCode.size > 0 && !materiasByCode.has(codigo)) {
            counts.Omitidas += 1;
            omittedCodes.push({ codigo, nombre: rec.nombre });
            continue;
        }

        const intentosOrdenados = [...rec.intentos].sort((a, b) => a.fecha.localeCompare(b.fecha));
        const ausentesOrdenados = [...rec.ausentes].sort((a, b) => a.fecha.localeCompare(b.fecha));
        const cursadasOrdenadas = [...rec.cursadas].sort(
            (a, b) => a.anio - b.anio || a.cuatrimestre - b.cuatrimestre,
        );

        const ultimaRegular = [...cursadasOrdenadas]
            .reverse()
            .find((c) => c.condicion === 'Regular');
        const ultimaPromovidaCursada = [...cursadasOrdenadas]
            .reverse()
            .find((c) => c.condicion === 'Promovido');

        /** @type {IntentoFinal[]} */
        const intentosFinal = [
            ...intentosOrdenados
                .filter((i) => i.tipo !== 'P')
                .map((i) => ({
                    nota: i.nota,
                    estado: /** @type {'aprobado'|'reprobado'} */ (i.nota >= 4 ? 'aprobado' : 'reprobado'),
                    fecha: i.fecha,
                })),
            ...ausentesOrdenados.map((a) => ({
                nota: null,
                estado: /** @type {'ausente'} */ ('ausente'),
                fecha: a.fecha,
            })),
        ].sort((a, b) => a.fecha.localeCompare(b.fecha));

        const aplazosCount = intentosFinal.filter((i) => i.estado === 'reprobado').length;
        counts.Aplazos += aplazosCount;

        const fechaRegularidad = ultimaRegular
            ? {
                  anio: ultimaRegular.anio,
                  cuatrimestre: /** @type {1 | 2} */ (ultimaRegular.cuatrimestre === 2 ? 2 : 1),
              }
            : null;
        const notaRegularizacion = ultimaRegular?.nota ?? null;

        // 1. Equivalencia / Eximida en cambio de plan
        if (rec.equivalencia) {
            progreso[codigo] = ESTADOS_MATERIA.APROBADO;
            progresoDetalles[codigo] = {
                intentosFinal: [],
                notaFinal: null,
                esEquivalencia: true,
                rendidaLibre: false,
                fechaAprobacion: rec.equivalencia.fecha,
                fechaRegularidad: null,
                notaRegularizacion: null,
            };
            counts.Equivalencia += 1;
            continue;
        }

        // 2. Promocionada (prioridad sobre intentos previos)
        const promoAnalitico = [...intentosOrdenados].reverse().find((i) => i.tipo === 'P' && i.nota >= 4);
        if (promoAnalitico || ultimaPromovidaCursada) {
            const notaPromo = promoAnalitico?.nota ?? ultimaPromovidaCursada?.nota ?? null;
            /** @type {{ anio: number, cuatrimestre: 1 | 2 } | null} */
            const fechaPromo = ultimaPromovidaCursada
                ? {
                      anio: ultimaPromovidaCursada.anio,
                      cuatrimestre: ultimaPromovidaCursada.cuatrimestre === 2 ? 2 : 1,
                  }
                : promoAnalitico?.fecha
                  ? inferFechaCursadaFromIso(promoAnalitico.fecha)
                  : null;
            progreso[codigo] = ESTADOS_MATERIA.PROMOCIONADO;
            progresoDetalles[codigo] = {
                intentosFinal,
                notaFinal: notaPromo,
                esEquivalencia: false,
                rendidaLibre: false,
                ...(promoAnalitico?.fecha && { fechaAprobacion: promoAnalitico.fecha }),
                fechaRegularidad: fechaPromo ?? fechaRegularidad,
                notaRegularizacion: notaPromo ?? notaRegularizacion,
            };
            counts.Promocionado += 1;
            continue;
        }

        // 3. Final aprobado (Regular o Libre)
        const finalAprobado = [...intentosOrdenados].reverse().find((i) => i.nota >= 4);
        if (finalAprobado) {
            progreso[codigo] = ESTADOS_MATERIA.APROBADO;
            progresoDetalles[codigo] = {
                intentosFinal,
                notaFinal: finalAprobado.nota,
                esEquivalencia: false,
                rendidaLibre: finalAprobado.tipo === 'L',
                fechaAprobacion: finalAprobado.fecha,
                fechaRegularidad,
                notaRegularizacion,
            };
            counts.Aprobado += 1;
            continue;
        }

        // 4. Regular vigente o vencida (desde tabla Cursadas)
        if (fechaRegularidad) {
            const estadoConsolidado = regularidadUtils.calcularEstadoConsolidado(
                ESTADOS_MATERIA.REGULAR,
                fechaRegularidad,
                intentosFinal,
            );
            progreso[codigo] = estadoConsolidado;
            progresoDetalles[codigo] = {
                intentosFinal,
                notaFinal: null,
                esEquivalencia: false,
                rendidaLibre: false,
                fechaRegularidad,
                notaRegularizacion,
            };
            if (estadoConsolidado === ESTADOS_MATERIA.REGULAR) {
                counts.Regular += 1;
            } else {
                counts.Libre += 1;
            }
            continue;
        }

        // 5. Solo aplazos sin regularidad vigente ni aprobación posterior
        if (intentosFinal.length > 0 || cursadasOrdenadas.some((c) => c.condicion === 'Libre')) {
            progreso[codigo] = ESTADOS_MATERIA.LIBRE;
            progresoDetalles[codigo] = {
                intentosFinal,
                notaFinal: null,
                esEquivalencia: false,
                rendidaLibre: false,
                fechaRegularidad: null,
                notaRegularizacion: null,
            };
            counts.Libre += 1;
        }
    }

    // Completar Disponible / Bloqueado para el resto de materias del plan
    for (const materia of materiasPlan || []) {
        if (!progreso[materia.codigo]) {
            progreso[materia.codigo] = calcularEstadoBaseMateria(
                progreso,
                materia,
                materiasPlan,
            );
        }
    }

    const totalMatched =
        counts.Promocionado +
        counts.Aprobado +
        counts.Equivalencia +
        counts.Regular +
        counts.Libre;

    return {
        detectedPlan,
        anioIngreso,
        sourcesDetected,
        counts,
        totalMatched,
        omittedCodes,
        progreso,
        progresoDetalles,
    };
}

/**
 * Combina el resultado del Analítico oficial con el progreso y detalles existentes del alumno,
 * actualizando intentos de final, fechas de aprobación, equivalencias y notas finales
 * SIN pisar `notaRegularizacion`, `fechaRegularidad`, `historial` ni materias `Cursando`/`Regular`
 * que no figuran en el Analítico.
 *
 * @param {ReturnType<typeof parseSawebTexts>} parsedResult
 * @param {ProgresoMap} existingProgreso
 * @param {ProgresoDetallesMap} existingDetalles
 * @param {Materia[]} materiasPlan
 * @returns {{ progreso: ProgresoMap, progresoDetalles: ProgresoDetallesMap }}
 */
export function mergeSawebImportWithExisting(
    parsedResult,
    existingProgreso = {},
    existingDetalles = {},
    materiasPlan = [],
) {
    /** @type {ProgresoMap} */
    const mergedProgreso = {};
    /** @type {ProgresoDetallesMap} */
    const mergedDetalles = {};

    const importedProgreso = parsedResult?.progreso || {};
    const importedDetalles = parsedResult?.progresoDetalles || {};

    for (const materia of materiasPlan || []) {
        const codigo = materia.codigo;
        const importedDet = importedDetalles[codigo];
        const prevDet = existingDetalles?.[codigo];
        const prevEstado = existingProgreso?.[codigo];
        const importedEstado = importedProgreso[codigo];

        if (importedDet && importedEstado) {
            const importedAnioReg = getAnioFromFechaRegularidad(importedDet.fechaRegularidad);
            const prevAnioReg = getAnioFromFechaRegularidad(prevDet?.fechaRegularidad);
            const isPromoMasReciente =
                importedEstado === ESTADOS_MATERIA.PROMOCIONADO &&
                importedAnioReg !== null &&
                prevAnioReg !== null &&
                importedAnioReg > prevAnioReg;

            const nextNotaReg = isPromoMasReciente
                ? (importedDet.notaRegularizacion ?? prevDet?.notaRegularizacion ?? null)
                : (prevDet?.notaRegularizacion ?? importedDet.notaRegularizacion ?? null);
            const nextFechaReg = isPromoMasReciente
                ? importedDet.fechaRegularidad
                : (prevDet?.fechaRegularidad ?? importedDet.fechaRegularidad ?? null);

            let finalEstado = importedEstado;
            // Si en el Analítico solo hay aplazos (sin aprobación) y ya estaba Regular en el simulador,
            // recalcular si la regularidad sigue vigente según intentos y fecha de cursada.
            if (
                importedEstado === ESTADOS_MATERIA.LIBRE &&
                prevEstado === ESTADOS_MATERIA.REGULAR
            ) {
                finalEstado = regularidadUtils.calcularEstadoConsolidado(
                    ESTADOS_MATERIA.REGULAR,
                    nextFechaReg,
                    importedDet.intentosFinal,
                );
            }

            mergedProgreso[codigo] = finalEstado;
            mergedDetalles[codigo] = {
                ...prevDet,
                ...importedDet,
                // Nunca pisar nota de cursada ni fecha de regularidad cargadas previamente
                notaRegularizacion: nextNotaReg,
                fechaRegularidad: nextFechaReg,
                ...(prevDet?.historial && { historial: prevDet.historial }),
            };
        } else if (
            prevEstado === ESTADOS_MATERIA.CURSANDO ||
            prevEstado === ESTADOS_MATERIA.REGULAR ||
            prevEstado === ESTADOS_MATERIA.APROBADO ||
            prevEstado === ESTADOS_MATERIA.PROMOCIONADO ||
            prevEstado === ESTADOS_MATERIA.LIBRE
        ) {
            // Conservar materias cursando / regulares / cargadas manualmente que no están en el Analítico
            mergedProgreso[codigo] = prevEstado;
            if (prevDet) {
                mergedDetalles[codigo] = prevDet;
            }
        }
    }

    // Recalcular Disponible / Bloqueado para materias sin estado consolidado
    for (const materia of materiasPlan || []) {
        if (!mergedProgreso[materia.codigo]) {
            mergedProgreso[materia.codigo] = calcularEstadoBaseMateria(
                mergedProgreso,
                materia,
                materiasPlan,
            );
        }
    }

    return {
        progreso: mergedProgreso,
        progresoDetalles: mergedDetalles,
    };
}
