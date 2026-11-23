// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('@heroui/react', () => ({
    Card: ({ children }) => <div>{children}</div>,
    CardBody: ({ children }) => <div>{children}</div>,
    Chip: ({ children }) => <span>{children}</span>,
    Button: ({ children, onPress }) => (
        <button type="button" onClick={onPress}>
            {children}
        </button>
    ),
}));

import Novedades from '../pages/Novedades';

function PathSpy() {
    const { pathname } = useLocation();
    return <span data-testid="novedades-path">{pathname}</span>;
}

describe('Novedades - Página permanente /novedades', () => {
    afterEach(() => {
        cleanup();
    });

    it('muestra la versión actual 2.0.0, grupos de novedades y permite navegar a las herramientas', () => {
        render(
            <MemoryRouter initialEntries={['/novedades']}>
                <PathSpy />
                <Novedades />
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', { name: /Novedades de Mi Avance Académico UNLu/i })).toBeTruthy();
        expect(screen.getByText(/Versión actual 2\.0\.0/i)).toBeTruthy();
        expect(screen.getByText(/Seguimiento Académico e Importación SAWeb/i)).toBeTruthy();
        expect(screen.getByText(/Importador de Analítico SAWeb/i)).toBeTruthy();
        expect(screen.getByText(/Estadísticas Académicas y Promedio/i)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Ver Estadísticas/i }));
        expect(screen.getByTestId('novedades-path').textContent).toBe('/estadisticas');
    });
});
