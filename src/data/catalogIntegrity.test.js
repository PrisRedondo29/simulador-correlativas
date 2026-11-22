import { describe, expect, it } from 'vitest';
import sistemasPlanes from './sistemas.json';
import equivalenciasRaw from './equivalencias.json';
import optativasData from './optativasData.json';
import { CAREERS_REGISTRY } from '../config/careersRegistry';
import { getPlanDiplomaturasConfig } from '../config/planPolicies';
import { validarPlanEstudios } from '../utils/Plan/planValidator';
import tituloIntermedioUtils from '../utils/Progreso/tituloIntermedioUtils';
import {
    EQUIVALENCIA_APPLICATION_MODE,
    EQUIVALENCIA_USAGE_POLICY,
    EQUIVALENCIA_VALIDATION_STATUS,
    getRuleSourceCodes,
    normalizeEquivalenciasCatalog,
} from '../utils/Plan/equivalenciasUtils';

const plan1713 = sistemasPlanes.find((p) => p.plan_numero === '17.13');
const plan1714 = sistemasPlanes.find((p) => p.plan_numero === '17.14');
const sistemasCareer = CAREERS_REGISTRY.find((c) => c.id === 'sistemas');
const plan1713Config = sistemasCareer?.plans.find((p) => p.planNumero === '17.13');
const plan1714Config = sistemasCareer?.plans.find((p) => p.planNumero === '17.14');

/**
 * Suma total de horas reloj de una lista de materias.
 * @param {Array<{ horas_totales?: string | number }>} materias
 * @returns {number}
 */
function sumHorasTotales(materias) {
    return materias.reduce((acc, m) => acc + (Number(m.horas_totales) || 0), 0);
}

describe('catalogIntegrity - Auditoría transversal de catálogo y referencias normativas', () => {
    it('valida integridad estructural, aciclicidad (DAG), conteo de materias y cargas horarias oficiales 17.13 / 17.14', () => {
        expect(plan1713).toBeDefined();
        expect(plan1714).toBeDefined();
        if (!plan1713 || !plan1714) return;

        const val13 = validarPlanEstudios(plan1713);
        expect(val13.ok).toBe(true);
        expect(val13.errores).toEqual([]);
        expect(val13.ciclos).toEqual([]);

        const val14 = validarPlanEstudios(plan1714);
        expect(val14.ok).toBe(true);
        expect(val14.errores).toEqual([]);
        expect(val14.ciclos).toEqual([]);

        expect(plan1713.materias).toHaveLength(42);
        expect(sumHorasTotales(plan1713.materias)).toBe(3592);

        expect(plan1714.materias).toHaveLength(43);
        expect(sumHorasTotales(plan1714.materias)).toBe(3374);

        const nominalDiff = sumHorasTotales(plan1713.materias) - sumHorasTotales(plan1714.materias);
        expect(nominalDiff).toBe(218);
        expect(plan1713Config?.transition?.savedHours).toBe(218);
    });

    it('verifica Título Intermedio APU 17.14 (24 actividades, 1888 hs exactas, excluyendo 11278 y 14028)', () => {
        expect(plan1714).toBeDefined();
        if (!plan1714) return;

        const intermediateCfg = plan1714Config?.intermediateTitle;
        expect(intermediateCfg?.name).toBe('Analista Programador/a Universitario/a');
        expect(intermediateCfg?.codigos).toHaveLength(24);
        expect(intermediateCfg?.codigos).not.toContain('11278');
        expect(intermediateCfg?.codigos).not.toContain('14028');

        const codigos1714Set = new Set(plan1714.materias.map((m) => m.codigo));
        for (const cod of intermediateCfg?.codigos || []) {
            expect(codigos1714Set.has(cod)).toBe(true);
        }

        expect(tituloIntermedioUtils.getTituloIntermedioNombre('17.14')).toBe(
            'Analista Programador/a Universitario/a',
        );
        const materiasApu = tituloIntermedioUtils.getMateriasIntermedio('17.14', plan1714.materias);
        expect(materiasApu).toHaveLength(24);
        expect(materiasApu.some((m) => m.codigo === '11278')).toBe(false);
        expect(materiasApu.some((m) => m.codigo === '14028')).toBe(false);
        expect(sumHorasTotales(materiasApu)).toBe(1888);
    });

    it('verifica cargas horarias, talleres, acreditaciones y nombres normalizados en Plan 17.14', () => {
        expect(plan1714).toBeDefined();
        if (!plan1714) return;

        const byCode = new Map(plan1714.materias.map((m) => [m.codigo, m]));

        expect(byCode.get('14026')?.horas_semanales).toBe('8');
        expect(byCode.get('14026')?.horas_totales).toBe('48');

        expect(byCode.get('19054')?.horas_semanales).toBe('');
        expect(byCode.get('19054')?.horas_totales).toBe('0');

        expect(byCode.get('39553')?.horas_semanales).toBe('');
        expect(byCode.get('39553')?.horas_totales).toBe('0');

        expect(byCode.get('11256')?.nombre).toBe('Sistemas de Información I');
        expect(byCode.get('13021')?.nombre).toBe('Álgebra Lineal y Geometría');

        expect(byCode.get('PSTC-1714')?.horas_totales).toBe('80');
        expect(byCode.get('TES-1714')?.horas_totales).toBe('120');
        expect(byCode.get('TES-1714')?.tesis).toBe(true);
    });

    it('audita integridad referencial, metadatos normativos, allowlist origen y políticas anti doble cómputo de equivalencias.json', () => {
        expect(plan1713).toBeDefined();
        expect(plan1714).toBeDefined();
        if (!plan1713 || !plan1714) return;

        const codigos1713Set = new Set(plan1713.materias.map((m) => m.codigo));
        const codigos1714Set = new Set(plan1714.materias.map((m) => m.codigo));
        const optativasSet = new Set(optativasData.map((o) => String(o.codigo)));

        const rawEntries = Object.entries(equivalenciasRaw);
        expect(rawEntries).toHaveLength(37);

        // Códigos erróneos históricos erradicados
        expect(equivalenciasRaw).not.toHaveProperty('11419');
        expect(equivalenciasRaw).not.toHaveProperty('21240');

        const normalizedCatalog = normalizeEquivalenciasCatalog(equivalenciasRaw, {
            sourcePlan: '17.13',
            targetPlan: '17.14',
        });
        expect(Object.keys(normalizedCatalog)).toHaveLength(37);

        /** @type {string[]} */
        const pendingTargets = [];
        /** @type {Map<string, string[]>} */
        const rulesBySourceCode = new Map();

        for (const [key, rule] of Object.entries(normalizedCatalog)) {
            expect(rule.targetCode).toBe(key);
            expect(codigos1714Set.has(key)).toBe(true);
            expect(rule.sourcePlan).toBe('17.13');
            expect(rule.targetPlan).toBe('17.14');
            expect(rule.requiredAcademicState).toBe('approved');
            expect(rule.condition.anyOf.length).toBeGreaterThan(0);

            expect(Object.values(EQUIVALENCIA_VALIDATION_STATUS)).toContain(rule.validationStatus);
            expect(Object.values(EQUIVALENCIA_APPLICATION_MODE)).toContain(rule.applicationMode);
            expect(Object.values(EQUIVALENCIA_USAGE_POLICY)).toContain(rule.usagePolicy);

            expect(rule.source?.resolution).toMatch(/^Res\. HCS (260\/24|836\/24)$/);
            expect(Boolean(rule.source?.annex && rule.source.annex.trim().length > 0)).toBe(true);

            // Ninguna regla pending_confirmation puede aplicarse de forma automática
            if (rule.validationStatus === EQUIVALENCIA_VALIDATION_STATUS.PENDING_CONFIRMATION) {
                expect(rule.applicationMode).toBe(EQUIVALENCIA_APPLICATION_MODE.ADVISORY);
                pendingTargets.push(key);
            }

            const allSourceCodes = getRuleSourceCodes(rule, { includeHistorical: true });
            expect(allSourceCodes).not.toContain('11419');
            expect(allSourceCodes).not.toContain('21240');

            for (const branch of rule.condition.anyOf) {
                for (const sourceCode of branch.allOf) {
                    const consumers = rulesBySourceCode.get(sourceCode) || [];
                    consumers.push(key);
                    rulesBySourceCode.set(sourceCode, consumers);

                    if (!codigos1713Set.has(sourceCode)) {
                        // Allowlist explícita de códigos origen no presentes en la malla troncal 17.13
                        if (sourceCode === '10043') {
                            expect(key).toBe('11289');
                            expect(branch.historical).toBe(true);
                        } else if (sourceCode === '11408') {
                            expect(key).toBe('14034');
                            expect(branch.historical).toBe(true);
                        } else if (sourceCode === '21420') {
                            expect(key).toBe('21279');
                            expect(optativasSet.has('21420')).toBe(true);
                        } else {
                            throw new Error(
                                `Código origen no autorizado fuera de malla troncal 17.13: "${sourceCode}" en regla "${key}"`,
                            );
                        }
                    }
                }
            }
        }

        expect(pendingTargets.sort()).toEqual(['11289', '14034', '21279']);

        // Verificación específica Res. HCS 836/24 (14031 requiere 11412 + 11417)
        const rule14031 = normalizedCatalog['14031'];
        expect(rule14031?.condition.anyOf).toEqual([{ allOf: ['11412', '11417'] }]);
        expect(rule14031?.validationStatus).toBe(EQUIVALENCIA_VALIDATION_STATUS.CONFIRMED);
        expect(rule14031?.applicationMode).toBe(EQUIVALENCIA_APPLICATION_MODE.AUTOMATIC);
        expect(rule14031?.source?.resolution).toBe('Res. HCS 836/24');

        // Políticas de exclusividad y materias origen multi-destino (shared)
        const rule21279 = normalizedCatalog['21279'];
        const ruleAO = normalizedCatalog['AO-1714'];
        expect(rule21279?.usagePolicy).toBe(EQUIVALENCIA_USAGE_POLICY.EXCLUSIVE);
        expect(ruleAO?.usagePolicy).toBe(EQUIVALENCIA_USAGE_POLICY.EXCLUSIVE);
        expect(rule21279?.priority).toBeLessThan(ruleAO?.priority);

        for (const sharedSource of ['11072', '11073', '11074', '11075']) {
            const targetKeys = rulesBySourceCode.get(sharedSource) || [];
            expect(targetKeys.length).toBeGreaterThanOrEqual(2);
            for (const targetKey of targetKeys) {
                expect(normalizedCatalog[targetKey]?.usagePolicy).toBe(
                    EQUIVALENCIA_USAGE_POLICY.SHARED,
                );
            }
        }

        // Materias del Plan 17.14 sin regla explícita en equivalencias.json (solo directas idénticas + nuevas 17.14)
        const sinReglaExplicita = plan1714.materias
            .map((m) => m.codigo)
            .filter((cod) => !normalizedCatalog[cod])
            .sort();
        expect(sinReglaExplicita).toEqual([
            '11083',
            '11091',
            '11410',
            '14032',
            '41407',
            'PSTC-1714',
        ]);
    });

    it('valida integridad de optativasData.json y citas normativas en CAREERS_REGISTRY', () => {
        expect(Array.isArray(optativasData)).toBe(true);
        const codigosVistos = new Set();
        for (const opt of optativasData) {
            expect(typeof opt.codigo).toBe('string');
            expect(opt.codigo.trim().length).toBeGreaterThan(0);
            expect(typeof opt.nombre).toBe('string');
            expect(opt.nombre.trim().length).toBeGreaterThan(0);
            expect(opt.nombre).not.toMatch(/artefactor/i);
            expect(codigosVistos.has(opt.codigo)).toBe(false);
            codigosVistos.add(opt.codigo);
        }

        const optByCode = new Map(optativasData.map((o) => [String(o.codigo), o]));
        expect(optByCode.has('11805')).toBe(true);
        expect(optByCode.get('11808')?.nombre).toBe('Artefactos Digitales Interactivos');
        expect(optByCode.has('11809')).toBe(true);
        expect(optByCode.has('21420')).toBe(true);

        expect(plan1713Config?.equivalencias?.resolution).toContain('Res. HCS 260/24');
        expect(plan1713Config?.equivalencias?.resolution).toContain('Res. HCS 836/24');
        expect(plan1714Config?.equivalencias?.resolution).toContain('Res. HCS 260/24');
        expect(plan1714Config?.equivalencias?.resolution).toContain('Res. HCS 836/24');
        expect(plan1713Config?.transition?.resolution).toContain('Res. HCS 89/2025');
    });

    it('audita las 6 diplomaturas intracurriculares del Plan 17.14 (Res. HCS 726/24): IDs, siglas, códigos y cargas horarias oficiales', () => {
        expect(plan1714).toBeDefined();
        if (!plan1714) return;

        const dipls14 = getPlanDiplomaturasConfig('17.14');
        const dipls13 = getPlanDiplomaturasConfig('17.13');
        expect(dipls14).toHaveLength(6);
        expect(dipls13).toEqual([]);

        const byCode14 = new Map(plan1714.materias.map((m) => [m.codigo, m]));
        const optativasSet = new Set(optativasData.map((o) => String(o.codigo)));
        const ids = new Set();
        const shortCodes = new Set();

        for (const dipl of dipls14) {
            expect(ids.has(dipl.id)).toBe(false);
            expect(shortCodes.has(dipl.shortCode)).toBe(false);
            ids.add(dipl.id);
            shortCodes.add(dipl.shortCode);
            expect(dipl.resolution).toBe('Res. HCS 726/24');

            for (const cod of dipl.codigosObligatorios) {
                expect(byCode14.has(cod)).toBe(true);
            }
            for (const slotCod of dipl.codigosOptativasSlot || []) {
                expect(byCode14.has(slotCod)).toBe(true);
            }
            for (const opt of dipl.optativasRequeridas || []) {
                if (opt.codigo) {
                    expect(optativasSet.has(opt.codigo)).toBe(true);
                }
            }
        }

        const expectedMandatoryHours = {
            informatica: 448,
            'analisis-diseno': 384,
            'desarrollo-software': 704,
            'hardware-redes': 544,
            'ciencia-datos': 576,
            'teoria-computacion': 96,
        };

        for (const dipl of dipls14) {
            const mandatoryMats = dipl.codigosObligatorios.map((c) => byCode14.get(c)).filter(Boolean);
            expect(sumHorasTotales(mandatoryMats)).toBe(expectedMandatoryHours[dipl.id]);
        }

        const tdc = dipls14.find((d) => d.id === 'teoria-computacion');
        expect(tdc?.horasTotales).toBe(224);
    });
});
