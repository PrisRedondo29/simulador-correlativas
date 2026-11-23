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

    it('permite importar cuando el estudiante solo tiene materias en estado Cursando ubicándolas en el cuatrimestre actual sin consolidarlas en progresoBaseFinal', () => {
        const res = reconstruirHistorial(
            { M1: 'Cursando', M2: 'Bloqueado', M3: 'Disponible' },
            {},
            MATERIAS_IMPORT,
        );

        expect(res).not.toBeNull();
        expect(res.historial).toEqual([]);
        expect(res.anioFinal).toBe(2026);
        expect(res.cuatriFinal).toBe('1');
        expect(res.materiasCursandoCodigos).toEqual(['M1']);
        expect(res.progresoFinal).toEqual({ M1: 'Cursado', M2: 'No Cursado', M3: 'No Cursado' });
        expect(res.progresoBaseFinal).toEqual({ M1: 'No Cursado', M2: 'No Cursado', M3: 'No Cursado' });
    });

    it('maneja mezcla de Aprobado, Promocionado, Regular, Cursando y Libre manteniendo Cursando fuera del historial consolidado', () => {
        const materiasMix = [
            ...MATERIAS_IMPORT,
            { codigo: 'M4', nombre: 'Bases de Datos', anio: '2', cuatrimestre: '4', correlativas: [] },
            { codigo: 'M5', nombre: 'Redes', anio: '3', cuatrimestre: '5', correlativas: [] },
        ];
        const res = reconstruirHistorial(
            {
                M1: 'Aprobado',
                M2: 'Promocionado',
                M3: 'Regular',
                M4: 'Cursando',
                M5: 'Libre',
            },
            {
                M1: { fechaRegularidad: { anio: 2025, cuatrimestre: 1 } },
                M2: { fechaRegularidad: { anio: 2025, cuatrimestre: 2 } },
                M3: { fechaRegularidad: { anio: 2025, cuatrimestre: 2 } },
            },
            materiasMix,
        );

        expect(res).not.toBeNull();
        expect(res.anioFinal).toBe(2026);
        expect(res.cuatriFinal).toBe('1');
        expect(res.materiasCursandoCodigos).toEqual(['M4']);
        // M1, M2 y M3 consolidados; M4 solo en progresoFinal (actual); M5 (Libre) en No Cursado
        expect(res.progresoBaseFinal).toEqual({
            M1: 'Cursado',
            M2: 'Cursado',
            M3: 'Cursado',
            M4: 'No Cursado',
            M5: 'No Cursado',
        });
        expect(res.progresoFinal).toEqual({
            M1: 'Cursado',
            M2: 'Cursado',
            M3: 'Cursado',
            M4: 'Cursado',
            M5: 'No Cursado',
        });
    });
});
