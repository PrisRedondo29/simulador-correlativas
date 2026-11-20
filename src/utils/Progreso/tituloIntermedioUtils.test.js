import { describe, it, expect } from 'vitest';
import sistemasData from '../../data/sistemas.json';
import tituloIntermedioUtils from './tituloIntermedioUtils';

const materias1713 = sistemasData.find((p) => p.plan_numero === '17.13')?.materias || [];
const materias1714 = sistemasData.find((p) => p.plan_numero === '17.14')?.materias || [];

describe('tituloIntermedioUtils - Título Intermedio (Analista)', () => {
    it('filtra hasta 6° cuatrimestre en Plan 17.14 y hasta 7° en Plan 17.13 sin incluir Tesina', () => {
        const intermedio14 = tituloIntermedioUtils.getMateriasIntermedio('17.14', materias1714);
        const intermedio13 = tituloIntermedioUtils.getMateriasIntermedio('17.13', materias1713);

        expect(intermedio14.length).toBeGreaterThan(0);
        expect(intermedio14.every((m) => Number(m.cuatrimestre) <= 6 && !m.tesis)).toBe(true);

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
});
