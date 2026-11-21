// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import storageRepository from '../services/storageRepository';

const mockGetPlanByNumber = vi.fn();
const mockGetEquivalenciasByPlan = vi.fn();

vi.mock('../services/planService', () => ({
    default: {
        getPlanByNumber: (...args) => mockGetPlanByNumber(...args),
        getEquivalenciasByPlan: (...args) => mockGetEquivalenciasByPlan(...args),
    },
}));

vi.mock('../components/Tutorial/InteractiveTourOverlay', () => ({
    default: () => null,
}));

vi.mock('../context/PlanContext', () => ({
    usePlanCapabilities: () => ({
        plan: '17.13',
        transitionInfo: {
            sourcePlan: '17.13',
            targetPlan: '17.14',
            resolution: 'Res. HCS 89/2025',
            shortBadge: 'Res. 89/25',
            route: '/cambio-plan',
            savedHours: 202,
            closingYear: 2029,
        },
    }),
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
    Chip: ({ children }) => <span>{children}</span>,
    Accordion: ({ children }) => <div>{children}</div>,
    AccordionItem: ({ title, children }) => (
        <div>
            <div>{title}</div>
            <div>{children}</div>
        </div>
    ),
    Spinner: () => <div role="status">Cargando</div>,
}));

import TransicionPlan from './TransicionPlan';

const PLAN_1713_MOCK = {
    plan_numero: '17.13',
    materias: [
        { codigo: '11071', nombre: 'Introducción a la Programación', cuatrimestre: 1, horas_totales: 96, correlativas: [] },
        { codigo: '11072', nombre: 'Álgebra', cuatrimestre: 1, horas_totales: 96, correlativas: [] },
        { codigo: '11073', nombre: 'Programación I', cuatrimestre: 2, horas_totales: 96, correlativas: ['11071'] },
    ],
};

const PLAN_1714_MOCK = {
    plan_numero: '17.14',
    materias: [
        { codigo: '11071', nombre: 'Introducción a la Programación', cuatrimestre: 1, horas_totales: 96, correlativas: [] },
        { codigo: '11072', nombre: 'Álgebra', cuatrimestre: 1, horas_totales: 96, correlativas: [] },
        { codigo: '11073', nombre: 'Programación I', cuatrimestre: 2, horas_totales: 96, correlativas: ['11071'] },
    ],
};

describe('TransicionPlan - Veredicto directo sin clic extra', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        mockGetPlanByNumber.mockImplementation((planNum) =>
            Promise.resolve(planNum === '17.14' ? PLAN_1714_MOCK : PLAN_1713_MOCK),
        );
        mockGetEquivalenciasByPlan.mockResolvedValue({});
    });

    afterEach(() => {
        cleanup();
    });

    it('muestra el veredicto y comparativa inmediatamente sin botón intermedio cuando hay materias cargadas', async () => {
        storageRepository.setProgreso('17.13', {
            '11071': 'Aprobado',
            '11072': 'Aprobado',
        });

        render(
            <MemoryRouter initialEntries={['/cambio-plan']}>
                <TransicionPlan />
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(screen.getByText('Comparativa de Avance')).toBeTruthy();
        });
        expect(screen.getByText('Ver Equivalencias')).toBeTruthy();
        expect(screen.queryByText(/Evaluar si me corresponde el cambio/i)).toBeNull();
    });

    it('muestra el estado vacío cuando todavía no hay materias cargadas en Plan 17.13', async () => {
        render(
            <MemoryRouter initialEntries={['/cambio-plan']}>
                <TransicionPlan />
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(screen.getByText(/Todavía no cargaste materias del Plan 17\.13/i)).toBeTruthy();
        });
        expect(screen.queryByText('Comparativa de Avance')).toBeNull();
    });
});
