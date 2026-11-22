// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import LeyendaEstados from './LeyendaEstados';

vi.mock('@heroui/react', () => ({
    Accordion: ({ children }) => <div>{children}</div>,
    AccordionItem: ({ title, subtitle, children, 'aria-label': ariaLabel }) => (
        <section aria-label={ariaLabel}>
            <h2>{title}</h2>
            <p>{subtitle}</p>
            <div>{children}</div>
        </section>
    ),
    Chip: ({ children }) => <span>{children}</span>,
}));

describe('LeyendaEstados - Régimen General de Estudios y enlace oficial UNLu', () => {
    afterEach(() => {
        cleanup();
    });

    it('enlaza a https://www.unlu.edu.ar/regimen.html con nombre oficial "Régimen General de Estudios"', () => {
        render(
            <LeyendaEstados
                materias={[
                    { codigo: '11071', horas_totales: '96' },
                    { codigo: '11072', horas_totales: '64' },
                ]}
            />,
        );

        expect(
            screen.getByRole('heading', {
                name: /Referencias de estados y Régimen General de Estudios \(RGE\)/i,
            }),
        ).toBeTruthy();
        expect(screen.getByText('Carga horaria total del plan: 160 hs')).toBeTruthy();
        expect(screen.getByText('Régimen General de Estudios (RGE) · UNLu')).toBeTruthy();
        expect(screen.queryByText(/Reglamento General de Estudios/i)).toBeNull();
        expect(screen.queryByText(/Normativa estudiantil UNLu/i)).toBeNull();

        const link = screen.getByRole('link', { name: /Régimen General de Estudios \(UNLu\)/i });
        expect(link.getAttribute('href')).toBe('https://www.unlu.edu.ar/regimen.html');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });
});
