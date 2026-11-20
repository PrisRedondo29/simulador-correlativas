// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useState } from 'react';

const mockUpdateAuthProgreso = vi.fn();

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        updateAuthProgreso: mockUpdateAuthProgreso,
    }),
}));

import useDetalleMateria from './useDetalleMateria';

const sampleMateria = {
    codigo: '11071',
    nombre: 'Introducción a la Programación',
    anio: 1,
    cuatrimestre: 1,
};

function renderDetalleHook({
    initialDetalles = {},
    estadoActual = 'Regular',
    cambioDeEstado = vi.fn(),
} = {}) {
    const progreso = { '11071': estadoActual };
    return {
        cambioDeEstado,
        ...renderHook(
            ({ estado }) => {
                const [detalles, setDetalles] = useState(initialDetalles);
                const api = useDetalleMateria(
                    sampleMateria,
                    detalles,
                    setDetalles,
                    '17.14',
                    progreso,
                    cambioDeEstado,
                    estado,
                );
                return { ...api, detalles };
            },
            { initialProps: { estado: estadoActual } },
        ),
    };
}

describe('useDetalleMateria - Reglas académicas de notas, intentos de final e historial', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        cleanup();
    });

    it('rechaza notas inválidas (< 0, > 10 o vacías) al guardar intento rendido sin alterar detalles', () => {
        const { result } = renderDetalleHook();

        act(() => {
            result.current.setNotaVal('11');
        });
        act(() => {
            result.current.handleGuardarIntento();
        });

        expect(result.current.notaError).toContain('0 y 10');
        expect(result.current.detalles['11071']).toBeUndefined();

        act(() => {
            result.current.setNotaVal('-1');
        });
        act(() => {
            result.current.handleGuardarIntento();
        });
        expect(result.current.notaError).toContain('0 y 10');
    });

    it('aprobar un final (>= 4) guarda notaFinal y transiciona a Aprobado; eliminarlo revierte a Regular', () => {
        const { result, cambioDeEstado } = renderDetalleHook({
            initialDetalles: {
                '11071': {
                    fechaRegularidad: { anio: 2026, cuatrimestre: 1 },
                    intentosFinal: [],
                },
            },
            estadoActual: 'Regular',
        });

        act(() => {
            result.current.setNotaVal('8');
            result.current.setEstadoVal('rendido');
            result.current.setFechaIntento('2026-07-15');
        });
        act(() => {
            result.current.handleGuardarIntento();
        });
        act(() => {
            vi.runAllTimers();
        });

        expect(result.current.detalles['11071'].notaFinal).toBe(8);
        expect(result.current.detalles['11071'].intentosFinal).toEqual([
            { nota: 8, estado: 'aprobado', fecha: '2026-07-15' },
        ]);
        expect(cambioDeEstado).toHaveBeenCalledWith('11071', 'Aprobado');

        // Eliminar el intento aprobado debe revertir a Regular y limpiar notaFinal
        cambioDeEstado.mockClear();
        act(() => {
            result.current.handleEliminarIntento(0);
        });
        act(() => {
            vi.runAllTimers();
        });

        expect(result.current.detalles['11071'].intentosFinal).toEqual([]);
        expect(result.current.detalles['11071'].notaFinal).toBeNull();
        expect(cambioDeEstado).toHaveBeenCalledWith('11071', 'Regular');
    });

    it('al alcanzar 4 intentos de final desaprobados (Art. 32 RGE UNLu) pasa automáticamente a Libre y bloquea un 5to intento', () => {
        const { result, cambioDeEstado } = renderDetalleHook({
            initialDetalles: {
                '11071': {
                    fechaRegularidad: { anio: 2026, cuatrimestre: 1 },
                    intentosFinal: [
                        { nota: 2, estado: 'reprobado', fecha: '2026-02-10' },
                        { nota: 3, estado: 'reprobado', fecha: '2026-05-10' },
                        { nota: 1, estado: 'reprobado', fecha: '2026-07-10' },
                    ],
                },
            },
            estadoActual: 'Regular',
        });

        act(() => {
            result.current.setNotaVal('2');
            result.current.setEstadoVal('rendido');
        });
        act(() => {
            result.current.handleGuardarIntento();
        });
        act(() => {
            vi.runAllTimers();
        });

        expect(result.current.detalles['11071'].intentosFinal).toHaveLength(4);
        expect(cambioDeEstado).toHaveBeenCalledWith('11071', 'Libre');

        // Un 5to intento no debe agregarse
        act(() => {
            result.current.setNotaVal('7');
        });
        act(() => {
            result.current.handleGuardarIntento();
        });
        act(() => {
            vi.runAllTimers();
        });
        expect(result.current.detalles['11071'].intentosFinal).toHaveLength(4);
    });

    it('editar un intento de reprobado a aprobado actualiza notaFinal y pasa a Aprobado', () => {
        const { result, cambioDeEstado } = renderDetalleHook({
            initialDetalles: {
                '11071': {
                    fechaRegularidad: { anio: 2026, cuatrimestre: 1 },
                    intentosFinal: [{ nota: 3, estado: 'reprobado', fecha: '2026-07-01' }],
                },
            },
            estadoActual: 'Regular',
        });

        act(() => {
            result.current.handleUpdateIntento(0, {
                nota: 9,
                estado: 'aprobado',
                fecha: '2026-07-01',
            });
            vi.runAllTimers();
        });

        expect(result.current.detalles['11071'].notaFinal).toBe(9);
        expect(cambioDeEstado).toHaveBeenCalledWith('11071', 'Aprobado');
    });

    it('toggles de Libre y Equivalencia limpian campos incompatibles y gestiona historial de recursadas', () => {
        const { result } = renderDetalleHook({
            initialDetalles: {
                '11071': {
                    fechaRegularidad: { anio: 2025, cuatrimestre: 1 },
                    notaRegularizacion: 7,
                    intentosFinal: [{ nota: 2, estado: 'reprobado', fecha: '2025-12-01' }],
                    historial: [{ fechaRegularidad: { anio: 2024, cuatrimestre: 1 }, notaRegularizacion: 6 }],
                },
            },
        });

        act(() => {
            result.current.handleToggleLibre(true);
        });
        expect(result.current.detalles['11071']).toMatchObject({
            rendidaLibre: true,
            esEquivalencia: false,
            fechaRegularidad: null,
            notaRegularizacion: null,
        });

        act(() => {
            result.current.handleToggleEquivalencia(true);
        });
        expect(result.current.detalles['11071']).toMatchObject({
            esEquivalencia: true,
            rendidaLibre: false,
            intentosFinal: [],
        });

        act(() => {
            result.current.handleUpdateCursadaHistorial(0, {
                fechaRegularidad: { anio: 2024, cuatrimestre: 2 },
                notaRegularizacion: 8,
            });
        });
        expect(result.current.detalles['11071'].historial[0].notaRegularizacion).toBe(8);

        act(() => {
            result.current.handleEliminarCursadaHistorial(0);
        });
        expect(result.current.detalles['11071'].historial).toEqual([]);
    });
});
