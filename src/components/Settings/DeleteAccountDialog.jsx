import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

const CONFIRM_KEYWORD = 'ELIMINAR';

function DeleteAccountDialogContent({
    pendingDeletion,
    userEmail,
    isDeleting,
    errorMessage,
    busyNotice,
    onExportBackup,
    onConfirm,
    onRequestClose,
}) {
    const [confirmText, setConfirmText] = useState('');
    const [clearLocalData, setClearLocalData] = useState(() =>
        Boolean(pendingDeletion?.clearLocalData),
    );

    const isRecoveryMode = pendingDeletion?.stage === 'firestore_deleted_auth_pending';
    const isConfirmed = isRecoveryMode || confirmText.trim().toUpperCase() === CONFIRM_KEYWORD;
    const canSubmit = isConfirmed && !isDeleting;

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!canSubmit) return;
        onConfirm?.({ clearLocalData });
    };

    return (
        <div className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-triangle-exclamation text-sm" aria-hidden="true" />
                    </div>
                    <div>
                        <h2
                            id="delete-account-dialog-title"
                            className="text-base sm:text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9]"
                        >
                            {isRecoveryMode
                                ? 'Completar eliminación de cuenta'
                                : 'Eliminar cuenta y datos en la nube'}
                        </h2>
                        {userEmail && (
                            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                                Cuenta: {userEmail}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {isRecoveryMode ? (
                <div
                    role="alert"
                    className="rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/60 p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-1 leading-relaxed"
                >
                    <p className="font-semibold">
                        Tus datos en Cloud Firestore ya fueron eliminados, pero quedó pendiente dar de baja tu usuario en Firebase Auth.
                    </p>
                    {pendingDeletion?.lastErrorMessage && (
                        <p>Último detalle registrado: {pendingDeletion.lastErrorMessage}</p>
                    )}
                    <p>
                        Al reintentar, volverás a confirmar tu identidad con Google y se completará el cierre definitivo de la cuenta.
                    </p>
                </div>
            ) : (
                <div className="space-y-2.5 text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                    <p>
                        Esta acción es irreversible y ejecutará los siguientes pasos en orden:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1 text-xs">
                        <li>Reautenticación con Google para verificar tu identidad.</li>
                        <li>Eliminación definitiva de tus datos sincronizados en la nube (Cloud Firestore).</li>
                        <li>Eliminación de tu usuario en Firebase Authentication.</li>
                    </ol>
                </div>
            )}

            <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540] p-3 text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                Los mensajes enviados previamente por el formulario de contacto (EmailJS) y las métricas técnicas agregadas sin datos académicos (GA4 y registros de error sanitizados) no se borran automáticamente desde el navegador.
            </div>

            {onExportBackup && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] dark:border-[#2A3540] px-3 py-2.5 text-xs">
                    <span className="text-[#475569] dark:text-[#CBD5E1]">
                        ¿Querés conservar una copia antes de borrar?
                    </span>
                    <button
                        type="button"
                        onClick={onExportBackup}
                        disabled={isDeleting}
                        className="font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:underline cursor-pointer shrink-0 disabled:opacity-50"
                    >
                        Exportar respaldo JSON
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex items-start gap-2.5 text-xs">
                    <input
                        id="delete-account-clear-local"
                        type="checkbox"
                        checked={clearLocalData}
                        onChange={(e) => setClearLocalData(e.target.checked)}
                        disabled={isDeleting}
                        className="mt-0.5 h-4 w-4 rounded accent-red-600 cursor-pointer shrink-0"
                    />
                    <label
                        htmlFor="delete-account-clear-local"
                        className="text-[#334155] dark:text-[#CBD5E1] cursor-pointer leading-snug"
                    >
                        También borrar mi progreso, notas y Mi Agenda guardados localmente en este navegador
                    </label>
                </div>

                {!isRecoveryMode && (
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="delete-account-confirm-input"
                            className="text-xs font-semibold text-[#334155] dark:text-[#CBD5E1]"
                        >
                            Escribí <code>{CONFIRM_KEYWORD}</code> para confirmar
                        </label>
                        <input
                            id="delete-account-confirm-input"
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={CONFIRM_KEYWORD}
                            autoComplete="off"
                            spellCheck={false}
                            disabled={isDeleting}
                            className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#11171D] px-3 py-2 text-sm text-[#1E293B] dark:text-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-[#005A36]"
                        />
                    </div>
                )}

                {errorMessage && (
                    <div
                        role="alert"
                        className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2.5 text-xs text-red-700 dark:text-red-300"
                    >
                        {errorMessage}
                    </div>
                )}

                {busyNotice && (
                    <p
                        id="delete-account-busy-msg"
                        role="status"
                        aria-live="polite"
                        className="text-xs text-[#64748B] dark:text-[#94A3B8]"
                    >
                        Esperá a que finalice el proceso actual antes de cerrar esta ventana.
                    </p>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#2A3540]">
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                        {isDeleting
                            ? 'Eliminando...'
                            : isRecoveryMode
                              ? 'Reintentar baja de cuenta'
                              : 'Eliminar cuenta y datos'}
                    </button>
                    <button
                        type="button"
                        autoFocus
                        onClick={onRequestClose}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0] border border-[#E2E8F0] dark:border-[#2A3540] hover:bg-[#E2E8F0] dark:hover:bg-[#2A3540] cursor-pointer disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
}

DeleteAccountDialogContent.propTypes = {
    pendingDeletion: PropTypes.shape({
        uid: PropTypes.string,
        stage: PropTypes.string,
        clearLocalData: PropTypes.bool,
        lastErrorMessage: PropTypes.string,
    }),
    userEmail: PropTypes.string,
    isDeleting: PropTypes.bool,
    errorMessage: PropTypes.string,
    busyNotice: PropTypes.bool,
    onExportBackup: PropTypes.func,
    onConfirm: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func.isRequired,
};

export default function DeleteAccountDialog({
    isOpen,
    onClose,
    onConfirm,
    onExportBackup,
    pendingDeletion = null,
    isDeleting = false,
    errorMessage = null,
    userEmail = null,
}) {
    const dialogRef = useRef(null);
    const [busyNotice, setBusyNotice] = useState(false);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen) {
            if (!dialog.open) {
                if (typeof dialog.showModal === 'function') {
                    dialog.showModal();
                } else {
                    dialog.setAttribute('open', '');
                }
            }
        } else if (dialog.open) {
            if (typeof dialog.close === 'function') {
                dialog.close();
            } else {
                dialog.removeAttribute('open');
            }
        }
    }, [isOpen]);

    const handleCancel = (event) => {
        if (isDeleting) {
            event.preventDefault();
            setBusyNotice(true);
        }
    };

    const handleClose = () => {
        const dialog = dialogRef.current;
        if (dialog && 'returnValue' in dialog) {
            dialog.returnValue = '';
        }
        setBusyNotice(false);
        onClose?.();
    };

    const requestClose = () => {
        if (isDeleting) {
            setBusyNotice(true);
            return;
        }
        const dialog = dialogRef.current;
        if (dialog?.open && typeof dialog.close === 'function') {
            dialog.close();
        } else {
            setBusyNotice(false);
            onClose?.();
        }
    };

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="delete-account-dialog-title"
            aria-describedby={busyNotice ? 'delete-account-busy-msg' : undefined}
            onCancel={handleCancel}
            onClose={handleClose}
            className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-[#E2E8F0] dark:border-[#2A3540] bg-white dark:bg-[#161D24] p-0 text-[#1E293B] dark:text-[#F1F5F9] shadow-2xl"
        >
            {isOpen && (
                <DeleteAccountDialogContent
                    key={pendingDeletion?.stage || 'default'}
                    pendingDeletion={pendingDeletion}
                    userEmail={userEmail}
                    isDeleting={isDeleting}
                    errorMessage={errorMessage}
                    busyNotice={busyNotice}
                    onExportBackup={onExportBackup}
                    onConfirm={onConfirm}
                    onRequestClose={requestClose}
                />
            )}
        </dialog>
    );
}

DeleteAccountDialog.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    onExportBackup: PropTypes.func,
    pendingDeletion: PropTypes.shape({
        uid: PropTypes.string,
        stage: PropTypes.string,
        clearLocalData: PropTypes.bool,
        lastErrorMessage: PropTypes.string,
    }),
    isDeleting: PropTypes.bool,
    errorMessage: PropTypes.string,
    userEmail: PropTypes.string,
};
