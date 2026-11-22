// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const mockDownloadPlanilla = vi.fn(async () => true);

vi.mock('../../../hooks/Simulador/useSimuladorPDF', () => ({
    downloadPlanillaPlanPDF: (...args) => mockDownloadPlanilla(...args),
}));

vi.mock('@heroui/react', () => {
    const ModalCloseContext = React.createContext(() => {});

    return {
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
        Chip: ({ children }) => <span>{children}</span>,
        Button: ({ children, onPress, isDisabled, isLoading, startContent }) => (
            <button type="button" onClick={onPress} disabled={Boolean(isDisabled || isLoading)}>
                {startContent}
                {children}
            </button>
        ),
        Tabs: ({ children, selectedKey, onSelectionChange }) => (
            <div data-selected={selectedKey}>
                <div role="tablist">
                    {React.Children.map(children, (child) =>
                        child ? (
                            <button
                                key={child.key}
                                type="button"
                                role="tab"
                                aria-selected={selectedKey === child.key}
                                onClick={() => onSelectionChange?.(child.key)}
                            >
                                {child.props.title}
                            </button>
                        ) : null,
                    )}
                </div>
                <div>
                    {React.Children.map(children, (child) =>
                        child && child.key === selectedKey ? child.props.children : null,
                    )}
                </div>
            </div>
        ),
        Tab: ({ children }) => <div>{children}</div>,
    };
});

import ExportarPlanillaPDFModal from './ExportarPlanillaPDFModal';

const MOCK_MATERIAS = [
    { codigo: '11071', nombre: 'Introducción a la Programación', anio: 1, cuatrimestre: 1 },
    { codigo: '11072', nombre: 'Álgebra', anio: 1, cuatrimestre: 1 },
];

describe('ExportarPlanillaPDFModal - Planilla en blanco o con progreso', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('cuando no hay progreso cargado muestra solo planilla en blanco y botón para cargar analítico/progreso', () => {
        const onOpenSawebImport = vi.fn();
        const onOpenChange = vi.fn();

        render(
            <ExportarPlanillaPDFModal
                isOpen={true}
                onOpenChange={onOpenChange}
                plan="17.13"
                materias={MOCK_MATERIAS}
                progreso={{ '11071': 'Disponible', '11072': 'Disponible' }}
                progresoDetalles={{}}
                kpis={{ aprobadasCount: 0, totalCount: 2, porcentaje: 0 }}
                onOpenSawebImport={onOpenSawebImport}
            />,
        );

        expect(screen.queryByRole('tab', { name: /Con mi progreso actual/i })).toBeNull();
        expect(screen.getByRole('button', { name: /Descargar planilla en blanco/i })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Cargar Analítico \/ Progreso/i }));
        expect(onOpenSawebImport).toHaveBeenCalledTimes(1);
    });

    it('cuando hay progreso cargado abre en "Con mi progreso actual" y permite alternar a "Planilla del Plan en blanco"', async () => {
        render(
            <ExportarPlanillaPDFModal
                isOpen={true}
                onOpenChange={vi.fn()}
                plan="17.13"
                materias={MOCK_MATERIAS}
                progreso={{ '11071': 'Promocionado', '11072': 'Disponible' }}
                progresoDetalles={{ '11071': { notaFinal: 9 } }}
                kpis={{ aprobadasCount: 1, totalCount: 2, porcentaje: 50 }}
                onOpenSawebImport={vi.fn()}
            />,
        );

        expect(screen.getByRole('tab', { name: /Con mi progreso actual/i })).toBeTruthy();
        expect(screen.getByRole('tab', { name: /Planilla del Plan en blanco/i })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Descargar PDF con mi progreso/i }));
        await waitFor(() => {
            expect(mockDownloadPlanilla).toHaveBeenCalledTimes(1);
        });
        expect(mockDownloadPlanilla).toHaveBeenCalledWith(
            expect.objectContaining({ plan: '17.13', includeProgress: true }),
        );

        await waitFor(() => {
            const btn = /** @type {HTMLButtonElement} */ (
                screen.getByRole('button', { name: /Descargar PDF con mi progreso/i })
            );
            expect(btn.disabled).toBe(false);
        });

        fireEvent.click(screen.getByRole('tab', { name: /Planilla del Plan en blanco/i }));
        fireEvent.click(screen.getByRole('button', { name: /Descargar planilla en blanco/i }));
        await waitFor(() => {
            expect(mockDownloadPlanilla).toHaveBeenCalledTimes(2);
        });
        expect(mockDownloadPlanilla).toHaveBeenLastCalledWith(
            expect.objectContaining({ plan: '17.13', includeProgress: false }),
        );
    });
});
