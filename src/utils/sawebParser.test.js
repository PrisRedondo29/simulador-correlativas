import { describe, expect, it } from 'vitest';
import { mergeSawebImportWithExisting, parseSawebTexts } from './sawebParser';
import { esMateriaIncompleta } from './Progreso/materiasUtils';
import { calcularPromedioGeneral } from './Progreso/regularidadUtils';
import sistemasPlanes from '../data/sistemas.json';

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

    it('mergeSawebImportWithExisting usa el Analítico como fuente de verdad (Promocionado pisa nota de cursada; Final Regular pisa nota final conservando nota de cursada)', () => {
        const parsed = parseSawebTexts(SAMPLE_ANALITICO_1713, MOCK_PLAN_1713);
        const existingProgreso = {
            '11071': 'Regular',
            '11075': 'Aprobado',
            '11079': 'Regular',
            '11081': 'Cursando',
        };
        const existingDetalles = {
            '11071': {
                notaRegularizacion: 8,
                fechaRegularidad: { anio: 2019, cuatrimestre: 1 },
                intentosFinal: [],
            },
            '11075': {
                notaRegularizacion: 8,
                notaFinal: 4,
                fechaRegularidad: { anio: 2023, cuatrimestre: 1 },
                intentosFinal: [{ nota: 4, estado: /** @type {const} */ ('aprobado'), fecha: '2023-12-01' }],
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

        // 11071 (Promocionado P-7 en Analítico): el Analítico manda y pisa notaRegularizacion=8 por 7
        expect(merged.progreso['11071']).toBe('Promocionado');
        expect(merged.progresoDetalles['11071'].notaFinal).toBe(7);
        expect(merged.progresoDetalles['11071'].notaRegularizacion).toBe(7);
        expect(merged.progresoDetalles['11071'].fechaRegularidad).toEqual({
            anio: 2019,
            cuatrimestre: 1,
        });

        // 11075 (Final Regular R-6 en Analítico): el Analítico pisa notaFinal=4 por 6 pero conserva notaRegularizacion=8
        expect(merged.progreso['11075']).toBe('Aprobado');
        expect(merged.progresoDetalles['11075'].notaFinal).toBe(6);
        expect(merged.progresoDetalles['11075'].notaRegularizacion).toBe(8);
        expect(merged.progresoDetalles['11075'].intentosFinal).toHaveLength(2);

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

    it('homologa materias aprobadas de Plan 17.13 a Plan 17.14 preservando notas, cursada, intentos y sin marcarlas Incompleta', () => {
        const analiticoCambioPlan = `
Universidad Nacional de Luján
CERTIFICADO ANALITICO DE ACTIVIDADES ACADEMICAS RENDIDAS
consta que ESTUDIANTE CAMBIO, DNI: 99999999, Nº de Legajo 196677, ingresó a la Universidad en el año 2023, habiendo rendido las siguientes asignaturas correspondientes a la carrera de LIC.EN SISTEMAS DE INFORMACION, Plan 1714:
ACTIVIDAD ACADEMICA NOTA LIBRO-FOLIO FECHA
31971 P-INGLES I 10(DIEZ) 0452-052 26-06-2023
11071 L-INTRODUCCION A LA PROGRAMACION 2(DOS) 0558-014 12-07-2023
41407 L-ORGANIZACION DE COMPUTADORAS 2(DOS) 0282-017 04-08-2023
11071 P-INTRODUCCION A LA PROGRAMACION 7(SIETE) 0565-006 01-11-2023
41407 R-ORGANIZACION DE COMPUTADORAS 2(DOS) 0284-099 15-12-2023
21056 R-INTROD. A LOS SISTEMAS DE INFORMACION 2(DOS) 1328-030 19-12-2023
41407 R-ORGANIZACION DE COMPUTADORAS 2(DOS) 0287-077 16-02-2024
21056 R-INTROD. A LOS SISTEMAS DE INFORMACION 2(DOS) 1337-098 22-02-2024
41407 P-ORGANIZACION DE COMPUTADORAS 7(SIETE) 0291-047 19-06-2024
11072 R-ALGEBRA Y LOGICA COMPUTACIONAL 4(CUATRO) 0583-029 31-07-2024
31972 L-INGLES II 9(NUEVE) 0482-080 23-09-2024
11073 P-MATEMATICA DISCRETA 9(NUEVE) 0592-066 29-11-2024
41406 P-ARQUITECTURA DE COMPUTADORAS 7(SIETE) 0298-022 02-12-2024
11074 L-PROGRAMACION I 2(DOS) 0590-056 18-12-2024
11074 L-PROGRAMACION I 8(OCHO) 0601-047 08-07-2025
21056 R-INTROD. A LOS SISTEMAS DE INFORMACION 4(CUATRO) 1418-070 30-09-2025

ACTIVIDADES ACADEMICAS RECONOCIDAS POR EQUIVALENCIA O EXIMIDAS
13021-ALGEBRA LINEAL Y GEOMETRIA E 21-08-2026
`;
        const plan1714Materias =
            sistemasPlanes.find((p) => p.plan_numero === '17.14')?.materias || [];

        const result = parseSawebTexts(analiticoCambioPlan, plan1714Materias);

        expect(result.detectedPlan).toBe('17.14');
        expect(result.anioIngreso).toBe(2023);
        // Promocionadas en 17.14: 41407 (común), 11271 (desde 11071), 41426 (desde 41406) y 14028 (desde 11073)
        expect(result.counts.Promocionado).toBe(4);
        // Aprobadas por final con acta primaria: 13014 (11072), 21256 (21056) y 11274 (11074)
        expect(result.counts.Aprobado).toBe(3);
        // Equivalencias sin nota duplicada: 13021 (Pág 3), 19054 (taller), 14026 (taller), 39553 (taller)
        expect(result.counts.Equivalencia).toBe(4);
        // Conserva cada aplazo del historial una sola vez (41407: 3, 11071: 1, 21056: 2, 11074: 1)
        expect(result.counts.Aplazos).toBe(7);
        expect(result.counts.Omitidas).toBe(0);
        expect(result.totalMatched).toBe(11);

        // 11271 (desde 11071 Promocionado 7) conserva estado, nota, cursada e intento Libre previo
        expect(result.progreso['11271']).toBe('Promocionado');
        expect(result.progresoDetalles['11271']).toMatchObject({
            notaFinal: 7,
            notaRegularizacion: 7,
            esEquivalencia: false,
            fechaRegularidad: { anio: 2023, cuatrimestre: 2 },
        });
        expect(result.progresoDetalles['11271']?.intentosFinal).toHaveLength(1);

        // 21256 (desde 21056 Regular con 2 aplazos y aprobado 4 en 2025-09-30)
        expect(result.progreso['21256']).toBe('Aprobado');
        expect(result.progresoDetalles['21256']).toMatchObject({
            notaFinal: 4,
            esEquivalencia: false,
            rendidaLibre: false,
            fechaRegularidad: { anio: 2023, cuatrimestre: 2 },
        });
        expect(result.progresoDetalles['21256']?.intentosFinal).toHaveLength(3);

        // 11274 (desde 11074 Libre 8 con 1 aplazo previo)
        expect(result.progreso['11274']).toBe('Aprobado');
        expect(result.progresoDetalles['11274']).toMatchObject({
            notaFinal: 8,
            esEquivalencia: false,
            rendidaLibre: true,
        });
        expect(result.progresoDetalles['11274']?.intentosFinal).toHaveLength(2);

        // 13014 (troncal 1:1 desde 11072) conserva acta; 14026 (taller) y 19054 (taller) no duplican nota ni aplazos
        expect(result.progreso['13014']).toBe('Aprobado');
        expect(result.progresoDetalles['13014']).toMatchObject({
            notaFinal: 4,
            esEquivalencia: false,
        });
        expect(result.progresoDetalles['14026']).toMatchObject({
            esEquivalencia: true,
            notaFinal: null,
            intentosFinal: [],
        });
        expect(result.progresoDetalles['19054']).toMatchObject({
            esEquivalencia: true,
            notaFinal: null,
            intentosFinal: [],
        });

        // 13021 (Equivalencia oficial de Página 3)
        expect(result.progreso['13021']).toBe('Aprobado');
        expect(result.progresoDetalles['13021']).toMatchObject({
            esEquivalencia: true,
            fechaAprobacion: '2026-08-21',
            notaFinal: null,
        });

        // 14028 (homologada con acta restante de 11073 Promocionado 9)
        expect(result.progreso['14028']).toBe('Promocionado');
        expect(result.progresoDetalles['14028']).toMatchObject({
            notaFinal: 9,
            notaRegularizacion: 9,
            esEquivalencia: false,
            fechaRegularidad: { anio: 2024, cuatrimestre: 2 },
        });

        // El promedio debe contabilizar exactamente 7 actas troncales aprobadas sin duplicar en talleres
        const promedio = calcularPromedioGeneral(result.progresoDetalles, result.progreso);
        expect(promedio.materiasContadas).toBe(7);
        expect(promedio.promedioSinAplazos).toBe(6.57); // (7+7+4+4+8+7+9)/7
        expect(promedio.promedioConAplazos).toBe(4.28); // (46 + 14)/14 = 4.2857... -> 4.28

        // Ninguna de las 11 materias importadas debe quedar marcada como Incompleta
        for (const materia of plan1714Materias) {
            expect(
                esMateriaIncompleta(
                    materia,
                    result.progreso[materia.codigo],
                    result.progresoDetalles[materia.codigo],
                ),
            ).toBe(false);
        }
    });

    it('detecta optativas con sufijo (OPT.) en Plan 17.13 (analítico Lucas) y las asigna a OP1 con su nombre real y promedio exacto', () => {
        const plan1713Materias =
            sistemasPlanes.find((p) => p.plan_numero === '17.13')?.materias || [];
        const lucasAnalitico = `
Universidad Nacional de Luján
correspondientes a la carrera de LIC.EN SISTEMAS DE INFORMACION, Plan 1713:
ingresó a la Universidad en el año 2019
ACTIVIDAD ACADEMICA NOTA LIBRO-FOLIO FECHA
21056 P-INTROD. A LOS SISTEMAS DE INFORMACION 7(SIETE) 1115-007 27-06-2019
11071 R-INTRODUCCION A LA PROGRAMACION 5(CINCO) 0478-025 13-07-2019
11072 L-ALGEBRA Y LOGICA COMPUTACIONAL 3(TRES) 0479-075 17-07-2019
11072 L-ALGEBRA Y LOGICA COMPUTACIONAL 6(SEIS) 0482-018 07-08-2019
31971 P-INGLES I 7(SIETE) 0374-033 02-12-2019
11074 R-PROGRAMACION I 9(NUEVE) 0489-035 14-12-2019
41407 P-ORGANIZACION DE COMPUTADORAS 8(OCHO) 0249-034 17-07-2020
31972 P-INGLES II 8(OCHO) 0387-086 30-08-2020
41406 P-ARQUITECTURA DE COMPUTADORAS 7(SIETE) 0251-002 29-12-2020
11056 R-SISTEMAS DE INFORMACION I 7(SIETE) 0504-061 24-02-2021
11081 P-ANALISIS MATEMATICO I 7(SIETE) 0517-052 12-07-2021
21057 P-ASPECTOS PROFESIONALES Y SOCIALES 8(OCHO) 1225-043 06-12-2021
11073 R-MATEMATICA DISCRETA 7(SIETE) 0523-084 22-12-2021
11075 R-PROGRAMACION II 4(CUATRO) 0535-002 11-07-2022
11079 R-PROGRAMACION FUNCIONAL Y LOGICA 7(SIETE) 0536-071 15-07-2022
11083 R-ESTADISTICA Y PROBABILIDAD 2(DOS) 0539-004 04-08-2022
11082 R-ANALISIS MATEMATICO II 6(SEIS) 0546-023 21-12-2022
11410 R-SISTEMAS OPERATIVOS 6(SEIS) 0547-066 10-02-2023
11077 R-BASE DE DATOS I 2(DOS) 0549-059 18-02-2023
10040 R-TELEINFORMATICA Y REDES 7(SIETE) 0561-005 03-08-2023
11083 R-ESTADISTICA Y PROBABILIDAD 2(DOS) 0566-081 14-12-2023
11083 R-ESTADISTICA Y PROBABILIDAD 7(SIETE) 0571-071 15-02-2024
41408 P-MODELOS, SIMUL. Y TEORIA DE LA DECISION 8(OCHO) 0291-050 19-06-2024
11077 R-BASE DE DATOS I 2(DOS) 0582-004 13-07-2024
11077 R-BASE DE DATOS I 9(NUEVE) 0584-094 03-08-2024
11076 R-PROGRAMACION ORIENTADA A OBJETOS 6(SEIS) 0586-077 27-09-2024
11412 P-TEORIA DE LA COMPUTACION I 8(OCHO) 0593-002 26-11-2024
11058 R-SISTEMAS DE INFORMACION II 7(SIETE) 0590-047 18-12-2024
11059 R-SISTEMAS DE INFORMACION III 8(OCHO) 0598-016 26-02-2025
11078 R-BASE DE DATOS II 7(SIETE) 0600-094 17-05-2025
11089 P-SISTEMAS INTELIGENTES 9(NUEVE) 0603-054 30-06-2025
11060 R-SISTEMAS DE INFORMACION IV 9(NUEVE) 0602-002 10-07-2025
11087 R-SEMINARIO DE INTEGRACION PROFESIONAL 7(SIETE) 0606-021 16-07-2025
11085 R-ADMINISTRACION Y GESTION DE REDES 7(SIETE) 0613-043 11-12-2025
11086 R-PROGRAMACION EN AMBIENTE WEB 8(OCHO) 0618-045 18-12-2025
11092 R-SEGURIDAD DE LA INFORMACION 8(OCHO) 0619-095 11-02-2026
41409 R-SISTEMAS DISTRIBUIDOS Y PROGRAM.PARALELA 7(SIETE) 0313-053 27-02-2026
11809 P-COMPILADORES (OPT.) 9(NUEVE) 0628-069 25-06-2026
Promedio (incluyendo aplazos): 6,60 (SEIS CON SESENTA CENTESIMOS)
        `;

        const parsed = parseSawebTexts(lucasAnalitico, plan1713Materias);

        expect(parsed.detectedPlan).toBe('17.13');
        expect(parsed.anioIngreso).toBe(2019);
        expect(parsed.counts.Omitidas).toBe(0);
        expect(parsed.omittedCodes).toEqual([]);
        expect(parsed.totalMatched).toBe(33);
        expect(parsed.counts.Promocionado).toBe(11);
        expect(parsed.counts.Aprobado).toBe(22);
        expect(parsed.counts.Aplazos).toBe(5);

        expect(parsed.progreso['OP1']).toBe('Promocionado');
        expect(parsed.progresoDetalles['OP1']).toMatchObject({
            notaFinal: 9,
            notaRegularizacion: 9,
            fechaAprobacion: '2026-06-25',
            nombreOptativa: 'COMPILADORES',
            codigoOptativa: '11809',
        });

        const merged = mergeSawebImportWithExisting(parsed, {}, {}, plan1713Materias);
        expect(merged.progreso['OP1']).toBe('Promocionado');
        expect(merged.progresoDetalles['OP1']).toMatchObject({
            notaFinal: 9,
            nombreOptativa: 'COMPILADORES',
            codigoOptativa: '11809',
        });

        const promedio = calcularPromedioGeneral(merged.progresoDetalles, merged.progreso);
        expect(promedio.materiasContadas).toBe(33);
        expect(promedio.totalNotas).toBe(240);
        expect(promedio.promedioSinAplazos).toBe(7.27); // 240 / 33
        expect(promedio.promedioConAplazos).toBe(6.6); // 251 / 38 = 6.6052... -> truncado a 6.60
    });

    it('ordena múltiples optativas (OPT.) cronológicamente en OP1, OP2 y OP3 y homologa AO-1714 al reunir 3 en Plan 17.14', () => {
        const plan1713Materias =
            sistemasPlanes.find((p) => p.plan_numero === '17.13')?.materias || [];
        const plan1714Materias =
            sistemasPlanes.find((p) => p.plan_numero === '17.14')?.materias || [];

        const multiOptText = `
correspondientes a la carrera de LIC.EN SISTEMAS DE INFORMACION, Plan 1713:
11811 R-ROBOTICA APLICADA (OPT.) 8(OCHO) 0640-010 15-12-2026
11809 P-COMPILADORES (OPT.) 9(NUEVE) 0628-069 25-06-2026
11812 P-BIOINFORMATICA (OPTATIVA) 10(DIEZ) 0650-001 10-03-2027
        `;

        const parsed1713 = parseSawebTexts(multiOptText, plan1713Materias);
        expect(parsed1713.counts.Omitidas).toBe(0);
        expect(parsed1713.progreso['OP1']).toBe('Promocionado');
        expect(parsed1713.progresoDetalles['OP1']).toMatchObject({
            nombreOptativa: 'COMPILADORES',
            codigoOptativa: '11809',
            notaFinal: 9,
        });
        expect(parsed1713.progreso['OP2']).toBe('Aprobado');
        expect(parsed1713.progresoDetalles['OP2']).toMatchObject({
            nombreOptativa: 'ROBOTICA APLICADA',
            codigoOptativa: '11811',
            notaFinal: 8,
        });
        expect(parsed1713.progreso['OP3']).toBe('Promocionado');
        expect(parsed1713.progresoDetalles['OP3']).toMatchObject({
            nombreOptativa: 'BIOINFORMATICA',
            codigoOptativa: '11812',
            notaFinal: 10,
        });

        // En Plan 17.14 las 3 optativas externas se homologan en AO-1714 sin quedar como omitidas
        const parsed1714 = parseSawebTexts(multiOptText, plan1714Materias);
        expect(parsed1714.counts.Omitidas).toBe(0);
        expect(parsed1714.progreso['AO-1714']).toBe('Aprobado');
        expect(parsed1714.progresoDetalles['AO-1714']?.notaFinal).toBe(9);
    });
});
