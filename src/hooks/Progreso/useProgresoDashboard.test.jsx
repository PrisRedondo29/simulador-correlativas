// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, screen, fireEvent, act, cleanup } from '@testing-library/react';
import storageRepository from '../../services/storageRepository';

const mockUpdateAuthProgreso = vi.fn();

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        updateAuthProgreso: (...args) => mockUpdateAuthProgreso(...args),
    }),
}));

vi.mock('../../services/analyticsService', () => ({
    trackSearch: vi.fn(),
    trackCambioVista: vi.fn(),
    trackProgreso: vi.fn(),
    trackCambioMateria: vi.fn(),
    trackRecursada: vi.fn(),
}));

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
        Modal: ({ isOpen, children }) => (isOpen ? <div role="dialog">{children}</div> : null),
        ModalContent: ({ children }) => (
            <div>{typeof children === 'function' ? children(() => {}) : children}</div>
        ),
        ModalHeader: ({ children }) => <h2>{children}</h2>,
        ModalBody: ({ children }) => <div>{children}</div>,
        ModalFooter: ({ children }) => <div>{children}</div>,
        Button: ({ children, onPress }) => (
            <button type="button" onClick={onPress}>
                {children}
            </button>
        ),
        Checkbox: ({ children, isSelected, onValueChange }) => (
            <label>
                <input
                    type="checkbox"
                    checked={Boolean(isSelected)}
                    onChange={(e) => onValueChange?.(e.target.checked)}
                />
                {children}
            </label>
        ),
    };
});

import useProgresoDashboard from './useProgresoDashboard';
import ConfirmarCambioModal from '../../components/Progreso/modals/ConfirmarCambioModal';

const MATERIAS_MOCK = [
    { codigo: 'M1', nombre: 'Intro Prog', anio: 1, cuatrimestre: 1, correlativas: [] },
    { codigo: 'M2', nombre: 'Estructuras', anio: 1, cuatrimestre: 2, correlativas: ['M1'] },
];

describe('useProgresoDashboard + ConfirmarCambioModal - Confirmación de cascada y persistencia de preferencia', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('intercepta aprobación con correlativa en Regular, muestra lista de materias afectadas y persiste "No volver a mostrar"', () => {
        let currentProgreso = {
            M1: 'Regular',
            M2: 'Regular',
        };
        const setProgreso = vi.fn((next) => {
            currentProgreso = typeof next === 'function' ? next(currentProgreso) : next;
        });
        const setProgresoDetalles = vi.fn();

        const { result, rerender } = renderHook(() =>
            useProgresoDashboard({
                plan: '17.14',
                materias: MATERIAS_MOCK,
                progreso: currentProgreso,
                setProgreso,
                progresoDetalles: {},
                setProgresoDetalles,
            }),
        );

        expect(result.current.mostrarConfirmacionCascada).toBe(true);

        // El usuario pulsa "Aprobado" sobre M2 mientras M1 sigue en "Regular" -> debe abrir confirmación de cascada
        act(() => {
            result.current.handleCambioDeEstado('M2', 'Aprobado');
        });

        expect(result.current.isConfirmationOpen).toBe(true);
        expect(result.current.pendingBlockedTransition).toMatchObject({
            codigo: 'M2',
            nombreMateria: 'Estructuras',
            targetState: 'Aprobado',
            materiasAfectadas: [
                {
                    codigo: 'M1',
                    nombre: 'Intro Prog',
                    estadoAnterior: 'Regular',
                    estadoNuevo: 'Aprobado',
                },
            ],
        });

        // Renderizamos ConfirmarCambioModal conectado al estado del hook
        render(
            <ConfirmarCambioModal
                isOpen={result.current.isConfirmationOpen}
                onOpenChange={result.current.onConfirmationOpenChange}
                onClose={result.current.onConfirmationClose}
                onConfirm={result.current.confirmarCascada}
                setMostrar={result.current.setMostrarConfirmacionCascada}
                targetState={result.current.pendingBlockedTransition?.targetState}
                nombreMateria={result.current.pendingBlockedTransition?.nombreMateria}
                materiasAfectadas={result.current.pendingBlockedTransition?.materiasAfectadas}
            />,
        );

        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(screen.getByText(/Intro Prog/)).toBeTruthy();
        expect(screen.getByText(/Regular → Aprobado/)).toBeTruthy();

        // Tildamos "No volver a mostrar esta advertencia" y confirmamos
        const checkbox = screen.getByRole('checkbox', {
            name: /No volver a mostrar esta advertencia/i,
        });
        fireEvent.click(checkbox);
        fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));

        // La preferencia quedó guardada en storageRepository
        expect(storageRepository.getMostrarConfirmacionCascada()).toBe(false);
        expect(result.current.mostrarConfirmacionCascada).toBe(false);

        // Ya sin modal intermedio, aplica la aprobación en cascada directamente
        rerender();
        expect(currentProgreso.M1).toBe('Aprobado');
        expect(currentProgreso.M2).toBe('Aprobado');

        // En una siguiente acción con cascada, ya NO vuelve a abrir el modal de confirmación de cascada
        act(() => {
            result.current.onConfirmationClose();
        });
        const actionSpy = vi.fn();
        act(() => {
            const intercepted = result.current.solicitarConfirmacionCascada({
                codigo: 'M2',
                targetState: 'Aprobado',
                onConfirmAction: actionSpy,
            });
            expect(intercepted).toBe(false);
        });
        expect(actionSpy).toHaveBeenCalledTimes(1);
    });

    it('al recursar una materia (Regular -> Cursando) archiva la cursada anterior en historial y registra fechaInicioCursada', () => {
        let currentProgreso = {
            M1: 'Regular',
            M2: 'Bloqueado',
        };
        let currentDetalles = {
            M1: {
                fechaRegularidad: { anio: 2024, cuatrimestre: 1 },
                notaRegularizacion: 6,
                intentosFinal: [{ nota: 2, estado: 'reprobado', fecha: '2025-02-10' }],
            },
        };
        const setProgreso = vi.fn((next) => {
            currentProgreso = typeof next === 'function' ? next(currentProgreso) : next;
        });
        const setProgresoDetalles = vi.fn((next) => {
            currentDetalles = typeof next === 'function' ? next(currentDetalles) : next;
        });

        const { result } = renderHook(() =>
            useProgresoDashboard({
                plan: '17.14',
                materias: MATERIAS_MOCK,
                progreso: currentProgreso,
                setProgreso,
                progresoDetalles: currentDetalles,
                setProgresoDetalles,
            }),
        );

        act(() => {
            result.current.handleCambioDeEstado('M1', 'Cursando');
        });

        expect(currentProgreso.M1).toBe('Cursando');
        expect(currentDetalles.M1.intentosFinal).toEqual([]);
        expect(currentDetalles.M1.fechaRegularidad).toBeNull();
        expect(currentDetalles.M1.fechaInicioCursada).toMatchObject({
            anio: new Date().getFullYear(),
            cuatrimestre: 1,
        });
        expect(currentDetalles.M1.historial).toHaveLength(1);
        expect(currentDetalles.M1.historial[0]).toMatchObject({
            estadoFinal: 'Regular',
            notaRegularizacion: 6,
            fechaRegularidad: { anio: 2024, cuatrimestre: 1 },
        });
    });
});
