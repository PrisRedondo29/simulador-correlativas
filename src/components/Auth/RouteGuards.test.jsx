// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import storageRepository from '../../services/storageRepository';

const mockUseAuth = vi.fn();

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

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

import AdminRoute from './AdminRoute';
import PlanFeatureRoute from './PlanFeatureRoute';
import { PlanProvider } from '../../context/PlanContext';

describe('AdminRoute - Protección de rutas administrativas', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('muestra indicador de carga mientras verifica permisos sin exponer contenido admin', () => {
        mockUseAuth.mockReturnValue({ user: null, userRole: 'user', loading: true });

        render(
            <MemoryRouter initialEntries={['/admin']}>
                <Routes>
                    <Route
                        path="/admin"
                        element={
                            <AdminRoute>
                                <div>Panel Secreto Admin</div>
                            </AdminRoute>
                        }
                    />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByRole('status').textContent).toContain('Verificando permisos');
        expect(screen.queryByText('Panel Secreto Admin')).toBeNull();
    });

    it('bloquea y redirige a usuarios no autenticados o sin rol admin', () => {
        mockUseAuth.mockReturnValue({
            user: { uid: 'u1' },
            userRole: 'user',
            loading: false,
        });

        render(
            <MemoryRouter initialEntries={['/admin']}>
                <Routes>
                    <Route
                        path="/admin"
                        element={
                            <AdminRoute>
                                <div>Panel Secreto Admin</div>
                            </AdminRoute>
                        }
                    />
                    <Route path="/" element={<div>Destino Inicio</div>} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.queryByText('Panel Secreto Admin')).toBeNull();
        expect(screen.getByText('Destino Inicio')).toBeTruthy();
    });

    it('permite el acceso únicamente cuando el usuario tiene rol admin', () => {
        mockUseAuth.mockReturnValue({
            user: { uid: 'admin-1' },
            userRole: 'admin',
            loading: false,
        });

        render(
            <MemoryRouter initialEntries={['/admin']}>
                <Routes>
                    <Route
                        path="/admin"
                        element={
                            <AdminRoute>
                                <div>Panel Secreto Admin</div>
                            </AdminRoute>
                        }
                    />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByText('Panel Secreto Admin')).toBeTruthy();
    });
});

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

        fireEvent.click(screen.getByRole('button', { name: /Cambiar a Plan 17\.13/i }));

        expect(storageRepository.getPlanActivo()).toBe('17.13');
        expect(screen.getByText('Simulador de Transición')).toBeTruthy();
    });
});
