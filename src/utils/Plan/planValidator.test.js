import { describe, it, expect } from 'vitest';
import {
    normalizarMateriaCanonica,
    validarPlanEstudios,
    compararVersionesPlan,
} from './planValidator';
import sistemasPlans from '../../data/sistemas.json';

describe('planValidator - Validación canónica DAG, normalización v2 y Diff de versiones', () => {
    it('valida como exitosos los planes reales actuales de Sistemas (17.13 y 17.14)', () => {
        sistemasPlans.forEach((plan) => {
            const res = validarPlanEstudios(plan);
            expect(res.ok).toBe(true);
            expect(res.errores).toHaveLength(0);
            expect(res.ciclos).toHaveLength(0);
            expect(res.planNormalizado?.materias.length).toBeGreaterThan(30);
        });
    });

    it('sincroniza correlativas como la unión canónica de correlativas, correlativasCursada y correlativasFinal', () => {
        const mat = normalizarMateriaCanonica({
            codigo: ' 20010 ',
            nombre: ' Física II ',
            anio: 2,
            correlativas: [],
            correlativasCursada: [
                { codigo: '20001', condicion: 'aprobada' },
                { codigo: '20002', condicion: 'regular' },
            ],
            correlativasFinal: ['20001', '20002', '20003'],
        });

        expect(mat.codigo).toBe('20010');
        expect(mat.nombre).toBe('Física II');
        expect(mat.correlativas).toEqual(['20001', '20002', '20003']);
    });

    it('detecta códigos duplicados, auto-referencias, correlativas huérfanas y ciclos dirigidos (A -> B -> C -> A)', () => {
        const planInvalido = {
            plan_numero: '99.01',
            materias: [
                { codigo: 'A', nombre: 'Materia A', anio: 1, correlativas: ['C'] },
                { codigo: 'B', nombre: 'Materia B', anio: 1, correlativas: ['A'] },
                {
                    codigo: 'C',
                    nombre: 'Materia C',
                    anio: 2,
                    correlativas: ['B', 'FANTASMA', 'C'],
                },
                { codigo: 'A', nombre: 'Duplicada A', anio: 1, correlativas: [] },
            ],
        };

        const res = validarPlanEstudios(planInvalido);
        expect(res.ok).toBe(false);
        expect(res.planNormalizado).toBeNull();

        const codigosError = res.errores.map((e) => e.code);
        expect(codigosError).toContain('DUPLICATE_CODE');
        expect(codigosError).toContain('SELF_DEPENDENCY');
        expect(codigosError).toContain('DANGLING_PREREQUISITE');
        expect(codigosError).toContain('CYCLE_DETECTED');
        expect(res.ciclos).toHaveLength(1);
    });

    it('compararVersionesPlan genera el Diff Antes vs. Después y detecta si requiere mapeo de códigos o tiene impacto en cascada', () => {
        const planV1 = {
            plan_numero: '17.14',
            materias: [
                { codigo: '11071', nombre: 'Intro a la Programación', anio: 1, correlativas: [] },
                { codigo: '11072', nombre: 'Matemática I', anio: 1, correlativas: [] },
                { codigo: '11073', nombre: 'Estructuras de Datos', anio: 2, correlativas: ['11071'] },
            ],
        };

        // En v2: 11071 cambia de código a 11071B, 11072 cambia de nombre, 11073 exige además 11072
        const planV2 = {
            plan_numero: '17.14',
            materias: [
                { codigo: '11071B', nombre: 'Intro a la Programación', anio: 1, correlativas: [] },
                { codigo: '11072', nombre: 'Álgebra y Matemática I', anio: 1, correlativas: [] },
                {
                    codigo: '11073',
                    nombre: 'Estructuras de Datos',
                    anio: 2,
                    correlativas: ['11071B', '11072'],
                },
            ],
        };

        const diff = compararVersionesPlan(planV1, planV2);

        expect(diff.materiasAgregadas).toEqual([
            { codigo: '11071B', nombre: 'Intro a la Programación' },
        ]);
        expect(diff.materiasEliminadas).toEqual([
            { codigo: '11071', nombre: 'Intro a la Programación' },
        ]);
        expect(diff.materiasRenombradas).toEqual([
            {
                codigo: '11072',
                nombreAntes: 'Matemática I',
                nombreDespues: 'Álgebra y Matemática I',
            },
        ]);
        expect(diff.cambiosCorrelativas).toHaveLength(1);
        expect(diff.cambiosCorrelativas[0].codigo).toBe('11073');
        expect(diff.requiereMapeoCodigos).toBe(true);
        expect(diff.tieneImpactoCascada).toBe(true);
    });
});
