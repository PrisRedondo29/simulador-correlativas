/**
 * Utilidades declarativas para el manejo del Título Intermedio por plan/carrera.
 * Lee las reglas desde planPolicies / careersRegistry sin hardcodear planes.
 */

import { CAREERS_REGISTRY } from '../../config/careersRegistry';
import { getIntermediateTitleConfig } from '../../config/planPolicies';

/**
 * Obtiene el nombre del título intermedio según la configuración del plan.
 * @param {string} plan - Identificador del plan de estudios (ej: "17.14")
 * @param {Array} [registry] - Registro de carreras opcional (para inyección en tests)
 * @returns {string} - Nombre del título intermedio o string vacío si el plan no tiene
 */
const getTituloIntermedioNombre = (plan, registry = CAREERS_REGISTRY) => {
    const config = getIntermediateTitleConfig(plan, registry);
    return config?.name || '';
};

/**
 * Obtiene las materias requeridas para el título intermedio según la configuración del plan.
 * Soporta corte por `maxCuatrimestre` o lista explícita de `codigos`.
 * @param {string} plan - Identificador del plan de estudios
 * @param {Array} materias - Lista de todas las materias del plan
 * @param {Array} [registry] - Registro de carreras opcional (para inyección en tests)
 * @returns {Array} - Lista de materias filtradas para el título intermedio
 */
const getMateriasIntermedio = (plan, materias, registry = CAREERS_REGISTRY) => {
    if (!materias || materias.length === 0) return [];

    const config = getIntermediateTitleConfig(plan, registry);
    if (!config) return [];

    if (Array.isArray(config.codigos) && config.codigos.length > 0) {
        const codigoSet = new Set(config.codigos.map(String));
        return materias.filter(
            (m) => codigoSet.has(String(m.codigo)) && !m.tesis && m.codigo !== 'N/A',
        );
    }

    if (typeof config.maxCuatrimestre === 'number') {
        return materias.filter(
            (m) =>
                Number(m.cuatrimestre) <= config.maxCuatrimestre &&
                !m.tesis &&
                m.codigo !== 'N/A',
        );
    }

    return [];
};

/**
 * Calcula el progreso del título intermedio.
 * @param {Array} materiasIntermedio - Materias requeridas para el título intermedio
 * @param {Object} progreso - Estado de progreso de todas las materias
 * @returns {{ porcentaje: number, completadas: number, totales: number }}
 */
const calcularProgresoIntermedio = (materiasIntermedio, progreso = {}) => {
    if (!materiasIntermedio || materiasIntermedio.length === 0) {
        return { porcentaje: 0, completadas: 0, totales: 0 };
    }

    const completadas = materiasIntermedio.filter(
        (m) => progreso[m.codigo] === 'Aprobado' || progreso[m.codigo] === 'Promocionado',
    ).length;

    const totales = materiasIntermedio.length;
    const porcentaje = Math.round((completadas * 100) / totales);

    return { porcentaje, completadas, totales };
};

export default {
    getTituloIntermedioNombre,
    getMateriasIntermedio,
    calcularProgresoIntermedio,
};
