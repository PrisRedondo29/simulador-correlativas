// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';

const mockGetPlanByNumber = vi.fn();
const mockGetEquivalenciasByPlan = vi.fn();
const mockAddToast = vi.fn();

vi.mock('@heroui/react', () => ({
    addToast: (...args) => mockAddToast(...args),
}));

vi.mock('../../services/planService', () => ({
    default: {
        getPlanByNumber: (...args) => mockGetPlanByNumber(...args),
        getEquivalenciasByPlan: (...args) => mockGetEquivalenciasByPlan(...args),
    },
}));

vi.mock('../../services/analyticsService', () => ({
    trackAvanceSemestre: vi.fn(),
    trackProyeccionEgreso: vi.fn(),
    trackIntencionCursada: vi.fn(),
    trackAlertaDesercion: vi.fn(),
}));

import useSimuladorEstado, { homologarProgresoSimulado1713A1714 } from './useSimuladorEstado';

const mockPlanMaterias = [
    { codigo: 'M1', nombre: 'Intro', anio: 1, cuatrimestre: 1, correlativas: [] },
    { codigo: 'M2', nombre: 'Prog I', anio: 1, cuatrimestre: 2, correlativas: ['M1'] },
];

describe('useSimuladorEstado - Navegación de semestres, retroceso y finalización', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetPlanByNumber.mockResolvedValue({
            plan_numero: '17.14',
            materias: mockPlanMaterias,
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('inicializa el plan limpio, avanza semestres cambiando año correctamente y permite retroceder al snapshot exacto', async () => {
        const { result } = renderHook(() =>
            useSimuladorEstado({ plan: '17.14', anioInicio: 2026, cuatriInicio: '1' }),
        );

        await waitFor(() => {
            expect(result.current.materias).toHaveLength(2);
        });

        expect(result.current.anioActual).toBe(2026);
        expect(result.current.cuatri).toBe('1');
        expect(result.current.estadoAnterior).toBe(false);
        expect(result.current.progresoSimulado).toEqual({ M1: 'No Cursado', M2: 'No Cursado' });

        // Cuatrimestre 1 (2026): cursa M1 -> pasa a 2026-C2
        act(() => {
            result.current.setProgresoSimulado((prev) => ({ ...prev, M1: 'Cursado' }));
        });
        act(() => {
            result.current.handleSiguiente([mockPlanMaterias[0]]);
        });

        expect(result.current.anioActual).toBe(2026);
        expect(result.current.cuatri).toBe('2');
        expect(result.current.estadoAnterior).toBe(true);
        expect(result.current.historialSemestres).toHaveLength(1);
        expect(result.current.simulacionTerminada).toBe(false);

        // Cuatrimestre 2 (2026): avanza sin cursar M2 -> pasa a 2027-C1 y avisa con toast
        act(() => {
            result.current.handleSiguiente([mockPlanMaterias[1]]);
        });

        expect(result.current.anioActual).toBe(2027);
        expect(result.current.cuatri).toBe('1');
        expect(mockAddToast).toHaveBeenCalled();

        // Retroceder vuelve exactamente a 2026-C2
        act(() => {
            result.current.handleAnterior();
        });
        expect(result.current.anioActual).toBe(2026);
        expect(result.current.cuatri).toBe('2');
        expect(result.current.historialSemestres).toHaveLength(1);

        // Ahora sí cursa M2 -> finaliza la carrera
        act(() => {
            result.current.setProgresoSimulado((prev) => ({ ...prev, M2: 'Cursado' }));
        });
        act(() => {
            result.current.handleSiguiente([mockPlanMaterias[1]]);
        });

        expect(result.current.simulacionTerminada).toBe(true);
        expect(result.current.estadoSiguiente).toBe(false);
    });

    it('importarHistorialReconstruido restaura historial, progreso, año y cuatrimestre', async () => {
        const { result } = renderHook(() =>
            useSimuladorEstado({ plan: '17.14', anioInicio: 2026, cuatriInicio: '1' }),
        );

        await waitFor(() => {
            expect(result.current.materias).toHaveLength(2);
        });

        act(() => {
            result.current.importarHistorialReconstruido({
                historial: [
                    {
                        anioActual: 2025,
                        cuatri: '2',
                        materiasDelSemestre: [mockPlanMaterias[0]],
                        progresoSnapshot: { M1: 'Cursado', M2: 'No Cursado' },
                        progresoBaseSnapshot: { M1: 'No Cursado', M2: 'No Cursado' },
                    },
                ],
                progresoFinal: { M1: 'Cursado', M2: 'No Cursado' },
                anioFinal: 2026,
                cuatriFinal: '1',
            });
        });

        expect(result.current.historialSemestres).toHaveLength(1);
        expect(result.current.progresoSimulado).toEqual({ M1: 'Cursado', M2: 'No Cursado' });
        expect(result.current.anioActual).toBe(2026);
        expect(result.current.cuatri).toBe('1');
        expect(result.current.simulacionTerminada).toBe(false);
    });

    it('simula transición híbrida 17.13 -> 17.14 al alcanzar el cuatrimestre elegido y revierte con handleAnterior', async () => {
        const materias1713 = [
            { codigo: '11071', nombre: 'Intro Prog', anio: 1, cuatrimestre: 1, correlativas: [] },
            { codigo: '11074', nombre: 'Prog I', anio: 1, cuatrimestre: 2, correlativas: ['11071'] },
        ];
        const materias1714 = [
            { codigo: '11271', nombre: 'Intro Prog (17.14)', anio: 1, cuatrimestre: 1, correlativas: [] },
            { codigo: '11274', nombre: 'Prog Estructurada', anio: 1, cuatrimestre: 2, correlativas: ['11271'] },
            { codigo: '11275', nombre: 'EDA I', anio: 2, cuatrimestre: 3, correlativas: ['11274'] },
        ];

        mockGetPlanByNumber.mockImplementation(async (p) =>
            p === '17.13'
                ? { plan_numero: '17.13', materias: materias1713 }
                : { plan_numero: '17.14', materias: materias1714 },
        );
        mockGetEquivalenciasByPlan.mockResolvedValue({
            11271: ['11071'],
            11274: ['11074'],
        });

        const { result } = renderHook(() =>
            useSimuladorEstado({
                plan: '17.13',
                anioInicio: 2026,
                cuatriInicio: '2',
                planTransition: { enabled: true, targetPlan: '17.14', anio: 2027, cuatri: '1' },
            }),
        );

        await waitFor(() => {
            expect(result.current.materias).toHaveLength(2);
            expect(result.current.targetPlanData.materiasTarget).toHaveLength(3);
        });

        expect(result.current.activePlan).toBe('17.13');

        // En 2°C 2026 aprueba 11071 en Plan 17.13 y avanza a 1°C 2027 (cuatrimestre de cambio)
        act(() => {
            result.current.setProgresoSimulado((prev) => ({ ...prev, 11071: 'Cursado' }));
        });
        act(() => {
            result.current.handleSiguiente([materias1713[0]]);
        });

        expect(result.current.activePlan).toBe('17.14');
        expect(result.current.anioActual).toBe(2027);
        expect(result.current.cuatri).toBe('1');
        expect(result.current.materias.map((m) => m.codigo)).toEqual(['11271', '11274', '11275']);
        expect(result.current.progresoSimulado).toEqual({
            11271: 'Cursado',
            11274: 'No Cursado',
            11275: 'No Cursado',
        });
        expect(result.current.transitionAppliedInfo).toMatchObject({
            fromPlan: '17.13',
            toPlan: '17.14',
            anio: 2027,
            cuatri: '1',
            equivalenciasCount: 1,
        });

        // Retroceder con handleAnterior vuelve al 2°C 2026 en Plan 17.13
        act(() => {
            result.current.handleAnterior();
        });

        expect(result.current.activePlan).toBe('17.13');
        expect(result.current.anioActual).toBe(2026);
        expect(result.current.cuatri).toBe('2');
        expect(result.current.transitionAppliedInfo).toBeNull();
        expect(result.current.materias.map((m) => m.codigo)).toEqual(['11071', '11074']);
    });

    it('homologarProgresoSimulado1713A1714 soporta AND/OR, UX Opción A vs projection_with_advisory y exclusividad', () => {
        const materias1714 = [
            { codigo: '14031', nombre: 'Teoría de la Computación', anio: 4, cuatrimestre: 7, correlativas: [] },
            { codigo: '11289', nombre: 'Inteligencia Artificial', anio: 4, cuatrimestre: 8, correlativas: [] },
            { codigo: '21279', nombre: 'Gestión Innovadora', anio: 3, cuatrimestre: 6, correlativas: [] },
            { codigo: 'OTHER', nombre: 'Otra Optativa', anio: 4, cuatrimestre: 8, correlativas: [] },
        ];

        const catalog = {
            14031: {
                sourcePlan: '17.13',
                targetPlan: '17.14',
                condition: { anyOf: [{ allOf: ['11412', '11417'] }] },
                validationStatus: 'confirmed',
                applicationMode: 'automatic',
                usagePolicy: 'shared',
            },
            11289: {
                sourcePlan: '17.13',
                targetPlan: '17.14',
                condition: { anyOf: [{ allOf: ['11089'] }, { allOf: ['10043'] }] },
                validationStatus: 'pending_confirmation',
                applicationMode: 'advisory',
                usagePolicy: 'shared',
            },
            21279: {
                sourcePlan: '17.13',
                targetPlan: '17.14',
                condition: { anyOf: [{ allOf: ['21420'] }] },
                validationStatus: 'confirmed',
                applicationMode: 'automatic',
                usagePolicy: 'exclusive',
                priority: 10,
            },
            OTHER: {
                sourcePlan: '17.13',
                targetPlan: '17.14',
                condition: { anyOf: [{ allOf: ['21420'] }] },
                validationStatus: 'confirmed',
                applicationMode: 'automatic',
                usagePolicy: 'exclusive',
                priority: 50,
            },
        };

        const progreso1713 = {
            11412: 'Cursado',
            11417: 'Cursado',
            10043: 'Cursado',
            21420: 'Cursado',
        };

        const consolidated = homologarProgresoSimulado1713A1714(
            progreso1713,
            materias1714,
            catalog,
            { mode: 'consolidated' },
        );
        expect(consolidated.progreso1714['14031']).toBe('Cursado');
        expect(consolidated.progreso1714['11289']).toBe('No Cursado');
        expect(consolidated.progreso1714['21279']).toBe('Cursado');
        expect(consolidated.progreso1714.OTHER).toBe('No Cursado');
        expect(consolidated.equivalenciasCount).toBe(2);
        expect(consolidated.advisoryEquivalencias).toHaveLength(1);
        expect(consolidated.advisoryEquivalencias[0].targetCode).toBe('11289');

        const projected = homologarProgresoSimulado1713A1714(
            progreso1713,
            materias1714,
            catalog,
            { mode: 'projection_with_advisory' },
        );
        expect(projected.progreso1714['11289']).toBe('Cursado');
        expect(projected.equivalenciasCount).toBe(3);
    });
});
