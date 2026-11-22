import { describe, it, expect } from 'vitest';
import sistemasData from '../../data/sistemas.json';
import tituloIntermedioUtils from './tituloIntermedioUtils';

const materias1713 = sistemasData.find((p) => p.plan_numero === '17.13')?.materias || [];
const materias1714 = sistemasData.find((p) => p.plan_numero === '17.14')?.materias || [];

describe('tituloIntermedioUtils - Título Intermedio declarativo por plan', () => {
    it('filtra hasta 6° cuatrimestre en Plan 17.14 y hasta 7° en Plan 17.13 sin incluir Tesina', () => {
        const intermedio14 = tituloIntermedioUtils.getMateriasIntermedio('17.14', materias1714);
        const intermedio13 = tituloIntermedioUtils.getMateriasIntermedio('17.13', materias1713);

        expect(intermedio14.length).toBeGreaterThan(0);
        expect(intermedio14.every((m) => Number(m.cuatrimestre) <= 6 && !m.tesis)).toBe(true);
        // Bases de Datos Distribuidas (11278) y Matemática Computacional (14028) pertenecen a la Licenciatura en Plan 17.14
        expect(intermedio14.some((m) => m.codigo === '11278')).toBe(false);
        expect(intermedio14.some((m) => m.codigo === '14028')).toBe(false);
        expect(tituloIntermedioUtils.getTituloIntermedioNombre('17.14')).toBe(
            'Analista Programador/a Universitario/a',
        );
        expect(intermedio14).toHaveLength(24);
        const totalHorasApu14 = intermedio14.reduce(
            (sum, m) => sum + (Number(m.horas_totales) || 0),
            0,
        );
        expect(totalHorasApu14).toBe(1888);
        expect(intermedio14.map((m) => m.codigo)).toEqual(
            expect.arrayContaining(['19054', '39553', '14026', '21279', '11287']),
        );

        expect(intermedio13.length).toBeGreaterThan(0);
        expect(intermedio13.every((m) => Number(m.cuatrimestre) <= 7 && !m.tesis)).toBe(true);
        expect(intermedio13.some((m) => Number(m.cuatrimestre) === 7)).toBe(true);
    });

    it('computa progreso contando Aprobado y Promocionado, sin contar Regular ni Cursando', () => {
        const intermedio14 = tituloIntermedioUtils.getMateriasIntermedio('17.14', materias1714);
        const progreso = {
            [intermedio14[0].codigo]: 'Aprobado',
            [intermedio14[1].codigo]: 'Promocionado',
            [intermedio14[2].codigo]: 'Regular',
            [intermedio14[3].codigo]: 'Cursando',
        };

        const res = tituloIntermedioUtils.calcularProgresoIntermedio(intermedio14, progreso);
        expect(res.completadas).toBe(2);
        expect(res.totales).toBe(intermedio14.length);
        expect(res.porcentaje).toBe(Math.round((2 * 100) / intermedio14.length));
    });

    it('soporta reglas declarativas de otras carreras (por cuatrimestre, por lista de códigos o sin título intermedio)', () => {
        const customRegistry = [
            {
                id: 'demo',
                planPrefix: '30',
                name: 'Licenciatura Demo',
                shortName: 'Demo',
                available: true,
                plans: [
                    {
                        planNumero: '30.01',
                        features: { intermediateTitle: true },
                        intermediateTitle: { name: 'Técnico Universitario', codigos: ['D1', 'D3'] },
                    },
                    {
                        planNumero: '30.02',
                        features: { intermediateTitle: false },
                        intermediateTitle: null,
                    },
                ],
            },
        ];

        const materiasDemo = [
            { codigo: 'D1', cuatrimestre: 1 },
            { codigo: 'D2', cuatrimestre: 2 },
            { codigo: 'D3', cuatrimestre: 5 },
            { codigo: 'D4', cuatrimestre: 6, tesis: true },
        ];

        expect(tituloIntermedioUtils.getTituloIntermedioNombre('30.01', customRegistry)).toBe('Técnico Universitario');
        expect(
            tituloIntermedioUtils.getMateriasIntermedio('30.01', materiasDemo, customRegistry).map((m) => m.codigo),
        ).toEqual(['D1', 'D3']);

        expect(tituloIntermedioUtils.getTituloIntermedioNombre('30.02', customRegistry)).toBe('');
        expect(tituloIntermedioUtils.getMateriasIntermedio('30.02', materiasDemo, customRegistry)).toEqual([]);
    });
});
