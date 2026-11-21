import { describe, expect, it } from 'vitest';
import { mergeSawebImportWithExisting, parseSawebTexts } from './sawebParser';

const MOCK_PLAN_1713 = [
    { codigo: '11071', nombre: 'Introducción a la Programación', correlativas: [] },
    { codigo: '11072', nombre: 'Álgebra y Lógica Computacional', correlativas: [] },
    { codigo: '21056', nombre: 'Introducción a los Sistemas de Información', correlativas: [] },
    { codigo: '31971', nombre: 'Inglés I', correlativas: [] },
    { codigo: '41407', nombre: 'Organización de Computadoras', correlativas: [] },
    { codigo: '11073', nombre: 'Matemática Discreta', correlativas: ['11072'] },
    { codigo: '11074', nombre: 'Programación I', correlativas: ['11071'] },
    { codigo: '31972', nombre: 'Inglés II', correlativas: ['31971'] },
    { codigo: '41406', nombre: 'Arquitectura de Computadoras', correlativas: ['41407'] },
    { codigo: '11056', nombre: 'Sistemas de Información I', correlativas: ['21056'] },
    { codigo: '11075', nombre: 'Programación II', correlativas: ['11074'] },
    { codigo: '11079', nombre: 'Programación Funcional y Lógica', correlativas: ['11073', '11074'] },
    { codigo: '11081', nombre: 'Análisis Matemático I', correlativas: ['11072'] },
];

const MOCK_PLAN_1714 = [
    { codigo: '11071', nombre: 'Introducción a la Programación', correlativas: [] },
    { codigo: '13021', nombre: 'Álgebra Lineal y Geometría', correlativas: [] },
    { codigo: '21056', nombre: 'Introducción a los Sistemas de Información', correlativas: [] },
    { codigo: '31971', nombre: 'Inglés I', correlativas: [] },
    { codigo: '41407', nombre: 'Organización de Computadoras', correlativas: [] },
    { codigo: '11073', nombre: 'Matemática Discreta', correlativas: ['13021'] },
    { codigo: '11074', nombre: 'Programación I', correlativas: ['11071'] },
    { codigo: '31972', nombre: 'Inglés II', correlativas: ['31971'] },
    { codigo: '41406', nombre: 'Arquitectura de Computadoras', correlativas: ['41407'] },
    { codigo: '11056', nombre: 'Sistemas de Información I', correlativas: ['21056'] },
    { codigo: '11075', nombre: 'Programación II', correlativas: ['11074'] },
];

const SAMPLE_ANALITICO_1713 = `
Universidad Nacional de Luján
CERTIFICADO ANALITICO DE ACTIVIDADES ACADEMICAS RENDIDAS
consta que ESTUDIANTE PRUEBA, DNI: 99999999, Nº de Legajo 123456, ingresó a la Universidad en el año 2019, habiendo rendido las siguientes asignaturas correspondientes a la carrera de LIC.EN SISTEMAS DE INFORMACION, Plan 1713:
ACTIVIDAD ACADEMICA NOTA LIBRO-FOLIO FECHA
11071 P-INTRODUCCION A LA PROGRAMACION 7(SIETE) 0475-047 01-07-2019
11072 R-ALGEBRA Y LOGICA COMPUTACIONAL 2(DOS) 0479-074 17-07-2019
11072 P-ALGEBRA Y LOGICA COMPUTACIONAL 7(SIETE) 0532-076 22-06-2022
41406 L-ARQUITECTURA DE COMPUTADORAS 2(DOS) 0272-093 13-12-2022
11074 L-PROGRAMACION I 10(DIEZ) 0546-020 21-12-2022
11075 R-PROGRAMACION II 2(DOS) 0563-048 30-09-2023
11075 R-PROGRAMACION II 6(SEIS) 0567-015 16-12-2023
`;

const SAMPLE_ANALITICO_CON_EQUIVALENCIAS_1714 = `
ingresó a la Universidad en el año 2019, habiendo rendido las siguientes asignaturas correspondientes a la carrera de LIC.EN SISTEMAS DE INFORMACION, Plan 1714:
11071 P-INTRODUCCION A LA PROGRAMACION 9(NUEVE) 0475-047 01-07-2019
11072 L-ALGEBRA Y LOGICA COMPUTACIONAL 5(CINCO) 0477-008 10-07-2019
11075 R-PROGRAMACION II 2(DOS) 0535-002 11-07-2022
11075 R-PROGRAMACION II 2(DOS) 0541-020 01-10-2022
11075 L-PROGRAMACION II 2(DOS) 0605-011 12-07-2025
11075 L-PROGRAMACION II 5(CINCO) 0636-022 08-08-2026

ACTIVIDADES ACADEMICAS RECONOCIDAS POR EQUIVALENCIA O EXIMIDAS
13021-ALGEBRA LINEAL Y GEOMETRIA E 21-08-2026
`;

const SAMPLE_CURSADAS_RECENT = `
CURSADAS
11071\tINTRODUCCION A LA PROGRAMACION\t2019\t1\tPromovido\t07\t1\t-
11079\tPROGRAMACION FUNCIONAL Y LOGICA\t2026\t1\tRegular\t-\t1\t-
`;

describe('sawebParser', () => {
    it('detecta plan 17.13, promociones, aprobados por final regular/libre y aplazos previos', () => {
        const result = parseSawebTexts(SAMPLE_ANALITICO_1713, MOCK_PLAN_1713);

        expect(result.detectedPlan).toBe('17.13');
        expect(result.anioIngreso).toBe(2019);
        expect(result.sourcesDetected.analitico).toBe(true);
        expect(result.counts).toEqual({
            Promocionado: 2,
            Aprobado: 2,
            Equivalencia: 0,
            Regular: 0,
            Libre: 1, // 41406 tuvo solo un aplazo L-2 sin aprobación posterior
            Aplazos: 3,
            Omitidas: 0,
        });

        expect(result.progreso['11071']).toBe('Promocionado');
        expect(result.progresoDetalles['11071'].notaFinal).toBe(7);
        expect(result.progresoDetalles['11071'].notaRegularizacion).toBe(7);
        expect(result.progresoDetalles['11071'].fechaRegularidad).toEqual({
            anio: 2019,
            cuatrimestre: 1,
        });

        expect(result.progreso['11072']).toBe('Promocionado');
        expect(result.progresoDetalles['11072'].notaFinal).toBe(7);
        expect(result.progresoDetalles['11072'].notaRegularizacion).toBe(7);
        expect(result.progresoDetalles['11072'].fechaRegularidad).toEqual({
            anio: 2022,
            cuatrimestre: 1,
        });
        expect(result.progresoDetalles['11072'].intentosFinal).toHaveLength(1);
        expect(result.progresoDetalles['11072'].intentosFinal[0]).toMatchObject({
            estado: 'reprobado',
            nota: 2,
            fecha: '2019-07-17',
        });

        expect(result.progreso['11074']).toBe('Aprobado');
        expect(result.progresoDetalles['11074'].rendidaLibre).toBe(true);
        expect(result.progresoDetalles['11074'].notaFinal).toBe(10);
        expect(result.progresoDetalles['11074'].fechaRegularidad).toBeNull();

        expect(result.progreso['11075']).toBe('Aprobado');
        expect(result.progresoDetalles['11075'].rendidaLibre).toBe(false);
        expect(result.progresoDetalles['11075'].notaFinal).toBe(6);
        expect(result.progresoDetalles['11075'].fechaRegularidad).toEqual({
            anio: 2023,
            cuatrimestre: 1,
        });
        expect(result.progresoDetalles['11075'].intentosFinal).toHaveLength(2);
        expect(result.progresoDetalles['11075'].intentosFinal[0].condicion).toBe('Regular');

        expect(result.progreso['11074']).toBe('Aprobado');
        expect(result.progresoDetalles['11074'].intentosFinal[0].condicion).toBe('Libre');
    });

    it('soporta equivalencias (E/X), múltiples aplazos y omite materias fuera del plan nuevo (17.14)', () => {
        const result = parseSawebTexts(SAMPLE_ANALITICO_CON_EQUIVALENCIAS_1714, MOCK_PLAN_1714);

        expect(result.detectedPlan).toBe('17.14');
        expect(result.sourcesDetected.equivalencias).toBe(true);
        expect(result.counts.Equivalencia).toBe(1);
        expect(result.counts.Promocionado).toBe(1);
        expect(result.counts.Aprobado).toBe(1);
        expect(result.counts.Omitidas).toBe(1);
        expect(result.omittedCodes).toEqual([
            { codigo: '11072', nombre: 'ALGEBRA Y LOGICA COMPUTACIONAL' },
        ]);

        expect(result.progreso['13021']).toBe('Aprobado');
        expect(result.progresoDetalles['13021'].esEquivalencia).toBe(true);
        expect(result.progresoDetalles['13021'].notaFinal).toBeNull();

        // 11073 depende de 13021 -> debe quedar Disponible al aprobarse por equivalencia
        expect(result.progreso['11073']).toBe('Disponible');

        expect(result.progreso['11075']).toBe('Aprobado');
        expect(result.progresoDetalles['11075'].rendidaLibre).toBe(true);
        expect(result.progresoDetalles['11075'].intentosFinal).toHaveLength(4);
    });

    it('combina acumulativamente Analítico + Cursadas deduplicando repetidos', () => {
        const result = parseSawebTexts(
            [SAMPLE_ANALITICO_1713, SAMPLE_ANALITICO_1713, SAMPLE_CURSADAS_RECENT],
            MOCK_PLAN_1713,
        );

        expect(result.sourcesDetected.analitico).toBe(true);
        expect(result.sourcesDetected.cursadas).toBe(true);
        expect(result.counts.Promocionado).toBe(2);
        expect(result.counts.Regular).toBe(1);
        expect(result.progreso['11079']).toBe('Regular');
        expect(result.progresoDetalles['11079'].fechaRegularidad).toEqual({
            anio: 2026,
            cuatrimestre: 1,
        });
    });

    it('mergeSawebImportWithExisting actualiza finales y aprobadas sin pisar nota de cursada ni materias Regular/Cursando previas', () => {
        const parsed = parseSawebTexts(SAMPLE_ANALITICO_1713, MOCK_PLAN_1713);
        const existingProgreso = {
            '11071': 'Regular',
            '11079': 'Regular',
            '11081': 'Cursando',
        };
        const existingDetalles = {
            '11071': {
                notaRegularizacion: 8,
                fechaRegularidad: { anio: 2019, cuatrimestre: 1 },
                intentosFinal: [],
            },
            '11079': {
                notaRegularizacion: 7,
                fechaRegularidad: { anio: 2026, cuatrimestre: 1 },
                intentosFinal: [],
            },
        };

        const merged = mergeSawebImportWithExisting(
            parsed,
            existingProgreso,
            existingDetalles,
            MOCK_PLAN_1713,
        );

        // 11071 pasa a Promocionado con notaFinal 7 pero conserva su notaRegularizacion=8 y fechaRegularidad
        expect(merged.progreso['11071']).toBe('Promocionado');
        expect(merged.progresoDetalles['11071'].notaFinal).toBe(7);
        expect(merged.progresoDetalles['11071'].notaRegularizacion).toBe(8);
        expect(merged.progresoDetalles['11071'].fechaRegularidad).toEqual({
            anio: 2019,
            cuatrimestre: 1,
        });

        // 11079 (Regular) y 11081 (Cursando) no están en el Analítico -> se conservan intactas
        expect(merged.progreso['11079']).toBe('Regular');
        expect(merged.progresoDetalles['11079'].notaRegularizacion).toBe(7);
        expect(merged.progreso['11081']).toBe('Cursando');
    });

    it('si estaba Regular y el Analítico trae 1 aplazo sin aprobar aún, mantiene Regular con el intento registrado', () => {
        const analiticoConAplazo = `
Plan 1713:
11075 R-PROGRAMACION II 2(DOS) 0563-048 30-09-2025
`;
        const parsed = parseSawebTexts(analiticoConAplazo, MOCK_PLAN_1713);
        const existingProgreso = { '11075': 'Regular' };
        const existingDetalles = {
            '11075': {
                notaRegularizacion: 6,
                fechaRegularidad: { anio: 2025, cuatrimestre: 1 },
                intentosFinal: [],
            },
        };

        const merged = mergeSawebImportWithExisting(
            parsed,
            existingProgreso,
            existingDetalles,
            MOCK_PLAN_1713,
        );

        expect(merged.progreso['11075']).toBe('Regular');
        expect(merged.progresoDetalles['11075'].notaRegularizacion).toBe(6);
        expect(merged.progresoDetalles['11075'].intentosFinal).toHaveLength(1);
        expect(merged.progresoDetalles['11075'].intentosFinal[0]).toMatchObject({
            estado: 'reprobado',
            nota: 2,
        });
    });

    it('actualiza año de cursada y nota si regularizó en un año previo y luego recursó y promocionó en un año posterior', () => {
        const analiticoRecursadaPromo = `
Plan 1713:
11072 R-ALGEBRA Y LOGICA COMPUTACIONAL 2(DOS) 0479-074 17-07-2019
11072 P-ALGEBRA Y LOGICA COMPUTACIONAL 7(SIETE) 0532-076 22-06-2022
`;
        const parsed = parseSawebTexts(analiticoRecursadaPromo, MOCK_PLAN_1713);
        const existingProgreso = { '11072': 'Regular' };
        const existingDetalles = {
            '11072': {
                notaRegularizacion: 5,
                fechaRegularidad: { anio: 2019, cuatrimestre: 1 },
                intentosFinal: [],
            },
        };

        const merged = mergeSawebImportWithExisting(
            parsed,
            existingProgreso,
            existingDetalles,
            MOCK_PLAN_1713,
        );

        expect(merged.progreso['11072']).toBe('Promocionado');
        expect(merged.progresoDetalles['11072'].fechaRegularidad).toEqual({
            anio: 2022,
            cuatrimestre: 1,
        });
        expect(merged.progresoDetalles['11072'].notaRegularizacion).toBe(7);
        expect(merged.progresoDetalles['11072'].notaFinal).toBe(7);
    });

    it('infiere año y cuatrimestre de regularidad para aprobadas R- descartando intentos Libres previos y ajustando mesas de febrero', () => {
        const analiticoAprobadasRegulares = `
Plan 1713:
41406 L-ARQUITECTURA DE COMPUTADORAS 2(DOS) 0272-093 13-12-2022
41406 R-ARQUITECTURA DE COMPUTADORAS 6(SEIS) 0296-034 13-12-2024
11073 R-MATEMATICA DISCRETA 6(SEIS) 0566-045 12-02-2026
`;
        const result = parseSawebTexts(analiticoAprobadasRegulares, MOCK_PLAN_1713);

        // 41406 tuvo un aplazo L- en 2022 y luego regularizó/aprobó R- en dic 2024
        expect(result.progreso['41406']).toBe('Aprobado');
        expect(result.progresoDetalles['41406'].rendidaLibre).toBe(false);
        expect(result.progresoDetalles['41406'].fechaRegularidad).toEqual({
            anio: 2024,
            cuatrimestre: 2,
        });

        // Rendida R- en febrero 2026 -> regularidad del 2° cuatrimestre 2025
        expect(result.progreso['11073']).toBe('Aprobado');
        expect(result.progresoDetalles['11073'].fechaRegularidad).toEqual({
            anio: 2025,
            cuatrimestre: 2,
        });
    });
});
