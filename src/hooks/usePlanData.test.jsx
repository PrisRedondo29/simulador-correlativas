// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';

const mockGetMateriasByPlan = vi.fn();
const mockGetProgresoLocal = vi.fn();
const mockGetProgresoDetallesLocal = vi.fn();
const mockUpdateAuthProgreso = vi.fn();
const mockAddToast = vi.fn();

vi.mock('../services/planService', () => ({
    default: {
        getMateriasByPlan: (...args) => mockGetMateriasByPlan(...args),
    },
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        getProgresoLocal: mockGetProgresoLocal,
        getProgresoDetallesLocal: mockGetProgresoDetallesLocal,
        updateAuthProgreso: mockUpdateAuthProgreso,
    }),
}));

vi.mock('@heroui/react', () => ({
    addToast: (...args) => mockAddToast(...args),
}));

import usePlanData from './usePlanData';

const MATERIAS_1714 = [
    { codigo: 'M1', nombre: 'Intro Prog', correlativas: [] },
    { codigo: 'M2', nombre: 'Estructuras', correlativas: ['M1'] },
    { codigo: 'TESIS', nombre: 'Tesina de Grado', correlativas: [], tesis: true },
];

const MATERIAS_1713 = [
    { codigo: 'A1', nombre: 'Matemática I', correlativas: [] },
];

describe('usePlanData - Carga de plan, estado derivado e hidratación', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('con plan null devuelve cargandoPlan=false de inmediato sin consultar planService', () => {
        const { result } = renderHook(() => usePlanData(null));

        expect(result.current.cargandoPlan).toBe(false);
        expect(result.current.materias).toEqual([]);
        expect(mockGetMateriasByPlan).not.toHaveBeenCalled();
    });

    it('inicializa Disponible/Bloqueado cuando no hay progreso local y persiste el estado inicial', async () => {
        mockGetMateriasByPlan.mockResolvedValue(MATERIAS_1714);
        mockGetProgresoLocal.mockReturnValue(null);
        mockGetProgresoDetallesLocal.mockReturnValue(null);

        const { result } = renderHook(() => usePlanData('17.14'));

        expect(result.current.cargandoPlan).toBe(true);

        await waitFor(() => {
            expect(result.current.cargandoPlan).toBe(false);
        });

        expect(result.current.materias).toEqual(MATERIAS_1714);
        expect(result.current.progreso).toEqual({
            M1: 'Disponible',
            M2: 'Bloqueado',
            TESIS: 'Bloqueado',
        });
        expect(mockUpdateAuthProgreso).toHaveBeenCalledWith(
            '17.14',
            { M1: 'Disponible', M2: 'Bloqueado', TESIS: 'Bloqueado' },
            {},
        );
    });

    it('pasa a cargandoPlan=true al cambiar de plan mientras resuelve la nueva carga', async () => {
        mockGetMateriasByPlan.mockResolvedValueOnce(MATERIAS_1714);
        mockGetProgresoLocal.mockReturnValue({ M1: 'Aprobado' });
        mockGetProgresoDetallesLocal.mockReturnValue({ M1: { notaFinal: 8 } });

        let resolvePlan13;
        const pending13 = new Promise((resolve) => {
            resolvePlan13 = resolve;
        });

        const { result, rerender } = renderHook(({ plan }) => usePlanData(plan), {
            initialProps: { plan: '17.14' },
        });

        await waitFor(() => {
            expect(result.current.cargandoPlan).toBe(false);
        });

        mockGetMateriasByPlan.mockReturnValueOnce(pending13);
        rerender({ plan: '17.13' });

        // El estado derivado pasa inmediatamente a loading sin flash de setState en efecto
        expect(result.current.cargandoPlan).toBe(true);

        mockGetProgresoLocal.mockReturnValue({ A1: 'Regular' });
        mockGetProgresoDetallesLocal.mockReturnValue({});
        await act(async () => {
            resolvePlan13(MATERIAS_1713);
        });

        await waitFor(() => {
            expect(result.current.cargandoPlan).toBe(false);
        });
        expect(result.current.materias).toEqual(MATERIAS_1713);
        expect(result.current.progreso).toEqual({ A1: 'Regular' });
    });

    it('ante error al cargar el plan muestra toast danger y libera cargandoPlan', async () => {
        mockGetMateriasByPlan.mockRejectedValue(new Error('Plan inexistente'));

        const { result } = renderHook(() => usePlanData('99.99'));

        await waitFor(() => {
            expect(result.current.cargandoPlan).toBe(false);
        });

        expect(mockAddToast).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Error de carga',
                color: 'danger',
            }),
        );
    });

    it('recarga progreso cuando AuthContext emite progress-hydrated', async () => {
        mockGetMateriasByPlan.mockResolvedValue(MATERIAS_1714);
        mockGetProgresoLocal.mockReturnValue({ M1: 'Disponible', M2: 'Bloqueado', TESIS: 'Bloqueado' });
        mockGetProgresoDetallesLocal.mockReturnValue({});

        const { result } = renderHook(() => usePlanData('17.14'));

        await waitFor(() => {
            expect(result.current.cargandoPlan).toBe(false);
        });

        mockGetProgresoLocal.mockReturnValue({ M1: 'Aprobado', M2: 'Disponible', TESIS: 'Bloqueado' });
        mockGetProgresoDetallesLocal.mockReturnValue({ M1: { notaFinal: 9 } });

        await act(async () => {
            window.dispatchEvent(new Event('progress-hydrated'));
        });

        await waitFor(() => {
            expect(result.current.progreso.M1).toBe('Aprobado');
        });
        expect(result.current.progresoDetalles.M1).toEqual({ notaFinal: 9 });
    });
});
