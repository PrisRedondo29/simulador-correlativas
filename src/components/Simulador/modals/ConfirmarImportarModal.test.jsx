// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ConfirmarImportarModal from './ConfirmarImportarModal';

vi.mock('@heroui/react', () => {
    const ModalContext = React.createContext(() => {});

    const Modal = ({ isOpen, onOpenChange, children }) =>
        isOpen ? (
            <ModalContext.Provider value={() => onOpenChange?.(false)}>
                <div role="dialog">{children}</div>
            </ModalContext.Provider>
        ) : null;

    const ModalContent = ({ children }) => {
        const onClose = React.useContext(ModalContext);
        return <div>{typeof children === 'function' ? children(onClose) : children}</div>;
    };

    const ModalHeader = ({ children }) => <div>{children}</div>;
    const ModalBody = ({ children }) => <div>{children}</div>;
    const ModalFooter = ({ children }) => <div>{children}</div>;
    const Progress = ({ value }) => <div data-testid="completitud-progress" data-value={value} />;
    const Button = ({ children, onPress, startContent, ...rest }) => (
        <button type="button" onClick={onPress} {...rest}>
            {startContent}
            {children}
        </button>
    );

    return { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Progress, Button };
});

function MisMateriasDestino() {
    const location = useLocation();
    return (
        <div data-testid="destino-mis-materias">
            {location.state?.soloIncompletas ? 'SOLO_INCOMPLETAS_ON' : 'SOLO_INCOMPLETAS_OFF'}
        </div>
    );
}

const MATERIAS_MOCK = [
    { codigo: 'M1', nombre: 'Álgebra y Lógica', anio: 1, cuatrimestre: 1 },
    { codigo: 'M2', nombre: 'Programación I', anio: 1, cuatrimestre: 2 },
    { codigo: 'M3', nombre: 'Sistemas Operativos', anio: 2, cuatrimestre: 1 },
];

describe('ConfirmarImportarModal', () => {
    afterEach(() => {
        cleanup();
    });

    it('excluye materias en Cursando del conteo de materias sin fecha estimada', () => {
        const progresoReal = {
            M1: 'Promocionado',
            M2: 'Cursando',
            M3: 'Disponible',
        };
        const progresoDetalles = {
            M1: { fechaRegularidad: { anio: 2024, cuatrimestre: 1 }, notaRegularizacion: 8 },
        };

        render(
            <MemoryRouter initialEntries={['/simulador']}>
                <ConfirmarImportarModal
                    isOpen={true}
                    onOpenChange={vi.fn()}
                    onConfirm={vi.fn()}
                    progresoReal={progresoReal}
                    progresoDetalles={progresoDetalles}
                    materias={MATERIAS_MOCK}
                />
            </MemoryRouter>,
        );

        expect(screen.getByText(/1 con fecha/i)).toBeTruthy();
        expect(screen.getByText('0 sin fecha')).toBeTruthy();
        expect(screen.queryByText(/se estimarán/i)).toBeNull();
        expect(screen.queryByTestId('btn-completar-fechas')).toBeNull();
        expect(screen.getByText('100%')).toBeTruthy();
    });

    it('al pulsar "Completar fechas" cierra el modal y navega a /mis-materias con soloIncompletas activado', () => {
        const onOpenChange = vi.fn();
        const progresoReal = {
            M1: 'Aprobado',
            M2: 'Regular',
        };
        const progresoDetalles = {
            M1: { fechaRegularidad: { anio: 2024, cuatrimestre: 1 }, notaFinal: 8 },
        };

        render(
            <MemoryRouter initialEntries={['/simulador']}>
                <Routes>
                    <Route
                        path="/simulador"
                        element={
                            <ConfirmarImportarModal
                                isOpen={true}
                                onOpenChange={onOpenChange}
                                onConfirm={vi.fn()}
                                progresoReal={progresoReal}
                                progresoDetalles={progresoDetalles}
                                materias={MATERIAS_MOCK}
                            />
                        }
                    />
                    <Route path="/mis-materias" element={<MisMateriasDestino />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByText(/1 sin fecha \(se estimarán\)/i)).toBeTruthy();

        const btnCompletar = screen.getByTestId('btn-completar-fechas');
        fireEvent.click(btnCompletar);

        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(screen.getByTestId('destino-mis-materias').textContent).toBe('SOLO_INCOMPLETAS_ON');
    });
});
