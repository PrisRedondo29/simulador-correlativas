// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import useOnboardingChecklist, { buildInitialProgreso } from './useOnboardingChecklist';

const MATERIAS_MOCK = [
    { codigo: 'M1', nombre: 'Álgebra', anio: 1, cuatrimestre: 1, correlativas: [] },
    { codigo: 'M2', nombre: 'Programación I', anio: 1, cuatrimestre: 2, correlativas: ['M1'] },
    { codigo: 'M3', nombre: 'Bases de Datos', anio: 2, cuatrimestre: 1, correlativas: ['M2'] },
    { codigo: 'T1', nombre: 'Tesina', anio: 4, cuatrimestre: 8, correlativas: [], tesis: true },
];

describe('useOnboardingChecklist - Checklist rápida con auto-cascada y Deshacer/Rehacer', () => {
    beforeEach(() => {
        // Sin timers pendientes
    });

    afterEach(() => {
        cleanup();
    });

    it('inicializa Disponible sin correlativas y Bloqueado con correlativas/tesis', () => {
        expect(buildInitialProgreso(MATERIAS_MOCK)).toEqual({
            M1: 'Disponible',
            M2: 'Bloqueado',
            M3: 'Bloqueado',
            T1: 'Bloqueado',
        });
    });

    it('auto-completa correlativas previas al marcar una materia avanzada y permite toggle on/off', () => {
        const { result } = renderHook(() => useOnboardingChecklist(MATERIAS_MOCK));

        // Al marcar M3 (2° año) como Aprobada, M1 y M2 deben aprobarse automáticamente
        act(() => {
            result.current.toggleSubjectState('M3', 'Aprobado');
        });

        expect(result.current.progreso.M3).toBe('Aprobado');
        expect(result.current.progreso.M2).toBe('Aprobado');
        expect(result.current.progreso.M1).toBe('Aprobado');
        expect(result.current.counts.aprobadas).toBe(3);
        expect(result.current.lastFeedback?.type).toBe('cascade');
        expect(result.current.lastFeedback?.text).toContain('2 correlativas previas');

        // Tocar nuevamente M3 (Aprobada) debe desmarcarla de regreso a Disponible (mantiene M1/M2 intactas)
        act(() => {
            result.current.toggleSubjectState('M3', 'Aprobado');
        });

        expect(result.current.progreso.M3).toBe('Disponible');
        expect(result.current.counts.aprobadas).toBe(2);
    });

    it('aprobarAnioCompleto aplica el bloque entero en 1 entrada de historial y funciona undo/redo completo', () => {
        const { result } = renderHook(() => useOnboardingChecklist(MATERIAS_MOCK));

        act(() => {
            result.current.aprobarAnioCompleto(['M1', 'M2'], '1° Año');
        });

        expect(result.current.progreso.M1).toBe('Aprobado');
        expect(result.current.progreso.M2).toBe('Aprobado');
        expect(result.current.progreso.M3).toBe('Disponible');
        expect(result.current.canUndo).toBe(true);
        expect(result.current.canRedo).toBe(false);

        // Un solo Deshacer revierte el año completo
        act(() => {
            result.current.undo();
        });
        expect(result.current.progreso.M1).toBe('Disponible');
        expect(result.current.progreso.M2).toBe('Bloqueado');
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(true);

        // Rehacer vuelve a aprobar el año completo
        act(() => {
            result.current.redo();
        });
        expect(result.current.progreso.M1).toBe('Aprobado');
        expect(result.current.progreso.M2).toBe('Aprobado');
        expect(result.current.canRedo).toBe(false);

        // Deshacer y realizar una nueva acción limpia la pila future
        act(() => {
            result.current.undo();
        });
        expect(result.current.canRedo).toBe(true);
        act(() => {
            result.current.toggleSubjectState('M1', 'Cursando');
        });
        expect(result.current.progreso.M1).toBe('Cursando');
        expect(result.current.canRedo).toBe(false);
    });

    it('responde a Ctrl+Z y Ctrl+Y en window, e ignora atajos cuando el foco está en un input', () => {
        const { result } = renderHook(() => useOnboardingChecklist(MATERIAS_MOCK));

        act(() => {
            result.current.toggleSubjectState('M1', 'Regular');
        });
        expect(result.current.progreso.M1).toBe('Regular');

        // Atajo dentro de un input no debe disparar undo
        const input = document.createElement('input');
        document.body.appendChild(input);
        act(() => {
            input.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }),
            );
        });
        expect(result.current.progreso.M1).toBe('Regular');
        document.body.removeChild(input);

        // Ctrl+Z global sí deshace
        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
        });
        expect(result.current.progreso.M1).toBe('Disponible');

        // Ctrl+Y global sí rehace
        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }));
        });
        expect(result.current.progreso.M1).toBe('Regular');
    });

    it('desmarcarAnioCompleto limpia el bloque recalculando dependencias y es reversible con 1 undo()', () => {
        const { result } = renderHook(() => useOnboardingChecklist(MATERIAS_MOCK));

        act(() => {
            result.current.aprobarAnioCompleto(['M1', 'M2'], '1° Año');
        });
        expect(result.current.progreso.M1).toBe('Aprobado');
        expect(result.current.progreso.M2).toBe('Aprobado');
        expect(result.current.progreso.M3).toBe('Disponible');

        act(() => {
            result.current.desmarcarAnioCompleto(['M1', 'M2'], '1° Año');
        });
        expect(result.current.progreso.M1).toBe('Disponible');
        expect(result.current.progreso.M2).toBe('Bloqueado');
        expect(result.current.progreso.M3).toBe('Bloqueado');
        expect(result.current.counts.aprobadas).toBe(0);
        expect(result.current.lastFeedback?.text).toContain('1° Año');

        // Un solo Deshacer restaura todo el bloque aprobado
        act(() => {
            result.current.undo();
        });
        expect(result.current.progreso.M1).toBe('Aprobado');
        expect(result.current.progreso.M2).toBe('Aprobado');
        expect(result.current.progreso.M3).toBe('Disponible');
    });
});
