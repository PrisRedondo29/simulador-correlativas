import regularidadUtils from './Progreso/regularidadUtils';
import {
    calcularEstadoBaseMateria,
    ESTADOS_MATERIA,
} from './Progreso/materiaStateMachine';
import equivalencias1714 from '../data/equivalencias.json';
import {
    DEFAULT_ADVISORY_MESSAGE,
    EQUIVALENCIA_ACCREDITATION_MODE,
    normalizeEquivalenciasCatalog,
    resolveEquivalenciasForTrajectory,
} from './Plan/equivalenciasUtils';

/** @typedef {import('../types/domain').Materia} Materia */
/** @typedef {import('../types/domain').EstadoMateria} EstadoMateria */
/** @typedef {import('../types/domain').FechaRegularidad} FechaRegularidad */
/** @typedef {import('../types/domain').ProgresoMap} ProgresoMap */
/** @typedef {import('../types/domain').ProgresoDetallesMap} ProgresoDetallesMap */
/** @typedef {import('../types/domain').IntentoFinal} IntentoFinal */
/** @typedef {import('../types/domain').MateriaDetalle} MateriaDetalle */
/** @typedef {import('../types/domain').EquivalenciasCatalogMap} EquivalenciasCatalogMap */
/** @typedef {import('../types/domain').EquivalenciaRule} EquivalenciaRule */
/** @typedef {import('../types/domain').EquivalenciaAdvisoryItem} EquivalenciaAdvisoryItem */
/** @typedef {import('../types/domain').EquivalenciaAdvisoryConflict} EquivalenciaAdvisoryConflict */

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
const OPTATIVA_MARKER_REGEX = /\(\s*OPT(?:ATIVA)?\.?\s*\)|\bOPTATIVA\b/i;

/**
 * Determina si un registro externo corresponde a una materia optativa (`(OPT.)`, `(OPT)`, `(OPTATIVA)`).
 * @param {{ nombre?: string | null } | null | undefined} rec
 * @returns {boolean}
 */
function isOptativaRecord(rec) {
    return Boolean(rec?.nombre && OPTATIVA_MARKER_REGEX.test(rec.nombre));
}

/**
 * Extrae el nombre real de una materia optativa removiendo la etiqueta `(OPT.)` / `(OPTATIVA)`.
 * @param {string | null | undefined} rawName
 * @returns {string}
 */
function extractNombreOptativa(rawName) {
    if (!rawName) return '';
    return String(rawName)
        .replace(/\(\s*OPT(?:ATIVA)?\.?\s*\)/gi, '')
        .replace(/(?:^|\s*[-–]\s*|\s+)OPTATIVA\s*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Obtiene la fecha de referencia cronológica de una evaluación para ordenar optativas.
 * @param {NonNullable<ReturnType<typeof resolveRecordWithStrategy>>} evalRes
 * @returns {string}
 */
function getOptativaSortDate(evalRes) {
    if (evalRes?.detalles?.fechaAprobacion) {
        return evalRes.detalles.fechaAprobacion;
    }
    const intentos = evalRes?.detalles?.intentosFinal || [];
    if (intentos.length > 0) {
        return intentos[intentos.length - 1]?.fecha || '';
    }
    return '';
}

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
 * Mesas de ene-feb corresponden al 2° cuatrimestre del año previo; mar-oct al 1° cuatrimestre
 * y nov-dic al 2° cuatrimestre del año en curso.
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
    if (mes <= 10) {
        return { anio, cuatrimestre: 1 };
    }
    return { anio, cuatrimestre: 2 };
}

/**
 * Infiere el año y cuatrimestre de regularidad a partir de los intentos de final
 * cuando una materia fue aprobada en condición Regular (`R-`).
 * Descarta intentos previos al último Libre (`L-`) o fuera de la ventana de vigencia.
 *
 * @param {Array<{ tipo: 'P'|'R'|'L', nota: number, fecha: string }>} intentosOrdenados
 * @param {{ tipo: 'P'|'R'|'L', nota: number, fecha: string } | null | undefined} finalAprobado
 * @returns {{ anio: number, cuatrimestre: 1 | 2 } | null}
 */
function inferFechaRegularidadFromIntentos(intentosOrdenados, finalAprobado) {
    if (!finalAprobado || finalAprobado.tipo !== 'R') return null;

    const idxAprobado = intentosOrdenados.lastIndexOf(finalAprobado);
    const intentosHastaAprobado =
        idxAprobado >= 0
            ? intentosOrdenados.slice(0, idxAprobado + 1)
            : intentosOrdenados.filter((i) => i.fecha <= finalAprobado.fecha);

    let ultimoLibreIdx = -1;
    for (let i = 0; i < intentosHastaAprobado.length; i += 1) {
        if (intentosHastaAprobado[i].tipo === 'L') {
            ultimoLibreIdx = i;
        }
    }

    const candidatosR = intentosHastaAprobado
        .slice(ultimoLibreIdx + 1)
        .filter((i) => i.tipo === 'R');

    const anioAprobado = Number(finalAprobado.fecha?.slice(0, 4));
    const intentoBase =
        candidatosR.find((i) => {
            const anioIntento = Number(i.fecha?.slice(0, 4));
            return (
                !Number.isNaN(anioAprobado) &&
                !Number.isNaN(anioIntento) &&
                anioAprobado - anioIntento <= 3
            );
        }) || finalAprobado;

    return inferFechaCursadaFromIso(intentoBase.fecha);
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
 * Etapa 2 (Patrón Strategy): Estrategias de resolución de actas académicas.
 * Determinan estado, notas (cursada vs final), fecha de regularidad e intentos
 * según la condición oficial del registro en SAWeb.
 */
const ACTA_RESOLUTION_STRATEGIES = {
    /** Equivalencia o materia eximida explícita (`E` / `X`, Página 3 SAWeb). */
    equivalenciaExplicita: ({ rec, aplazosCount }) => {
        const fecha = rec.equivalencia?.fecha || '';
        const anioExamenEq =
            fecha && /^\d{4}/.test(fecha) ? Number(fecha.slice(0, 4)) : null;
        return {
            kind: /** @type {const} */ ('Equivalencia'),
            estado: ESTADOS_MATERIA.APROBADO,
            detalles: {
                intentosFinal: [],
                notaFinal: null,
                esEquivalencia: true,
                rendidaLibre: false,
                fechaAprobacion: fecha,
                ...(anioExamenEq ? { anioExamen: anioExamenEq } : {}),
                fechaRegularidad: null,
                notaRegularizacion: null,
            },
            aplazosCount,
        };
    },

    /** Promoción (`P-` / `Promovido`): la nota del Analítico corresponde a la cursada. */
    promocion: ({
        promoAnalitico,
        ultimaPromovidaCursada,
        intentosFinal,
        fechaRegularidad,
        notaRegularizacion,
        aplazosCount,
    }) => {
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
        return {
            kind: /** @type {const} */ ('Promocionado'),
            estado: ESTADOS_MATERIA.PROMOCIONADO,
            detalles: {
                intentosFinal,
                notaFinal: notaPromo,
                esEquivalencia: false,
                rendidaLibre: false,
                ...(promoAnalitico?.fecha && { fechaAprobacion: promoAnalitico.fecha }),
                fechaRegularidad: fechaPromo ?? fechaRegularidad,
                notaRegularizacion: notaPromo ?? notaRegularizacion,
            },
            aplazosCount,
        };
    },

    /** Examen final aprobado en condición Regular (`R-`): la nota va al final y se preserva la nota de cursada previa. */
    finalRegular: ({
        finalAprobado,
        intentosOrdenados,
        intentosFinal,
        fechaRegularidad,
        notaRegularizacion,
        aplazosCount,
    }) => ({
        kind: /** @type {const} */ ('Aprobado'),
        estado: ESTADOS_MATERIA.APROBADO,
        detalles: {
            intentosFinal,
            notaFinal: finalAprobado.nota,
            esEquivalencia: false,
            rendidaLibre: false,
            fechaAprobacion: finalAprobado.fecha,
            fechaRegularidad:
                fechaRegularidad ??
                inferFechaRegularidadFromIntentos(intentosOrdenados, finalAprobado),
            notaRegularizacion,
        },
        aplazosCount,
    }),

    /** Examen final aprobado en condición Libre (`L-`): sin cursada regular ni nota de cursada. */
    finalLibre: ({ finalAprobado, intentosFinal, aplazosCount }) => ({
        kind: /** @type {const} */ ('Aprobado'),
        estado: ESTADOS_MATERIA.APROBADO,
        detalles: {
            intentosFinal,
            notaFinal: finalAprobado.nota,
            esEquivalencia: false,
            rendidaLibre: true,
            fechaAprobacion: finalAprobado.fecha,
            fechaRegularidad: null,
            notaRegularizacion: null,
        },
        aplazosCount,
    }),

    /** Regularidad vigente o vencida proveniente de tabla Cursadas sin aprobación posterior. */
    regularidadVigente: ({ fechaRegularidad, notaRegularizacion, intentosFinal, aplazosCount }) => {
        const estadoConsolidado = regularidadUtils.calcularEstadoConsolidado(
            ESTADOS_MATERIA.REGULAR,
            fechaRegularidad,
            intentosFinal,
        );
        return {
            kind: /** @type {'Regular' | 'Libre'} */ (
                estadoConsolidado === ESTADOS_MATERIA.REGULAR ? 'Regular' : 'Libre'
            ),
            estado: estadoConsolidado,
            detalles: {
                intentosFinal,
                notaFinal: null,
                esEquivalencia: false,
                rendidaLibre: false,
                fechaRegularidad,
                notaRegularizacion,
            },
            aplazosCount,
        };
    },

    /** Intentos desaprobados o condición Libre sin regularidad vigente ni aprobación. */
    aplazosPendientes: ({ intentosFinal, aplazosCount }) => ({
        kind: /** @type {const} */ ('Libre'),
        estado: ESTADOS_MATERIA.LIBRE,
        detalles: {
            intentosFinal,
            notaFinal: null,
            esEquivalencia: false,
            rendidaLibre: false,
            fechaRegularidad: null,
            notaRegularizacion: null,
        },
        aplazosCount,
    }),
};

/**
 * Selecciona y ejecuta la estrategia adecuada para resolver los registros de una materia.
 *
 * @param {{
 *   nombre: string,
 *   intentos: Array<{ tipo: 'P'|'R'|'L', nota: number, fecha: string }>,
 *   ausentes: Array<{ fecha: string }>,
 *   equivalencia: { tipo: 'E'|'X', fecha: string } | null,
 *   cursadas: Array<{ anio: number, cuatrimestre: number, condicion: string, nota: number | null }>
 * }} rec
 * @returns {{
 *   kind: 'Equivalencia' | 'Promocionado' | 'Aprobado' | 'Regular' | 'Libre',
 *   estado: EstadoMateria,
 *   detalles: MateriaDetalle,
 *   aplazosCount: number
 * } | null}
 */
function resolveRecordWithStrategy(rec) {
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
                condicion: /** @type {'Regular'|'Libre'} */ (i.tipo === 'L' ? 'Libre' : 'Regular'),
            })),
        ...ausentesOrdenados.map((a) => ({
            nota: null,
            estado: /** @type {'ausente'} */ ('ausente'),
            fecha: a.fecha,
        })),
    ].sort((a, b) => a.fecha.localeCompare(b.fecha));

    const aplazosCount = intentosFinal.filter((i) => i.estado === 'reprobado').length;

    const fechaRegularidad = ultimaRegular
        ? {
              anio: ultimaRegular.anio,
              cuatrimestre: /** @type {1 | 2} */ (ultimaRegular.cuatrimestre === 2 ? 2 : 1),
          }
        : null;
    const notaRegularizacion = ultimaRegular?.nota ?? null;

    if (rec.equivalencia) {
        return ACTA_RESOLUTION_STRATEGIES.equivalenciaExplicita({ rec, aplazosCount });
    }

    const promoAnalitico = [...intentosOrdenados].reverse().find((i) => i.tipo === 'P' && i.nota >= 4);
    if (promoAnalitico || ultimaPromovidaCursada) {
        return ACTA_RESOLUTION_STRATEGIES.promocion({
            promoAnalitico,
            ultimaPromovidaCursada,
            intentosFinal,
            fechaRegularidad,
            notaRegularizacion,
            aplazosCount,
        });
    }

    const finalAprobado = [...intentosOrdenados].reverse().find((i) => i.nota >= 4);
    if (finalAprobado) {
        if (finalAprobado.tipo === 'L') {
            return ACTA_RESOLUTION_STRATEGIES.finalLibre({
                finalAprobado,
                intentosFinal,
                aplazosCount,
            });
        }
        return ACTA_RESOLUTION_STRATEGIES.finalRegular({
            finalAprobado,
            intentosOrdenados,
            intentosFinal,
            fechaRegularidad,
            notaRegularizacion,
            aplazosCount,
        });
    }

    if (fechaRegularidad) {
        return ACTA_RESOLUTION_STRATEGIES.regularidadVigente({
            fechaRegularidad,
            notaRegularizacion,
            intentosFinal,
            aplazosCount,
        });
    }

    if (intentosFinal.length > 0 || cursadasOrdenadas.some((c) => c.condicion === 'Libre')) {
        return ACTA_RESOLUTION_STRATEGIES.aplazosPendientes({ intentosFinal, aplazosCount });
    }

    return null;
}

/**
 * Etapa 1: Extracción y tokenización de bloques de texto SAWeb (con filtrado de PII).
 * @param {string[] | string} rawInputs
 */
function tokenizeSawebInputs(rawInputs) {
    const chunks = Array.isArray(rawInputs) ? rawInputs : [rawInputs];
    const validChunks = chunks.filter((c) => typeof c === 'string' && c.trim().length > 0);

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

    return { detectedPlan, anioIngreso, sourcesDetected, recordsByCode };
}

/**
 * Etapa 2b: Detecta asignaturas optativas (`(OPT.)`) con código propio en SAWeb y las asigna
 * cronológicamente a los slots optativos del plan (`OP1`, `OP2`, `OP3`) o, si el plan usa
 * `AO-1714` (Plan 17.14), las mapea virtualmente a `OP1..OP3` para su evaluación en homologación.
 *
 * @param {{
 *   materiasPlan: Materia[],
 *   materiasByCode: Map<string, Materia>,
 *   recordsByCode: Map<string, { nombre: string }>,
 *   externalRecords: Array<{ codigo: string, nombre: string }>,
 *   evaluatedExternalByCode: Map<string, NonNullable<ReturnType<typeof resolveRecordWithStrategy>>>,
 *   excludedOptativeCodes?: Set<string> | null,
 *   progreso: ProgresoMap,
 *   progresoDetalles: ProgresoDetallesMap,
 *   counts: { Promocionado: number, Aprobado: number, Equivalencia: number, Regular: number, Libre: number, Aplazos: number, Omitidas: number },
 * }} params
 * @returns {{
 *   consumedOptativaCodes: Set<string>,
 *   virtualSlotToSourceCode: Map<string, string>,
 * }}
 */
function assignOptativaRecordsToSlots({
    materiasPlan,
    materiasByCode,
    recordsByCode,
    externalRecords,
    evaluatedExternalByCode,
    excludedOptativeCodes = null,
    progreso,
    progresoDetalles,
    counts,
}) {
    const consumedOptativaCodes = new Set();
    /** @type {Map<string, string>} */
    const virtualSlotToSourceCode = new Map();

    const optativaExternals = externalRecords
        .filter(
            (ext) =>
                !excludedOptativeCodes?.has(ext.codigo) &&
                isOptativaRecord(recordsByCode.get(ext.codigo) || ext) &&
                evaluatedExternalByCode.has(ext.codigo),
        )
        .map((ext) => ({
            ext,
            evalRes: /** @type {NonNullable<ReturnType<typeof resolveRecordWithStrategy>>} */ (
                evaluatedExternalByCode.get(ext.codigo)
            ),
        }))
        .sort((a, b) => {
            const dateA = getOptativaSortDate(a.evalRes) || '9999-99-99';
            const dateB = getOptativaSortDate(b.evalRes) || '9999-99-99';
            return dateA.localeCompare(dateB) || a.ext.codigo.localeCompare(b.ext.codigo);
        });

    if (optativaExternals.length === 0) {
        return { consumedOptativaCodes, virtualSlotToSourceCode };
    }

    const optativaSlots = (materiasPlan || [])
        .filter((m) => Boolean(m.es_optativa) || /^OP\d+$/i.test(String(m.codigo).trim()))
        .sort((a, b) => (Number(a.cuatrimestre) || 99) - (Number(b.cuatrimestre) || 99));

    if (optativaSlots.length > 0) {
        for (const { ext, evalRes } of optativaExternals) {
            const targetSlot = optativaSlots.find((slot) => !progreso[slot.codigo]);
            if (!targetSlot) break;

            const cleanName = extractNombreOptativa(ext.nombre) || ext.nombre;
            progreso[targetSlot.codigo] = evalRes.estado;
            progresoDetalles[targetSlot.codigo] = {
                ...evalRes.detalles,
                intentosFinal: [...(evalRes.detalles.intentosFinal || [])],
                nombreOptativa: cleanName,
                codigoOptativa: ext.codigo,
            };
            counts[evalRes.kind] += 1;
            counts.Aplazos += evalRes.aplazosCount;
            consumedOptativaCodes.add(ext.codigo);
        }
        return { consumedOptativaCodes, virtualSlotToSourceCode };
    }

    // Plan 17.14 con slot consolidado AO-1714 (equivalencia sobre OP1, OP2 y OP3)
    if (materiasByCode.has('AO-1714')) {
        const virtualSlotCodes = ['OP1', 'OP2', 'OP3'];
        let slotIdx = 0;
        for (const { ext, evalRes } of optativaExternals) {
            while (
                slotIdx < virtualSlotCodes.length &&
                evaluatedExternalByCode.has(virtualSlotCodes[slotIdx])
            ) {
                slotIdx += 1;
            }
            if (slotIdx >= virtualSlotCodes.length) break;

            const virtualCode = virtualSlotCodes[slotIdx];
            const cleanName = extractNombreOptativa(ext.nombre) || ext.nombre;
            evaluatedExternalByCode.set(virtualCode, {
                ...evalRes,
                detalles: {
                    ...evalRes.detalles,
                    intentosFinal: [...(evalRes.detalles.intentosFinal || [])],
                    nombreOptativa: cleanName,
                    codigoOptativa: ext.codigo,
                },
            });
            virtualSlotToSourceCode.set(virtualCode, ext.codigo);
            slotIdx += 1;
        }
    }

    return { consumedOptativaCodes, virtualSlotToSourceCode };
}

/**
 * Filtra un catálogo de equivalencias a las reglas cuyo código destino pertenece al plan actual.
 * @param {EquivalenciasCatalogMap | Record<string, EquivalenciaRule>} catalog
 * @param {Map<string, Materia>} materiasByCode
 * @param {string} sourcePlan
 * @param {string} targetPlan
 * @returns {Record<string, EquivalenciaRule>}
 */
function scopeEquivalenciasCatalogForPlan(catalog, materiasByCode, sourcePlan, targetPlan) {
    /** @type {Record<string, EquivalenciaRule>} */
    const scoped = {};
    const normalized = normalizeEquivalenciasCatalog(catalog || {}, { sourcePlan, targetPlan });
    for (const [targetCode, rule] of Object.entries(normalized)) {
        if (materiasByCode.has(targetCode)) {
            scoped[targetCode] = rule;
        }
    }
    return scoped;
}

/**
 * Combina progreso consolidado del plan destino con estados externos evaluados del analítico.
 * @param {ProgresoMap} progreso
 * @param {Map<string, NonNullable<ReturnType<typeof resolveRecordWithStrategy>>>} evaluatedExternalByCode
 * @returns {Record<string, string>}
 */
function buildCombinedProgresoForEquivalencias(progreso, evaluatedExternalByCode) {
    /** @type {Record<string, string>} */
    const combined = { ...(progreso || {}) };
    for (const [cod, evalData] of evaluatedExternalByCode.entries()) {
        if (!combined[cod] && evalData?.estado) {
            combined[cod] = evalData.estado;
        }
    }
    return combined;
}

/**
 * Etapa 3: Motor de homologación entre planes (`17.13 → 17.14`).
 * Delega la evaluación y acreditación en `resolveEquivalenciasForTrajectory`, transfiriendo
 * el acta completa solo a la materia troncal primaria y marcando talleres / desdoblamientos
 * como Equivalencia (`esEquivalencia: true`, `notaFinal: null`).
 *
 * @param {{
 *   materiasByCode: Map<string, Materia>,
 *   externalRecords: Array<{ codigo: string, nombre: string }>,
 *   evaluatedExternalByCode: Map<string, NonNullable<ReturnType<typeof resolveRecordWithStrategy>>>,
 *   virtualSlotToSourceCode?: Map<string, string>,
 *   scopedCatalog: Record<string, EquivalenciaRule>,
 *   sourcePlan: string,
 *   targetPlan: string,
 *   availableOptativeCodes?: string[],
 *   progreso: ProgresoMap,
 *   progresoDetalles: ProgresoDetallesMap,
 *   counts: { Promocionado: number, Aprobado: number, Equivalencia: number, Regular: number, Libre: number, Aplazos: number, Omitidas: number },
 *   omittedCodes: Array<{ codigo: string, nombre: string }>,
 * }} params
 * @returns {{
 *   advisoryEquivalencias: EquivalenciaAdvisoryItem[],
 *   advisoryConflicts: EquivalenciaAdvisoryConflict[],
 * }}
 */
function homologateCrossPlanRecords({
    materiasByCode,
    externalRecords,
    evaluatedExternalByCode,
    virtualSlotToSourceCode,
    scopedCatalog,
    sourcePlan,
    targetPlan,
    availableOptativeCodes = [],
    progreso,
    progresoDetalles,
    counts,
    omittedCodes,
}) {
    if (materiasByCode.size === 0 || externalRecords.length === 0) {
        return { advisoryEquivalencias: [], advisoryConflicts: [] };
    }

    const consumedExternalCodes = new Set();
    const primaryActaAssignedFor1713 = new Set();

    /** @param {ReturnType<typeof resolveRecordWithStrategy>} evalData */
    const isEvalApproved = (evalData) =>
        Boolean(
            evalData &&
                (evalData.estado === ESTADOS_MATERIA.APROBADO ||
                    evalData.estado === ESTADOS_MATERIA.PROMOCIONADO),
        );

    /** @param {string} cod */
    const resolveEvalForCode = (cod) => {
        if (evaluatedExternalByCode.has(cod)) {
            return evaluatedExternalByCode.get(cod) || null;
        }
        if (progreso[cod] && progresoDetalles[cod]) {
            /** @type {'Promocionado' | 'Equivalencia' | 'Aprobado'} */
            const kind =
                progreso[cod] === ESTADOS_MATERIA.PROMOCIONADO
                    ? 'Promocionado'
                    : progresoDetalles[cod]?.esEquivalencia
                      ? 'Equivalencia'
                      : 'Aprobado';
            return {
                kind,
                estado: progreso[cod],
                detalles: /** @type {MateriaDetalle} */ (progresoDetalles[cod]),
                aplazosCount: 0,
            };
        }
        return null;
    };

    const combinedProgreso = buildCombinedProgresoForEquivalencias(
        progreso,
        evaluatedExternalByCode,
    );
    const resolution = resolveEquivalenciasForTrajectory({
        catalog: scopedCatalog,
        sourcePlan,
        targetPlan,
        progreso: combinedProgreso,
        mode: EQUIVALENCIA_ACCREDITATION_MODE.CONSOLIDATED,
        optativeCodes: availableOptativeCodes,
        includeHistoricalBranches: true,
    });

    /**
     * Prioridad de transferencia de acta primaria (no altera acreditación):
     * troncales 1:1 -> troncales N:1 -> talleres/desdoblamientos -> orden de cuatrimestre.
     * @param {string} targetCode
     * @param {string[]} matchedCodes
     */
    const getActaTransferPriority = (targetCode, matchedCodes) => {
        const targetMat = materiasByCode.get(targetCode);
        if (targetMat?.taller) return 2;
        if (matchedCodes.length === 1) return 0;
        return 1;
    };

    const accreditedEntries = resolution.accreditedTargets
        .map((targetCode) => {
            const acc = resolution.accreditationsByTarget[targetCode];
            return {
                targetCode,
                matchedCodes: acc?.matchedSourceCodes || [],
            };
        })
        .filter((entry) => entry.matchedCodes.length > 0)
        .sort((a, b) => {
            const pDiff =
                getActaTransferPriority(a.targetCode, a.matchedCodes) -
                getActaTransferPriority(b.targetCode, b.matchedCodes);
            if (pDiff !== 0) return pDiff;
            const matA = materiasByCode.get(a.targetCode);
            const matB = materiasByCode.get(b.targetCode);
            return (Number(matA?.cuatrimestre) || 99) - (Number(matB?.cuatrimestre) || 99);
        });

    for (const { targetCode: targetCode1714, matchedCodes: requiredCodes1713 } of accreditedEntries) {
        const sourceEntries = requiredCodes1713.map((reqCode) => ({
            reqCode,
            isExternal: evaluatedExternalByCode.has(reqCode),
            evalData: resolveEvalForCode(reqCode),
        }));

        if (!sourceEntries.every(({ evalData }) => isEvalApproved(evalData))) {
            continue;
        }

        for (const { reqCode, isExternal } of sourceEntries) {
            if (isExternal) {
                consumedExternalCodes.add(reqCode);
                const mappedSourceCode = virtualSlotToSourceCode?.get(reqCode);
                if (mappedSourceCode) {
                    consumedExternalCodes.add(mappedSourceCode);
                }
            }
        }

        // Si 39553 consume 31972 (Inglés II), también absorbe 31971 (Inglés I)
        if (
            requiredCodes1713.includes('31972') &&
            isEvalApproved(evaluatedExternalByCode.get('31971') || null)
        ) {
            consumedExternalCodes.add('31971');
        }

        // Si ya vino como Equivalencia explícita en Página 3 (ej. 13021), respetar ese registro oficial
        if (progreso[targetCode1714]) {
            continue;
        }

        const targetMateria = materiasByCode.get(targetCode1714);
        const unassignedExternal = sourceEntries.filter(
            ({ reqCode, isExternal, evalData }) =>
                isExternal && Boolean(evalData) && !primaryActaAssignedFor1713.has(reqCode),
        );

        // Asignar el acta completa (con nota, regularidad e intentos) únicamente al destino troncal primario
        if (!targetMateria?.taller && unassignedExternal.length === 1 && unassignedExternal[0].evalData) {
            const { reqCode, evalData } = unassignedExternal[0];
            primaryActaAssignedFor1713.add(reqCode);
            progreso[targetCode1714] = evalData.estado;
            progresoDetalles[targetCode1714] = {
                ...evalData.detalles,
                intentosFinal: [...(evalData.detalles.intentosFinal || [])],
            };
            counts[evalData.kind] += 1;
            counts.Aplazos += evalData.aplazosCount;
            continue;
        }

        if (!targetMateria?.taller && unassignedExternal.length > 1) {
            const evalList = unassignedExternal
                .map((u) => u.evalData)
                .filter(
                    /** @returns {e is NonNullable<ReturnType<typeof resolveRecordWithStrategy>>} */ (
                        e,
                    ) => Boolean(e),
                );
            unassignedExternal.forEach((u) => {
                primaryActaAssignedFor1713.add(u.reqCode);
                if (u.evalData) counts.Aplazos += u.evalData.aplazosCount;
            });

            const allPromocionado = evalList.every(
                (e) => e.estado === ESTADOS_MATERIA.PROMOCIONADO,
            );
            const notas = evalList
                .map((e) => e.detalles.notaFinal)
                .filter(/** @returns {n is number} */ (n) => typeof n === 'number');
            const notaCombinada =
                notas.length > 0
                    ? Math.round(notas.reduce((sum, n) => sum + n, 0) / notas.length)
                    : null;
            const fechasAprob = evalList
                .map((e) => e.detalles.fechaAprobacion)
                .filter(/** @returns {f is string} */ (f) => typeof f === 'string' && f.length > 0)
                .sort();
            const latestFecha = fechasAprob.pop() || null;
            const fechasReg = evalList
                .map((e) => e.detalles.fechaRegularidad)
                .filter(
                    /** @returns {f is { anio: number, cuatrimestre: number }} */ (f) =>
                        Boolean(f && typeof f === 'object' && typeof f.anio === 'number'),
                )
                .sort((a, b) => a.anio - b.anio || a.cuatrimestre - b.cuatrimestre);
            const latestFechaReg = fechasReg.pop() || null;
            const intentosCombinados = evalList
                .flatMap((e) => e.detalles.intentosFinal || [])
                .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
            const anyEquivalenciaOnly = notaCombinada == null;
            const targetKind = anyEquivalenciaOnly
                ? 'Equivalencia'
                : allPromocionado
                  ? 'Promocionado'
                  : 'Aprobado';

            progreso[targetCode1714] = allPromocionado
                ? ESTADOS_MATERIA.PROMOCIONADO
                : ESTADOS_MATERIA.APROBADO;
            progresoDetalles[targetCode1714] = {
                intentosFinal: intentosCombinados,
                notaFinal: notaCombinada,
                esEquivalencia: anyEquivalenciaOnly,
                rendidaLibre:
                    !allPromocionado &&
                    !anyEquivalenciaOnly &&
                    evalList.every((e) => Boolean(e.detalles.rendidaLibre)),
                ...(latestFecha ? { fechaAprobacion: latestFecha } : {}),
                ...(anyEquivalenciaOnly && latestFecha && /^\d{4}/.test(latestFecha)
                    ? { anioExamen: Number(latestFecha.slice(0, 4)) }
                    : {}),
                fechaRegularidad: latestFechaReg,
                notaRegularizacion: allPromocionado ? notaCombinada : null,
            };
            counts[targetKind] += 1;
            continue;
        }

        // Talleres y segundas materias derivadas del mismo código: Equivalencia sin duplicar notas ni aplazos
        const fechas = sourceEntries
            .map(({ evalData }) => evalData?.detalles.fechaAprobacion)
            .filter(/** @returns {f is string} */ (f) => typeof f === 'string' && f.length > 0)
            .sort();
        const latestFecha = fechas.pop() || null;
        const anioExamen =
            latestFecha && /^\d{4}/.test(latestFecha) ? Number(latestFecha.slice(0, 4)) : null;

        progreso[targetCode1714] = ESTADOS_MATERIA.APROBADO;
        progresoDetalles[targetCode1714] = {
            intentosFinal: [],
            notaFinal: null,
            esEquivalencia: true,
            rendidaLibre: false,
            ...(latestFecha ? { fechaAprobacion: latestFecha } : {}),
            ...(anioExamen && !Number.isNaN(anioExamen) ? { anioExamen } : {}),
            fechaRegularidad: null,
            notaRegularizacion: null,
        };
        counts.Equivalencia += 1;
    }

    /** @type {EquivalenciaAdvisoryItem[]} */
    const advisoryEquivalencias = [];
    for (const targetCode of resolution.advisoryTargets) {
        const acc = resolution.accreditationsByTarget[targetCode];
        if (!acc || acc.status !== 'advisory_pending_confirmation') continue;
        if (progreso[targetCode]) continue;
        const targetMateria = materiasByCode.get(targetCode);
        advisoryEquivalencias.push({
            targetCode,
            targetName: targetMateria?.nombre || targetCode,
            matchedSourceCodes: acc.matchedSourceCodes,
            status: acc.status,
            message: acc.statusMessage || DEFAULT_ADVISORY_MESSAGE,
            source: acc.source,
            ...(targetMateria ? { materia: targetMateria } : {}),
        });
    }

    for (const ext of externalRecords) {
        if (!consumedExternalCodes.has(ext.codigo)) {
            counts.Omitidas += 1;
            omittedCodes.push(ext);
        }
    }

    return {
        advisoryEquivalencias,
        advisoryConflicts: resolution.advisoryConflicts,
    };
}

/**
 * Parsea uno o más bloques de texto copiados desde SAWeb (PDF Analítico, Equivalencias,
 * tablas de Cursadas y/o Finales) y construye un preview consolidado sobre las materias del plan.
 *
 * @param {string[] | string} rawInputs
 * @param {Materia[]} [materiasPlan=[]]
 * @param {{
 *   equivalenciasCatalog?: EquivalenciasCatalogMap | Record<string, EquivalenciaRule>,
 *   sourcePlan?: string,
 *   targetPlan?: string,
 * }} [options={}]
 */
export function parseSawebTexts(rawInputs, materiasPlan = [], options = {}) {
    const materiasByCode = new Map(
        (materiasPlan || []).map((m) => [String(m.codigo).trim(), m]),
    );

    const { detectedPlan, anioIngreso, sourcesDetected, recordsByCode } =
        tokenizeSawebInputs(rawInputs);

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
    /** @type {Map<string, NonNullable<ReturnType<typeof resolveRecordWithStrategy>>>} */
    const evaluatedExternalByCode = new Map();
    /** @type {Array<{ codigo: string, nombre: string }>} */
    const externalRecords = [];

    for (const [codigo, rec] of recordsByCode.entries()) {
        const evalRes = resolveRecordWithStrategy(rec);

        if (materiasByCode.size > 0 && !materiasByCode.has(codigo)) {
            if (evalRes) {
                evaluatedExternalByCode.set(codigo, evalRes);
            }
            externalRecords.push({ codigo, nombre: rec.nombre });
            continue;
        }

        if (!evalRes) continue;
        progreso[codigo] = evalRes.estado;
        progresoDetalles[codigo] = evalRes.detalles;
        counts[evalRes.kind] += 1;
        counts.Aplazos += evalRes.aplazosCount;
    }

    const eqSourcePlan = options.sourcePlan || '17.13';
    const eqTargetPlan = options.targetPlan || '17.14';
    const scopedCatalog = scopeEquivalenciasCatalogForPlan(
        options.equivalenciasCatalog || equivalencias1714,
        materiasByCode,
        eqSourcePlan,
        eqTargetPlan,
    );

    const optativaCandidateCodes = externalRecords
        .filter(
            (ext) =>
                isOptativaRecord(recordsByCode.get(ext.codigo) || ext) &&
                evaluatedExternalByCode.has(ext.codigo),
        )
        .map((ext) => ext.codigo);

    /** @type {Set<string> | null} */
    let excludedOptativeCodes = null;
    if (Object.keys(scopedCatalog).length > 0 && optativaCandidateCodes.length > 0) {
        const preResolution = resolveEquivalenciasForTrajectory({
            catalog: scopedCatalog,
            sourcePlan: eqSourcePlan,
            targetPlan: eqTargetPlan,
            progreso: buildCombinedProgresoForEquivalencias(progreso, evaluatedExternalByCode),
            mode: EQUIVALENCIA_ACCREDITATION_MODE.CONSOLIDATED,
            optativeCodes: optativaCandidateCodes,
            includeHistoricalBranches: true,
        });
        if (preResolution.exclusivelyConsumedSourceCodes.length > 0) {
            excludedOptativeCodes = new Set(preResolution.exclusivelyConsumedSourceCodes);
        }
    }

    const { consumedOptativaCodes, virtualSlotToSourceCode } = assignOptativaRecordsToSlots({
        materiasPlan,
        materiasByCode,
        recordsByCode,
        externalRecords,
        evaluatedExternalByCode,
        excludedOptativeCodes,
        progreso,
        progresoDetalles,
        counts,
    });

    const remainingExternalRecords = externalRecords.filter(
        (ext) => !consumedOptativaCodes.has(ext.codigo),
    );
    const availableOptativeCandidateCodes = optativaCandidateCodes.filter(
        (cod) => !excludedOptativeCodes?.has(cod) && !consumedOptativaCodes.has(cod),
    );

    const { advisoryEquivalencias, advisoryConflicts } = homologateCrossPlanRecords({
        materiasByCode,
        externalRecords: remainingExternalRecords,
        evaluatedExternalByCode,
        virtualSlotToSourceCode,
        scopedCatalog,
        sourcePlan: eqSourcePlan,
        targetPlan: eqTargetPlan,
        availableOptativeCodes: availableOptativeCandidateCodes,
        progreso,
        progresoDetalles,
        counts,
        omittedCodes,
    });

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
        advisoryEquivalencias,
        advisoryConflicts,
        progreso,
        progresoDetalles,
    };
}

/**
 * Etapa 4 (Reconciliador Oficial): Combina el resultado del Analítico oficial con el progreso
 * existente tomando el Analítico como fuente de verdad para actas (`P-`, `R-`, `L-`, `E/X`),
 * y preservando únicamente `notaRegularizacion` manual en materias aprobadas por final Regular (`R-`)
 * o materias `Cursando`/`Regular` que aún no figuran en el certificado.
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
            if (importedEstado === ESTADOS_MATERIA.PROMOCIONADO) {
                // Promoción: la nota y fecha del Analítico son de cursada -> fuente de verdad oficial
                mergedProgreso[codigo] = ESTADOS_MATERIA.PROMOCIONADO;
                mergedDetalles[codigo] = {
                    ...prevDet,
                    ...importedDet,
                    esEquivalencia: false,
                    rendidaLibre: false,
                    notaFinal: importedDet.notaFinal ?? null,
                    notaRegularizacion: importedDet.notaRegularizacion ?? importedDet.notaFinal ?? null,
                    fechaRegularidad: importedDet.fechaRegularidad ?? prevDet?.fechaRegularidad ?? null,
                    ...(prevDet?.historial && { historial: prevDet.historial }),
                };
                continue;
            }

            if (importedEstado === ESTADOS_MATERIA.APROBADO && importedDet.esEquivalencia) {
                // Equivalencia / Eximida: respetar exactamente la resolución de equivalencia
                mergedProgreso[codigo] = ESTADOS_MATERIA.APROBADO;
                mergedDetalles[codigo] = {
                    ...prevDet,
                    ...importedDet,
                    esEquivalencia: true,
                    rendidaLibre: false,
                    notaFinal: importedDet.notaFinal ?? null,
                    notaRegularizacion: null,
                    fechaRegularidad: null,
                    ...(prevDet?.historial && { historial: prevDet.historial }),
                };
                continue;
            }

            if (importedEstado === ESTADOS_MATERIA.APROBADO && importedDet.rendidaLibre) {
                // Aprobada por final Libre: la nota pertenece al final y no hay regularidad de cursada
                mergedProgreso[codigo] = ESTADOS_MATERIA.APROBADO;
                mergedDetalles[codigo] = {
                    ...prevDet,
                    ...importedDet,
                    esEquivalencia: false,
                    rendidaLibre: true,
                    notaFinal: importedDet.notaFinal ?? null,
                    notaRegularizacion: null,
                    fechaRegularidad: null,
                    ...(prevDet?.historial && { historial: prevDet.historial }),
                };
                continue;
            }

            if (importedEstado === ESTADOS_MATERIA.APROBADO) {
                // Final Regular (R-): el Analítico manda en el final e intentos y conserva nota de cursada previa
                mergedProgreso[codigo] = ESTADOS_MATERIA.APROBADO;
                mergedDetalles[codigo] = {
                    ...prevDet,
                    ...importedDet,
                    esEquivalencia: false,
                    rendidaLibre: false,
                    notaFinal: importedDet.notaFinal ?? null,
                    fechaRegularidad: importedDet.fechaRegularidad ?? prevDet?.fechaRegularidad ?? null,
                    notaRegularizacion: prevDet?.notaRegularizacion ?? importedDet.notaRegularizacion ?? null,
                    ...(prevDet?.historial && { historial: prevDet.historial }),
                };
                continue;
            }

            const importedAnioReg = getAnioFromFechaRegularidad(importedDet.fechaRegularidad);
            const prevAnioReg = getAnioFromFechaRegularidad(prevDet?.fechaRegularidad);
            const nextFechaReg =
                importedAnioReg !== null && (prevAnioReg === null || importedAnioReg > prevAnioReg)
                    ? importedDet.fechaRegularidad
                    : (prevDet?.fechaRegularidad ?? importedDet.fechaRegularidad ?? null);
            const nextNotaReg = prevDet?.notaRegularizacion ?? importedDet.notaRegularizacion ?? null;

            /** @type {EstadoMateria} */
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
