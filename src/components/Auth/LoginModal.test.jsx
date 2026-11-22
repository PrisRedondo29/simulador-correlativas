// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let mockAuthError = null;
const mockClearAuthError = vi.fn();

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        authError: mockAuthError,
        clearAuthError: mockClearAuthError,
    }),
}));

vi.mock('@heroui/react', () => ({
    Modal: ({ isOpen, children }) => (isOpen ? <div role="dialog">{children}</div> : null),
    ModalContent: ({ children }) => <div>{children}</div>,
    ModalHeader: ({ children }) => <div>{children}</div>,
    ModalBody: ({ children }) => <div>{children}</div>,
    ModalFooter: ({ children }) => <div>{children}</div>,
    Button: ({ children, onPress }) => (
        <button type="button" onClick={onPress}>
            {children}
        </button>
    ),
    Switch: ({ isSelected, onValueChange }) => (
        <input
            type="checkbox"
            aria-label="Recordarme"
            checked={Boolean(isSelected)}
            onChange={(e) => onValueChange?.(e.target.checked)}
        />
    ),
}));

import LoginModal from './LoginModal';

describe('LoginModal - Flujo de inicio de sesión y manejo de errores', () => {
    beforeEach(() => {
        mockAuthError = null;
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('invoca clearAuthError, pasa rememberMe a onConfirm y cierra al completar', async () => {
        const onClose = vi.fn();
        const onConfirm = vi.fn().mockResolvedValue({ uid: 'u1' });

        render(
            <MemoryRouter>
                <LoginModal isOpen={true} onClose={onClose} onConfirm={onConfirm} />
            </MemoryRouter>,
        );

        const legalLink = screen.getByRole('link', { name: 'Aviso legal y privacidad' });
        expect(legalLink.getAttribute('href')).toBe('/legal');

        fireEvent.click(screen.getByRole('checkbox', { name: /Recordarme/i }));
        fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/i }));

        await waitFor(() => {
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        expect(mockClearAuthError).toHaveBeenCalledTimes(1);
        expect(onConfirm).toHaveBeenCalledWith(true);
    });

    it('si onConfirm rechaza, no propaga excepción, no cierra el modal y rehabilita el botón', async () => {
        const onClose = vi.fn();
        const onConfirm = vi.fn().mockRejectedValue(new Error('auth/popup-closed-by-user'));
        mockAuthError = 'Se cerró la ventana antes de completar el inicio de sesión.';

        render(
            <MemoryRouter>
                <LoginModal isOpen={true} onClose={onClose} onConfirm={onConfirm} />
            </MemoryRouter>,
        );

        expect(screen.getByText(mockAuthError)).toBeTruthy();

        const loginBtn = screen.getByRole('button', { name: /Continuar con Google/i });
        fireEvent.click(loginBtn);

        await waitFor(() => {
            expect(onConfirm).toHaveBeenCalledTimes(1);
            expect(loginBtn.hasAttribute('disabled')).toBe(false);
        });

        expect(onClose).not.toHaveBeenCalled();
    });
});
