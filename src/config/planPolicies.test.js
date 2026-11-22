import { describe, it, expect } from 'vitest';
import {
    canUseFeature,
    getPlanPolicy,
    getPlanTransitionMeta,
    getPlanEquivalenciasMeta,
    getIntermediateTitleConfig,
    getPlanDiplomaturasConfig,
    getAcademicNavItems,
} from './planPolicies';
import { CAREERS_REGISTRY } from './careersRegistry';

const SECOND_CAREER_REGISTRY = [
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

describe('planPolicies - Capacidades y navegación por plan y carrera', () => {
    it('habilita Cambio de Plan únicamente en el Plan 17.13', () => {
        expect(canUseFeature('17.13', 'planTransition')).toBe(true);
        expect(canUseFeature('17.14', 'planTransition')).toBe(false);
        expect(canUseFeature(null, 'planTransition')).toBe(false);
    });

    it('retorna metadatos de transición solo para Plan 17.13', () => {
        const meta13 = getPlanTransitionMeta('17.13');
        expect(meta13).not.toBeNull();
        expect(meta13.sourcePlan).toBe('17.13');
        expect(meta13.targetPlan).toBe('17.14');
        expect(meta13.route).toBe('/cambio-plan');

        expect(getPlanTransitionMeta('17.14')).toBeNull();
    });

    it('oculta el ítem "Cambio de Plan" del menú en Plan 17.14 y usa rutas semánticas', () => {
        const nav13 = getAcademicNavItems('17.13');
        const nav14 = getAcademicNavItems('17.14');

        expect(nav13.map((i) => i.name)).toContain('Cambio de Plan');
        expect(nav14.map((i) => i.name)).not.toContain('Cambio de Plan');
        expect(nav14.map((i) => i.name)).toContain('Mis Materias');
        expect(nav14.map((i) => i.name)).toContain('Mi Agenda');
        expect(nav14.map((i) => i.name)).toContain('Estadísticas');
        expect(nav14.map((i) => i.name)).toContain('Equivalencias');
        expect(nav14.map((i) => i.path)).toEqual([
            '/',
            '/mis-materias',
            '/mi-agenda',
            '/simulador',
            '/estadisticas',
            '/equivalencias',
        ]);
    });

    it('adapta navegación, metadatos y capacidades automáticamente para una segunda carrera sin equivalencias ni título intermedio', () => {
        const policy = getPlanPolicy('25.01', SECOND_CAREER_REGISTRY);
        expect(policy.carrera).toBe('Ingeniería Industrial');
        expect(policy.careerShortName).toBe('Ing. Industrial');

        expect(canUseFeature('25.01', 'equivalencias', SECOND_CAREER_REGISTRY)).toBe(false);
        expect(canUseFeature('25.01', 'planTransition', SECOND_CAREER_REGISTRY)).toBe(false);
        expect(canUseFeature('25.01', 'intermediateTitle', SECOND_CAREER_REGISTRY)).toBe(false);
        expect(getPlanEquivalenciasMeta('25.01', SECOND_CAREER_REGISTRY)).toBeNull();
        expect(getIntermediateTitleConfig('25.01', SECOND_CAREER_REGISTRY)).toBeNull();

        const navInd = getAcademicNavItems('25.01', SECOND_CAREER_REGISTRY).map((i) => i.name);
        expect(navInd).toEqual(['Inicio', 'Mis Materias', 'Mi Agenda', 'Simulador de Avance', 'Estadísticas']);
    });

    it('deshabilita capacidades opcionales ante un plan desconocido', () => {
        expect(canUseFeature('99.01', 'planTransition')).toBe(false);
        expect(canUseFeature('99.01', 'equivalencias')).toBe(false);
        expect(canUseFeature('99.01', 'intermediateTitle')).toBe(false);
        expect(canUseFeature('99.01', 'diplomaturas')).toBe(false);
        expect(getPlanDiplomaturasConfig('99.01')).toEqual([]);
    });

    it('expone diplomaturas declarativas en Plan 17.14 y lista vacía en Plan 17.13 y carreras sin diplomaturas', () => {
        expect(canUseFeature('17.14', 'diplomaturas')).toBe(true);
        expect(getPlanDiplomaturasConfig('17.14')).toHaveLength(6);

        expect(canUseFeature('17.13', 'diplomaturas')).toBe(false);
        expect(getPlanDiplomaturasConfig('17.13')).toEqual([]);

        expect(canUseFeature('25.01', 'diplomaturas', SECOND_CAREER_REGISTRY)).toBe(false);
        expect(getPlanDiplomaturasConfig('25.01', SECOND_CAREER_REGISTRY)).toEqual([]);
    });
});
