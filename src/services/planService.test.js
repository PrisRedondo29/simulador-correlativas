import { describe, it, expect, beforeEach, vi } from 'vitest';
import planService, { createPlanService } from './planService';
import { createStorageRepository } from './storageRepository';

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

    it('Stale-While-Revalidate: descarga nueva versión solo cuando catalog_meta/index reporta versión mayor, migra códigos y registra notificación con changelogMessage', async () => {
        const map = new Map();
        const memStorage = createStorageRepository({
            get length() {
                return map.size;
            },
            key: (idx) => Array.from(map.keys())[idx] ?? null,
            getItem: (k) => (map.has(k) ? map.get(k) : null),
            setItem: (k, v) => {
                map.set(k, String(v));
            },
            removeItem: (k) => {
                map.delete(k);
            },
        });

        // El alumno tiene progreso cargado en el plan 25.01 con el código viejo IND101
        memStorage.setProgreso('25.01', {
            IND101: 'Aprobado',
            IND102: 'Disponible',
        });
        memStorage.setProgresoDetalles('25.01', {
            IND101: { notaFinal: 10 },
        });

        const fetchMeta = vi.fn(async () => ({
            '25.01': { version: 2, changelogMessage: 'Se actualizó el código IND101 a IND101B' },
        }));

        const fetchPlan = vi.fn(async (planNum) => ({
            plan_numero: planNum,
            carrera: 'Ingeniería Industrial',
            version: 2,
            changelogMessage: 'Se actualizó el código IND101 a IND101B',
            codeMappings: { IND101: 'IND101B' },
            materias: [
                {
                    codigo: 'IND101B',
                    nombre: 'Introducción a la Ingeniería Industrial',
                    anio: 1,
                    correlativas: [],
                },
                {
                    codigo: 'IND102',
                    nombre: 'Economía Industrial',
                    anio: 1,
                    correlativas: ['IND101B'],
                },
            ],
        }));

        const swrService = createPlanService(
            [
                {
                    id: 'industrial',
                    planPrefix: '25',
                    name: 'Ingeniería Industrial',
                    shortName: 'Ing. Industrial',
                    available: true,
                    loadPlans: async () => ({
                        default: [
                            {
                                plan_numero: '25.01',
                                materias: [
                                    { codigo: 'IND101', nombre: 'Intro', anio: 1, correlativas: [] },
                                    {
                                        codigo: 'IND102',
                                        nombre: 'Economía',
                                        anio: 1,
                                        correlativas: ['IND101'],
                                    },
                                ],
                            },
                        ],
                    }),
                    plans: [{ planNumero: '25.01' }],
                },
            ],
            {
                storageRepo: memStorage,
                ttlMs: 60_000,
                fetchRemoteCatalogMeta: fetchMeta,
                fetchRemotePublishedPlan: fetchPlan,
            },
        );

        const updated = await swrService.revalidatePlanIfStale('25.01');
        expect(updated?.version).toBe(2);
        expect(fetchMeta).toHaveBeenCalledTimes(1);
        expect(fetchPlan).toHaveBeenCalledTimes(1);

        // El progreso y la nota 10 se migraron automáticamente de IND101 a IND101B
        expect(memStorage.getProgreso('25.01')).toEqual({
            IND101B: 'Aprobado',
            IND102: 'Disponible',
        });
        expect(memStorage.getProgresoDetalles('25.01')).toEqual({
            IND101B: { notaFinal: 10 },
        });

        // Se registró la notificación con el motivo del cambio para el alumno
        const notice = memStorage.getPlanUpdateNotice('25.01');
        expect(notice?.version).toBe(2);
        expect(notice?.changelogMessage).toBe('Se actualizó el código IND101 a IND101B');
        expect(notice?.codigosMigrados).toEqual([{ desde: 'IND101', hacia: 'IND101B' }]);

        // Una segunda llamada dentro de la ventana TTL NO vuelve a golpear Firestore
        await swrService.revalidatePlanIfStale('25.01');
        expect(fetchMeta).toHaveBeenCalledTimes(1);
        expect(fetchPlan).toHaveBeenCalledTimes(1);

        // Y getPlanByNumber devuelve instantáneamente el plan v2 cacheado en storageRepository
        const cachedPlan = await swrService.getPlanByNumber('25.01');
        expect(cachedPlan?.version).toBe(2);
        expect(cachedPlan?.materias[0].codigo).toBe('IND101B');
    });
});
