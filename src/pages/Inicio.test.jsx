// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import storageRepository from '../services/storageRepository';
import { PlanProvider } from '../context/PlanContext';

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        user: null,
        userData: null,
    }),
}));

const mockGetMateriasByPlan = vi.fn();
vi.mock('../services/planService', () => ({
    default: {
        getMateriasByPlan: (...args) => mockGetMateriasByPlan(...args),
    },
}));

vi.mock('@heroui/react', () => ({
    Button: ({ children, onPress, isDisabled, 'aria-label': ariaLabel }) => (
        <button type="button" onClick={onPress} disabled={isDisabled} aria-label={ariaLabel}>
            {children}
        </button>
    ),
    Progress: ({ value, 'aria-label': ariaLabel }) => (
        <div role="progressbar" aria-label={ariaLabel} aria-valuenow={value} />
    ),
}));

import Inicio from './Inicio';

function buildMaterias(count) {
    return Array.from({ length: count }, (_, idx) => ({
        codigo: `M${idx + 1}`,
        nombre: `Materia ${idx + 1}`,
        anio: 1,
        cuatrimestre: 1,
        correlativas: [],
    }));
}

describe('Inicio - Porcentaje de avance consistente con Mis Materias', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        storageRepository.setPlanActivo('17.13');
    });

    afterEach(() => {
        cleanup();
    });

    it('calcula 48% cuando hay 20 materias aprobadas sobre las 42 reales del Plan 17.13 (alineado con Mis Materias)', async () => {
        const materias42 = buildMaterias(42);
        mockGetMateriasByPlan.mockResolvedValue(materias42);

        const progreso = {};
        for (let i = 1; i <= 20; i += 1) {
            progreso[`M${i}`] = 'Aprobado';
        }
        storageRepository.setProgreso('17.13', progreso);

        render(
            <MemoryRouter>
                <PlanProvider>
                    <Inicio />
                </PlanProvider>
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(screen.getByText('20 materias aprobadas (48%)')).toBeTruthy();
        });
        expect(screen.queryByText(/54%/)).toBeNull();
    });

    it('ignora códigos huérfanos fuera del plan activo y calcula sobre las materias reales cargadas', async () => {
        const materias10 = buildMaterias(10);
        mockGetMateriasByPlan.mockResolvedValue(materias10);

        const progreso = {
            M1: 'Aprobado',
            M2: 'Promocionado',
            M3: 'Aprobado',
            M4: 'Promocionado',
            M5: 'Aprobado',
            ORPHAN_1: 'Aprobado',
            ORPHAN_2: 'Promocionado',
        };
        storageRepository.setProgreso('17.13', progreso);

        render(
            <MemoryRouter>
                <PlanProvider>
                    <Inicio />
                </PlanProvider>
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(screen.getByText('5 materias aprobadas (50%)')).toBeTruthy();
        });
    });
});
