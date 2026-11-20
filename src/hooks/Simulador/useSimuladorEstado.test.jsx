// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';

const mockGetPlanByNumber = vi.fn();
const mockAddToast = vi.fn();

vi.mock('@heroui/react', () => ({
    addToast: (...args) => mockAddToast(...args),
}));

vi.mock('../../services/planService', () => ({
    default: {
        getPlanByNumber: (...args) => mockGetPlanByNumber(...args),
    },
}));

vi.mock('../../services/analyticsService', () => ({
    trackAvanceSemestre: vi.fn(),
    trackProyeccionEgreso: vi.fn(),
    trackIntencionCursada: vi.fn(),
    trackAlertaDesercion: vi.fn(),
}));

import useSimuladorEstado from './useSimuladorEstado';

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
});
