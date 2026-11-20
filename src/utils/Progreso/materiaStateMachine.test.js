import { describe, it, expect } from 'vitest';
import {
    ESTADOS_MATERIA,
    aplicarCambioEstado,
    aplicarCambioMasivo,
    calcularEstadoBaseMateria,
    sincronizarTesina,
    esTransicionRecursada,
} from './materiaStateMachine';

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
});
