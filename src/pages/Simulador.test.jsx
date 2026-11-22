// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import storageRepository from '../services/storageRepository';

const mockSetSimulacionLocal = vi.fn();
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        setSimulacionLocal: mockSetSimulacionLocal,
    }),
}));

vi.mock('../services/analyticsService', () => ({
    trackCambioVista: vi.fn(),
    trackGuardarSimulacion: vi.fn(),
    trackDescargaPDF: vi.fn(),
}));

vi.mock('../hooks/usePlanData', () => ({
    default: () => ({
        progreso: {},
        progresoDetalles: {},
    }),
}));

const MATERIAS_MOCK = [
    {
        codigo: '11071',
        nombre: 'Introducción a la Programación',
        anio: 1,
        cuatrimestre: 1,
        horas_semanales: 6,
        horas_totales: 96,
        correlativas: [],
    },
];

const HISTORIAL_MOCK = [
    {
        cuatri: 1,
        anioActual: '2026',
        materiasDelSemestre: MATERIAS_MOCK,
        progresoSnapshot: { '11071': 'Cursado' },
        progresoBaseSnapshot: {},
    },
];

vi.mock('../hooks/Simulador/useSimuladorEstado', () => ({
    default: () => ({
        materias: MATERIAS_MOCK,
        cargando: false,
        progresoSimulado: { '11071': 'Cursado' },
        setProgresoSimulado: vi.fn(),
        progresoBase: {},
        cuatri: 1,
        anioActual: '2028',
        historialSemestres: HISTORIAL_MOCK,
        semestreActualPlan: 1,
        estadoAnterior: true,
        estadoSiguiente: false,
        simulacionTerminada: true,
        handleAnterior: vi.fn(),
        handleSiguiente: vi.fn(),
        importarHistorialReconstruido: vi.fn(),
    }),
}));

vi.mock('../hooks/Simulador/useSimuladorMaterias', () => ({
    default: () => ({
        cambioDeEstado: vi.fn(),
        materiasCursables: [],
    }),
}));

const mockHandleDownloadPDF = vi.fn();
vi.mock('../hooks/Simulador/useSimuladorPDF', () => ({
    default: () => ({
        handleDownloadPDF: mockHandleDownloadPDF,
    }),
}));

vi.mock('../components/Progreso/MateriasGrafo', () => ({
    default: () => <div data-testid="grafo-mock" />,
}));

vi.mock('../components/Tutorial/InteractiveTourOverlay', () => ({
    default: () => null,
}));

vi.mock('../components/Simulador/modals/SimuladorModeModal', () => ({
    default: () => null,
}));

const mockAddToast = vi.fn();
vi.mock('@heroui/react', () => {
    const ModalCloseContext = React.createContext(() => {});

    const useDisclosure = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        return {
            isOpen,
            onOpen: () => setIsOpen(true),
            onClose: () => setIsOpen(false),
            onOpenChange: (next) => setIsOpen(Boolean(next)),
        };
    };

    return {
        useDisclosure,
        addToast: (...args) => mockAddToast(...args),
        Button: ({
            children,
            onPress,
            isDisabled,
            isLoading,
            'aria-label': ariaLabel,
            title,
            className,
            startContent,
            endContent,
        }) => (
            <button
                type="button"
                onClick={onPress}
                disabled={Boolean(isDisabled || isLoading)}
                aria-label={ariaLabel}
                title={title}
                className={className}
            >
                {startContent}
                {children}
                {endContent}
            </button>
        ),
        Spinner: ({ label }) => <div role="status">{label || 'Cargando'}</div>,
        Modal: ({ isOpen, onOpenChange, children }) =>
            isOpen ? (
                <ModalCloseContext.Provider value={() => onOpenChange?.(false)}>
                    <div role="dialog">{children}</div>
                </ModalCloseContext.Provider>
            ) : null,
        ModalContent: ({ children }) => {
            const onClose = React.useContext(ModalCloseContext);
            return <div>{typeof children === 'function' ? children(onClose) : children}</div>;
        },
        ModalHeader: ({ children }) => <div>{children}</div>,
        ModalBody: ({ children }) => <div>{children}</div>,
        ModalFooter: ({ children }) => <div>{children}</div>,
        Accordion: ({ children }) => <div>{children}</div>,
        AccordionItem: ({ title, children }) => (
            <div>
                <div>{title}</div>
                <div>{children}</div>
            </div>
        ),
        Select: ({ children }) => <div>{children}</div>,
        SelectItem: ({ children }) => <div>{children}</div>,
        Progress: ({ value, 'aria-label': ariaLabel }) => (
            <div role="progressbar" aria-label={ariaLabel} aria-valuenow={value} />
        ),
        Card: ({ children }) => <div>{children}</div>,
        CardBody: ({ children }) => <div>{children}</div>,
        CardHeader: ({ children }) => <div>{children}</div>,
        CardFooter: ({ children }) => <div>{children}</div>,
        Chip: ({ children }) => <span>{children}</span>,
        Switch: ({ isSelected, onValueChange, 'aria-label': ariaLabel }) => (
            <input
                type="checkbox"
                aria-label={ariaLabel}
                checked={Boolean(isSelected)}
                onChange={(e) => onValueChange?.(e.target.checked)}
            />
        ),
    };
});

import Simulador from './Simulador';

function renderSimulador() {
    return render(
        <MemoryRouter>
            <Simulador plan="17.13" />
        </MemoryRouter>,
    );
}

describe('Simulador - Persistencia de Guardar simulación y Descargar PDF tras finalizar', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 });
        storageRepository.setPlanActivo('17.13');
        storageRepository.setSimuladorModeSelected('planificar');
        storageRepository.setSimuladorDesktopLayout('panel');
    });

    afterEach(() => {
        cleanup();
    });

    it('mantiene accesibles Guardar simulación y Descargar PDF tras Ver historial -> Cerrar -> Ver (N)', async () => {
        renderSimulador();

        await screen.findByText('¡Simulación Finalizada!');

        fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }));

        const firstHistoryDialog = await screen.findByRole('dialog');
        expect(within(firstHistoryDialog).getByText('Historial Académico')).toBeTruthy();
        expect(within(firstHistoryDialog).getByRole('button', { name: 'Guardar simulación' })).toBeTruthy();
        expect(within(firstHistoryDialog).getByRole('button', { name: 'Descargar PDF' })).toBeTruthy();

        fireEvent.click(within(firstHistoryDialog).getByRole('button', { name: 'Cerrar' }));

        await waitFor(() => {
            expect(screen.queryByText('Historial Académico')).toBeNull();
        });

        fireEvent.click(screen.getByRole('button', { name: /Ver \(1\)/i }));

        const reopenedDialog = await screen.findByRole('dialog');
        expect(within(reopenedDialog).getByText('Historial Académico')).toBeTruthy();
        expect(within(reopenedDialog).getByRole('button', { name: 'Guardar simulación' })).toBeTruthy();
        expect(within(reopenedDialog).getByRole('button', { name: 'Descargar PDF' })).toBeTruthy();
    });

    it('permite guardar desde el historial reabierto o abrir confirmación si ya existe una simulación guardada', async () => {
        renderSimulador();

        await screen.findByText('¡Simulación Finalizada!');
        fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }));

        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar simulación' }));

        expect(mockSetSimulacionLocal).toHaveBeenCalledWith(
            '17.13',
            expect.objectContaining({
                historialSemestres: HISTORIAL_MOCK,
                simulacionTerminada: true,
            }),
        );

        storageRepository.setSimulacion('17.13', { existing: true });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar simulación' }));

        await screen.findByText('Sobrescribir Simulación');
    });

    it('permite descargar PDF desde el modal de Historial Académico cerrando el diálogo', async () => {
        renderSimulador();

        await screen.findByText('¡Simulación Finalizada!');
        fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }));

        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Descargar PDF' }));

        expect(mockHandleDownloadPDF).toHaveBeenCalledTimes(1);
        await waitFor(() => {
            expect(screen.queryByText('Historial Académico')).toBeNull();
        });
    });
});
