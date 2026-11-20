import { describe, it, expect } from 'vitest';
import { normalizeNestedPlanMap } from './syncService';

describe('syncService.normalizeNestedPlanMap - Aplanado genérico multi-carrera', () => {
    it('reconstruye claves con punto anidadas por Firestore para cualquier prefijo de carrera', () => {
        const raw = {
            '17': {
                '13': { '11071': 'Aprobado' },
                '14': { '11071': 'Promocionado' },
            },
            '20': {
                '08': { '20001': 'Regular' },
            },
        };

        const result = normalizeNestedPlanMap(raw);

        expect(result).toEqual({
            '17.13': { '11071': 'Aprobado' },
            '17.14': { '11071': 'Promocionado' },
            '20.08': { '20001': 'Regular' },
        });
    });

    it('preserva entradas planas existentes sin sobrescribirlas', () => {
        const raw = {
            '17.14': { '11071': 'Aprobado' },
            '17': {
                '14': { '11071': 'Regular' },
            },
        };

        const result = normalizeNestedPlanMap(raw);
        expect(result['17.14']).toEqual({ '11071': 'Aprobado' });
        expect(result['17']).toBeUndefined();
    });
});
