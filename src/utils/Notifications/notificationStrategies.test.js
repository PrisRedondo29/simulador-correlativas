import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    buildNotifications,
    estrategiaActualizacionPlan,
    estrategiaEventosProximos,
    estrategiaUltimoIntentoFinal,
    estrategiaVencimientoRegularidad,
    estrategiaTransicionPlan,
    estrategiaTituloIntermedio,
} from './notificationStrategies';

const MATERIAS_MOCK = [
    { codigo: 'M1', nombre: 'Bases de Datos I', cuatrimestre: '3', tesis: false },
    { codigo: 'M2', nombre: 'Redes', cuatrimestre: '4', tesis: false },
    { codigo: 'M3', nombre: 'Sistemas Operativos', cuatrimestre: '5', tesis: false },
    { codigo: 'M4', nombre: 'Ingeniería de Software', cuatrimestre: '8', tesis: false },
];

describe('notificationStrategies - Patrón Strategy de alertas académicas', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // 1° Cuatrimestre 2026
        vi.setSystemTime(new Date('2026-04-15T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('alerta de última oportunidad de final con 3 desaprobaciones y no se dispara por ausentes', () => {
        const con3Desaprobaciones = estrategiaUltimoIntentoFinal({
            activePlan: '17.14',
            materias: MATERIAS_MOCK,
            progreso: { M1: 'Regular' },
            progresoDetalles: {
                M1: {
                    fechaRegularidad: { anio: 2025, cuatrimestre: 2 },
                    intentosFinal: [
                        { estado: 'reprobado', nota: 2 },
                        { estado: 'reprobado', nota: 3 },
                        { estado: 'reprobado', nota: 1 },
                    ],
                },
            },
        });

        expect(con3Desaprobaciones).not.toBeNull();
        expect(con3Desaprobaciones.tone).toBe('danger');
        expect(con3Desaprobaciones.description).toContain('Bases de Datos I');

        const soloAusentes = estrategiaUltimoIntentoFinal({
            activePlan: '17.14',
            materias: MATERIAS_MOCK,
            progreso: { M1: 'Regular' },
            progresoDetalles: {
                M1: {
                    fechaRegularidad: { anio: 2025, cuatrimestre: 2 },
                    intentosFinal: [
                        { estado: 'ausente', nota: null },
                        { estado: 'ausente', nota: null },
                        { estado: 'ausente', nota: null },
                    ],
                },
            },
        });
        expect(soloAusentes).toBeNull();
    });

    it('alerta de vencimiento de regularidad incluye nombres de las materias con <= 1 cuatri restante', () => {
        // 2023-C2 hasta 2026-C1 = 5 cuatris transcurridos => 0 restantes (<= 1)
        const alerta = estrategiaVencimientoRegularidad({
            activePlan: '17.14',
            materias: MATERIAS_MOCK,
            progreso: { M1: 'Regular', M2: 'Regular' },
            progresoDetalles: {
                M1: { fechaRegularidad: { anio: 2023, cuatrimestre: 2 } },
                M2: { fechaRegularidad: { anio: 2025, cuatrimestre: 2 } },
            },
        });

        expect(alerta).not.toBeNull();
        expect(alerta.path).toBe('/mis-materias');
        expect(alerta.description).toContain('Bases de Datos I');
        expect(alerta.description).not.toContain('Redes');
    });

    it('emite notificación de transición solo cuando la política del plan lo habilita', () => {
        const en1713 = estrategiaTransicionPlan({
            activePlan: '17.13',
            canSimulateTransition: true,
            transitionInfo: { targetPlan: '17.14', shortBadge: 'Res. 89/25', route: '/cambio-plan' },
        });
        expect(en1713).not.toBeNull();
        expect(en1713.path).toBe('/cambio-plan');

        const en1714 = estrategiaTransicionPlan({
            activePlan: '17.14',
            canSimulateTransition: false,
            transitionInfo: null,
        });
        expect(en1714).toBeNull();
    });

    it('notifica cercanía y logro del Título Intermedio', () => {
        // En 17.14 intermedio son las de cuatrimestre <= 6 (M1, M2, M3 = 3 materias)
        const cerca = estrategiaTituloIntermedio({
            activePlan: '17.14',
            materias: MATERIAS_MOCK,
            progreso: { M1: 'Aprobado', M2: 'Promocionado', M3: 'Regular' },
        });
        expect(cerca).not.toBeNull();
        expect(cerca.title).toContain('Muy cerca');

        const completo = estrategiaTituloIntermedio({
            activePlan: '17.14',
            materias: MATERIAS_MOCK,
            progreso: { M1: 'Aprobado', M2: 'Promocionado', M3: 'Aprobado' },
        });
        expect(completo).not.toBeNull();
        expect(completo.title).toContain('Completaste');
    });

    it('buildNotifications prioriza alertas críticas antes que tips secundarios', () => {
        const list = buildNotifications({
            activePlan: '17.14',
            materias: MATERIAS_MOCK,
            progreso: { M1: 'Regular', M2: 'Disponible' },
            progresoDetalles: {
                M1: {
                    fechaRegularidad: { anio: 2023, cuatrimestre: 2 },
                    intentosFinal: [
                        { estado: 'reprobado', nota: 2 },
                        { estado: 'reprobado', nota: 2 },
                        { estado: 'reprobado', nota: 3 },
                    ],
                },
            },
            isAuthenticated: false,
            canSimulateTransition: false,
            transitionInfo: null,
        });

        expect(list[0].tone).toBe('danger'); // última oportunidad primero
        expect(list[1].id).toContain('vencimiento'); // luego vencimiento
        expect(list[list.length - 1].id).toBe('sync-tip'); // respaldo al final
    });

    it('alerta eventos próximos de Mi Cursada con urgencia danger (hoy/mañana) y warning (2..7 días)', () => {
        // Fecha simulada: 2026-04-15
        const inminente = estrategiaEventosProximos({
            activePlan: '17.14',
            materias: MATERIAS_MOCK,
            cursada: {
                horarios: [],
                bitacora: [],
                eventos: [
                    { id: 'e1', titulo: '1° Parcial', tipo: 'parcial', fecha: '2026-04-16', codigoMateria: 'M1' },
                ],
            },
        });
        expect(inminente).not.toBeNull();
        expect(inminente.tone).toBe('danger');
        expect(inminente.path).toBe('/mi-agenda');
        expect(inminente.description).toContain('Bases de Datos I');
        expect(inminente.description).toContain('Mañana');

        const semana = estrategiaEventosProximos({
            activePlan: '17.14',
            materias: MATERIAS_MOCK,
            cursada: {
                horarios: [],
                bitacora: [],
                eventos: [
                    { id: 'e2', titulo: 'Entrega TP 1', tipo: 'tp', fecha: '2026-04-20', codigoMateria: 'M2' },
                ],
            },
        });
        expect(semana).not.toBeNull();
        expect(semana.tone).toBe('warning');
        expect(semana.description).toContain('En 5 días');

        const lejano = estrategiaEventosProximos({
            activePlan: '17.14',
            materias: MATERIAS_MOCK,
            cursada: {
                horarios: [],
                bitacora: [],
                eventos: [
                    { id: 'e3', titulo: 'Final lejano', tipo: 'final', fecha: '2026-05-01', codigoMateria: 'M1' },
                ],
            },
        });
        expect(lejano).toBeNull();
    });

    it('notifica al alumno cuando el plan activo fue actualizado desde el Panel Admin indicando el motivo del cambio y códigos migrados', () => {
        const notif = estrategiaActualizacionPlan({
            activePlan: '17.14',
            planUpdateNotice: {
                planNumero: '17.14',
                version: 3,
                previousVersion: 2,
                changelogMessage: 'Se corrigió el código de Intro a la Programación',
                codigosMigrados: [{ desde: '11071', hacia: '11071B' }],
                materiasRecalculadas: ['11073'],
                appliedAt: '2026-11-20T18:00:00.000Z',
            },
        });

        expect(notif).not.toBeNull();
        expect(notif?.id).toBe('plan-update-17.14-v3');
        expect(notif?.title).toContain('Plan 17.14 actualizado (v3)');
        expect(notif?.description).toContain('Motivo: "Se corrigió el código de Intro a la Programación"');
        expect(notif?.description).toContain('11071 → 11071B');
        expect(notif?.description).toContain('1 materia');
    });
});
