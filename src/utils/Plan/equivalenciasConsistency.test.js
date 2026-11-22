// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import sistemasPlanes from '../../data/sistemas.json';
import equivalenciasRaw from '../../data/equivalencias.json';
import storageRepository from '../../services/storageRepository';
import {
    augmentProgresoWithOptativas,
    DEFAULT_ADVISORY_MESSAGE,
} from './equivalenciasUtils';
import { evaluarTransicionCompleta } from '../Transicion/transicionUtils';
import { parseSawebTexts } from '../sawebParser';
import { calculateProjection } from '../Simulador/projectionUtils';

const mockGetPlanByNumber = vi.fn();
const mockGetEquivalenciasByPlan = vi.fn();

vi.mock('../../services/planService', () => ({
    default: {
        getPlanByNumber: (...args) => mockGetPlanByNumber(...args),
        getEquivalenciasByPlan: (...args) => mockGetEquivalenciasByPlan(...args),
    },
}));

import { PlanProvider } from '../../context/PlanContext';
import { useEquivalencias } from '../../hooks/useEquivalencias';
import { homologarProgresoSimulado1713A1714 } from '../../hooks/Simulador/useSimuladorEstado';

const plan1713 = sistemasPlanes.find((p) => p.plan_numero === '17.13');
const plan1714 = sistemasPlanes.find((p) => p.plan_numero === '17.14');

/** @param {{ children: React.ReactNode }} props */
const wrapper = ({ children }) => React.createElement(PlanProvider, null, children);

/**
 * Historial académico 17.13 compartido entre los 5 consumidores:
 * - 11071 (Promocionado) -> 11271 [1:1 confirmada]
 * - 11074 (Aprobado) -> 11274 + 19054 [shared multi-destino]
 * - 11072 (Promocionado) + 11073 (Aprobado) -> 14026, 13014, 13021, 14028 [shared 1:1 y AND]
 * - 11412 (Aprobado) + 11417 (Promocionado) -> 14031 [AND Res. HCS 836/24]
 * - 41407 (Aprobado) -> 41407 [directa mismo código sin regla explícita]
 * - 11075 (Regular) -> NO acredita 11275 ni 14030 [Regular jamás acredita equivalencia]
 * - 11089 (Aprobado) -> 11289 [OR pending_confirmation/advisory, no consolida]
 * - 41408 (Promocionado) -> 14034 [OR pending_confirmation/advisory, no consolida]
 * - OP1 -> 21420 (Aprobado) -> 21279 [pending_confirmation/advisory, AO-1714 no acredita]
 */
const HISTORIAL_1713_PROGRESO = {
    11071: 'Promocionado',
    11074: 'Aprobado',
    11072: 'Promocionado',
    11073: 'Aprobado',
    11412: 'Aprobado',
    11417: 'Promocionado',
    41407: 'Aprobado',
    11075: 'Regular',
    11089: 'Aprobado',
    41408: 'Promocionado',
    OP1: 'Aprobado',
};

const HISTORIAL_1713_DETALLES = {
    OP1: {
        codigoOptativa: '21420',
        nombreOptativa: 'Taller de Emprendimientos Tecnológicos',
    },
};

const SAWEB_MISMO_HISTORIAL = `
Universidad Nacional de Luján
CERTIFICADO ANALITICO DE ACTIVIDADES ACADEMICAS RENDIDAS
ingresó a la Universidad en el año 2023, correspondientes a la carrera de LIC.EN SISTEMAS DE INFORMACION, Plan 1713:
11071 P-INTRODUCCION A LA PROGRAMACION 9(NUEVE) 0475-047 10-07-2024
11072 P-ALGEBRA Y LOGICA COMPUTACIONAL 8(OCHO) 0479-074 12-07-2024
11074 R-PROGRAMACION I 8(OCHO) 0546-020 15-07-2024
11073 R-MATEMATICA DISCRETA 7(SIETE) 0550-010 10-12-2024
41407 R-ORGANIZACION DE COMPUTADORAS 7(SIETE) 0540-003 12-12-2024
11412 R-TEORIA DE LA COMPUTACION I 7(SIETE) 0601-012 18-12-2024
11417 P-TEORIA DE LA COMPUTACION II 9(NUEVE) 0620-010 15-07-2025
11089 R-SISTEMAS INTELIGENTES 8(OCHO) 0630-005 18-07-2025
41408 P-MODELOS, SIMULACION Y TEORIA DE LA DECISION 9(NUEVE) 0631-002 19-07-2025
21420 P-TALLER DE EMPRENDIMIENTOS TECNOLOGICOS (OPT.) 9(NUEVE) 0651-010 20-07-2025

CURSADAS
11075\tPROGRAMACION II\t2026\t1\tRegular\t-\t1\t-
`;

const EXPECTED_CONSOLIDATED = [
    '11271',
    '11274',
    '13014',
    '13021',
    '14026',
    '14028',
    '14031',
    '19054',
    '41407',
];

const EXPECTED_ADVISORY = ['11289', '14034', '21279'];

describe('equivalenciasConsistency - Coherencia cross-módulo en los 5 consumidores', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        storageRepository.setPlanActivo('17.13', { silent: true });
        storageRepository.setProgreso('17.13', HISTORIAL_1713_PROGRESO, { silent: true });
        storageRepository.setProgresoDetalles('17.13', HISTORIAL_1713_DETALLES, { silent: true });

        mockGetPlanByNumber.mockImplementation(async (plan) =>
            plan === '17.13' ? plan1713 : plan1714,
        );
        mockGetEquivalenciasByPlan.mockResolvedValue(equivalenciasRaw);
    });

    afterEach(() => {
        cleanup();
    });

    it('produce el mismo conjunto consolidado, los mismos avisos pending_confirmation y coherencia temporal en los 5 consumidores', async () => {
        expect(plan1713).toBeDefined();
        expect(plan1714).toBeDefined();
        if (!plan1713 || !plan1714) return;

        // 1. Mis Materias / Equivalencias (`useEquivalencias`)
        const { result: eqHook } = renderHook(() => useEquivalencias(), { wrapper });
        await waitFor(() => {
            expect(eqHook.current.planNuevo).not.toBeNull();
            expect(eqHook.current.materiasFiltradas.length).toBeGreaterThan(0);
        });

        const eqGruposReales = eqHook.current.materiasFiltradas.filter(
            (g) => !g.id.startsWith('huerfana-'),
        );
        const hookConsolidated = eqGruposReales
            .filter((g) => g.estaAprobada)
            .map((g) => g.materiaNueva.codigo)
            .sort();
        const hookAdvisory = eqGruposReales
            .filter((g) => g.esPendienteConfirmacion)
            .map((g) => g.materiaNueva.codigo)
            .sort();

        expect(hookConsolidated).toEqual(EXPECTED_CONSOLIDATED);
        expect(hookAdvisory).toEqual(EXPECTED_ADVISORY);

        // 2. Cambio de Plan (`transicionUtils.evaluarTransicionCompleta`)
        const transRes = evaluarTransicionCompleta({
            progreso: HISTORIAL_1713_PROGRESO,
            progresoDetalles: HISTORIAL_1713_DETALLES,
            materias1713: plan1713.materias,
            materias1714: plan1714.materias,
            equivalenciasData: equivalenciasRaw,
            anioAnalisis: 2026,
        });
        const transConsolidated = transRes.avance1714.listaAprobadas
            .map((m) => m.codigo)
            .sort();
        const transAdvisory = transRes.equivalenciasPorConfirmar
            .map((item) => item.targetCode)
            .sort();

        expect(transConsolidated).toEqual(EXPECTED_CONSOLIDATED);
        expect(transAdvisory).toEqual(EXPECTED_ADVISORY);

        // 3. Importador SAWeb (`sawebParser.parseSawebTexts`)
        const sawebRes = parseSawebTexts(SAWEB_MISMO_HISTORIAL, plan1714.materias);
        const sawebConsolidated = Object.entries(sawebRes.progreso)
            .filter(([, estado]) => estado === 'Aprobado' || estado === 'Promocionado')
            .map(([codigo]) => codigo)
            .sort();
        const sawebAdvisory = sawebRes.advisoryEquivalencias
            .map((item) => item.targetCode)
            .sort();

        expect(sawebConsolidated).toEqual(EXPECTED_CONSOLIDATED);
        expect(sawebAdvisory).toEqual(EXPECTED_ADVISORY);
        expect(sawebRes.progreso['11275']).not.toBe('Aprobado');
        expect(sawebRes.progreso['11275']).not.toBe('Promocionado');
        expect(sawebRes.progreso['14030']).not.toBe('Aprobado');
        expect(sawebRes.advisoryEquivalencias.every((x) => x.message === DEFAULT_ADVISORY_MESSAGE)).toBe(true);

        // 4. Simulador de Avance (`useSimuladorEstado.homologarProgresoSimulado1713A1714`)
        const { progreso: simInput1713, optativeCodes } = augmentProgresoWithOptativas(
            HISTORIAL_1713_PROGRESO,
            HISTORIAL_1713_DETALLES,
        );
        const simRes = homologarProgresoSimulado1713A1714(
            simInput1713,
            plan1714.materias,
            equivalenciasRaw,
            { optativeCodes },
        );
        const simConsolidated = Object.entries(simRes.progreso1714)
            .filter(([, estado]) => estado === 'Cursado')
            .map(([codigo]) => codigo)
            .sort();
        const simAdvisory = simRes.advisoryEquivalencias
            .map((item) => item.targetCode)
            .sort();

        expect(simConsolidated).toEqual(EXPECTED_CONSOLIDATED);
        expect(simAdvisory).toEqual(EXPECTED_ADVISORY);

        // 5. Proyección del Simulador (`projectionUtils.calculateProjection`)
        const historialSemestres = [
            {
                cuatri: '1',
                anioActual: 2024,
                materiasDelSemestre: [
                    { codigo: '11071', nombre: 'Intro Prog', anio: 1, cuatrimestre: 1, correlativas: [] },
                    { codigo: '11072', nombre: 'Álgebra y Lógica', anio: 1, cuatrimestre: 1, correlativas: [] },
                    { codigo: '11074', nombre: 'Prog I', anio: 1, cuatrimestre: 2, correlativas: [] },
                ],
                progresoSnapshot: { 11071: 'Cursado', 11072: 'Cursado', 11074: 'Cursado' },
                progresoBaseSnapshot: {},
            },
            {
                cuatri: '2',
                anioActual: 2024,
                materiasDelSemestre: [
                    { codigo: '11073', nombre: 'Mat Discreta', anio: 1, cuatrimestre: 2, correlativas: [] },
                    { codigo: '41407', nombre: 'Org Computadoras', anio: 1, cuatrimestre: 2, correlativas: [] },
                    { codigo: '11412', nombre: 'Teoría I', anio: 3, cuatrimestre: 5, correlativas: [] },
                    { codigo: '11089', nombre: 'Sist Inteligentes', anio: 5, cuatrimestre: 9, correlativas: [] },
                    { codigo: '41408', nombre: 'Modelos y Sim', anio: 5, cuatrimestre: 9, correlativas: [] },
                ],
                progresoSnapshot: {
                    11073: 'Cursado',
                    41407: 'Cursado',
                    11412: 'Cursado',
                    11089: 'Cursado',
                    41408: 'Cursado',
                },
                progresoBaseSnapshot: { 11071: 'Cursado', 11072: 'Cursado', 11074: 'Cursado' },
            },
            {
                cuatri: '1',
                anioActual: 2025,
                materiasDelSemestre: [
                    { codigo: '11417', nombre: 'Teoría II', anio: 4, cuatrimestre: 7, correlativas: [] },
                    { codigo: 'OP1', nombre: 'Optativa I', anio: 5, cuatrimestre: 9, correlativas: [] },
                ],
                progresoSnapshot: { 11417: 'Cursado', OP1: 'Cursado' },
                progresoBaseSnapshot: { 11412: 'Cursado' },
            },
        ];

        const projRes = calculateProjection({
            materias: plan1714.materias,
            historialSemestres,
            progresoBase: simRes.progreso1714,
            cuatriActual: '2',
            anioActual: 2025,
            equivalenciasMap: equivalenciasRaw,
        });

        const projConsolidated = Object.entries(projRes.items)
            .filter(([, item]) => item.estado === 'Aprobada')
            .map(([codigo]) => codigo)
            .sort();

        expect(projConsolidated).toEqual(EXPECTED_CONSOLIDATED);
        expect(projRes.items['11271']?.columna).toBe(1);
        expect(projRes.items['11274']?.columna).toBe(1);
        expect(projRes.items['19054']?.columna).toBe(1);
        expect(projRes.items['14026']?.columna).toBe(1);
        expect(projRes.items['13014']?.columna).toBe(1);
        expect(projRes.items['13021']?.columna).toBe(2);
        expect(projRes.items['14028']?.columna).toBe(2);
        expect(projRes.items['41407']?.columna).toBe(2);
        expect(projRes.items['14031']?.columna).toBe(3);

        for (const noConsolidada of ['11275', '14030', '11289', '14034', '21279']) {
            expect(projRes.items[noConsolidada]?.estado).not.toBe('Aprobada');
        }
    });
});
