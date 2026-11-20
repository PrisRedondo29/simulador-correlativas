import { describe, it, expect } from 'vitest';
import {
    CAREERS_REGISTRY,
    normalizePlanNumber,
    getCareerPrefix,
    getAvailableCareers,
    getAvailablePlans,
    getCareerByPlan,
    getPlanEntry,
    getPlansSupportingFeature,
} from './careersRegistry';

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
});
