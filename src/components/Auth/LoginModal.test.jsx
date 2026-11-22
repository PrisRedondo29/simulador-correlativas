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

    it('invoca clearAuthError, omite opción Recordarme, llama a onConfirm y cierra al completar', async () => {
        const onClose = vi.fn();
        const onConfirm = vi.fn().mockResolvedValue({ uid: 'u1' });

        render(
            <MemoryRouter>
                <LoginModal isOpen={true} onClose={onClose} onConfirm={onConfirm} />
            </MemoryRouter>,
        );

        const legalLink = screen.getByRole('link', { name: 'Aviso legal y privacidad' });
        expect(legalLink.getAttribute('href')).toBe('/legal');
        expect(screen.queryByRole('checkbox', { name: /Recordarme/i })).toBeNull();
        expect(screen.queryByText(/Sesión activa por 24 horas/i)).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/i }));

        await waitFor(() => {
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        expect(mockClearAuthError).toHaveBeenCalledTimes(1);
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onConfirm).toHaveBeenCalledWith();
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
