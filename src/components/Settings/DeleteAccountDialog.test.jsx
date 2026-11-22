// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import DeleteAccountDialog from './DeleteAccountDialog';

describe('DeleteAccountDialog - Diálogo nativo <dialog> y recuperación de baja parcial', () => {
    afterEach(() => {
        cleanup();
    });

    it('usa <dialog> nativo sin role/aria-modal redundante, exige escribir ELIMINAR y pasa la opción de borrado local', () => {
        const onClose = vi.fn();
        const onConfirm = vi.fn();
        const onExportBackup = vi.fn();

        const { container } = render(
            <DeleteAccountDialog
                isOpen={true}
                onClose={onClose}
                onConfirm={onConfirm}
                onExportBackup={onExportBackup}
                userEmail="est@unlu.edu.ar"
            />,
        );

        const dialog = container.querySelector('dialog');
        expect(dialog).toBeTruthy();
        expect(dialog?.getAttribute('role')).toBeNull();
        expect(dialog?.getAttribute('aria-modal')).toBeNull();
        expect(dialog?.getAttribute('aria-labelledby')).toBe('delete-account-dialog-title');

        expect(document.body.textContent).toMatch(/EmailJS/i);
        expect(document.body.textContent).toMatch(/GA4/i);

        const submitBtn = screen.getByRole('button', { name: 'Eliminar cuenta y datos' });
        expect(submitBtn.hasAttribute('disabled')).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: 'Exportar respaldo JSON' }));
        expect(onExportBackup).toHaveBeenCalledTimes(1);

        const localCheckbox = screen.getByRole('checkbox', {
            name: /También borrar mi progreso/i,
        });
        expect(localCheckbox.checked).toBe(false);
        fireEvent.click(localCheckbox);
        expect(localCheckbox.checked).toBe(true);

        const confirmInput = screen.getByLabelText(/Escribí/i);
        fireEvent.change(confirmInput, { target: { value: 'eliminar' } });
        expect(submitBtn.hasAttribute('disabled')).toBe(false);

        fireEvent.click(submitBtn);
        expect(onConfirm).toHaveBeenCalledWith({ clearLocalData: true });
    });

    it('en modo recuperación ante fallo parcial permite reintentar directamente sin reescribir ELIMINAR', () => {
        const onConfirm = vi.fn();

        render(
            <DeleteAccountDialog
                isOpen={true}
                onClose={vi.fn()}
                onConfirm={onConfirm}
                pendingDeletion={{
                    uid: 'u1',
                    stage: 'firestore_deleted_auth_pending',
                    clearLocalData: false,
                    lastErrorMessage: 'Reautenticación vencida',
                }}
                errorMessage="Fallo en Auth"
            />,
        );

        expect(screen.getByText(/Tus datos en Cloud Firestore ya fueron eliminados/i)).toBeTruthy();
        expect(screen.getByText(/Reautenticación vencida/i)).toBeTruthy();
        expect(screen.getByText('Fallo en Auth')).toBeTruthy();
        expect(screen.queryByPlaceholderText('ELIMINAR')).toBeNull();

        const retryBtn = screen.getByRole('button', { name: 'Reintentar baja de cuenta' });
        expect(retryBtn.hasAttribute('disabled')).toBe(false);
        fireEvent.click(retryBtn);
        expect(onConfirm).toHaveBeenCalledWith({ clearLocalData: false });
    });
});
