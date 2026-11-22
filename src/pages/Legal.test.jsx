// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanProvider } from '../context/PlanContext';
import Legal from './Legal';

describe('Legal - Aviso legal, alcance no oficial y privacidad (Ley 25.326)', () => {
    afterEach(() => {
        cleanup();
    });

    it('renderiza encabezado único, descargo no oficial UNLu/CODES++, tabla de datos tratados y derechos AAIP', () => {
        render(
            <MemoryRouter>
                <PlanProvider>
                    <Legal />
                </PlanProvider>
            </MemoryRouter>,
        );

        const headings = screen.getAllByRole('heading', { level: 1 });
        expect(headings).toHaveLength(1);
        expect(headings[0].textContent).toMatch(/Aviso legal y privacidad/i);

        expect(document.body.textContent).toMatch(/No es un portal oficial/i);
        expect(document.body.textContent).toMatch(/CODES\+\+.*comunidad estudiantil independiente y no oficial/i);
        expect(document.body.textContent).toMatch(/Ley N° 25\.326/i);

        const table = screen.getByRole('table', {
            name: /Resumen de datos tratados por la aplicación/i,
        });
        expect(table).toBeTruthy();
        expect(table.textContent).toContain('localStorage');
        expect(table.textContent).toContain('pdfjs-dist');
        expect(table.textContent).toContain('Firebase Auth');
        expect(table.textContent).toContain('Firebase Analytics');
        expect(table.textContent).toContain('EmailJS');

        const aaipLink = screen.getByRole('link', { name: /argentina\.gob\.ar\/aaip/i });
        expect(aaipLink.getAttribute('href')).toBe('https://www.argentina.gob.ar/aaip');

        expect(screen.getByRole('link', { name: 'Configuración' }).getAttribute('href')).toBe('/configuracion');
        expect(screen.getByRole('link', { name: 'Contacto' }).getAttribute('href')).toBe('/contacto');
    });
});
