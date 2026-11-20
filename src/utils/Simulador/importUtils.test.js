import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reconstruirHistorial } from './importUtils';

const MATERIAS_IMPORT = [
    { codigo: 'M1', nombre: 'Intro Prog', anio: '1', cuatrimestre: '1', correlativas: [] },
    { codigo: 'M2', nombre: 'Estructuras', anio: '1', cuatrimestre: '2', correlativas: ['M1'] },
    { codigo: 'M3', nombre: 'Algoritmos', anio: '2', cuatrimestre: '3', correlativas: ['M2'] },
];

describe('importUtils - Importación de progreso real al Simulador', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // 1° Cuatrimestre 2026 (Abril -> C1 2026)
        vi.setSystemTime(new Date('2026-04-15T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('retorna null cuando no hay materias aprobadas, promocionadas ni regulares', () => {
        const res = reconstruirHistorial(
            { M1: 'Disponible', M2: 'Bloqueado', M3: 'Libre' },
            {},
            MATERIAS_IMPORT,
        );
        expect(res).toBeNull();
    });

    it('reconstruye historial ordenado cronológicamente y rellena cuatrimestres vacíos hasta el actual', () => {
        const progresoReal = {
            M1: 'Aprobado',
            M2: 'Regular',
            M3: 'Disponible',
        };
        const progresoDetalles = {
            M1: { fechaRegularidad: { anio: 2024, cuatrimestre: 1 } },
            M2: { fechaRegularidad: { anio: 2024, cuatrimestre: 2 } },
        };

        const res = reconstruirHistorial(progresoReal, progresoDetalles, MATERIAS_IMPORT);

        expect(res).not.toBeNull();
        expect(res.progresoFinal.M1).toBe('Cursado');
        expect(res.progresoFinal.M2).toBe('Cursado');
        expect(res.progresoFinal.M3).toBe('No Cursado');

        // Historial: 2024-C1 (M1), 2024-C2 (M2), 2025-C1 (vacío), 2025-C2 (vacío) => queda parado en C1 2026
        expect(res.historial[0]).toMatchObject({ anioActual: 2024, cuatri: '1', esImportado: true });
        expect(res.historial[1]).toMatchObject({ anioActual: 2024, cuatri: '2', esImportado: true });
        expect(res.historial.filter((h) => h.esVacio)).toHaveLength(2);
        expect(res.anioFinal).toBe(2026);
        expect(res.cuatriFinal).toBe('1');
    });
});
