import { describe, it, expect } from 'vitest';
import { reconciliarProgresoConNuevaVersionPlan } from './planMigration';
import { ESTADOS_MATERIA } from '../Progreso/materiaStateMachine';

describe('planMigration - Reconciliación no destructiva por versión y notificación del motivo del cambio', () => {
    const nuevoPlanV2 = {
        plan_numero: '17.14',
        version: 2,
        materias: [
            { codigo: '11071B', nombre: 'Intro a la Programación', anio: 1, correlativas: [] },
            { codigo: '11072', nombre: 'Matemática I', anio: 1, correlativas: [] },
            {
                codigo: '11073',
                nombre: 'Estructuras de Datos',
                anio: 2,
                correlativas: ['11071B', '11072'],
            },
            {
                codigo: '11099',
                nombre: 'Nueva Optativa',
                anio: 3,
                correlativas: ['11071B'],
            },
        ],
    };

    it('migra códigos renombrados en progreso, detalles y Mi Cursada, recalcula correlativas y genera el aviso con changelogMessage', () => {
        const progresoAlumno = {
            '11071': ESTADOS_MATERIA.APROBADO, // se migrará a 11071B
            '11072': ESTADOS_MATERIA.BLOQUEADO,
            '11073': ESTADOS_MATERIA.DISPONIBLE, // antes solo pedía 11071; ahora pide también 11072 -> pasará a Bloqueado
        };
        const detallesAlumno = {
            '11071': { notaFinal: 9, fechaAprobacion: '2025-12-10' },
        };
        const cursadaAlumno = {
            horarios: [
                {
                    id: 'h1',
                    codigoMateria: '11071',
                    dia: 1,
                    horaInicio: '08:00',
                    horaFin: '12:00',
                },
            ],
            eventos: [
                {
                    id: 'e1',
                    titulo: 'Parcial 1',
                    tipo: 'parcial',
                    fecha: '2026-05-10',
                    codigoMateria: '11071',
                },
            ],
            bitacora: [
                {
                    id: 'b1',
                    fecha: '2026-04-01',
                    codigoMateria: '11071',
                    tema: 'Recursividad',
                },
            ],
        };

        const res = reconciliarProgresoConNuevaVersionPlan({
            planNumero: '17.14',
            nuevoPlan: nuevoPlanV2,
            versionNueva: 2,
            versionAnterior: 1,
            codeMappings: { '11071': '11071B' },
            changelogMessage:
                'Se corrigió el código de Intro a la Programación (11071 -> 11071B) y se sumó Matemática I como correlativa de Estructuras.',
            progreso: progresoAlumno,
            progresoDetalles: detallesAlumno,
            cursada: cursadaAlumno,
            nowIso: '2026-11-20T18:00:00.000Z',
        });

        expect(res.applied).toBe(true);
        // 11071 migrado a 11071B sin perder su estado Aprobado ni su nota 9
        expect(res.progreso['11071']).toBeUndefined();
        expect(res.progreso['11071B']).toBe(ESTADOS_MATERIA.APROBADO);
        expect(res.progresoDetalles['11071']).toBeUndefined();
        expect(res.progresoDetalles['11071B']).toEqual({
            notaFinal: 9,
            fechaAprobacion: '2025-12-10',
        });

        // Mi Cursada migrada al nuevo código
        expect(res.cursada?.horarios[0].codigoMateria).toBe('11071B');
        expect(res.cursada?.eventos[0].codigoMateria).toBe('11071B');
        expect(res.cursada?.bitacora[0].codigoMateria).toBe('11071B');

        // 11073 pasó de Disponible a Bloqueado porque aún no cursó 11072
        expect(res.progreso['11073']).toBe(ESTADOS_MATERIA.BLOQUEADO);
        // La nueva materia 11099 se inicializó automáticamente en Disponible porque 11071B está Aprobada
        expect(res.progreso['11099']).toBe(ESTADOS_MATERIA.DISPONIBLE);

        // Se generó la notificación con el motivo del cambio y las métricas de impacto
        expect(res.notice).toEqual({
            planNumero: '17.14',
            version: 2,
            previousVersion: 1,
            changelogMessage:
                'Se corrigió el código de Intro a la Programación (11071 -> 11071B) y se sumó Matemática I como correlativa de Estructuras.',
            codigosMigrados: [{ desde: '11071', hacia: '11071B' }],
            materiasRecalculadas: ['11072', '11073'],
            appliedAt: '2026-11-20T18:00:00.000Z',
        });
    });

    it('nunca degrada materias que el alumno ya está Cursando, Regular o Aprobado aunque cambien sus correlativas', () => {
        const progresoEnCurso = {
            '11071B': ESTADOS_MATERIA.APROBADO,
            '11072': ESTADOS_MATERIA.BLOQUEADO,
            '11073': ESTADOS_MATERIA.REGULAR, // Ya la regularizó antes del cambio de plan
        };

        const res = reconciliarProgresoConNuevaVersionPlan({
            planNumero: '17.14',
            nuevoPlan: nuevoPlanV2,
            versionNueva: 2,
            versionAnterior: 1,
            progreso: progresoEnCurso,
        });

        expect(res.progreso['11073']).toBe(ESTADOS_MATERIA.REGULAR);
    });
});
