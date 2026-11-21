// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import storageRepository, { CURRENT_ONBOARDING_VERSION } from '../../services/storageRepository';
import { PlanProvider } from '../../context/PlanContext';

const mockSignIn = vi.fn();
const mockUpdateAuthProgreso = vi.fn((plan, progreso, detalles) => {
    storageRepository.setProgreso(plan, progreso);
    if (detalles) storageRepository.setProgresoDetalles(plan, detalles);
});
let mockAuthState = {
    isAuthenticated: false,
    loading: false,
};

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        ...mockAuthState,
        signIn: mockSignIn,
        updateAuthProgreso: mockUpdateAuthProgreso,
    }),
}));

const mockGetMateriasByPlan = vi.fn();
vi.mock('../../services/planService', () => ({
    default: {
        getMateriasByPlan: (...args) => mockGetMateriasByPlan(...args),
    },
}));

vi.mock('../../services/analyticsService', () => ({
    trackSeleccionCarrera: vi.fn(),
    trackProgresoInicial: vi.fn(),
}));

const mockAddToast = vi.fn();
vi.mock('@heroui/react', () => {
    const useDisclosure = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        return {
            isOpen,
            onOpen: () => setIsOpen(true),
            onClose: () => setIsOpen(false),
            onOpenChange: (v) => setIsOpen(Boolean(v)),
        };
    };
    return {
        useDisclosure,
        addToast: (...args) => mockAddToast(...args),
        Spinner: ({ label }) => <div role="status">{label || 'Cargando'}</div>,
        Button: ({ children, onPress, 'aria-label': ariaLabel }) => (
            <button type="button" onClick={onPress} aria-label={ariaLabel}>
                {children}
            </button>
        ),
    };
});

vi.mock('../Auth/LoginModal', () => ({
    default: ({ isOpen, onConfirm, onClose }) =>
        isOpen ? (
            <div role="dialog" aria-label="Login Mock">
                <button
                    type="button"
                    onClick={async () => {
                        const res = await onConfirm(false);
                        if (res) onClose();
                    }}
                >
                    Confirmar Google Mock
                </button>
            </div>
        ) : null,
}));

import OnboardingGate from './OnboardingGate';

const MATERIAS_MOCK = [
    { codigo: '11071', nombre: 'Introducción a la Programación', anio: 1, cuatrimestre: 1, correlativas: [] },
    { codigo: '11072', nombre: 'Álgebra', anio: 1, cuatrimestre: 2, correlativas: [] },
];

function LocationMonitor() {
    const location = useLocation();
    return (
        <div>
            <span data-testid="pathname">{location.pathname}</span>
            <span data-testid="loc-state">{JSON.stringify(location.state || null)}</span>
            <div>Contenido App</div>
        </div>
    );
}

function renderGate(initialEntry = '/') {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <PlanProvider>
                <OnboardingGate>
                    <LocationMonitor />
                </OnboardingGate>
            </PlanProvider>
        </MemoryRouter>,
    );
}

describe('OnboardingGate - Asistente inicial obligatorio, usuarios existentes y redirección', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.clearAllMocks();
        mockAuthState = { isAuthenticated: false, loading: false };
        mockGetMateriasByPlan.mockResolvedValue(MATERIAS_MOCK);
    });

    afterEach(() => {
        cleanup();
    });

    it('usuario nuevo en / ve el asistente obligatorio sin botón Omitir ni warning de sobrescritura', () => {
        renderGate('/');

        expect(screen.getByText(/¿En qué año ingresaste a la carrera\?/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /Ya tengo cuenta/i })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Omitir/i })).toBeNull();
        expect(screen.queryByText(/Ya tenés materias guardadas/i)).toBeNull();
        expect(screen.queryByText('Contenido App')).toBeNull();
    });

    it.each(['/como-usar', '/contacto'])(
        'permite acceder libremente a %s sin bloquear al usuario nuevo',
        (route) => {
            renderGate(route);
            expect(screen.getByText('Contenido App')).toBeTruthy();
            expect(screen.getByTestId('pathname').textContent).toBe(route);
        },
    );

    it('usuario existente ve warning exclusivo y botón Omitir que conserva sus datos sin alterar nada', () => {
        storageRepository.setPlanActivo('17.13', { silent: true });
        storageRepository.setProgreso('17.13', { '11071': 'Aprobado' }, { silent: true });

        renderGate('/');

        expect(screen.getByText(/Ya tenés materias guardadas en este dispositivo/i)).toBeTruthy();
        const skipBtn = screen.getByRole('button', { name: /^Omitir$/i });
        fireEvent.click(skipBtn);

        expect(storageRepository.getOnboardingVersionCompleted()).toBe(CURRENT_ONBOARDING_VERSION);
        expect(storageRepository.getProgreso('17.13')).toEqual({ '11071': 'Aprobado' });
        expect(screen.getByText('Contenido App')).toBeTruthy();
    });

    it('usuario nuevo de cohorte 2024+ elige Plan 17.14, puede usar atajo ingresante y aterriza en /mis-materias', async () => {
        renderGate('/');

        fireEvent.click(screen.getByRole('button', { name: /Ingresé en 2024 o después/i }));

        await waitFor(() => {
            expect(screen.getByText(/Marcá tus materias en una sola pasada/i)).toBeTruthy();
        });

        fireEvent.click(screen.getByRole('button', { name: /Soy ingresante \(0 materias\)/i }));

        expect(storageRepository.getPlanActivo()).toBe('17.14');
        expect(storageRepository.getOnboardingVersionCompleted()).toBe(CURRENT_ONBOARDING_VERSION);
        expect(screen.getByTestId('pathname').textContent).toBe('/mis-materias');
        expect(screen.getByText('Contenido App')).toBeTruthy();
    });

    it('usuario en Plan 17.13 con materias marcadas redirige automáticamente a /cambio-plan con autoEvaluate=true', async () => {
        renderGate('/');

        fireEvent.click(screen.getByRole('button', { name: /Ingresé en 2023 o antes/i }));
        fireEvent.click(screen.getByRole('button', { name: /Sigo en Plan 17\.13/i }));

        await waitFor(() => {
            expect(screen.getByText(/Introducción a la Programación/i)).toBeTruthy();
        });

        const group = screen.getByRole('group', {
            name: /Estado de Introducción a la Programación/i,
        });
        const aprobadaBtn = group.querySelector('button:nth-child(3)');
        expect(aprobadaBtn).toBeTruthy();
        fireEvent.click(aprobadaBtn);

        fireEvent.click(
            screen.getByRole('button', { name: /Ver si me corresponde cambio de plan/i }),
        );

        expect(storageRepository.getPlanActivo()).toBe('17.13');
        expect(storageRepository.getProgreso('17.13')).toMatchObject({ '11071': 'Aprobado' });
        expect(screen.getByTestId('pathname').textContent).toBe('/cambio-plan');
        expect(JSON.parse(screen.getByTestId('loc-state').textContent)).toEqual({
            fromOnboarding: true,
            autoEvaluate: true,
        });
    });

    it('al iniciar sesión con Google ("Ya tengo cuenta") y recuperar progreso en la nube, salta el onboarding', async () => {
        mockSignIn.mockImplementation(async () => {
            storageRepository.setPlanActivo('17.14');
            storageRepository.setProgreso('17.14', { '11071': 'Aprobado' });
            return { uid: 'u-cloud' };
        });

        renderGate('/');

        fireEvent.click(screen.getByRole('button', { name: /Ya tengo cuenta/i }));
        fireEvent.click(screen.getByRole('button', { name: /Confirmar Google Mock/i }));

        await waitFor(() => {
            expect(storageRepository.getOnboardingVersionCompleted()).toBe(
                CURRENT_ONBOARDING_VERSION,
            );
        });
        expect(screen.getByText('Contenido App')).toBeTruthy();
        expect(mockAddToast).toHaveBeenCalledWith(
            expect.objectContaining({
                title: '¡Bienvenido de vuelta!',
            }),
        );
    });
});
