import { describe, it, expect } from 'vitest';
import {
    parseISODateParts,
    diffDaysISO,
    buildCalendarMonthGrid,
    detectarSuperposicionesHorarios,
    obtenerEventosProximos,
    filtrarBitacora,
    agruparMateriasSelector,
} from './cursadaUtils';

describe('cursadaUtils - Calendario, Horarios y Bitácora', () => {
    it('valida fechas calendario ISO sin deriva de zona horaria (incluyendo bisiestos)', () => {
        expect(parseISODateParts('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
        expect(parseISODateParts('2026-02-29')).toBeNull();
        expect(parseISODateParts('2026-13-01')).toBeNull();

        expect(diffDaysISO('2026-04-30', '2026-05-01')).toBe(1);
        expect(diffDaysISO('2026-05-10', '2026-05-10')).toBe(0);
        expect(diffDaysISO('2026-05-10', '2026-05-08')).toBe(-2);
    });

    it('construye la grilla mensual comenzando en lunes', () => {
        // Junio 2026 arranca lunes 1
        const grid = buildCalendarMonthGrid(2026, 6);
        expect(grid[0]).toEqual({ iso: '2026-06-01', day: 1, inCurrentMonth: true });
        expect(grid.length === 35 || grid.length === 42).toBe(true);
        expect(grid.filter((c) => c.inCurrentMonth)).toHaveLength(30);
    });

    it('detecta superposiciones horarias reales sin marcar clases contiguas ni de otros días', () => {
        const horarios = [
            { id: 'h1', codigoMateria: 'M1', dia: 1, horaInicio: '18:00', horaFin: '20:00' },
            { id: 'h2', codigoMateria: 'M2', dia: 1, horaInicio: '19:30', horaFin: '21:30' }, // solapa con h1
            { id: 'h3', codigoMateria: 'M3', dia: 1, horaInicio: '20:00', horaFin: '22:00' }, // contigua a h1, solapa con h2
            { id: 'h4', codigoMateria: 'M4', dia: 2, horaInicio: '18:00', horaFin: '20:00' }, // martes, sin conflicto
            { id: 'h5', codigoMateria: 'M5', dia: 2, horaInicio: '20:00', horaFin: '22:00' }, // contigua a h4, sin conflicto
        ];

        const conflictos = detectarSuperposicionesHorarios(horarios);
        expect(conflictos.has('h1')).toBe(true);
        expect(conflictos.has('h2')).toBe(true);
        expect(conflictos.has('h3')).toBe(true);
        expect(conflictos.has('h4')).toBe(false);
        expect(conflictos.has('h5')).toBe(false);
    });

    it('filtra eventos dentro de la ventana de 7 días y los ordena cronológicamente', () => {
        const eventos = [
            { id: 'pasado', titulo: 'Parcial viejo', tipo: 'parcial', fecha: '2026-05-09' },
            { id: 'dia7', titulo: 'TP Final', tipo: 'tp', fecha: '2026-05-17', hora: '23:59' },
            { id: 'hoy-tarde', titulo: 'Final', tipo: 'final', fecha: '2026-05-10', hora: '18:00' },
            { id: 'hoy-maniana', titulo: 'Parcial', tipo: 'parcial', fecha: '2026-05-10', hora: '09:00' },
            { id: 'lejos', titulo: 'Recuperatorio', tipo: 'recuperatorio', fecha: '2026-05-18' },
        ];

        const proximos = obtenerEventosProximos(eventos, { dias: 7, hoyISO: '2026-05-10' });
        expect(proximos.map((e) => e.id)).toEqual(['hoy-maniana', 'hoy-tarde', 'dia7']);
        expect(proximos[0].diasRestantes).toBe(0);
        expect(proximos[2].diasRestantes).toBe(7);
    });

    it('filtra la bitácora por materia y búsqueda insensible a tildes ordenada de más nueva a más vieja', () => {
        const entradas = [
            { id: 'b1', fecha: '2026-04-02', codigoMateria: 'M1', tema: 'Álgebra relacional', notas: 'Repasar división' },
            { id: 'b2', fecha: '2026-04-10', codigoMateria: 'M1', tema: 'Normalización 3FN', notas: 'Ejercicios de práctica' },
            { id: 'b3', fecha: '2026-04-08', codigoMateria: 'M2', tema: 'Árboles AVL', notas: 'Rotaciones' },
        ];

        const soloM1 = filtrarBitacora(entradas, { codigoMateria: 'M1' });
        expect(soloM1.map((e) => e.id)).toEqual(['b2', 'b1']);

        const buscandoSinTilde = filtrarBitacora(entradas, { busqueda: 'algebra' });
        expect(buscandoSinTilde.map((e) => e.id)).toEqual(['b1']);
    });

    it('agrupa materias del selector priorizando Cursando y Regular sobre el resto del plan', () => {
        const materias = [
            { codigo: 'M1', nombre: 'BD I' },
            { codigo: 'M2', nombre: 'Redes' },
            { codigo: 'M3', nombre: 'Álgebra' },
            { codigo: 'M4', nombre: 'SO' },
        ];
        const progreso = {
            M1: 'Cursando',
            M2: 'Regular',
            M3: 'Aprobado',
            M4: 'Disponible',
        };

        const grupos = agruparMateriasSelector(materias, progreso);
        expect(grupos.cursando.map((m) => m.codigo)).toEqual(['M1']);
        expect(grupos.regulares.map((m) => m.codigo)).toEqual(['M2']);
        expect(grupos.otras.map((m) => m.codigo)).toEqual(['M3', 'M4']);
    });
});
