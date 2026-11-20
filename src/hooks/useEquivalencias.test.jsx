// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import storageRepository from '../services/storageRepository';

const mockGetPlanByNumber = vi.fn();
const mockGetEquivalenciasByPlan = vi.fn();

vi.mock('../services/planService', () => ({
    default: {
        getPlanByNumber: (...args) => mockGetPlanByNumber(...args),
        getEquivalenciasByPlan: (...args) => mockGetEquivalenciasByPlan(...args),
    },
}));

import { PlanProvider } from '../context/PlanContext';
import { useEquivalencias } from './useEquivalencias';

const planViejoMock = {
    plan_numero: '17.13',
    materias: [
        { codigo: '11071', nombre: 'Introducción a la Programación', anio: 1, cuatrimestre: 1, horas_totales: '100', horas_semanales: '6' },
        { codigo: '11072', nombre: 'Álgebra', anio: 1, cuatrimestre: 1, horas_totales: '80', horas_semanales: '5' },
        { codigo: '11073', nombre: 'Lógica', anio: 1, cuatrimestre: 2, horas_totales: '80', horas_semanales: '5' },
        { codigo: '11999', nombre: 'Materia Extinguida', anio: 2, cuatrimestre: 1, horas_totales: '60', horas_semanales: '4' },
    ],
};

const planNuevoMock = {
    plan_numero: '17.14',
    materias: [
        { codigo: '11071', nombre: 'Introducción a la Programación', anio: 1, cuatrimestre: 1, horas_totales: '100', horas_semanales: '6' },
        { codigo: '21001', nombre: 'Álgebra y Lógica Computacional', anio: 1, cuatrimestre: 1, horas_totales: '120', horas_semanales: '8' },
    ],
};

const equivalenciasMapMock = {
    '11071': ['11071'],
    // Many-to-One: requiere AMBAS (11072 y 11073) aprobadas para acreditar 21001
    '21001': ['11072', '11073'],
};

const wrapper = ({ children }) => <PlanProvider>{children}</PlanProvider>;

describe('useEquivalencias - Mapeo 1:1, N:1, materias huérfanas, búsqueda sin acentos y horas', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        storageRepository.setPlanActivo('17.13', { silent: true });
        storageRepository.setProgreso(
            '17.13',
            {
                '11071': 'Aprobado',
                '11072': 'Promocionado',
                '11073': 'Regular', // Todavía NO tiene final -> 21001 sigue pendiente
                '11999': 'Disponible',
            },
            { silent: true },
        );

        mockGetPlanByNumber.mockImplementation(async (plan) =>
            plan === '17.13' ? planViejoMock : planNuevoMock,
        );
        mockGetEquivalenciasByPlan.mockResolvedValue(equivalenciasMapMock);
    });

    afterEach(() => {
        cleanup();
    });

    it('agrupa equivalencias 1:1, N:1 y materias sin equivalente, calcula horas y filtra sin acentos', async () => {
        const { result } = renderHook(() => useEquivalencias(), { wrapper });

        await waitFor(() => {
            expect(result.current.materiasFiltradas).toHaveLength(3);
        });

        // 2 grupos del plan nuevo + 1 huérfana (11999)
        const huerfana = result.current.materiasFiltradas.find((g) => g.id === 'huerfana-11999');
        expect(huerfana?.esEquivalente).toBe(false);

        // Estadísticas: solo 11071 cumple equivalencia completa (21001 requiere 11072 Y 11073 aprobadas)
        expect(result.current.stats.totalNuevas).toBe(2);
        expect(result.current.stats.aprobadasNuevas).toBe(1);
        expect(result.current.comparativaHoras).toEqual({
            viejo: { totales: 320, restantes: 140 },
            nuevo: { totales: 220, restantes: 120 },
        });

        // Filtro 'aprobadas' devuelve únicamente 11071
        act(() => {
            result.current.setFiltro('aprobadas');
        });
        expect(result.current.materiasFiltradas).toHaveLength(1);
        expect(result.current.materiasFiltradas[0].materiaNueva.codigo).toBe('11071');

        // Búsqueda sin acentos encuentra "Álgebra y Lógica Computacional"
        act(() => {
            result.current.setFiltro('todas');
            result.current.setBusqueda('algebra');
        });
        expect(result.current.materiasFiltradas).toHaveLength(1);
        expect(result.current.materiasFiltradas[0].materiaNueva.codigo).toBe('21001');

        // Al aprobar 11073 en storage, reacciona en vivo y 21001 pasa a aprobada (aprobadasNuevas: 2)
        act(() => {
            storageRepository.setProgreso('17.13', {
                '11071': 'Aprobado',
                '11072': 'Promocionado',
                '11073': 'Aprobado',
                '11999': 'Disponible',
            });
        });

        await waitFor(() => {
            expect(result.current.stats.aprobadasNuevas).toBe(2);
        });
        expect(result.current.comparativaHoras?.nuevo.restantes).toBe(0);
    });
});
