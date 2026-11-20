/**
 * tenantConfig.js
 * Configuración institucional declarativa (Patrón Strategy / Policy para B2B Multi-Universidad).
 * Centraliza la identidad visual, enlaces institucionales, modos de operación y reglas
 * académicas (vigencia de regularidad, cantidad de finales y política de ausentes).
 *
 * Para adaptar el simulador a otra universidad o unidad académica, basta con
 * parametrizar este contrato sin modificar componentes, hooks ni reglas de cálculo.
 */

import reglasUniversidadJson from '../utils/Progreso/reglas_universidad.json';

/** @typedef {import('../types/domain').TenantConfig} TenantConfig */
/** @typedef {import('../types/domain').AcademicRulesConfig} AcademicRulesConfig */

/** @type {AcademicRulesConfig} */
export const DEFAULT_UNLU_ACADEMIC_RULES = Object.freeze({
    cuatrimestresRegularidad: Number(reglasUniversidadJson?.limites?.cuatrimestres_regularidad) || 5,
    intentosFinal: Number(reglasUniversidadJson?.limites?.intentos_final) || 4,
    // Art. 32° RGE UNLu: los ausentes en llamados de examen final no descuentan intentos.
    // Otras universidades pueden configurar `ausenteDescuentaIntento: true`.
    ausenteDescuentaIntento: false,
    notaMinimaAprobacion: 4,
    notaMinimaPromocion: 7,
    instanciasFinal: Array.isArray(reglasUniversidadJson?.instancias_final)
        ? reglasUniversidadJson.instancias_final
        : ['Febrero', 'Mayo', 'Julio-Agosto', 'Septiembre', 'Diciembre'],
});

/** @type {TenantConfig} */
export const UNLU_TENANT_CONFIG = Object.freeze({
    id: 'unlu',
    name: 'Universidad Nacional de Luján',
    shortName: 'UNLu',
    portalTitle: 'Portal Estudiantil',
    themeColor: '#005A36',
    academicRules: DEFAULT_UNLU_ACADEMIC_RULES,
    communityLink: {
        name: 'CODES UNLu',
        description: 'Comunidad, consultas y acompañamiento',
        imgIcon: '/imgs/logo-codes.png',
        icon: 'fa-solid fa-users',
        url: 'https://www.codesunlu.tech/',
    },
    operationModes: {
        identityMode: /** @type {'student_oauth'} */ ('student_oauth'),
        storageMode: /** @type {'local_and_cloud'} */ ('local_and_cloud'),
    },
});

/**
 * Construye una configuración institucional fusionando overrides parciales
 * sobre la configuración base (útil para pilotos multi-universidad y tests).
 *
 * @param {Partial<TenantConfig> & { academicRules?: Partial<AcademicRulesConfig> }} [overrides]
 * @returns {TenantConfig}
 */
export function createTenantConfig(overrides = {}) {
    return {
        ...UNLU_TENANT_CONFIG,
        ...overrides,
        academicRules: {
            ...DEFAULT_UNLU_ACADEMIC_RULES,
            ...(overrides.academicRules || {}),
        },
        operationModes: {
            ...UNLU_TENANT_CONFIG.operationModes,
            ...(overrides.operationModes || {}),
        },
    };
}

/**
 * Devuelve la configuración institucional activa.
 * @returns {TenantConfig}
 */
export function getActiveTenantConfig() {
    return UNLU_TENANT_CONFIG;
}
