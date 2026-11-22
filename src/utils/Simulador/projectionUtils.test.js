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

        // Tesina no depende de paridad fija 1°/2° cuatri: en cuanto se completa M4 en C1 2027* (col 3),
        // se habilita inmediatamente en el próximo cuatrimestre (C2 2027*, col 4) sin dejar un cuatri vacío
        expect(res.items.TES.estado).toBe('Proyectada');
        expect(res.items.TES.columna).toBe(res.items.M4.columna + 1);
        expect(res.currentCol).toBe(1);
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

    it('normaliza anioActual recibido como string para evitar concatenación al proyectar el siguiente año', () => {
        const res = calculateProjection({
            materias: MATERIAS_SIM,
            historialSemestres: [],
            progresoBase: {},
            cuatriActual: '2',
            anioActual: '2026',
        });

        expect(res.labels[1]).toBe('C2 2026');
        expect(res.labels[2]).toBe('C1 2027*');
    });

    it('al completar todas las materias del plan devuelve currentCol null sin columna vacía adicional', () => {
        const historialCompleto = [
            {
                cuatri: '1',
                anioActual: 2026,
                materiasDelSemestre: MATERIAS_SIM.slice(0, 2),
                progresoSnapshot: { M1: 'Cursado', M2: 'Cursado' },
                progresoBaseSnapshot: { M1: 'No Cursado', M2: 'No Cursado' },
            },
            {
                cuatri: '2',
                anioActual: 2026,
                materiasDelSemestre: MATERIAS_SIM.slice(2),
                progresoSnapshot: { M3: 'Cursado', M4: 'Cursado', TES: 'Cursado' },
                progresoBaseSnapshot: { M3: 'No Cursado', M4: 'No Cursado', TES: 'No Cursado' },
            },
        ];

        const res = calculateProjection({
            materias: MATERIAS_SIM,
            historialSemestres: historialCompleto,
            cuatriActual: '2',
            anioActual: 2026,
        });

        expect(res.currentCol).toBeNull();
        expect(res.maxCol).toBe(historialCompleto.length);
    });

    it('distribuye equivalencias 17.13 -> 17.14 en los cuatrimestres reales sin generar columna Postergado', () => {
        const historial1713 = [
            {
                cuatri: '1',
                anioActual: 2025,
                materiasDelSemestre: [{ codigo: '11071', nombre: 'Intro Old', anio: 1, cuatrimestre: 1, correlativas: [] }],
                progresoSnapshot: { '11071': 'Cursado' },
                progresoBaseSnapshot: {},
            },
            {
                cuatri: '2',
                anioActual: 2025,
                materiasDelSemestre: [{ codigo: '11074', nombre: 'Prog I Old', anio: 1, cuatrimestre: 2, correlativas: ['11071'] }],
                progresoSnapshot: { '11074': 'Cursado' },
                progresoBaseSnapshot: { '11071': 'Cursado' },
            },
        ];

        const materias1714 = [
            { codigo: '11271', nombre: 'Intro New', cuatrimestre: '1', correlativas: [] },
            { codigo: '11274', nombre: 'Prog Estructurada', cuatrimestre: '2', correlativas: ['11271'] },
            { codigo: '11275', nombre: 'EDA I', cuatrimestre: '3', correlativas: ['11274'] },
            { codigo: 'TES', nombre: 'Tesina', cuatrimestre: '11', tesis: true, correlativas: [] },
        ];

        const res = calculateProjection({
            materias: materias1714,
            historialSemestres: historial1713,
            progresoBase: { '11271': 'Cursado', '11274': 'Cursado' },
            cuatriActual: '1',
            anioActual: 2026,
            equivalenciasMap: {
                '11271': ['11071'],
                '11274': ['11074'],
            },
        });

        // No debe contabilizar códigos viejos (11071/11074) ni mandar el resto a Postergado
        expect(res.items['11071']).toBeUndefined();
        expect(res.items['11271']).toEqual({ columna: 1, estado: 'Aprobada' });
        expect(res.items['11274']).toEqual({ columna: 2, estado: 'Aprobada' });
        expect(res.items['11275']).toEqual({ columna: 3, estado: 'Presente' });
        expect(res.items.TES).toEqual({ columna: 4, estado: 'Proyectada' });
        expect(Object.values(res.labels)).not.toContain('Postergado');
    });
});
