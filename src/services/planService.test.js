import { describe, it, expect, beforeEach, vi } from 'vitest';
import planService, { createPlanService } from './planService';

describe('planService - Carga dinámica multi-carrera y caché en memoria', () => {
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

    it('carga y cachea equivalencias de forma dinámica según configuración del plan', async () => {
        const eq1 = await planService.getEquivalenciasByPlan('17.13');
        const eq2 = await planService.getEquivalenciasByPlan('17.14');

        expect(Object.keys(eq1).length).toBeGreaterThan(0);
        // Ambos comparten el mismo par 17.13->17.14 y se sirven desde caché
        expect(eq2).toBe(eq1);
        expect(await planService.getEquivalenciasByPlan('99.99')).toEqual({});
    });

    it('soporta inyectar un registro multi-carrera sin modificar el servicio', async () => {
        const loadIndustrial = vi.fn(async () => ({
            default: [
                {
                    plan_numero: '25.01',
                    materias: [{ codigo: 'IND101', nombre: 'Introducción a la Ingeniería Industrial' }],
                },
            ],
        }));

        const customService = createPlanService([
            {
                id: 'industrial',
                planPrefix: '25',
                name: 'Ingeniería Industrial',
                shortName: 'Ing. Industrial',
                available: true,
                loadPlans: loadIndustrial,
                plans: [{ planNumero: '25.01', features: { equivalencias: false } }],
            },
        ]);

        const plan = await customService.getPlanByNumber('25.01');
        const planAgain = await customService.getPlanByNumber('25.01');

        expect(plan?.carrera).toBe('Ingeniería Industrial');
        expect(plan?.materias).toHaveLength(1);
        expect(planAgain).toBe(plan);
        expect(loadIndustrial).toHaveBeenCalledTimes(1);
        expect(await customService.getEquivalenciasByPlan('25.01')).toEqual({});
    });
});
