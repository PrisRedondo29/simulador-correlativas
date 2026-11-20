import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    verificarVencimientoTiempo,
    verificarVencimientoIntentos,
    calcularEstadoConsolidado,
    obtenerPlanificacionInstancias,
    calcularPromedioGeneral,
    obtenerFechaVencimientoLabel,
} from './regularidadUtils';

describe('regularidadUtils - Reglas académicas UNLu', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // 1° Cuatrimestre de 2026
        vi.setSystemTime(new Date('2026-04-15T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('vencimiento por tiempo (5 cuatrimestres)', () => {
        it('mantiene vigente la regularidad exactamente al cumplir 5 cuatrimestres', () => {
            // 2023-C2 hasta 2026-C1 = 5 cuatrimestres transcurridos
            const fecha = { anio: 2023, cuatrimestre: 2 };
            expect(verificarVencimientoTiempo(fecha)).toBe(false);
            expect(calcularEstadoConsolidado('Regular', fecha, [])).toBe('Regular');
        });

        it('vence la regularidad a Libre al superar los 5 cuatrimestres', () => {
            // 2023-C1 hasta 2026-C1 = 6 cuatrimestres transcurridos
            const fecha = { anio: 2023, cuatrimestre: 1 };
            expect(verificarVencimientoTiempo(fecha)).toBe(true);
            expect(calcularEstadoConsolidado('Regular', fecha, [])).toBe('Libre');
        });

        it('no altera el estado si la materia ya fue Aprobada', () => {
            const fechaMuyVieja = { anio: 2020, cuatrimestre: 1 };
            expect(calcularEstadoConsolidado('Aprobado', fechaMuyVieja, [])).toBe('Aprobado');
        });

        it('calcula correctamente la etiqueta del cuatrimestre de vencimiento', () => {
            expect(obtenerFechaVencimientoLabel({ anio: 2024, cuatrimestre: 1 })).toBe('Dic 2026');
            expect(obtenerFechaVencimientoLabel({ anio: 2024, cuatrimestre: 2 })).toBe('Jul 2027');
        });

        it('soporta fechas legacy en formato string "YYYY-MM"', () => {
            // 2023-10 => 2° Cuatrimestre 2023 => 5 cuatris en 2026-C1 (vigente)
            expect(verificarVencimientoTiempo('2023-10')).toBe(false);
            expect(obtenerFechaVencimientoLabel('2023-10')).toBe('Jul 2026');

            // 2023-03 => 1° Cuatrimestre 2023 => 6 cuatris en 2026-C1 (vencida)
            expect(verificarVencimientoTiempo('2023-03')).toBe(true);
            expect(calcularEstadoConsolidado('Regular', '2023-03', [])).toBe('Libre');
        });
    });

    describe('límite de desaprobaciones a final (Art. 32 RGE: 4 desaprobaciones, ausentes no descuentan)', () => {
        it('mantiene Regular con 3 desaprobaciones aunque tenga ausentes y calcula 1 oportunidad restante', () => {
            const intentos = [
                { estado: 'reprobado', nota: 2 },
                { estado: 'ausente', nota: null },
                { estado: 'reprobado', nota: 3 },
                { estado: 'ausente', nota: null },
                { estado: 'reprobado', nota: 1 },
            ];
            expect(verificarVencimientoIntentos(intentos)).toBe(false);
            const plan = obtenerPlanificacionInstancias({ anio: 2025, cuatrimestre: 2 }, intentos);
            expect(plan.intentosRestantes).toBe(1);
            expect(calcularEstadoConsolidado('Regular', { anio: 2025, cuatrimestre: 2 }, intentos)).toBe('Regular');
        });

        it('no vence a Libre si tras 3 desaprobaciones y ausentes aprueba el final', () => {
            const intentos = [
                { estado: 'reprobado', nota: 2 },
                { estado: 'ausente', nota: null },
                { estado: 'reprobado', nota: 3 },
                { estado: 'reprobado', nota: 2 },
                { estado: 'aprobado', nota: 7 },
            ];
            expect(verificarVencimientoIntentos(intentos)).toBe(false);
            expect(calcularEstadoConsolidado('Regular', { anio: 2025, cuatrimestre: 2 }, intentos)).toBe('Regular');
        });

        it('pasa a Libre al alcanzar la 4° desaprobación (reprobado)', () => {
            const intentos = [
                { estado: 'reprobado', nota: 2 },
                { estado: 'ausente', nota: null },
                { estado: 'reprobado', nota: 3 },
                { estado: 'reprobado', nota: 1 },
                { estado: 'reprobado', nota: 2 },
            ];
            expect(verificarVencimientoIntentos(intentos)).toBe(true);
            expect(calcularEstadoConsolidado('Regular', { anio: 2025, cuatrimestre: 2 }, intentos)).toBe('Libre');
        });
    });

    describe('cálculo de promedios con y sin aplazos', () => {
        it('calcula promedios diferenciando aplazos e historial de recursadas', () => {
            const progreso = {
                M1: 'Aprobado',
                M2: 'Promocionado',
                M3: 'Regular',
            };
            const progresoDetalles = {
                M1: {
                    notaFinal: 8,
                    historial: [
                        { intentosFinal: [{ estado: 'reprobado', nota: 2 }] },
                    ],
                    intentosFinal: [{ estado: 'aprobado', nota: 8 }],
                },
                M2: {
                    notaFinal: 10,
                },
                M3: {
                    notaRegularizacion: 7,
                },
            };

            const res = calcularPromedioGeneral(progresoDetalles, progreso);
            // Sin aplazos: (8 + 10) / 2 = 9
            expect(res.promedioSinAplazos).toBe(9);
            // Con aplazos: (2 + 8 + 10) / 3 = 6.67
            expect(res.promedioConAplazos).toBe(6.67);
            expect(res.materiasContadas).toBe(2);
        });

        it('retorna null cuando no hay notas finales registradas', () => {
            const res = calcularPromedioGeneral({ M1: { notaRegularizacion: 6 } }, { M1: 'Regular' });
            expect(res.promedioSinAplazos).toBeNull();
            expect(res.promedioConAplazos).toBeNull();
        });

        it('incluye promocionadas/equivalencias que solo tienen notaFinal sin intentosFinal', () => {
            const progreso = {
                M1: 'Promocionado',
                M2: 'Aprobado',
                M3: 'Regular',
            };
            const progresoDetalles = {
                M1: { notaFinal: 9 },
                M2: { notaFinal: 7, esEquivalencia: true },
                M3: { notaRegularizacion: 8 },
            };

            const res = calcularPromedioGeneral(progresoDetalles, progreso);
            expect(res.promedioSinAplazos).toBe(8);
            expect(res.promedioConAplazos).toBe(8);
            expect(res.materiasContadas).toBe(2);
        });

        it('ignora entradas de detalle nulas sin fallar y descuenta intentos aunque falte fechaRegularidad', () => {
            const res = calcularPromedioGeneral(
                { M1: null, M2: { notaFinal: 10 } },
                { M1: 'Aprobado', M2: 'Aprobado' },
            );
            expect(res.promedioSinAplazos).toBe(10);
            expect(res.materiasContadas).toBe(1);

            const planif = obtenerPlanificacionInstancias(null, [
                { estado: 'reprobado', nota: 2 },
                { estado: 'reprobado', nota: 3 },
                { estado: 'reprobado', nota: 2 },
            ]);
            expect(planif.intentosRestantes).toBe(1);
        });
    });
});
