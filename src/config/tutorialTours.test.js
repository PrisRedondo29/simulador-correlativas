import { describe, it, expect } from 'vitest';
import { TOUR_IDS, TUTORIAL_TOURS } from './tutorialTours';
import estadoUtils from '../utils/Progreso/estadoUtils';
import materiasUtils from '../utils/Progreso/materiasUtils';

describe('Tutorial Mis Materias y paleta unificada de estado Cursando', () => {
    it('sube el recorrido de Mis Materias a v2 e incluye el paso hacia el indicador En la nube', () => {
        const tour = TUTORIAL_TOURS[TOUR_IDS.MIS_MATERIAS];
        expect(tour.version).toBe(2);

        const syncStep = tour.steps.find((s) => s.id === 'sync_nube');
        expect(syncStep).toBeDefined();
        expect(syncStep.target).toBe('[data-tour="sync-status-menu"]');
    });

    it('diferencia visualmente Cursando en tono índigo lejos del verde de Aprobado/Promocionado', () => {
        const config = estadoUtils.ESTADO_CONFIG.Cursando;
        expect(config.estilo).toContain('#EEF2FF');
        expect(config.badgeClass).toContain('#E0E7FF');
        expect(config.badgeClass).toContain('#3730A3');
        expect(config.estilo).not.toContain('#F0FDF4');
        expect(config.badgeClass).not.toContain('#005A36');

        const estilo = materiasUtils.obtenerEstiloPorEstado('Cursando');
        expect(estilo.bgSoft).toContain('#E0E7FF');
        expect(estilo.colorText).toContain('#3730A3');
        expect(estilo.colorText).not.toContain('#005A36');
    });
});
