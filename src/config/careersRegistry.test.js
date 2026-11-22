import { describe, it, expect } from 'vitest';
import {
    CAREERS_REGISTRY,
    normalizePlanNumber,
    getCareerPrefix,
    getAvailableCareers,
    getAvailablePlans,
    getCatalogCareers,
    getCareerByPlan,
    getPlanEntry,
    getPlansSupportingFeature,
    mergeDynamicCatalogCareers,
} from './careersRegistry';
import sistemasPlans from '../data/sistemas.json';

const MULTI_CAREER_MOCK = [
    ...CAREERS_REGISTRY,
    {
        id: 'industrial',
        planPrefix: '25',
        name: 'Ingeniería Industrial',
        shortName: 'Ing. Industrial',
        defaultPlan: '25.01',
        available: true,
        loadPlans: async () => ({ default: [] }),
        plans: [
            {
                planNumero: '25.01',
                label: 'Plan 25.01',
                shortTitle: 'Plan Vigente',
                statusLabel: 'Vigente',
                estimatedSubjects: 40,
                isDefault: true,
                intermediateTitle: null,
                features: {
                    planTransition: false,
                    equivalencias: false,
                    intermediateTitle: false,
                },
                equivalencias: null,
                transition: null,
            },
        ],
    },
];

describe('careersRegistry - Registro declarativo multi-carrera', () => {
    it('expone solo carreras habilitadas con planes cargados (excluye placeholders vacíos)', () => {
        const available = getAvailableCareers();
        const ids = available.map((c) => c.id);

        expect(ids).toContain('sistemas');
        expect(ids).not.toContain('civil');
    });

    it('normaliza identificadores de plan legados y modernos', () => {
        expect(normalizePlanNumber('17.14')).toBe('17.14');
        expect(normalizePlanNumber('Sistemas 17.13')).toBe('17.13');
        expect(normalizePlanNumber(' Plan 25.01 ')).toBe('25.01');
        expect(normalizePlanNumber('WEB-2026')).toBe('WEB-2026');
        expect(normalizePlanNumber('')).toBeNull();
        expect(normalizePlanNumber(null)).toBeNull();

        expect(getCareerPrefix('17.14')).toBe('17');
        expect(getCareerPrefix('25.01')).toBe('25');
    });

    it('resuelve carrera y metadatos enriquecidos al incorporar una segunda carrera al registro', () => {
        const available = getAvailableCareers(MULTI_CAREER_MOCK);
        const plans = getAvailablePlans(MULTI_CAREER_MOCK);

        expect(available.map((c) => c.id)).toEqual(['sistemas', 'industrial']);
        expect(plans.map((p) => p.planNumero)).toEqual(['17.14', '17.13', '25.01']);

        const careerInd = getCareerByPlan('25.01', MULTI_CAREER_MOCK);
        expect(careerInd?.name).toBe('Ingeniería Industrial');

        const entryInd = getPlanEntry('25.01', MULTI_CAREER_MOCK);
        expect(entryInd?.carrera).toBe('Ingeniería Industrial');
        expect(entryInd?.careerShortName).toBe('Ing. Industrial');
        expect(entryInd?.careerId).toBe('industrial');
    });

    it('filtra planes compatibles por capacidad priorizando la carrera activa', () => {
        const transitionPlans = getPlansSupportingFeature('planTransition', {
            careerId: 'sistemas',
            registry: MULTI_CAREER_MOCK,
        });
        expect(transitionPlans.map((p) => p.planNumero)).toEqual(['17.13']);

        const eqPlans = getPlansSupportingFeature('equivalencias', {
            careerId: 'industrial',
            registry: MULTI_CAREER_MOCK,
        });
        expect(eqPlans.map((p) => p.planNumero)).toEqual(['17.14', '17.13']);
    });

    it('mergeDynamicCatalogCareers habilita carreras catalogadas ("Próximamente") o incorpora nuevas carreras desde catalog_meta/index sin recompilar', () => {
        expect(getCatalogCareers().map((c) => c.id)).toEqual(['sistemas', 'civil']);

        const merged = mergeDynamicCatalogCareers({
            '20.08': {
                version: 1,
                carrera: 'Ingeniería Civil',
                careerId: 'civil',
                careerShortName: 'Ing. Civil',
                estimatedSubjects: 42,
            },
            '30.01': {
                version: 1,
                carrera: 'Licenciatura en Administración',
                careerId: 'administracion',
                careerShortName: 'Lic. Admin',
                estimatedSubjects: 34,
            },
        });

        const available = getAvailableCareers(merged);
        expect(available.map((c) => c.id)).toEqual(['sistemas', 'civil', 'administracion']);
        expect(getPlanEntry('20.08', merged)?.carrera).toBe('Ingeniería Civil');
        expect(getPlanEntry('30.01', merged)?.careerShortName).toBe('Lic. Admin');
    });

    it('alinea estimatedSubjects con la cantidad real de materias de cada plan estático de sistemas.json', () => {
        sistemasPlans.forEach((planData) => {
            const entry = getPlanEntry(planData.plan_numero);
            expect(entry).not.toBeNull();
            expect(entry.estimatedSubjects).toBe(planData.materias.length);
        });
    });

    it('configura APU 17.14 oficial (24 códigos), citas 260/24+836/24, diferencia nominal 218 hs y cargas de sistemas.json', () => {
        const entry14 = getPlanEntry('17.14');
        const entry13 = getPlanEntry('17.13');
        const materias13 = sistemasPlans.find((p) => p.plan_numero === '17.13')?.materias || [];
        const materias14 = sistemasPlans.find((p) => p.plan_numero === '17.14')?.materias || [];

        expect(entry14?.intermediateTitle?.name).toBe('Analista Programador/a Universitario/a');
        expect(entry14?.intermediateTitle?.codigos).toHaveLength(24);
        expect(entry14?.intermediateTitle?.codigos).not.toContain('11278');
        expect(entry14?.intermediateTitle?.codigos).not.toContain('14028');
        expect(entry14?.equivalencias?.resolution).toBe('Res. HCS 260/24 (Anexo VI) y Res. HCS 836/24');
        expect(entry13?.equivalencias?.resolution).toBe('Res. HCS 260/24 (Anexo VI) y Res. HCS 836/24');

        const tot13 = materias13.reduce((s, m) => s + (Number(m.horas_totales) || 0), 0);
        const tot14 = materias14.reduce((s, m) => s + (Number(m.horas_totales) || 0), 0);
        expect(tot13 - tot14).toBe(218);
        expect(entry13?.transition?.savedHours).toBe(218);

        const byCode14 = Object.fromEntries(materias14.map((m) => [m.codigo, m]));
        expect(byCode14['14026'].horas_semanales).toBe('8');
        expect(byCode14['19054'].horas_semanales).toBe('');
        expect(byCode14['39553'].horas_semanales).toBe('');
        expect(byCode14['11256'].nombre).toBe('Sistemas de Información I');
        expect(byCode14['13021'].nombre).toBe('Álgebra Lineal y Geometría');
    });
});
