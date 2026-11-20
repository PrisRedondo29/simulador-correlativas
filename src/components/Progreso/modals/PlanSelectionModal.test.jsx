// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const mockTrackSeleccionCarrera = vi.fn();

vi.mock('../../../services/analyticsService', () => ({
    trackSeleccionCarrera: (...args) => mockTrackSeleccionCarrera(...args),
}));

vi.mock('@heroui/react', () => ({
    Modal: ({ isOpen, children }) => (isOpen ? <div role="dialog">{children}</div> : null),
    ModalContent: ({ children }) => <div>{children}</div>,
    ModalHeader: ({ children }) => <div>{children}</div>,
    ModalBody: ({ children }) => <div>{children}</div>,
    Card: ({ children, onPress }) => (
        <button type="button" onClick={onPress}>
            {children}
        </button>
    ),
    CardBody: ({ children }) => <div>{children}</div>,
    Chip: ({ children }) => <span>{children}</span>,
}));

import PlanSelectionModal from './PlanSelectionModal';

describe('PlanSelectionModal - Selector Multi-Carrera y Plan de Estudios', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('muestra las carreras del catálogo con insignia "Próximamente" deshabilitada para carreras sin planes publicados y permite elegir un plan activo', () => {
        const onSelect = vi.fn();

        render(<PlanSelectionModal isOpen={true} onSelect={onSelect} />);

        // Muestra la carrera activa (Licenciatura en Sistemas de Información) y la carrera en preparación (Ingeniería Civil - Próximamente)
        const btnSistemas = screen.getByRole('button', {
            name: /Licenciatura en Sistemas de Información/i,
        });
        const btnCivil = screen.getByRole('button', {
            name: /Ingeniería Civil/i,
        });

        expect(btnSistemas.hasAttribute('disabled')).toBe(false);
        expect(btnCivil.hasAttribute('disabled')).toBe(true);
        expect(screen.getByText('Próximamente')).toBeTruthy();

        // Al seleccionar el Plan 17.14 dispara onSelect('17.14') y analytics
        fireEvent.click(screen.getByRole('button', { name: /17\.14/i }));
        expect(onSelect).toHaveBeenCalledWith('17.14');
        expect(mockTrackSeleccionCarrera).toHaveBeenCalledWith({
            plan: '17.14',
            origen_plan: 'welcome_modal',
        });
    });
});
