/**
 * Utilidades puras y declarativas para calcular y mapear Diplomaturas Intracurriculares por plan.
 * Lee las reglas desde planPolicies / careersRegistry sin hardcodear planes ni códigos.
 */

import { CAREERS_REGISTRY } from '../../config/careersRegistry';
import { getPlanDiplomaturasConfig } from '../../config/planPolicies';

/** @typedef {import('../../types/domain').CareerConfig} CareerConfig */
/** @typedef {import('../../types/domain').DiplomaturaConfig} DiplomaturaConfig */
/** @typedef {import('../../types/domain').DiplomaturaMateriaTag} DiplomaturaMateriaTag */
/** @typedef {import('../../types/domain').DiplomaturaProgresoResumen} DiplomaturaProgresoResumen */
/** @typedef {import('../../types/domain').ProgresoMap} ProgresoMap */
/** @typedef {import('../../types/domain').ProgresoDetallesMap} ProgresoDetallesMap */

const ESTADOS_APROBADOS = new Set(['Aprobado', 'Promocionado']);

/**
 * Devuelve las diplomaturas declaradas para el plan indicado.
 * @param {string | null | undefined} plan
 * @param {CareerConfig[]} [registry]
 * @returns {DiplomaturaConfig[]}
 */
export function getDiplomaturasByPlan(plan, registry = CAREERS_REGISTRY) {
    return getPlanDiplomaturasConfig(plan, registry);
}

/**
 * Indexa por código de materia a qué diplomaturas aporta (soportando múltiples diplomaturas
 * y marcando los slots de optativas como referencia orientativa).
 * @param {string | null | undefined} plan
 * @param {CareerConfig[]} [registry]
 * @returns {Record<string, DiplomaturaMateriaTag[]>}
 */
export function getDiplomaturasPorMateria(plan, registry = CAREERS_REGISTRY) {
    const diplomaturas = getDiplomaturasByPlan(plan, registry);
    /** @type {Record<string, DiplomaturaMateriaTag[]>} */
    const map = {};

    const addTag = (rawCode, diplomatura, esOptativa) => {
        const code = String(rawCode || '').trim();
        if (!code) return;
        if (!map[code]) {
            map[code] = [];
        }
        const exists = map[code].some((entry) => entry.diplomatura.id === diplomatura.id);
        if (!exists) {
            map[code].push({ diplomatura, esOptativa });
        }
    };

    diplomaturas.forEach((diplomatura) => {
        (diplomatura.codigosObligatorios || []).forEach((codigo) => {
            addTag(codigo, diplomatura, false);
        });
        (diplomatura.codigosOptativasSlot || []).forEach((codigo) => {
            addTag(codigo, diplomatura, true);
        });
    });

    return map;
}

/**
 * Verifica si una optativa específica fue acreditada ya sea por su código propio en `progreso`
 * o registrada como `codigoOptativa` dentro de un slot aprobado (por ej. `AO-1714`).
 * @param {string} targetOptCode
 * @param {ProgresoMap} progreso
 * @param {ProgresoDetallesMap} progresoDetalles
 * @returns {boolean}
 */
function hasApprovedOptativa(targetOptCode, progreso = {}, progresoDetalles = {}) {
    const code = String(targetOptCode);
    if (ESTADOS_APROBADOS.has(progreso?.[code])) {
        return true;
    }

    return Object.entries(progreso || {}).some(([slotCode, estado]) => {
        if (!ESTADOS_APROBADOS.has(estado)) return false;
        const det = progresoDetalles?.[slotCode];
        return Boolean(det?.codigoOptativa && String(det.codigoOptativa).trim() === code);
    });
}

/**
 * Calcula el avance real de una diplomatura a partir de materias aprobadas/promocionadas.
 * @param {DiplomaturaConfig} diplomatura
 * @param {ProgresoMap} [progreso]
 * @param {ProgresoDetallesMap} [progresoDetalles]
 * @returns {DiplomaturaProgresoResumen}
 */
export function calcularProgresoDiplomatura(diplomatura, progreso = {}, progresoDetalles = {}) {
    const obligatorias = diplomatura.codigosObligatorios || [];
    const optativas = diplomatura.optativasRequeridas || [];

    const obligatoriasAprobadas = obligatorias.filter((cod) =>
        ESTADOS_APROBADOS.has(progreso?.[String(cod)]),
    ).length;

    const optativasAprobadas = optativas.filter((opt) =>
        opt?.codigo ? hasApprovedOptativa(String(opt.codigo), progreso, progresoDetalles) : false,
    ).length;

    const totales = obligatorias.length + optativas.length;
    const completadas = obligatoriasAprobadas + optativasAprobadas;
    const faltantesCount = Math.max(0, totales - completadas);
    const porcentaje = totales > 0 ? Math.round((completadas * 100) / totales) : 0;
    const tieneOptativasRequeridas = optativas.length > 0;
    const tieneOptativaSinCodigo = optativas.some((opt) => !opt?.codigo);
    const obtenida = totales > 0 && completadas === totales && !tieneOptativaSinCodigo;

    return {
        id: diplomatura.id,
        shortCode: diplomatura.shortCode,
        shortName: diplomatura.shortName,
        name: diplomatura.name,
        resolution: diplomatura.resolution,
        horasTotales: diplomatura.horasTotales,
        completadas,
        totales,
        faltantesCount,
        porcentaje,
        obtenida,
        tieneOptativasRequeridas,
        tieneOptativaSinCodigo,
        notaNormativa: diplomatura.notaNormativa,
        color: diplomatura.color,
    };
}

/**
 * Calcula el progreso de todas las diplomaturas declaradas para un plan.
 * @param {string | null | undefined} plan
 * @param {ProgresoMap} [progreso]
 * @param {ProgresoDetallesMap} [progresoDetalles]
 * @param {CareerConfig[]} [registry]
 * @returns {DiplomaturaProgresoResumen[]}
 */
export function calcularProgresoDiplomaturas(
    plan,
    progreso = {},
    progresoDetalles = {},
    registry = CAREERS_REGISTRY,
) {
    return getDiplomaturasByPlan(plan, registry).map((dipl) =>
        calcularProgresoDiplomatura(dipl, progreso, progresoDetalles),
    );
}

export default {
    getDiplomaturasByPlan,
    getDiplomaturasPorMateria,
    calcularProgresoDiplomatura,
    calcularProgresoDiplomaturas,
};
