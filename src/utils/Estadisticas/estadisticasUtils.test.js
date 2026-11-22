import { describe, it, expect } from 'vitest';
import {
    calcularEstadisticasAcademicas,
    inferirPeriodoDesdeFechaIso,
    inferirPeriodoMateria,
} from './estadisticasUtils';

const MOCK_MATERIAS = [
    { codigo: '19054', nombre: 'Taller de Informática', anio: 1, cuatrimestre: 1, horas_totales: 0, taller: true },
    { codigo: '11071', nombre: 'Intro a la Programación', anio: 1, cuatrimestre: 1, horas_totales: 96 },
    { codigo: '11072', nombre: 'Álgebra y Lógica', anio: 1, cuatrimestre: 1, horas_totales: 96 },
    { codigo: '11074', nombre: 'Programación I', anio: 1, cuatrimestre: 2, horas_totales: 96 },
    { codigo: '11075', nombre: 'Programación II', anio: 2, cuatrimestre: 3, horas_totales: 96 },
    { codigo: '11076', nombre: 'POO', anio: 2, cuatrimestre: 4, horas_totales: 64 },
    { codigo: '11095', nombre: 'Tesina de Grado', anio: 6, cuatrimestre: 11, horas_totales: 200, tesis: true },
];

describe('estadisticasUtils - Motor de estadísticas académicas', () => {
    it('calcula histograma con y sin aplazos, moda y modalidades correctamente', () => {
        const progreso = {
            '19054': 'Aprobado',
            '11071': 'Promocionado',
            '11072': 'Aprobado',
            '11074': 'Aprobado',
            '11075': 'Regular',
            '11076': 'Disponible',
        };
        const progresoDetalles = {
            '19054': { esEquivalencia: true, fechaAprobacion: '2024-03-10' },
            '11071': { notaFinal: 8, notaRegularizacion: 8, fechaAprobacion: '2024-06-25' },
            '11072': {
                notaFinal: 8,
                rendidaLibre: false,
                fechaAprobacion: '2025-02-20',
                intentosFinal: [
                    { nota: 2, estado: 'reprobado', fecha: '2024-07-15' },
                    { nota: 8, estado: 'aprobado', fecha: '2025-02-20' },
                ],
            },
            '11074': {
                notaFinal: 7,
                rendidaLibre: true,
                fechaAprobacion: '2025-07-10',
                intentosFinal: [
                    { nota: 2, estado: 'reprobado', fecha: '2024-12-12' },
                    { nota: null, estado: 'ausente', fecha: '2025-03-01' },
                    { nota: 7, estado: 'aprobado', fecha: '2025-07-10' },
                ],
            },
            '11075': {
                fechaRegularidad: { anio: 2025, cuatrimestre: 1 },
            },
        };

        const stats = calcularEstadisticasAcademicas({
            materias: MOCK_MATERIAS,
            progreso,
            progresoDetalles,
        });

        expect(stats.resumen.tieneDatos).toBe(true);
        expect(stats.resumen.aprobadasCount).toBe(4);
        expect(stats.resumen.regularesCount).toBe(1);

        // Histograma sin aplazos (4..10): 2 notas de 8 (Promo + Final Regular) y 1 de 7 (Final Libre)
        expect(stats.histograma.sinAplazos.totalActas).toBe(3);
        expect(stats.histograma.sinAplazos.moda).toEqual({ nota: 8, count: 2 });
        const bin8 = stats.histograma.sinAplazos.bins.find((b) => b.nota === 8);
        expect(bin8).toMatchObject({ total: 2, promocion: 1, finalRegular: 1, finalLibre: 0, aplazo: 0 });
        const bin7 = stats.histograma.sinAplazos.bins.find((b) => b.nota === 7);
        expect(bin7).toMatchObject({ total: 1, promocion: 0, finalRegular: 0, finalLibre: 1, aplazo: 0 });

        // Histograma con aplazos (1..10): incluye los dos aplazos de nota 2 -> 5 actas en total, empate 2 vs 8 (2 c/u -> gana nota 8)
        expect(stats.histograma.conAplazos.totalActas).toBe(5);
        expect(stats.histograma.conAplazos.moda).toEqual({ nota: 8, count: 2 });
        const bin2 = stats.histograma.conAplazos.bins.find((b) => b.nota === 2);
        expect(bin2).toMatchObject({ total: 2, aplazo: 2 });

        // Modalidades y finales
        expect(stats.modalidadesYFinales.modalidades).toEqual({
            promocion: { count: 1, porcentaje: 25 },
            finalRegular: { count: 1, porcentaje: 25 },
            finalLibre: { count: 1, porcentaje: 25 },
            equivalencia: { count: 1, porcentaje: 25 },
        });
        expect(stats.modalidadesYFinales.finales).toEqual({
            finalesAprobados: 2,
            aplazosTotales: 2,
            ausentesTotales: 1,
            totalRendiciones: 4,
            tasaEfectividad: 50,
            aprobadasPrimerIntento: 0,
            aprobadasConReintento: 2,
            promedioIntentosPorFinal: 2,
        });

        // Listado desagregado completo
        expect(stats.listadoDesagregado).toHaveLength(7);
        const item11071 = stats.listadoDesagregado.find((m) => m.codigo === '11071');
        expect(item11071).toMatchObject({
            codigo: '11071',
            nombre: 'Intro a la Programación',
            esAprobada: true,
            modalidad: 'Promoción',
            nota: 8,
            fecha: '2024-06-25',
        });
        const item11072 = stats.listadoDesagregado.find((m) => m.codigo === '11072');
        expect(item11072).toMatchObject({
            codigo: '11072',
            esAprobada: true,
            modalidad: 'Final Regular',
            nota: 8,
            aplazosCount: 1,
            intentosFinalCount: 2,
        });
        const item11075 = stats.listadoDesagregado.find((m) => m.codigo === '11075');
        expect(item11075).toMatchObject({
            codigo: '11075',
            esRegular: true,
            modalidad: 'Cursada',
        });
        const item11076 = stats.listadoDesagregado.find((m) => m.codigo === '11076');
        expect(item11076).toMatchObject({
            codigo: '11076',
            esPendiente: true,
            modalidad: 'Pendiente',
        });
    });

    it('agrupa por cuatrimestre ajustando mesas de febrero y calcula curva de promedios acumulados', () => {
        expect(inferirPeriodoDesdeFechaIso('2025-02-20')).toEqual({ anio: 2024, cuatri: 2 });
        expect(inferirPeriodoDesdeFechaIso('2025-07-10')).toEqual({ anio: 2025, cuatri: 1 });
        expect(inferirPeriodoMateria(MOCK_MATERIAS[4], 'Aprobado', { fechaRegularidad: '2024-10-05' })).toEqual({
            anio: 2024,
            cuatri: 2,
        });

        const stats = calcularEstadisticasAcademicas({
            materias: MOCK_MATERIAS.slice(1, 5),
            progreso: {
                '11071': 'Promocionado',
                '11072': 'Aprobado',
                '11074': 'Aprobado',
                '11075': 'Promocionado',
            },
            progresoDetalles: {
                '11071': { notaFinal: 8, fechaAprobacion: '2024-06-25' }, // 1°C 2024
                '11072': { notaFinal: 6, fechaAprobacion: '2025-02-20', intentosFinal: [{ nota: 2, estado: 'reprobado', fecha: '2024-07-15' }, { nota: 6, estado: 'aprobado', fecha: '2025-02-20' }] }, // 2°C 2024 (aplazo en 1°C 2024)
                '11074': { notaFinal: 9, fechaAprobacion: '2025-02-18' }, // 2°C 2024
                '11075': { notaFinal: 10, fechaAprobacion: '2025-07-05' }, // 1°C 2025
            },
        });

        expect(stats.cuatrimestres.items.map((c) => c.key)).toEqual(['2024-C1', '2024-C2', '2025-C1']);
        expect(stats.cuatrimestres.mejorCuatrimestre?.key).toBe('2024-C2');
        expect(stats.cuatrimestres.ritmoPromedioMaterias).toBe(1.3);
        expect(stats.cuatrimestres.ritmoPromedioHoras).toBe(128);

        // 2024-C1: sin aplazos = 8, con aplazos = (8 + 2) / 2 = 5
        expect(stats.cuatrimestres.items[0].promedioCuatriSinAplazos).toBe(8);
        expect(stats.cuatrimestres.items[0].promedioCuatriConAplazos).toBe(5);
        // 2024-C2: sin aplazos del cuatri = (6 + 9)/2 = 7.5; acumulado = (8 + 6 + 9)/3 = 7.66 (truncado)
        expect(stats.cuatrimestres.items[1].promedioCuatriSinAplazos).toBe(7.5);
        expect(stats.cuatrimestres.items[1].promedioAcumuladoSinAplazos).toBe(7.66);
        // 2025-C1 acumulado sin aplazos = (8 + 6 + 9 + 10)/4 = 8.25
        expect(stats.cuatrimestres.items[2].promedioAcumuladoSinAplazos).toBe(8.25);
    });

    it('calcula avance por año curricular y separa Talleres al final', () => {
        const stats = calcularEstadisticasAcademicas({
            materias: MOCK_MATERIAS,
            progreso: {
                '19054': 'Aprobado',
                '11071': 'Promocionado',
                '11072': 'Aprobado',
                '11074': 'Regular',
                '11075': 'Cursando',
            },
            progresoDetalles: {},
        });

        expect(stats.avancePorAnio.map((g) => g.label)).toEqual(['1° Año', '2° Año', 'Tramo Final', 'Talleres']);
        expect(stats.avancePorAnio[0]).toMatchObject({ total: 3, aprobadas: 2, regulares: 1, pendientes: 0, completado: false });
        expect(stats.avancePorAnio[1]).toMatchObject({ total: 2, aprobadas: 0, regulares: 1, pendientes: 1 });
        expect(stats.avancePorAnio[3]).toMatchObject({ total: 1, aprobadas: 1, completado: true });
    });

    it('maneja estado vacío sin progreso sin errores', () => {
        const stats = calcularEstadisticasAcademicas({
            materias: MOCK_MATERIAS,
            progreso: {},
            progresoDetalles: {},
        });

        expect(stats.resumen.tieneDatos).toBe(false);
        expect(stats.histograma.sinAplazos.moda).toBeNull();
        expect(stats.cuatrimestres.items).toEqual([]);
        expect(stats.modalidadesYFinales.finales.tasaEfectividad).toBeNull();
    });
});
