// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import storageRepository, { CURRENT_ONBOARDING_VERSION } from '../../services/storageRepository';
import { CURRENT_RELEASE_VERSION } from '../../config/releaseNotes';

vi.mock('@heroui/react', () => {
    const Modal = ({ isOpen, children }) => (isOpen ? <div role="dialog">{children}</div> : null);
    const ModalContent = ({ children }) => (
        <div>{typeof children === 'function' ? children(() => {}) : children}</div>
    );
    const ModalHeader = ({ children }) => <div>{children}</div>;
    const ModalBody = ({ children }) => <div>{children}</div>;
    const ModalFooter = ({ children }) => <div>{children}</div>;
    const Chip = ({ children }) => <span>{children}</span>;
    const Button = ({ children, onPress }) => (
        <button type="button" onClick={onPress}>
            {children}
        </button>
    );
    return { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip, Button };
});

import WhatsNewModal from './WhatsNewModal';

function PathSpy() {
    const { pathname } = useLocation();
    return <span data-testid="path-spy">{pathname}</span>;
}

describe('WhatsNewModal - Novedades 2.0.0 para usuarios recurrentes vs nuevos', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    afterEach(() => {
        cleanup();
    });

    it('no se muestra durante onboarding ni para usuarios completamente nuevos', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <WhatsNewModal />
            </MemoryRouter>,
        );

        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('se muestra una sola vez para usuarios existentes, persiste la versión vista y navega al pulsar CTA', () => {
        storageRepository.setOnboardingVersionCompleted(CURRENT_ONBOARDING_VERSION, { silent: true });

        const { unmount } = render(
            <MemoryRouter initialEntries={['/']}>
                <PathSpy />
                <WhatsNewModal />
            </MemoryRouter>,
        );

        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(screen.getByText(/Versión 2\.0\.0/i)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Abrir Mi Agenda/i }));

        expect(storageRepository.getLastSeenReleaseVersion()).toBe(CURRENT_RELEASE_VERSION);
        expect(screen.getByTestId('path-spy').textContent).toBe('/mi-agenda');
        expect(screen.queryByRole('dialog')).toBeNull();

        // Al recargar / volver a montar no reaparece
        unmount();
        render(
            <MemoryRouter initialEntries={['/']}>
                <WhatsNewModal />
            </MemoryRouter>,
        );
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
