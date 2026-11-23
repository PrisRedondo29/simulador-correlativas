// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import storageRepository from '../../services/storageRepository';

vi.mock('../../pages/Progreso', () => ({ default: () => <div>Página Mis Materias</div> }));
vi.mock('../../pages/Cursada', () => ({ default: () => <div>Página Mi Agenda</div> }));
vi.mock('../../pages/TransicionPlan', () => ({ default: () => <div>Página Cambio de Plan</div> }));
vi.mock('../../pages/SettingsPage', () => ({ default: () => <div>Página Configuración</div> }));

vi.mock('@heroui/react', () => ({
    Spinner: ({ label }) => <div role="status">{label}</div>,
    Card: ({ children }) => <div>{children}</div>,
    CardBody: ({ children }) => <div>{children}</div>,
    Button: ({ children, onPress }) => (
        <button type="button" onClick={onPress}>
            {children}
        </button>
    ),
}));

import PlanFeatureRoute from './PlanFeatureRoute';
import Rutas from '../../routes/Rutas';
import { PlanProvider } from '../../context/PlanContext';

function LocationSpy() {
    const { pathname } = useLocation();
    return <span data-testid="location-path">{pathname}</span>;
}

describe('PlanFeatureRoute - Guardas declarativas por capacidades del plan', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    afterEach(() => {
        cleanup();
    });

    it('renderiza la ruta protegida cuando el plan activo (17.13) soporta la funcionalidad', () => {
        storageRepository.setPlanActivo('17.13', { silent: true });

        render(
            <MemoryRouter initialEntries={['/cambio-plan']}>
                <PlanProvider>
                    <PlanFeatureRoute feature="planTransition">
                        <div>Simulador de Transición</div>
                    </PlanFeatureRoute>
                </PlanProvider>
            </MemoryRouter>,
        );

        expect(screen.getByText('Simulador de Transición')).toBeTruthy();
    });

    it('bloquea planTransition en Plan 17.14 y permite cambiar al Plan 17.13 compatible en 1 clic', () => {
        storageRepository.setPlanActivo('17.14', { silent: true });

        render(
            <MemoryRouter initialEntries={['/cambio-plan']}>
                <PlanProvider>
                    <PlanFeatureRoute feature="planTransition">
                        <div>Simulador de Transición</div>
                    </PlanFeatureRoute>
                </PlanProvider>
            </MemoryRouter>,
        );

        expect(screen.queryByText('Simulador de Transición')).toBeNull();
        expect(screen.getByText(/Herramienta disponible para el Plan 17\.13/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /Ir a Mis Materias/i })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Cambiar a Plan 17\.13/i }));

        expect(storageRepository.getPlanActivo()).toBe('17.13');
        expect(screen.getByText('Simulador de Transición')).toBeTruthy();
    });

    it.each([
        ['/progreso', '/mis-materias', 'Página Mis Materias'],
        ['/cursada', '/mi-agenda', 'Página Mi Agenda'],
        ['/transicion', '/cambio-plan', 'Página Cambio de Plan'],
        ['/config', '/configuracion', 'Página Configuración'],
    ])('redirige ruta legacy %s hacia la ruta canónica %s', async (legacyPath, canonicalPath, expectedPageText) => {
        storageRepository.setPlanActivo('17.13', { silent: true });

        render(
            <MemoryRouter initialEntries={[legacyPath]}>
                <PlanProvider>
                    <LocationSpy />
                    <Rutas plan="17.13" setPlan={vi.fn()} />
                </PlanProvider>
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(screen.getByTestId('location-path').textContent).toBe(canonicalPath);
            expect(screen.getByText(expectedPageText)).toBeTruthy();
        });
    });

    it('renderiza página 404 NotFound para rutas inexistentes con enlaces a Inicio, Mis Materias y Simulador', async () => {
        storageRepository.setPlanActivo('17.14', { silent: true });

        render(
            <MemoryRouter initialEntries={['/ruta-que-no-existe']}>
                <PlanProvider>
                    <LocationSpy />
                    <Rutas plan="17.14" setPlan={vi.fn()} />
                </PlanProvider>
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(screen.getByText(/Página no encontrada/i)).toBeTruthy();
            expect(screen.getByRole('button', { name: /Ir a Inicio/i })).toBeTruthy();
            expect(screen.getByRole('button', { name: /Mis Materias/i })).toBeTruthy();
            expect(screen.getByRole('button', { name: /Simulador/i })).toBeTruthy();
        });
    });

    it('enlace compartido a /cambio-plan desde Plan 17.14 muestra restricción académica (no 404 ni auth) y mantiene la URL', async () => {
        storageRepository.setPlanActivo('17.14', { silent: true });

        render(
            <MemoryRouter initialEntries={['/cambio-plan']}>
                <PlanProvider>
                    <LocationSpy />
                    <Rutas plan="17.14" setPlan={vi.fn()} />
                </PlanProvider>
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(screen.getByTestId('location-path').textContent).toBe('/cambio-plan');
            expect(screen.getByText(/Herramienta disponible para el Plan 17\.13/i)).toBeTruthy();
            expect(screen.queryByText(/Página no encontrada/i)).toBeNull();
            expect(screen.getByRole('button', { name: /Volver/i })).toBeTruthy();
        });
    });
});
