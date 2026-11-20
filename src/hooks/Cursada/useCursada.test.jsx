// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import storageRepository from '../../services/storageRepository';

const mockMaterias = [
    { codigo: '11071', nombre: 'Introducción a la Programación', anio: 1, cuatrimestre: 1 },
    { codigo: '11072', nombre: 'Álgebra y Lógica', anio: 1, cuatrimestre: 1 },
];

vi.mock('../usePlanData', () => ({
    default: () => ({
        materias: mockMaterias,
        progreso: { '11071': 'Cursando', '11072': 'Regular' },
        cargandoPlan: false,
    }),
}));

import useCursada from './useCursada';

describe('useCursada - CRUD completo, superposiciones y aislamiento por plan', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    afterEach(() => {
        cleanup();
    });

    it('gestiona CRUD de eventos, horarios (con superposiciones) y bitácora persistiendo en storageRepository', () => {
        const { result } = renderHook(() => useCursada('17.14'));

        // 1. Eventos: agregar, editar y borrar
        let ev;
        act(() => {
            ev = result.current.addEvento({
                titulo: '  Parcial 1  ',
                tipo: 'parcial',
                fecha: '2026-11-25',
                hora: '18:00',
                codigoMateria: '11071',
                nota: '  Aula 4  ',
            });
        });

        expect(result.current.eventos).toHaveLength(1);
        expect(result.current.eventos[0]).toMatchObject({
            id: ev.id,
            titulo: 'Parcial 1',
            nota: 'Aula 4',
        });
        expect(storageRepository.getCursada('17.14')?.eventos).toHaveLength(1);

        act(() => {
            result.current.updateEvento(ev.id, { titulo: 'Parcial 1 Reprogramado', fecha: '2026-11-27' });
        });
        expect(result.current.eventos[0].titulo).toBe('Parcial 1 Reprogramado');
        expect(result.current.eventos[0].fecha).toBe('2026-11-27');

        act(() => {
            result.current.deleteEvento(ev.id);
        });
        expect(result.current.eventos).toHaveLength(0);

        // 2. Horarios + detección de superposición
        let h1;
        act(() => {
            h1 = result.current.addHorario({
                codigoMateria: '11071',
                dia: 1,
                horaInicio: '18:00',
                horaFin: '20:00',
                aula: 'Lab 1',
            });
            result.current.addHorario({
                codigoMateria: '11072',
                dia: 1,
                horaInicio: '19:00',
                horaFin: '21:00',
                aula: 'Aula 3',
            });
        });

        expect(result.current.horarios).toHaveLength(2);
        expect(result.current.superposiciones.has(h1.id)).toBe(true);

        act(() => {
            result.current.deleteHorario(h1.id);
        });
        expect(result.current.horarios).toHaveLength(1);
        expect(result.current.superposiciones.size).toBe(0);

        // 3. Bitácora: agregar, editar y borrar
        let bit;
        act(() => {
            bit = result.current.addBitacora({
                fecha: '2026-11-20',
                codigoMateria: '11071',
                tema: 'Recursividad',
                notas: 'Hacer guía 4',
            });
        });
        expect(result.current.bitacora).toHaveLength(1);

        act(() => {
            result.current.updateBitacora(bit.id, { tema: 'Recursividad y Backtracking' });
        });
        expect(result.current.bitacora[0].tema).toBe('Recursividad y Backtracking');

        act(() => {
            result.current.deleteBitacora(bit.id);
        });
        expect(result.current.bitacora).toHaveLength(0);
    });

    it('aísla datos entre planes al cambiar planProp y recarga reactivamente ante hidratación remota', () => {
        storageRepository.setCursada(
            '17.13',
            {
                horarios: [],
                eventos: [{ id: 'ev-13', titulo: 'Final 17.13', tipo: 'final', fecha: '2026-12-10' }],
                bitacora: [],
            },
            { silent: true },
        );

        const { result, rerender } = renderHook(({ plan }) => useCursada(plan), {
            initialProps: { plan: '17.14' },
        });
        expect(result.current.eventos).toHaveLength(0);

        rerender({ plan: '17.13' });
        expect(result.current.eventos).toHaveLength(1);
        expect(result.current.eventos[0].id).toBe('ev-13');

        // Simulamos hidratación remota (como tras cargar desde la nube)
        storageRepository.setCursada(
            '17.13',
            {
                horarios: [],
                eventos: [{ id: 'ev-cloud', titulo: 'Parcial Nube', tipo: 'parcial', fecha: '2026-12-15' }],
                bitacora: [],
            },
            { silent: true },
        );
        act(() => {
            window.dispatchEvent(new Event('progress-hydrated'));
        });

        expect(result.current.eventos[0].id).toBe('ev-cloud');
    });
});
