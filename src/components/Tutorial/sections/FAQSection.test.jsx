// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PlanProvider } from '../../../context/PlanContext';
import storageRepository from '../../../services/storageRepository';

vi.mock('@heroui/react', () => ({
    Accordion: ({ children }) => <div>{children}</div>,
    AccordionItem: ({ title, children }) => (
        <div>
            <div>{title}</div>
            <div>{children}</div>
        </div>
    ),
}));

import FAQSection from './FAQSection';

describe('FAQSection - Preguntas frecuentes ampliadas 2.0.0', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    afterEach(() => {
        cleanup();
    });

    it('organiza las preguntas por categorías y cubre SAWeb, Mi Agenda, Estadísticas, PDF, PWA, sync, PostHog y eliminación', () => {
        storageRepository.setPlanActivo('17.14', { silent: true });

        render(
            <PlanProvider>
                <FAQSection />
            </PlanProvider>,
        );

        expect(screen.getByRole('button', { name: /Mis Materias y SAWeb/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Agenda, Estadísticas y PDF/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Simulador y Planes/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Cuenta, PWA y Privacidad/i })).toBeTruthy();

        expect(screen.getByText(/importación desde SAWeb/i)).toBeTruthy();
        expect(screen.getByText(/Mi Agenda y cuándo avisan/i)).toBeTruthy();
        expect(screen.getByText(/sección Estadísticas/i)).toBeTruthy();
        expect(screen.getByText(/Diplomaturas Intracurriculares/i)).toBeTruthy();
        expect(screen.getByText(/PostHog.*consentimiento/i)).toBeTruthy();

        // Filtrar por categoría Cuenta, PWA y Privacidad
        fireEvent.click(screen.getByRole('button', { name: /Cuenta, PWA y Privacidad/i }));
        expect(screen.getByText(/¿La sincronización con la nube es automática\?/i)).toBeTruthy();
        expect(screen.queryByText(/importación desde SAWeb/i)).toBeNull();
    });
});
