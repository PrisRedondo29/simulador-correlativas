import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    buildNotifications,
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
});
