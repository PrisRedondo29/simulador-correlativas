import { describe, it, expect } from 'vitest';
import sistemasData from '../../data/sistemas.json';
import equivalenciasData from '../../data/equivalencias.json';
import {
    obtenerResumenPaso1,
    evaluarElegibilidadActual,
} from './transicionUtils';

const plan1713 = sistemasData.find((p) => p.plan_numero === '17.13');
const plan1714 = sistemasData.find((p) => p.plan_numero === '17.14');
const materias1713 = plan1713?.materias || [];
const materias1714 = plan1714?.materias || [];

describe('transicionUtils - Reglas Res. HCS 89/2025 (17.13 -> 17.14)', () => {
    it('no otorga equivalencias por materias que solo están Regulares o Cursando', () => {
        const progreso = {
            '11071': 'Aprobado',
            '21056': 'Regular',
            '11074': 'Cursando',
        };

        const resumen = obtenerResumenPaso1(progreso, materias1713);
        expect(resumen.cantidadAprobadas).toBe(1);
        expect(resumen.cantidadFuera).toBe(2);

        const elegibilidad = evaluarElegibilidadActual({
            progreso,
            materias1713,
            materias1714,
            equivalenciasData,
            anioActual: 2026,
            cuatrimestreActual: 1,
        });

        // Solo 11071 (aprobada con final) otorga equivalencia
        expect(elegibilidad.resultadoHoy.equivalenciasReconocidasCount).toBe(1);
    });

    it('indica que ya corresponde cambiarse en 2026 cuando el alumno tiene avance de 1° año', () => {
        const progreso1Anio = {};
        materias1713
            .filter((m) => Number(m.anio) === 1)
            .forEach((m) => {
                progreso1Anio[m.codigo] = 'Aprobado';
            });

        const res = evaluarElegibilidadActual({
            progreso: progreso1Anio,
            materias1713,
            materias1714,
            equivalenciasData,
            anioActual: 2026,
            cuatrimestreActual: 1,
        });

        expect(res.puedeCambiarseHoy).toBe(true);
        expect(res.anioHabilitado).toBe(2026);
        expect([1, 2]).toContain(res.cuatrimestreHabilitado);
        expect(res.periodoHabilitado).toMatch(/Cuatrimestre de 2026$/);
    });

    it('indica año y cuatrimestre futuro cuando en 2026 hay bache por oferta de 3° año', () => {
        // Alumno que aprobó todo 1° y 2° año de 17.13: en 2026 el 17.14 solo dicta hasta 2° año (C1..C4)
        const progresoHasta2 = {};
        materias1713
            .filter((m) => Number(m.anio) <= 2)
            .forEach((m) => {
                progresoHasta2[m.codigo] = 'Aprobado';
            });

        const res = evaluarElegibilidadActual({
            progreso: progresoHasta2,
            materias1713,
            materias1714,
            equivalenciasData,
            anioActual: 2026,
            cuatrimestreActual: 1,
        });

        expect(res.puedeCambiarseHoy).toBe(false);
        expect(res.anioHabilitado).toBeGreaterThan(2026);
        expect([1, 2]).toContain(res.cuatrimestreHabilitado);
        expect(res.mensajePrincipal).toContain(res.periodoHabilitado);
    });

    it('exige aprobar TODAS las materias origen en equivalencias múltiples (ej. 13021 requiere 11072 y 11073)', () => {
        const soloUna = evaluarElegibilidadActual({
            progreso: { '11072': 'Aprobado' },
            materias1713,
            materias1714,
            equivalenciasData,
            anioActual: 2026,
            cuatrimestreActual: 1,
        });
        const aprobadasSoloUna = soloUna.resultadoHoy.avance1714.listaAprobadas.map((m) => m.codigo);
        expect(aprobadasSoloUna).not.toContain('13021');

        const ambas = evaluarElegibilidadActual({
            progreso: { '11072': 'Aprobado', '11073': 'Promocionado' },
            materias1713,
            materias1714,
            equivalenciasData,
            anioActual: 2026,
            cuatrimestreActual: 1,
        });
        const aprobadasAmbas = ambas.resultadoHoy.avance1714.listaAprobadas.map((m) => m.codigo);
        expect(aprobadasAmbas).toContain('13021');
    });

    it('informa 2° Cuatrimestre cuando se evalúa durante el segundo cuatrimestre del año vigente', () => {
        const progreso1C = {};
        materias1713
            .filter((m) => Number(m.cuatrimestre) === 1)
            .forEach((m) => {
                progreso1C[m.codigo] = 'Aprobado';
            });

        const res = evaluarElegibilidadActual({
            progreso: progreso1C,
            materias1713,
            materias1714,
            equivalenciasData,
            anioActual: 2026,
            cuatrimestreActual: 2,
        });

        expect(res.puedeCambiarseHoy).toBe(true);
        expect(res.anioHabilitado).toBe(2026);
        expect(res.cuatrimestreHabilitado).toBe(2);
        expect(res.periodoHabilitado).toBe('2° Cuatrimestre de 2026');
    });
});
