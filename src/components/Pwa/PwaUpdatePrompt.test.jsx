// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

const mockUpdateServiceWorker = vi.fn();
const mockUseAuth = vi.fn();
let mockNeedRefresh = false;

vi.mock('virtual:pwa-register/react', () => ({
    useRegisterSW: () => ({
        needRefresh: [mockNeedRefresh, vi.fn()],
        offlineReady: [false, vi.fn()],
        updateServiceWorker: mockUpdateServiceWorker,
    }),
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

vi.mock('@heroui/react', () => ({
    Button: ({ children, onPress, isDisabled }) => (
        <button type="button" disabled={isDisabled} onClick={onPress}>
            {children}
        </button>
    ),
}));

import PwaUpdatePrompt from './PwaUpdatePrompt';

describe('PwaUpdatePrompt - Actualización diferida segura integrada con AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNeedRefresh = false;
        mockUpdateServiceWorker.mockResolvedValue(undefined);
        mockUseAuth.mockReturnValue({
            syncState: { status: 'synced', isOnline: true },
            showSyncModal: false,
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('no interrumpe mientras syncState está syncing o mientras hay un conflicto abierto', () => {
        mockNeedRefresh = true;
        mockUseAuth.mockReturnValue({
            syncState: { status: 'syncing', isOnline: true },
            showSyncModal: false,
        });

        const { rerender } = render(<PwaUpdatePrompt />);
        expect(screen.queryByText('Nueva versión disponible')).toBeNull();

        mockUseAuth.mockReturnValue({
            syncState: { status: 'conflict', isOnline: true },
            showSyncModal: true,
        });
        rerender(<PwaUpdatePrompt />);
        expect(screen.queryByText('Nueva versión disponible')).toBeNull();
    });

    it('difiere el aviso mientras el usuario escribe en un input y aparece al salir del campo', () => {
        mockNeedRefresh = true;
        mockUseAuth.mockReturnValue({
            syncState: { status: 'pending', isOnline: true },
            showSyncModal: false,
        });

        render(
            <div>
                <input aria-label="Nota de cursada" type="text" />
                <button type="button">Afuera</button>
                <PwaUpdatePrompt />
            </div>,
        );

        const input = screen.getByLabelText('Nota de cursada');
        const outsideBtn = screen.getByRole('button', { name: 'Afuera' });

        act(() => {
            input.focus();
            fireEvent.focusIn(input);
        });
        expect(screen.queryByText('Nueva versión disponible')).toBeNull();

        act(() => {
            outsideBtn.focus();
            fireEvent.focusIn(outsideBtn);
        });
        expect(screen.getByText('Nueva versión disponible')).toBeTruthy();
        expect(screen.getByText(/cambios locales pendientes seguirán guardados/i)).toBeTruthy();
    });

    it('permite aplicar la actualización manualmente o posponerla con "Más tarde"', async () => {
        mockNeedRefresh = true;
        render(<PwaUpdatePrompt />);

        expect(screen.getByText('Nueva versión disponible')).toBeTruthy();

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Actualizar ahora' }));
        });
        expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true);

        fireEvent.click(screen.getByRole('button', { name: 'Más tarde' }));
        expect(screen.queryByText('Nueva versión disponible')).toBeNull();
    });
});
