// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockSend = vi.fn();
const mockAddToast = vi.fn();

vi.mock('@emailjs/browser', () => ({
    default: {
        send: (...args) => mockSend(...args),
    },
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { uid: 'user-123' },
    }),
}));

vi.mock('@heroui/react', () => ({
    addToast: (...args) => mockAddToast(...args),
    Card: ({ children, className }) => <div className={className}>{children}</div>,
    CardBody: ({ children, className }) => <div className={className}>{children}</div>,
    Form: React.forwardRef(({ children, onSubmit, className }, ref) => (
        <form ref={ref} onSubmit={onSubmit} className={className}>
            {children}
        </form>
    )),
    Input: ({ name, label, type = 'text', isRequired, autoComplete, autoCorrect, autoCapitalize, spellCheck }) => (
        <div>
            <label htmlFor={`input-${name}`}>{label}</label>
            <input
                id={`input-${name}`}
                name={name}
                type={type}
                required={Boolean(isRequired)}
                autoComplete={autoComplete}
                autoCorrect={autoCorrect}
                autoCapitalize={autoCapitalize}
                spellCheck={spellCheck}
            />
        </div>
    ),
    Textarea: ({ name, label, isRequired }) => (
        <div>
            <label htmlFor={`textarea-${name}`}>{label}</label>
            <textarea id={`textarea-${name}`} name={name} required={Boolean(isRequired)} />
        </div>
    ),
    Button: ({ children, type = 'button', isLoading, 'aria-describedby': ariaDescribedBy, endContent }) => (
        <button type={type} disabled={Boolean(isLoading)} aria-describedby={ariaDescribedBy}>
            {children}
            {endContent}
        </button>
    ),
}));

import ContactForm from './ContactForm';

describe('ContactForm - Aviso previo y control de diagnóstico técnico', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSend.mockResolvedValue({ status: 200 });
    });

    afterEach(() => {
        cleanup();
    });

    it('informa antes de enviar qué metadatos adjunta, enlaza /legal y respeta el opt-out', async () => {
        render(
            <MemoryRouter>
                <ContactForm />
            </MemoryRouter>,
        );

        expect(document.body.textContent).toMatch(/UID de tu cuenta.*navegador.*sistema operativo/i);
        const legalLink = screen.getByRole('link', { name: 'Aviso legal y privacidad' });
        expect(legalLink.getAttribute('href')).toBe('/legal');

        const diagCheckbox = screen.getByRole('checkbox', {
            name: /Adjuntar información técnica de diagnóstico/i,
        });
        expect(diagCheckbox.checked).toBe(true);

        const emailInput = screen.getByLabelText('Correo electrónico');
        expect(emailInput.getAttribute('autocomplete')).toBe('email');

        fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });
        fireEvent.change(emailInput, { target: { value: 'ana@ejemplo.com' } });
        fireEvent.change(screen.getByLabelText('Mensaje'), {
            target: { value: 'Error al exportar planilla' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Enviar mensaje/i }));

        await waitFor(() => {
            expect(mockSend).toHaveBeenCalledTimes(1);
        });
        expect(mockSend.mock.calls[0][2].message).toContain('--- Información de Diagnóstico ---');
        expect(mockSend.mock.calls[0][2].message).toContain('UID: user-123');

        // Al desmarcar el checkbox, no adjunta UID ni metadatos técnicos
        fireEvent.click(diagCheckbox);
        expect(diagCheckbox.checked).toBe(false);

        fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });
        fireEvent.change(emailInput, { target: { value: 'ana@ejemplo.com' } });
        fireEvent.change(screen.getByLabelText('Mensaje'), {
            target: { value: 'Consulta general sin diagnóstico' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Enviar mensaje/i }));

        await waitFor(() => {
            expect(mockSend).toHaveBeenCalledTimes(2);
        });
        expect(mockSend.mock.calls[1][2].message).toBe('Consulta general sin diagnóstico');
    });
});
