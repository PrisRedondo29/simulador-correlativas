import { describe, it, expect } from 'vitest';
import {
    canUseFeature,
    getPlanTransitionMeta,
    getAcademicNavItems,
} from './planPolicies';

describe('planPolicies - Capacidades y navegación por plan', () => {
    it('habilita Cambio de Plan únicamente en el Plan 17.13', () => {
        expect(canUseFeature('17.13', 'planTransition')).toBe(true);
        expect(canUseFeature('17.14', 'planTransition')).toBe(false);
        expect(canUseFeature(null, 'planTransition')).toBe(false);
    });

    it('retorna metadatos de transición solo para Plan 17.13', () => {
        const meta13 = getPlanTransitionMeta('17.13');
        expect(meta13).not.toBeNull();
        expect(meta13.targetPlan).toBe('17.14');
        expect(meta13.route).toBe('/cambio-plan');

        expect(getPlanTransitionMeta('17.14')).toBeNull();
    });

    it('oculta el ítem "Cambio de Plan" del menú en Plan 17.14', () => {
        const nav13 = getAcademicNavItems('17.13').map((i) => i.name);
        const nav14 = getAcademicNavItems('17.14').map((i) => i.name);

        expect(nav13).toContain('Cambio de Plan');
        expect(nav14).not.toContain('Cambio de Plan');
        expect(nav14).toContain('Mi Progreso');
        expect(nav14).toContain('Equivalencias');
    });
});
