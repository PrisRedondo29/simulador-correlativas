import { describe, it, expect } from 'vitest';
import { reconciliarProgresoConNuevaVersionPlan } from './planMigration';
import { ESTADOS_MATERIA } from '../Progreso/materiaStateMachine';
import sistemasPlanes from '../../data/sistemas.json';

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

    it('migra códigos internos de Plan 17.14 (PSTC-1714 -> 11293, TES-1714 -> 11294) preservando progreso, optativas y Mi Cursada sin duplicar claves', () => {
        const plan1714Actual = sistemasPlanes.find((p) => p.plan_numero === '17.14');
        expect(plan1714Actual).toBeDefined();
        if (!plan1714Actual) return;

        const plan1714V2 = {
            ...plan1714Actual,
            version: 2,
            materias: plan1714Actual.materias.map((m) => {
                if (m.codigo === 'PSTC-1714') return { ...m, codigo: '11293', mostrarCodigo: true };
                if (m.codigo === 'TES-1714') return { ...m, codigo: '11294', mostrarCodigo: true };
                return { ...m };
            }),
        };

        /** @type {Record<string, string>} */
        const progresoPrevio = {};
        plan1714Actual.materias.forEach((m) => {
            if (!m.tesis) {
                progresoPrevio[m.codigo] = ESTADOS_MATERIA.APROBADO;
            }
        });
        progresoPrevio['11271'] = ESTADOS_MATERIA.PROMOCIONADO;
        progresoPrevio['PSTC-1714'] = ESTADOS_MATERIA.APROBADO;
        progresoPrevio['TES-1714'] = ESTADOS_MATERIA.REGULAR;

        const detallesPrevios = {
            'PSTC-1714': { notaFinal: 9, fechaAprobacion: '2026-07-10' },
            'TES-1714': {
                notaFinal: null,
                notaRegularizacion: 8,
                fechaRegularidad: { anio: 2026, cuatrimestre: 2 },
                intentosFinal: [{ nota: 2, estado: 'reprobado', fecha: '2026-10-15', condicion: 'Regular' }],
            },
            'AO-1714': {
                notaFinal: 8,
                codigoOptativa: '11809',
                nombreOptativa: 'Compiladores',
            },
        };

        const cursadaPrevia = {
            horarios: [
                { id: 'h-pstc', codigoMateria: 'PSTC-1714', dia: 2, horaInicio: '14:00', horaFin: '18:00' },
                { id: 'h-tes', codigoMateria: 'TES-1714', dia: 4, horaInicio: '18:00', horaFin: '20:00' },
            ],
            eventos: [
                { id: 'e-pstc', titulo: 'Entrega informe PSTC', tipo: 'tp', fecha: '2026-07-01', codigoMateria: 'PSTC-1714' },
                { id: 'e-tes', titulo: 'Defensa Tesina', tipo: 'final', fecha: '2026-12-15', codigoMateria: 'TES-1714' },
            ],
            bitacora: [
                { id: 'b-pstc', fecha: '2026-06-10', codigoMateria: 'PSTC-1714', tema: 'Vinculación territorial' },
                { id: 'b-tes', fecha: '2026-11-05', codigoMateria: 'TES-1714', tema: 'Revisión capítulo 3' },
            ],
        };

        const res = reconciliarProgresoConNuevaVersionPlan({
            planNumero: '17.14',
            nuevoPlan: plan1714V2,
            versionNueva: 2,
            versionAnterior: 1,
            codeMappings: {
                'PSTC-1714': '11293',
                'TES-1714': '11294',
            },
            changelogMessage: 'Adopción de códigos oficiales 11293 (PSTC) y 11294 (Tesina).',
            progreso: progresoPrevio,
            progresoDetalles: detallesPrevios,
            cursada: cursadaPrevia,
        });

        expect(res.applied).toBe(true);
        expect(res.codigosMigrados).toEqual([
            { desde: 'PSTC-1714', hacia: '11293' },
            { desde: 'TES-1714', hacia: '11294' },
        ]);

        // Sin duplicación de claves antiguas y preservando estados reales
        expect(res.progreso['PSTC-1714']).toBeUndefined();
        expect(res.progreso['TES-1714']).toBeUndefined();
        expect(res.progreso['11293']).toBe(ESTADOS_MATERIA.APROBADO);
        expect(res.progreso['11294']).toBe(ESTADOS_MATERIA.REGULAR);
        expect(res.progreso['11271']).toBe(ESTADOS_MATERIA.PROMOCIONADO);

        // Preservación de notas, intentos y metadata de optativas
        expect(res.progresoDetalles['PSTC-1714']).toBeUndefined();
        expect(res.progresoDetalles['TES-1714']).toBeUndefined();
        expect(res.progresoDetalles['11293']).toEqual({ notaFinal: 9, fechaAprobacion: '2026-07-10' });
        expect(res.progresoDetalles['11294']).toEqual(detallesPrevios['TES-1714']);
        expect(res.progresoDetalles['AO-1714']).toEqual({
            notaFinal: 8,
            codigoOptativa: '11809',
            nombreOptativa: 'Compiladores',
        });

        // Mi Cursada remapeada íntegramente
        expect(res.cursada?.horarios.map((h) => h.codigoMateria)).toEqual(['11293', '11294']);
        expect(res.cursada?.eventos.map((e) => e.codigoMateria)).toEqual(['11293', '11294']);
        expect(res.cursada?.bitacora.map((b) => b.codigoMateria)).toEqual(['11293', '11294']);
    });

    it('preserva PSTC-1714 en Cursando y nunca degrada si 11293 ya posee un estado superior', () => {
        const plan1714Actual = sistemasPlanes.find((p) => p.plan_numero === '17.14');
        expect(plan1714Actual).toBeDefined();
        if (!plan1714Actual) return;

        const plan1714V2 = {
            ...plan1714Actual,
            version: 2,
            materias: plan1714Actual.materias.map((m) =>
                m.codigo === 'PSTC-1714' ? { ...m, codigo: '11293' } : { ...m },
            ),
        };

        const enCurso = reconciliarProgresoConNuevaVersionPlan({
            planNumero: '17.14',
            nuevoPlan: plan1714V2,
            versionNueva: 2,
            versionAnterior: 1,
            codeMappings: { 'PSTC-1714': '11293' },
            progreso: {
                21279: ESTADOS_MATERIA.APROBADO,
                11287: ESTADOS_MATERIA.APROBADO,
                11278: ESTADOS_MATERIA.APROBADO,
                14028: ESTADOS_MATERIA.APROBADO,
                'PSTC-1714': ESTADOS_MATERIA.CURSANDO,
            },
            progresoDetalles: {
                'PSTC-1714': { notaRegularizacion: 7 },
            },
        });

        expect(enCurso.progreso['PSTC-1714']).toBeUndefined();
        expect(enCurso.progreso['11293']).toBe(ESTADOS_MATERIA.CURSANDO);
        expect(enCurso.progresoDetalles['11293']).toEqual({ notaRegularizacion: 7 });

        const colisionSuperior = reconciliarProgresoConNuevaVersionPlan({
            planNumero: '17.14',
            nuevoPlan: plan1714V2,
            versionNueva: 2,
            versionAnterior: 1,
            codeMappings: { 'PSTC-1714': '11293' },
            progreso: {
                'PSTC-1714': ESTADOS_MATERIA.CURSANDO,
                11293: ESTADOS_MATERIA.APROBADO,
            },
            progresoDetalles: {
                'PSTC-1714': { notaFinal: 5 },
                11293: { notaFinal: 10 },
            },
        });

        expect(colisionSuperior.progreso['PSTC-1714']).toBeUndefined();
        expect(colisionSuperior.progreso['11293']).toBe(ESTADOS_MATERIA.APROBADO);
        expect(colisionSuperior.progresoDetalles['PSTC-1714']).toBeUndefined();
        expect(colisionSuperior.progresoDetalles['11293']).toEqual({ notaFinal: 10 });
    });
});
