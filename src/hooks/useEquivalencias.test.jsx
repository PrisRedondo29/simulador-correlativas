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

    it('soporta reglas AND/OR enriquecidas, UX Opción A para pending_confirmation y optativa 21420 sin doble cómputo', async () => {
        const plan1713Enriquecido = {
            plan_numero: '17.13',
            materias: [
                { codigo: '11412', nombre: 'Teoría I', anio: 3, cuatrimestre: 5, horas_totales: '80', horas_semanales: '5' },
                { codigo: '11417', nombre: 'Teoría II', anio: 4, cuatrimestre: 7, horas_totales: '80', horas_semanales: '5' },
                { codigo: '11089', nombre: 'Sistemas Inteligentes', anio: 5, cuatrimestre: 9, horas_totales: '96', horas_semanales: '6' },
                { codigo: 'OP1', nombre: 'Optativa I', anio: 5, cuatrimestre: 9, horas_totales: '64', horas_semanales: '4', es_optativa: true },
            ],
        };
        const plan1714Enriquecido = {
            plan_numero: '17.14',
            materias: [
                { codigo: '14031', nombre: 'Teoría de la Computación', anio: 4, cuatrimestre: 7, horas_totales: '96', horas_semanales: '6' },
                { codigo: '11289', nombre: 'Inteligencia Artificial', anio: 4, cuatrimestre: 8, horas_totales: '96', horas_semanales: '6' },
                { codigo: '21279', nombre: 'Gestión de Soluciones Innovadoras', anio: 3, cuatrimestre: 6, horas_totales: '64', horas_semanales: '4' },
            ],
        };

        mockGetPlanByNumber.mockImplementation(async (plan) =>
            plan === '17.13' ? plan1713Enriquecido : plan1714Enriquecido,
        );
        mockGetEquivalenciasByPlan.mockResolvedValue({
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
                condition: {
                    anyOf: [
                        { allOf: ['11089'] },
                        { allOf: ['10043'], historical: true },
                    ],
                },
                validationStatus: 'pending_confirmation',
                applicationMode: 'advisory',
                usagePolicy: 'shared',
            },
            21279: {
                sourcePlan: '17.13',
                targetPlan: '17.14',
                condition: { anyOf: [{ allOf: ['21420'] }] },
                validationStatus: 'pending_confirmation',
                applicationMode: 'advisory',
                usagePolicy: 'exclusive',
                priority: 10,
            },
        });

        storageRepository.setProgreso(
            '17.13',
            {
                11412: 'Promocionado',
                11417: 'Aprobado',
                11089: 'Aprobado',
                OP1: 'Aprobado',
            },
            { silent: true },
        );
        storageRepository.setProgresoDetalles(
            '17.13',
            {
                OP1: { codigoOptativa: '21420', nombreOptativa: 'Taller de Emprendimientos Tecnológicos' },
            },
            { silent: true },
        );

        const { result } = renderHook(() => useEquivalencias(), { wrapper });

        await waitFor(() => {
            expect(result.current.materiasFiltradas.some((g) => g.materiaNueva.codigo === '14031')).toBe(true);
        });

        // Solo 14031 (confirmada AND) acredita en consolidado; 11289 y 21279 quedan por confirmar (Opción A)
        expect(result.current.stats.aprobadasNuevas).toBe(1);
        expect(result.current.stats.posiblesEquivalencias).toBe(2);
        // Totales 17.14 = 96 + 96 + 64 = 256; solo descuenta 14031 (96) -> restantes = 160
        expect(result.current.comparativaHoras?.nuevo).toEqual({ totales: 256, restantes: 160 });

        const grupoIA = result.current.materiasFiltradas.find((g) => g.materiaNueva.codigo === '11289');
        expect(grupoIA?.estaAprobada).toBe(false);
        expect(grupoIA?.esPendienteConfirmacion).toBe(true);
        expect(grupoIA?.advisoryMessage).toBe('Posible equivalencia · confirmar con UNLu');

        const grupo21279 = result.current.materiasFiltradas.find((g) => g.materiaNueva.codigo === '21279');
        expect(grupo21279?.materiasViejas[0]?.codigo).toBe('21420');
        expect(grupo21279?.esPendienteConfirmacion).toBe(true);
    });
});
