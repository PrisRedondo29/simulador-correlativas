import { describe, it, expect } from 'vitest';
import { calculateProjection } from './projectionUtils';

const MATERIAS_SIM = [
    { codigo: 'M1', nombre: 'Intro Prog', cuatrimestre: '1', correlativas: [] },
    { codigo: 'M2', nombre: 'Álgebra', cuatrimestre: '1', correlativas: [] },
    { codigo: 'M3', nombre: 'Estructuras', cuatrimestre: '2', correlativas: ['M1'] },
    { codigo: 'M4', nombre: 'Algoritmos', cuatrimestre: '3', correlativas: ['M3'] },
    { codigo: 'TES', nombre: 'Tesina', cuatrimestre: '11', tesis: true, correlativas: [] },
];

describe('projectionUtils - Proyección de cuatrimestres del Simulador', () => {
    it('proyecta materias respetando paridad de cuatrimestre, correlativas y regla de Tesina', () => {
        const res = calculateProjection({
            materias: MATERIAS_SIM,
            historialSemestres: [],
            progresoBase: {},
            cuatriActual: '1',
            anioActual: 2026,
        });

        // C1 2026 (col 1): M1 y M2 en Presente
        expect(res.items.M1).toEqual({ columna: 1, estado: 'Presente' });
        expect(res.items.M2).toEqual({ columna: 1, estado: 'Presente' });

        // C2 2026* (col 2): M3 proyectada
        expect(res.items.M3).toEqual({ columna: 2, estado: 'Proyectada' });

        // C1 2027* (col 3): M4 proyectada (cuatri 3 = impar)
        expect(res.items.M4).toEqual({ columna: 3, estado: 'Proyectada' });

        // Tesina (cuatri 11 = impar): no puede cursarse en col 3 junto a M4 porque aún quedaba M4 pendiente,
        // así que se proyecta en el próximo cuatrimestre impar disponible (C1 2028*, col 5)
        expect(res.items.TES.estado).toBe('Proyectada');
        expect(res.items.TES.columna).toBeGreaterThan(res.items.M4.columna);
    });

    it('respeta historial pasado y registra materias ofrecidas no cursadas en skippedItems', () => {
        const historialSemestres = [
            {
                cuatri: '1',
                anioActual: 2025,
                materiasDelSemestre: [MATERIAS_SIM[0], MATERIAS_SIM[1]],
                progresoSnapshot: { M1: 'Cursado', M2: 'No Cursado' },
                progresoBaseSnapshot: { M1: 'No Cursado', M2: 'No Cursado' },
            },
        ];

        const res = calculateProjection({
            materias: MATERIAS_SIM,
            historialSemestres,
            progresoBase: { M1: 'Cursado' },
            cuatriActual: '2',
            anioActual: 2025,
        });

        expect(res.items.M1).toEqual({ columna: 1, estado: 'Aprobada' });
        expect(res.skippedItems).toHaveLength(1);
        expect(res.skippedItems[0].codigo).toBe('M2');
        expect(res.skippedItems[0].estado).toBe('NoCursada');

        // En C2 2025 (col 2), M3 queda en Presente porque M1 ya está completada
        expect(res.items.M3).toEqual({ columna: 2, estado: 'Presente' });
    });
});
