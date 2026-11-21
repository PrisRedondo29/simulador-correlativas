// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@xyflow/react', () => ({
    Handle: () => null,
    Position: { Left: 'left', Right: 'right' },
}));

vi.mock('@heroui/react', () => ({
    Card: ({ children, className }) => <div className={className}>{children}</div>,
}));

import MateriaNode from '../Progreso/MateriaNode';
import MateriasMallaEstatica from './MateriasMallaEstatica';

const MATERIA_INTERMEDIO = {
    codigo: '11075',
    nombre: 'Programación II',
    anio: 2,
    cuatrimestre: 3,
    horas_semanales: 6,
    horas_totales: 96,
    correlativas: [],
};

const MATERIA_LICENCIATURA = {
    codigo: '11099',
    nombre: 'Ingeniería Web',
    anio: 5,
    cuatrimestre: 9,
    horas_semanales: 4,
    horas_totales: 64,
    correlativas: [],
};

describe('Insignia de Título Intermedio en Simulador', () => {
    afterEach(() => {
        cleanup();
    });

    it('MateriaNode muestra insignia 🎓 Intermedio solo cuando pertenece al Título Intermedio', () => {
        const { rerender } = render(
            <MateriaNode
                data={{
                    materia: MATERIA_INTERMEDIO,
                    estado: 'Disponible',
                    esTituloIntermedio: true,
                    tituloIntermedioNombre: 'Analista Universitario de Sistemas',
                }}
            />,
        );

        const badge = screen.getByTestId('badge-intermedio-11075');
        expect(badge.textContent).toContain('🎓');
        expect(badge.textContent).toContain('Intermedio');
        expect(badge.getAttribute('title')).toBe('Integra el Analista Universitario de Sistemas');

        rerender(
            <MateriaNode
                data={{
                    materia: MATERIA_LICENCIATURA,
                    estado: 'Disponible',
                    esTituloIntermedio: false,
                    tituloIntermedioNombre: 'Analista Universitario de Sistemas',
                }}
            />,
        );

        expect(screen.queryByTestId('badge-intermedio-11099')).toBeNull();
    });

    it('MateriasMallaEstatica muestra insignia 🎓 Intermedio únicamente en las materias del conjunto', () => {
        const codigosIntermedio = new Set(['11075']);

        render(
            <MateriasMallaEstatica
                materias={[MATERIA_INTERMEDIO, MATERIA_LICENCIATURA]}
                progreso={{ '11075': 'Disponible', '11099': 'Disponible' }}
                codigosIntermedio={codigosIntermedio}
                tituloIntermedioNombre="Analista Universitario de Sistemas"
            />,
        );

        expect(screen.getByTestId('badge-intermedio-11075').textContent).toContain('🎓');
        expect(screen.queryByTestId('badge-intermedio-11099')).toBeNull();
    });
});
