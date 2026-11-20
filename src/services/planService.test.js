import { describe, it, expect, beforeEach } from 'vitest';
import planService from './planService';

describe('planService - Carga dinámica y caché en memoria', () => {
    beforeEach(() => {
        planService.clearCache();
    });

    it('carga dinámicamente los planes 17.13 y 17.14 y cachea resultados', async () => {
        const plan13 = await planService.getPlanByNumber('17.13');
        const plan14 = await planService.getPlanByNumber('17.14');
        const plan14Cached = await planService.getPlanByNumber('17.14');

        expect(plan13?.plan_numero).toBe('17.13');
        expect(plan13?.materias?.length).toBeGreaterThan(0);

        expect(plan14?.plan_numero).toBe('17.14');
        expect(plan14?.materias?.length).toBeGreaterThan(0);
        // Al venir de caché en memoria, devuelve exactamente la misma referencia
        expect(plan14Cached).toBe(plan14);
    });

    it('getMateriasByPlan retorna materias válidas y lanza error ante plan inexistente', async () => {
        const materias = await planService.getMateriasByPlan('17.14');
        expect(Array.isArray(materias)).toBe(true);
        expect(materias.length).toBeGreaterThan(0);

        expect(await planService.getPlanByNumber('99.99')).toBeNull();
        await expect(planService.getMateriasByPlan('99.99')).rejects.toThrow(/no existe/);
    });
});
