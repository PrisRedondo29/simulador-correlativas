import { describe, it, expect } from 'vitest';
import {
    ESTADOS_MATERIA,
    aplicarCambioEstado,
    aplicarCambioMasivo,
    calcularEstadoBaseMateria,
    sincronizarTesina,
    esTransicionRecursada,
    evaluarElegibilidadMateria,
    obtenerRequisitosCursada,
    obtenerRequisitosFinal,
} from './materiaStateMachine';
import materiasUtils from './materiasUtils';

const MATERIAS_MOCK = [
    { codigo: 'M1', nombre: 'Intro Prog', anio: '1', correlativas: [] },
    { codigo: 'M2', nombre: 'Matemática I', anio: '1', correlativas: [] },
    { codigo: 'M3', nombre: 'Estructuras', anio: '2', correlativas: ['M1'] },
    { codigo: 'M4', nombre: 'Algoritmos', anio: '2', correlativas: ['M2', 'M3'] },
    { codigo: 'T1', nombre: 'Taller Inicial', anio: null, taller: true, correlativas: [] },
    { codigo: 'TES', nombre: 'Tesina', anio: '6', tesis: true, correlativas: [] },
];

const PROGRESO_INICIAL = {
    M1: ESTADOS_MATERIA.DISPONIBLE,
    M2: ESTADOS_MATERIA.DISPONIBLE,
    M3: ESTADOS_MATERIA.BLOQUEADO,
    M4: ESTADOS_MATERIA.BLOQUEADO,
    T1: ESTADOS_MATERIA.DISPONIBLE,
    TES: ESTADOS_MATERIA.BLOQUEADO,
};

describe('materiaStateMachine - Transiciones, correlativas y Tesina', () => {
    it('regulariza correlativas previas en cascada sin degradar Aprobado ni Promocionado', () => {
        const progreso = {
            ...PROGRESO_INICIAL,
            M1: ESTADOS_MATERIA.PROMOCIONADO,
            M2: ESTADOS_MATERIA.DISPONIBLE,
            M3: ESTADOS_MATERIA.BLOQUEADO,
        };

        const { nuevoProgreso } = aplicarCambioEstado(
            progreso,
            MATERIAS_MOCK,
            'M4',
            ESTADOS_MATERIA.REGULAR,
        );

        expect(nuevoProgreso.M4).toBe(ESTADOS_MATERIA.REGULAR);
        expect(nuevoProgreso.M3).toBe(ESTADOS_MATERIA.REGULAR);
        expect(nuevoProgreso.M2).toBe(ESTADOS_MATERIA.REGULAR);
        expect(nuevoProgreso.M1).toBe(ESTADOS_MATERIA.PROMOCIONADO);
        // No muta el objeto original
        expect(progreso.M4).toBe(ESTADOS_MATERIA.BLOQUEADO);
    });

    it('aprueba correlativas previas en cascada sin pisar Promocionado', () => {
        const progreso = {
            ...PROGRESO_INICIAL,
            M1: ESTADOS_MATERIA.PROMOCIONADO,
        };

        const { nuevoProgreso } = aplicarCambioEstado(
            progreso,
            MATERIAS_MOCK,
            'M3',
            ESTADOS_MATERIA.APROBADO,
        );

        expect(nuevoProgreso.M3).toBe(ESTADOS_MATERIA.APROBADO);
        expect(nuevoProgreso.M1).toBe(ESTADOS_MATERIA.PROMOCIONADO);
    });

    it('desbloquea dependientes solo cuando TODAS sus correlativas están cumplidas', () => {
        const res1 = aplicarCambioEstado(
            PROGRESO_INICIAL,
            MATERIAS_MOCK,
            'M1',
            ESTADOS_MATERIA.APROBADO,
        );
        expect(res1.nuevoProgreso.M3).toBe(ESTADOS_MATERIA.DISPONIBLE);
        expect(res1.nuevoProgreso.M4).toBe(ESTADOS_MATERIA.BLOQUEADO);

        const res2 = aplicarCambioEstado(
            res1.nuevoProgreso,
            MATERIAS_MOCK,
            'M2',
            ESTADOS_MATERIA.REGULAR,
        );
        const res3 = aplicarCambioEstado(
            res2.nuevoProgreso,
            MATERIAS_MOCK,
            'M3',
            ESTADOS_MATERIA.REGULAR,
        );
        expect(res3.nuevoProgreso.M4).toBe(ESTADOS_MATERIA.DISPONIBLE);
    });

    it('reiniciar una materia bloquea en cascada todas sus dependientes', () => {
        const progreso = {
            M1: ESTADOS_MATERIA.APROBADO,
            M2: ESTADOS_MATERIA.APROBADO,
            M3: ESTADOS_MATERIA.REGULAR,
            M4: ESTADOS_MATERIA.REGULAR,
            T1: ESTADOS_MATERIA.DISPONIBLE,
            TES: ESTADOS_MATERIA.BLOQUEADO,
        };

        const { nuevoProgreso } = aplicarCambioEstado(
            progreso,
            MATERIAS_MOCK,
            'M1',
            ESTADOS_MATERIA.DISPONIBLE,
        );

        expect(nuevoProgreso.M1).toBe(ESTADOS_MATERIA.DISPONIBLE);
        expect(nuevoProgreso.M3).toBe(ESTADOS_MATERIA.BLOQUEADO);
        expect(nuevoProgreso.M4).toBe(ESTADOS_MATERIA.BLOQUEADO);
    });

    it('desbloquea la Tesina al tener el resto entre Aprobado y Promocionado, y la bloquea si una regresa', () => {
        const casiCompleto = {
            M1: ESTADOS_MATERIA.PROMOCIONADO,
            M2: ESTADOS_MATERIA.APROBADO,
            M3: ESTADOS_MATERIA.PROMOCIONADO,
            M4: ESTADOS_MATERIA.APROBADO,
            T1: ESTADOS_MATERIA.DISPONIBLE,
            TES: ESTADOS_MATERIA.BLOQUEADO,
        };

        const resCompleto = aplicarCambioEstado(
            casiCompleto,
            MATERIAS_MOCK,
            'T1',
            ESTADOS_MATERIA.PROMOCIONADO,
        );
        expect(resCompleto.nuevoProgreso.TES).toBe(ESTADOS_MATERIA.DISPONIBLE);

        const resPendiente = aplicarCambioEstado(
            resCompleto.nuevoProgreso,
            MATERIAS_MOCK,
            'M2',
            ESTADOS_MATERIA.DISPONIBLE,
        );
        expect(resPendiente.nuevoProgreso.TES).toBe(ESTADOS_MATERIA.BLOQUEADO);

        const sync = sincronizarTesina(
            { ...resCompleto.nuevoProgreso, TES: ESTADOS_MATERIA.BLOQUEADO },
            MATERIAS_MOCK,
        );
        expect(sync.huboCambios).toBe(true);
        expect(sync.progreso.TES).toBe(ESTADOS_MATERIA.DISPONIBLE);
    });

    it('en cambio masivo excluye la Tesina para no aprobar Talleres involuntariamente', () => {
        const { nuevoProgreso } = aplicarCambioMasivo(
            PROGRESO_INICIAL,
            MATERIAS_MOCK,
            ['M1', 'M2', 'M3', 'M4', 'TES'],
            ESTADOS_MATERIA.APROBADO,
        );

        expect(nuevoProgreso.M1).toBe(ESTADOS_MATERIA.APROBADO);
        expect(nuevoProgreso.M4).toBe(ESTADOS_MATERIA.APROBADO);
        expect(nuevoProgreso.T1).toBe(ESTADOS_MATERIA.DISPONIBLE);
        expect(nuevoProgreso.TES).toBe(ESTADOS_MATERIA.BLOQUEADO);
    });

    it('calcula correctamente el estado base al reiniciar y detecta recursadas', () => {
        expect(
            calcularEstadoBaseMateria(PROGRESO_INICIAL, MATERIAS_MOCK[2], MATERIAS_MOCK),
        ).toBe(ESTADOS_MATERIA.BLOQUEADO);
        expect(
            calcularEstadoBaseMateria(
                { ...PROGRESO_INICIAL, M1: ESTADOS_MATERIA.REGULAR },
                MATERIAS_MOCK[2],
                MATERIAS_MOCK,
            ),
        ).toBe(ESTADOS_MATERIA.DISPONIBLE);

        expect(esTransicionRecursada(ESTADOS_MATERIA.REGULAR, ESTADOS_MATERIA.CURSANDO)).toBe(true);
        expect(esTransicionRecursada(ESTADOS_MATERIA.LIBRE, ESTADOS_MATERIA.APROBADO)).toBe(true);
        expect(esTransicionRecursada(ESTADOS_MATERIA.DISPONIBLE, ESTADOS_MATERIA.CURSANDO)).toBe(false);
    });

    it('regla UNLu al quedar Libre: conserva Regular/Cursando/Aprobado en dependientes y solo bloquea Disponible', () => {
        const materiasConDosDependientes = [
            ...MATERIAS_MOCK,
            { codigo: 'M5', nombre: 'Paradigmas', anio: '2', correlativas: ['M1'] },
        ];
        const progreso = {
            ...PROGRESO_INICIAL,
            M1: ESTADOS_MATERIA.REGULAR,
            M3: ESTADOS_MATERIA.REGULAR,    // ya regularizó M3 dependiendo de M1
            M5: ESTADOS_MATERIA.DISPONIBLE, // todavía no cursó M5
        };

        const { nuevoProgreso } = aplicarCambioEstado(
            progreso,
            materiasConDosDependientes,
            'M1',
            ESTADOS_MATERIA.LIBRE,
        );

        expect(nuevoProgreso.M1).toBe(ESTADOS_MATERIA.LIBRE);
        // M3 conserva su regularidad aunque M1 haya quedado Libre (regla UNLu)
        expect(nuevoProgreso.M3).toBe(ESTADOS_MATERIA.REGULAR);
        // M5, al estar solo Disponible (sin cursar), vuelve a Bloqueado
        expect(nuevoProgreso.M5).toBe(ESTADOS_MATERIA.BLOQUEADO);
    });

    describe('Dominio Académico Canónico v2 (correlativas diferenciadas, requisitos especiales y guardas)', () => {
        const MATERIAS_V2_MOCK = [
            { codigo: 'C1', nombre: 'Álgebra', anio: 1, horas_totales: 128, creditos: 8, correlativas: [] },
            { codigo: 'C2', nombre: 'Análisis I', anio: 1, horas_totales: 128, creditos: 8, correlativas: [] },
            {
                codigo: 'C3',
                nombre: 'Física II',
                anio: 2,
                horas_totales: 96,
                creditos: 6,
                correlativas: ['C1', 'C2'],
                // Para cursar C3: C1 debe estar APROBADA (con final) y C2 basta con REGULAR
                correlativasCursada: [
                    { codigo: 'C1', condicion: 'aprobada' },
                    { codigo: 'C2', condicion: 'regular' },
                ],
                // Para rendir final de C3: ambas deben estar APROBADAS
                correlativasFinal: ['C1', 'C2'],
            },
            {
                codigo: 'PPS',
                nombre: 'Práctica Profesional Supervisada',
                anio: 4,
                horas_totales: 200,
                creditos: 12,
                correlativas: [],
                requisitosEspeciales: {
                    minimoMateriasAprobadas: 2,
                    minimoHorasAprobadas: 200,
                    minimoCreditos: 15,
                    aniosCompletosAprobados: [1],
                },
            },
        ];

        it('soporta correlativasCursada mixtas (regular + aprobada) para desbloquear y propagar en cascada', () => {
            const progresoParcial = {
                C1: ESTADOS_MATERIA.REGULAR, // No alcanza: C3 exige C1 aprobada para cursar
                C2: ESTADOS_MATERIA.REGULAR,
                C3: ESTADOS_MATERIA.BLOQUEADO,
                PPS: ESTADOS_MATERIA.BLOQUEADO,
            };

            const elegParcial = evaluarElegibilidadMateria(
                MATERIAS_V2_MOCK[2],
                progresoParcial,
                MATERIAS_V2_MOCK,
            );
            expect(elegParcial.puedeCursar).toBe(false);
            expect(elegParcial.faltantesParaCursar).toHaveLength(1);
            expect(elegParcial.faltantesParaCursar[0]).toMatchObject({
                codigo: 'C1',
                condicionRequerida: 'aprobada',
                estadoActual: ESTADOS_MATERIA.REGULAR,
            });

            // Al aprobar C1 (y teniendo C2 Regular), C3 se desbloquea para cursar
            const { nuevoProgreso } = aplicarCambioEstado(
                progresoParcial,
                MATERIAS_V2_MOCK,
                'C1',
                ESTADOS_MATERIA.APROBADO,
            );
            expect(nuevoProgreso.C3).toBe(ESTADOS_MATERIA.DISPONIBLE);

            // Pero aún no puede rendir final de C3 porque C2 sigue Regular
            const elegCursable = evaluarElegibilidadMateria(
                MATERIAS_V2_MOCK[2],
                nuevoProgreso,
                MATERIAS_V2_MOCK,
            );
            expect(elegCursable.puedeCursar).toBe(true);
            expect(elegCursable.puedeRendirFinal).toBe(false);
            expect(elegCursable.faltantesParaFinal).toHaveLength(1);
            expect(elegCursable.faltantesParaFinal[0].codigo).toBe('C2');

            // Si el usuario marca C3 como Regular desde cero, C1 sube a Aprobado y C2 a Regular
            const desdeCero = {
                C1: ESTADOS_MATERIA.DISPONIBLE,
                C2: ESTADOS_MATERIA.DISPONIBLE,
                C3: ESTADOS_MATERIA.BLOQUEADO,
                PPS: ESTADOS_MATERIA.BLOQUEADO,
            };
            const cascadaMixta = aplicarCambioEstado(
                desdeCero,
                MATERIAS_V2_MOCK,
                'C3',
                ESTADOS_MATERIA.REGULAR,
            );
            expect(cascadaMixta.nuevoProgreso.C3).toBe(ESTADOS_MATERIA.REGULAR);
            expect(cascadaMixta.nuevoProgreso.C1).toBe(ESTADOS_MATERIA.APROBADO);
            expect(cascadaMixta.nuevoProgreso.C2).toBe(ESTADOS_MATERIA.REGULAR);
        });

        it('evalúa y sincroniza automáticamente materias con requisitosEspeciales (materias, horas, créditos y año completo)', () => {
            const progresoUnoAprobado = {
                C1: ESTADOS_MATERIA.APROBADO, // 1 materia, 128 hs, 8 créditos (falta C2 para completar 1° año y umbrales)
                C2: ESTADOS_MATERIA.REGULAR,
                C3: ESTADOS_MATERIA.DISPONIBLE,
                PPS: ESTADOS_MATERIA.BLOQUEADO,
            };

            const elegFaltante = evaluarElegibilidadMateria(
                MATERIAS_V2_MOCK[3],
                progresoUnoAprobado,
                MATERIAS_V2_MOCK,
            );
            expect(elegFaltante.puedeCursar).toBe(false);
            expect(
                elegFaltante.requisitosEspecialesFaltantes.map((r) => r.tipo),
            ).toEqual([
                'minimo_materias_aprobadas',
                'minimo_horas_aprobadas',
                'minimo_creditos',
                'anio_completo_aprobado',
            ]);

            // Al aprobar C2 se cumplen las 2 materias, 256 hs (>=200), 16 créditos (>=15) y 1° año completo
            const { nuevoProgreso } = aplicarCambioEstado(
                progresoUnoAprobado,
                MATERIAS_V2_MOCK,
                'C2',
                ESTADOS_MATERIA.PROMOCIONADO,
            );
            expect(nuevoProgreso.PPS).toBe(ESTADOS_MATERIA.DISPONIBLE);

            // Si C2 vuelve a Regular, PPS vuelve a Bloqueado si aún no fue cursada
            const { nuevoProgreso: progresoRevertido } = aplicarCambioEstado(
                nuevoProgreso,
                MATERIAS_V2_MOCK,
                'C2',
                ESTADOS_MATERIA.REGULAR,
            );
            expect(progresoRevertido.PPS).toBe(ESTADOS_MATERIA.BLOQUEADO);
        });

        it('protege contra ciclos accidentales en correlativas sin lanzar Maximum call stack size exceeded', () => {
            const planCiclico = [
                { codigo: 'A', nombre: 'Ciclo A', anio: 1, correlativas: ['B'] },
                { codigo: 'B', nombre: 'Ciclo B', anio: 1, correlativas: ['A'] },
            ];
            const progresoCiclico = {
                A: ESTADOS_MATERIA.BLOQUEADO,
                B: ESTADOS_MATERIA.BLOQUEADO,
            };

            expect(() =>
                aplicarCambioEstado(progresoCiclico, planCiclico, 'A', ESTADOS_MATERIA.REGULAR),
            ).not.toThrow();

            const resReg = aplicarCambioEstado(
                progresoCiclico,
                planCiclico,
                'A',
                ESTADOS_MATERIA.REGULAR,
            );
            expect(resReg.nuevoProgreso.A).toBe(ESTADOS_MATERIA.REGULAR);
            expect(resReg.nuevoProgreso.B).toBe(ESTADOS_MATERIA.REGULAR);

            const resApr = aplicarCambioEstado(
                resReg.nuevoProgreso,
                planCiclico,
                'A',
                ESTADOS_MATERIA.APROBADO,
            );
            expect(resApr.nuevoProgreso.A).toBe(ESTADOS_MATERIA.APROBADO);
            expect(resApr.nuevoProgreso.B).toBe(ESTADOS_MATERIA.APROBADO);

            const resBloq = aplicarCambioEstado(
                resApr.nuevoProgreso,
                planCiclico,
                'A',
                ESTADOS_MATERIA.BLOQUEADO,
            );
            expect(resBloq.nuevoProgreso.A).toBe(ESTADOS_MATERIA.BLOQUEADO);
            expect(resBloq.nuevoProgreso.B).toBe(ESTADOS_MATERIA.BLOQUEADO);

            // calcularImpactoTapon tampoco entra en recursión infinita ni se cuenta a sí misma
            expect(materiasUtils.calcularImpactoTapon('A', planCiclico)).toBe(1);
        });

        it('mantiene compatibilidad hacia atrás con correlativas v1 en obtenerRequisitosCursada y obtenerRequisitosFinal', () => {
            const matV1 = { codigo: 'M3', nombre: 'Estructuras', anio: '2', correlativas: ['M1'] };
            expect(obtenerRequisitosCursada(matV1)).toEqual([
                { codigo: 'M1', condicion: 'regular' },
            ]);
            expect(obtenerRequisitosFinal(matV1)).toEqual([
                { codigo: 'M1', condicion: 'aprobada' },
            ]);
        });
    });
});
