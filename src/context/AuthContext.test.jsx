// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup } from '@testing-library/react';
import storageRepository, { STORAGE_KEYS } from '../services/storageRepository';
import {
    SYNC_STATUS,
    buildExportBackupPayload,
    computeBundleHash,
} from '../utils/Sync/syncStateMachine';

// ─── Mocks exclusivos del borde Firebase / red / toast ────────────────────────
let authObserverCallback = null;

const mockFetchCloudBundle = vi.fn();
const mockUploadAcademicSnapshot = vi.fn();
const mockGetUserData = vi.fn();
const mockGetUserRole = vi.fn();
const mockDeleteUserCloudData = vi.fn();
const mockLogout = vi.fn();
const mockReauthenticateWithGoogle = vi.fn();
const mockDeleteCurrentAuthUser = vi.fn();
const mockAddToast = vi.fn();

vi.mock('firebase/auth', () => ({
    onAuthStateChanged: (_auth, cb) => {
        authObserverCallback = cb;
        return () => {
            authObserverCallback = null;
        };
    },
}));

vi.mock('../services/firebase', () => ({
    auth: {},
    db: {},
}));

vi.mock('../services/authService', () => ({
    loginConGoogle: vi.fn(),
    logout: (...args) => mockLogout(...args),
    reauthenticateWithGoogle: (...args) => mockReauthenticateWithGoogle(...args),
    deleteCurrentAuthUser: (...args) => mockDeleteCurrentAuthUser(...args),
}));

vi.mock('../services/logService', () => ({
    logError: vi.fn(),
}));

vi.mock('../services/analyticsService', () => ({
    syncAnalyticsAuthUser: vi.fn(),
    trackAccountDeleted: vi.fn(),
    trackLogin: vi.fn(),
    trackLogout: vi.fn(),
}));

vi.mock('../services/dbService', () => ({
    getUserData: (...args) => mockGetUserData(...args),
    getUserRole: (...args) => mockGetUserRole(...args),
    deleteUserCloudData: (...args) => mockDeleteUserCloudData(...args),
}));

// Mantenemos adoptRemoteSnapshot y claimLocalSnapshotForAccount REALES de syncService
vi.mock('../services/syncService', async () => {
    const actual = await vi.importActual('../services/syncService');
    return {
        ...actual,
        fetchCloudBundle: (...args) => mockFetchCloudBundle(...args),
        uploadAcademicSnapshot: (...args) => mockUploadAcademicSnapshot(...args),
    };
});

// Mock liviano de @heroui/react para probar el comportamiento real de SyncModal y SyncStatusMenu en happy-dom
vi.mock('@heroui/react', () => ({
    addToast: (...args) => mockAddToast(...args),
    Spinner: () => <span data-testid="spinner" />,
    Popover: ({ children }) => <div>{children}</div>,
    PopoverTrigger: ({ children }) => <div>{children}</div>,
    PopoverContent: ({ children }) => <div>{children}</div>,
    Modal: ({ isOpen, children }) => (isOpen ? <div role="dialog">{children}</div> : null),
    ModalContent: ({ children }) => <div>{children}</div>,
    ModalHeader: ({ children }) => <div>{children}</div>,
    ModalBody: ({ children }) => <div>{children}</div>,
    ModalFooter: ({ children }) => <div>{children}</div>,
    Button: ({ children, onPress, isDisabled, className, 'aria-label': ariaLabel }) => (
        <button
            type="button"
            disabled={isDisabled}
            onClick={onPress}
            className={className}
            aria-label={ariaLabel}
        >
            {children}
        </button>
    ),
}));

import { AuthProvider, useAuth } from './AuthContext';
import SyncModal from '../components/SyncModal';
import SyncStatusMenu from '../components/Sync/SyncStatusMenu';

function createActiveSession() {
    window.localStorage.setItem(
        'auth_session',
        JSON.stringify({ expiry: Date.now() + 60 * 60 * 1000, rememberMe: true }),
    );
}

function makeCloudResponse(bundle, syncRevision = 1, rawDoc = null) {
    return {
        exists: true,
        syncRevision,
        bundle,
        hash: computeBundleHash(bundle),
        isEmpty:
            Object.keys(bundle.progreso || {}).length === 0 &&
            Object.keys(bundle.cursada || {}).length === 0 &&
            Object.keys(bundle.simulaciones || {}).length === 0,
        config: rawDoc?.config ?? null,
        rawDoc: rawDoc ?? { uid: 'uid-1', syncRevision, progreso: bundle.progreso },
    };
}

function AuthHarness({ onAuth }) {
    const ctx = useAuth();
    React.useEffect(() => {
        onAuth(ctx);
    }, [ctx, onAuth]);

    return (
        <div>
            <span data-testid="sync-status">{ctx.syncState.status}</span>
            <span data-testid="sync-online">{String(ctx.syncState.isOnline)}</span>
            <span data-testid="sync-revision">{String(ctx.syncState.syncRevision)}</span>
            <span data-testid="show-modal">{String(ctx.showSyncModal)}</span>
            <span data-testid="has-backup">{String(Boolean(ctx.recoveryBackup))}</span>
            <span data-testid="alias">{ctx.userData?.config?.alias || ''}</span>
        </div>
    );
}

function renderWithAuth({ includeStatusMenu = false } = {}) {
    const authBox = { current: null };
    const handleAuth = (ctx) => {
        authBox.current = ctx;
    };
    render(
        <AuthProvider>
            <SyncModal />
            {includeStatusMenu && <SyncStatusMenu plan="17.14" variant="light-bar" />}
            <AuthHarness onAuth={handleAuth} />
        </AuthProvider>,
    );
    return authBox;
}

describe('AuthContext + SyncModal - Integración React completa (Etapa 6A.2)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        authObserverCallback = null;
        mockGetUserRole.mockResolvedValue('user');
        mockLogout.mockResolvedValue(undefined);
        Object.defineProperty(window.navigator, 'onLine', {
            configurable: true,
            value: true,
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('al iniciar sesión con datos divergentes NO sobrescribe localStorage, abre SyncModal y al elegir nube crea backup de recuperación', async () => {
        createActiveSession();
        storageRepository.setProgreso('17.14', { '11071': 'Aprobado' }, { silent: true });

        const remoteBundle = {
            progreso: { '17.14': { '11071': 'Aprobado', '11072': 'Promocionado' } },
            progresoDetalles: {},
            cursada: {},
            simulaciones: {},
        };
        mockFetchCloudBundle.mockResolvedValue(makeCloudResponse(remoteBundle, 5));

        renderWithAuth();

        await act(async () => {
            await authObserverCallback({ uid: 'uid-1', email: 'estudiante@unlu.edu.ar' });
        });

        // 1. Se abre el modal de conflicto y localStorage sigue 100% intacto
        expect(screen.getByTestId('sync-status').textContent).toBe(SYNC_STATUS.CONFLICT);
        expect(screen.getByTestId('show-modal').textContent).toBe('true');
        expect(
            screen.getByText('Diferencias entre este dispositivo y la nube'),
        ).toBeTruthy();
        expect(storageRepository.getProgreso('17.14')).toEqual({ '11071': 'Aprobado' });

        // 2. El estudiante hace clic en "Usar datos de la nube"
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Usar datos de la nube/i }));
        });

        await waitFor(() => {
            expect(screen.getByTestId('sync-status').textContent).toBe(SYNC_STATUS.SYNCED);
        });
        expect(screen.getByTestId('show-modal').textContent).toBe('false');
        expect(screen.getByTestId('has-backup').textContent).toBe('true');
        expect(storageRepository.getProgreso('17.14')).toEqual({
            '11071': 'Aprobado',
            '11072': 'Promocionado',
        });
        expect(storageRepository.getRecoveryBackup()?.bundle.progreso['17.14']).toEqual({
            '11071': 'Aprobado',
        });
    });

    it('al cambiar de cuenta (account_mismatch) muestra el diálogo específico de identidad y al conservar localmente reasigna propiedad sin perder datos', async () => {
        createActiveSession();
        storageRepository.setProgreso('17.14', { '11071': 'Aprobado' }, { silent: true });
        storageRepository.setSyncMeta(
            {
                syncRevision: 3,
                lastSyncedHash: computeBundleHash(storageRepository.readAcademicBundle()),
                lastSyncedUid: 'uid-cuenta-A',
                lastSyncedAt: '2026-11-19T12:00:00Z',
            },
            { silent: true },
        );

        const cloudB = {
            progreso: { '17.14': { '11074': 'Regular' } },
            progresoDetalles: {},
            cursada: {},
            simulaciones: {},
        };
        mockFetchCloudBundle.mockResolvedValue(makeCloudResponse(cloudB, 2));

        renderWithAuth();

        await act(async () => {
            await authObserverCallback({ uid: 'uid-cuenta-B', email: 'cuentab@unlu.edu.ar' });
        });

        expect(screen.getByTestId('sync-status').textContent).toBe(SYNC_STATUS.ACCOUNT_MISMATCH);
        expect(screen.getByText('Datos de otra cuenta en este dispositivo')).toBeTruthy();

        // Elegir conservar localmente y subir más tarde
        await act(async () => {
            fireEvent.click(
                screen.getByRole('button', { name: /Conservar este dispositivo y subir más tarde/i }),
            );
        });

        await waitFor(() => {
            expect(screen.getByTestId('sync-status').textContent).toBe(SYNC_STATUS.PENDING);
        });
        expect(screen.getByTestId('show-modal').textContent).toBe('false');
        expect(storageRepository.getSyncMeta()?.lastSyncedUid).toBe('uid-cuenta-B');
        expect(storageRepository.getSyncMeta()?.syncRevision).toBe(2);
        expect(storageRepository.getProgreso('17.14')).toEqual({ '11071': 'Aprobado' });
    });

    it('regresiones 6A.2: setSimulacionLocal guarda solo local (pasa a pending sin escribir Firestore) y refetchUserData refresca alias sin borrar progreso local', async () => {
        createActiveSession();
        const syncedBundle = {
            progreso: { '17.14': { '11071': 'Aprobado' } },
            progresoDetalles: {},
            cursada: {},
            simulaciones: {},
        };
        storageRepository.setProgreso('17.14', { '11071': 'Aprobado' }, { silent: true });
        mockFetchCloudBundle.mockResolvedValue(
            makeCloudResponse(syncedBundle, 4, {
                uid: 'uid-1',
                syncRevision: 4,
                config: { alias: 'Pris' },
            }),
        );

        const authBox = renderWithAuth();

        await act(async () => {
            await authObserverCallback({ uid: 'uid-1', email: 'estudiante@unlu.edu.ar' });
        });
        expect(screen.getByTestId('sync-status').textContent).toBe(SYNC_STATUS.SYNCED);
        expect(screen.getByTestId('alias').textContent).toBe('Pris');

        // 1. Guardar simulación local NO dispara subida inmediata a la nube y marca pending automáticamente
        act(() => {
            authBox.current.setSimulacionLocal('17.14', { anioFinal: 2029, historial: [] });
        });

        expect(mockUploadAcademicSnapshot).not.toHaveBeenCalled();
        expect(storageRepository.getSimulacion('17.14')).toEqual({ anioFinal: 2029, historial: [] });
        expect(screen.getByTestId('sync-status').textContent).toBe(SYNC_STATUS.PENDING);

        // 2. refetchUserData (como hace SettingsPage tras guardar alias) actualiza alias SIN pisar local
        mockGetUserData.mockResolvedValue({
            uid: 'uid-1',
            syncRevision: 4,
            config: { alias: 'Priscila UNLu' },
            progreso: { '17.14': { '11071': 'Aprobado' } },
        });

        await act(async () => {
            await authBox.current.refetchUserData();
        });

        expect(screen.getByTestId('alias').textContent).toBe('Priscila UNLu');
        expect(storageRepository.getSimulacion('17.14')).toEqual({ anioFinal: 2029, historial: [] });
        expect(screen.getByTestId('sync-status').textContent).toBe(SYNC_STATUS.PENDING);
    });

    it('conectividad ortogonal (offline/online) conserva estado pending y bloquea intentos de subida sin red', async () => {
        createActiveSession();
        const syncedBundle = {
            progreso: { '17.14': { '11071': 'Aprobado' } },
            progresoDetalles: {},
            cursada: {},
            simulaciones: {},
        };
        storageRepository.setProgreso('17.14', { '11071': 'Aprobado' }, { silent: true });
        mockFetchCloudBundle.mockResolvedValue(makeCloudResponse(syncedBundle, 2));

        const authBox = renderWithAuth({ includeStatusMenu: true });
        await act(async () => {
            await authObserverCallback({ uid: 'uid-1', email: 'estudiante@unlu.edu.ar' });
        });

        // Editamos localmente -> pending y SyncStatusMenu refleja "Cambios locales sin subir"
        act(() => {
            authBox.current.updateAuthProgreso('17.14', { '11071': 'Aprobado', '11072': 'Cursando' });
        });
        expect(screen.getByTestId('sync-status').textContent).toBe(SYNC_STATUS.PENDING);
        expect(screen.getByText('Cambios locales sin subir')).toBeTruthy();

        // Se corta internet -> sigue siendo pending con isOnline: false y SyncStatusMenu muestra "Offline" + pendiente
        act(() => {
            window.dispatchEvent(new Event('offline'));
        });
        expect(screen.getByTestId('sync-status').textContent).toBe(SYNC_STATUS.PENDING);
        expect(screen.getByTestId('sync-online').textContent).toBe('false');
        expect(screen.getByText('Cambios pendientes (sin conexión)')).toBeTruthy();
        expect(screen.getByText('Offline')).toBeTruthy();

        // Intentar subir offline no llama a Firestore ni cambia el estado a error/synced
        let offlineRes;
        await act(async () => {
            offlineRes = await authBox.current.saveToCloud();
        });
        expect(offlineRes.code).toBe('sync/offline');
        expect(mockUploadAcademicSnapshot).not.toHaveBeenCalled();
        expect(screen.getByTestId('sync-status').textContent).toBe(SYNC_STATUS.PENDING);

        // Vuelve internet -> sigue pending listo para subir
        act(() => {
            window.dispatchEvent(new Event('online'));
        });
        expect(screen.getByTestId('sync-online').textContent).toBe('true');
        expect(screen.getByTestId('sync-status').textContent).toBe(SYNC_STATUS.PENDING);
    });

    it('saveToCloud ante conflicto de revisión remota abre SyncModal v11 y al confirmar sube usando baseRevision 11', async () => {
        createActiveSession();
        storageRepository.setProgreso('17.14', { '11071': 'Aprobado' }, { silent: true });
        mockFetchCloudBundle.mockResolvedValue(
            makeCloudResponse(
                {
                    progreso: { '17.14': { '11071': 'Aprobado' } },
                    progresoDetalles: {},
                    cursada: {},
                    simulaciones: {},
                },
                10,
            ),
        );

        const authBox = renderWithAuth();
        await act(async () => {
            await authObserverCallback({ uid: 'uid-1', email: 'estudiante@unlu.edu.ar' });
        });

        act(() => {
            authBox.current.updateAuthProgreso('17.14', { '11071': 'Aprobado', '11073': 'Aprobado' });
        });

        // Primer intento recibe conflicto optimista (otro dispositivo publicó v11)
        const remoteV11 = {
            progreso: { '17.14': { '11071': 'Aprobado', '11074': 'Aprobado' } },
            progresoDetalles: {},
            cursada: {},
            simulaciones: {},
        };
        mockUploadAcademicSnapshot.mockResolvedValueOnce({
            status: 'conflict',
            reason: 'revision_conflict',
            remoteRevision: 11,
            remoteBundle: remoteV11,
            remoteHash: computeBundleHash(remoteV11),
            nextStatus: SYNC_STATUS.CONFLICT,
        });

        await act(async () => {
            await authBox.current.saveToCloud();
        });

        expect(screen.getByTestId('show-modal').textContent).toBe('true');
        expect(screen.getByText('Hay una versión más reciente en la nube')).toBeTruthy();

        // Usuario elige "Conservar este dispositivo y subir" -> reintenta con expectedRevision: 11
        const localHashNow = computeBundleHash(storageRepository.readAcademicBundle());
        mockUploadAcademicSnapshot.mockResolvedValueOnce({
            status: 'synced',
            syncRevision: 12,
            uploadedHash: localHashNow,
            currentLocalHash: localHashNow,
            hasConcurrentLocalEdits: false,
            syncedAt: '2026-11-20T16:00:00Z',
            nextStatus: SYNC_STATUS.SYNCED,
        });

        await act(async () => {
            fireEvent.click(
                screen.getByRole('button', { name: /Conservar este dispositivo y subir$/i }),
            );
        });

        await waitFor(() => {
            expect(screen.getByTestId('sync-status').textContent).toBe(SYNC_STATUS.SYNCED);
        });
        expect(mockUploadAcademicSnapshot).toHaveBeenLastCalledWith(
            'uid-1',
            expect.objectContaining({ expectedRevision: 11 }),
        );
        expect(screen.getByTestId('sync-revision').textContent).toBe('12');
    });

    it('reacciona a eventos nativos storage de otra pestaña actualizando revisión y estado sin recargar', async () => {
        createActiveSession();
        storageRepository.setProgreso('17.14', { '11071': 'Aprobado' }, { silent: true });
        mockFetchCloudBundle.mockResolvedValue(
            makeCloudResponse(
                {
                    progreso: { '17.14': { '11071': 'Aprobado' } },
                    progresoDetalles: {},
                    cursada: {},
                    simulaciones: {},
                },
                2,
            ),
        );

        renderWithAuth();
        await act(async () => {
            await authObserverCallback({ uid: 'uid-1', email: 'estudiante@unlu.edu.ar' });
        });
        expect(screen.getByTestId('sync-revision').textContent).toBe('2');

        // Otra pestaña guarda progreso nuevo y actualiza SYNC_META a v3
        const tab2Progreso = { '11071': 'Aprobado', '11072': 'Aprobado' };
        window.localStorage.setItem(STORAGE_KEYS.progreso('17.14'), JSON.stringify(tab2Progreso));
        const newHash = computeBundleHash(storageRepository.readAcademicBundle());
        window.localStorage.setItem(
            STORAGE_KEYS.SYNC_META,
            JSON.stringify({
                syncRevision: 3,
                lastSyncedHash: newHash,
                lastSyncedUid: 'uid-1',
                lastSyncedAt: '2026-11-20T16:10:00Z',
            }),
        );

        act(() => {
            window.dispatchEvent(
                new StorageEvent('storage', { key: STORAGE_KEYS.SYNC_META }),
            );
        });

        expect(screen.getByTestId('sync-revision').textContent).toBe('3');
        expect(screen.getByTestId('sync-status').textContent).toBe(SYNC_STATUS.SYNCED);
    });

    it('importBackupJson respalda el estado actual, importa los 4 módulos y permite restaurar desde SyncStatusMenu', async () => {
        createActiveSession();
        storageRepository.setProgreso('17.14', { '11071': 'Aprobado' }, { silent: true });
        mockFetchCloudBundle.mockResolvedValue(
            makeCloudResponse(
                {
                    progreso: { '17.14': { '11071': 'Aprobado' } },
                    progresoDetalles: {},
                    cursada: {},
                    simulaciones: {},
                },
                1,
            ),
        );

        const authBox = renderWithAuth({ includeStatusMenu: true });
        await act(async () => {
            await authObserverCallback({ uid: 'uid-1', email: 'estudiante@unlu.edu.ar' });
        });

        // Rechaza JSON corrupto sin tocar datos locales
        let badRes;
        act(() => {
            badRes = authBox.current.importBackupJson('{corrupto');
        });
        expect(badRes.ok).toBe(false);
        expect(storageRepository.getProgreso('17.14')).toEqual({ '11071': 'Aprobado' });

        // Importa respaldo válido
        const importedPayload = buildExportBackupPayload(
            {
                progreso: { '17.14': { '11071': 'Aprobado', '11075': 'Regular' } },
                progresoDetalles: { '17.14': { '11071': { notaFinal: 10 } } },
                cursada: {
                    '17.14': {
                        horarios: [],
                        eventos: [{ id: 'e1', titulo: 'Parcial', tipo: 'parcial', fecha: '2026-12-01' }],
                        bitacora: [],
                    },
                },
                simulaciones: { '17.14': { anioFinal: 2028 } },
            },
            { planActivo: '17.14' },
        );

        let importRes;
        act(() => {
            importRes = authBox.current.importBackupJson(JSON.stringify(importedPayload));
        });
        expect(importRes.ok).toBe(true);
        expect(importRes.backedUp).toBe(true);
        expect(storageRepository.getProgreso('17.14')).toEqual({
            '11071': 'Aprobado',
            '11075': 'Regular',
        });
        expect(screen.getByTestId('sync-status').textContent).toBe(SYNC_STATUS.PENDING);

        // Restaurar la copia previa haciendo clic directo en "Restaurar copia anterior" del SyncStatusMenu
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: /Restaurar copia anterior/i }));
        });
        expect(storageRepository.getProgreso('17.14')).toEqual({ '11071': 'Aprobado' });
    });

    it('deleteAccount (flujo feliz): reautentica, borra Firestore y Auth conservando o limpiando localStorage según opción', async () => {
        createActiveSession();
        storageRepository.setProgreso('17.14', { '11071': 'Aprobado' }, { silent: true });
        mockFetchCloudBundle.mockResolvedValue(
            makeCloudResponse(
                {
                    progreso: { '17.14': { '11071': 'Aprobado' } },
                    progresoDetalles: {},
                    cursada: {},
                    simulaciones: {},
                },
                2,
            ),
        );
        mockReauthenticateWithGoogle.mockResolvedValue({ user: { uid: 'uid-1' } });
        mockDeleteUserCloudData.mockResolvedValue(undefined);
        mockDeleteCurrentAuthUser.mockResolvedValue(undefined);

        const authBox = renderWithAuth();
        await act(async () => {
            await authObserverCallback({ uid: 'uid-1', email: 'estudiante@unlu.edu.ar' });
        });

        let resKeepLocal;
        await act(async () => {
            resKeepLocal = await authBox.current.deleteAccount({ clearLocalData: false });
        });

        expect(resKeepLocal).toEqual({
            ok: true,
            status: 'completed',
            firestoreDeleted: true,
            authDeleted: true,
            localCleared: false,
        });
        expect(mockReauthenticateWithGoogle).toHaveBeenCalledTimes(1);
        expect(mockDeleteUserCloudData).toHaveBeenCalledWith('uid-1');
        expect(mockDeleteCurrentAuthUser).toHaveBeenCalledTimes(1);
        expect(storageRepository.getPendingAccountDeletion()).toBeNull();
        expect(storageRepository.getSyncMeta()).toBeNull();
        expect(storageRepository.getProgreso('17.14')).toEqual({ '11071': 'Aprobado' });
        expect(authBox.current.isAuthenticated).toBe(false);

        // Segunda sesión eligiendo clearLocalData: true -> también limpia progreso local y backup
        createActiveSession();
        mockFetchCloudBundle.mockResolvedValue(
            makeCloudResponse(
                {
                    progreso: { '17.14': { '11071': 'Aprobado' } },
                    progresoDetalles: {},
                    cursada: {},
                    simulaciones: {},
                },
                3,
            ),
        );
        await act(async () => {
            await authObserverCallback({ uid: 'uid-2', email: 'dos@unlu.edu.ar' });
        });

        let resClearAll;
        await act(async () => {
            resClearAll = await authBox.current.deleteAccount({ clearLocalData: true });
        });

        expect(resClearAll?.localCleared).toBe(true);
        expect(storageRepository.getProgreso('17.14')).toBeNull();
        expect(storageRepository.getRecoveryBackup()).toBeNull();
    });

    it('deleteAccount cancelado en reautenticación o ante error de Firestore aborta sin tocar Auth', async () => {
        createActiveSession();
        storageRepository.setProgreso('17.14', { '11071': 'Aprobado' }, { silent: true });
        mockFetchCloudBundle.mockResolvedValue(
            makeCloudResponse(
                {
                    progreso: { '17.14': { '11071': 'Aprobado' } },
                    progresoDetalles: {},
                    cursada: {},
                    simulaciones: {},
                },
                1,
            ),
        );

        const authBox = renderWithAuth();
        await act(async () => {
            await authObserverCallback({ uid: 'uid-1', email: 'estudiante@unlu.edu.ar' });
        });

        mockReauthenticateWithGoogle.mockRejectedValueOnce({
            code: 'auth/popup-closed-by-user',
            message: null,
        });
        let cancelRes;
        await act(async () => {
            cancelRes = await authBox.current.deleteAccount({ clearLocalData: true });
        });
        expect(cancelRes.status).toBe('cancelled');
        expect(mockDeleteUserCloudData).not.toHaveBeenCalled();
        expect(mockDeleteCurrentAuthUser).not.toHaveBeenCalled();

        mockReauthenticateWithGoogle.mockResolvedValueOnce({ user: { uid: 'uid-1' } });
        mockDeleteUserCloudData.mockRejectedValueOnce(new Error('permission-denied'));
        let fsFailRes;
        await act(async () => {
            fsFailRes = await authBox.current.deleteAccount({ clearLocalData: true });
        });
        expect(fsFailRes.status).toBe('failed_firestore');
        expect(fsFailRes.firestoreDeleted).toBe(false);
        expect(mockDeleteCurrentAuthUser).not.toHaveBeenCalled();
        expect(storageRepository.getPendingAccountDeletion()).toBeNull();
        expect(authBox.current.isAuthenticated).toBe(true);
    });

    it('deleteAccount ante fallo parcial (Firestore OK pero falla Auth) persiste estado recuperable y completa en reintento sin re-borrar Firestore', async () => {
        createActiveSession();
        storageRepository.setProgreso('17.14', { '11071': 'Aprobado' }, { silent: true });
        mockFetchCloudBundle.mockResolvedValue(
            makeCloudResponse(
                {
                    progreso: { '17.14': { '11071': 'Aprobado' } },
                    progresoDetalles: {},
                    cursada: {},
                    simulaciones: {},
                },
                4,
            ),
        );

        const authBox = renderWithAuth();
        await act(async () => {
            await authObserverCallback({ uid: 'uid-partial', email: 'parcial@unlu.edu.ar' });
        });

        // Primer intento: Firestore OK, Auth deleteUser falla -> partial_auth_pending
        mockReauthenticateWithGoogle.mockResolvedValueOnce({ user: { uid: 'uid-partial' } });
        mockDeleteUserCloudData.mockResolvedValueOnce(undefined);
        mockDeleteCurrentAuthUser.mockRejectedValueOnce({
            code: 'auth/requires-recent-login',
            message: 'Necesitás volver a confirmar tu identidad con Google.',
        });

        let partialRes;
        await act(async () => {
            partialRes = await authBox.current.deleteAccount({ clearLocalData: false });
        });

        expect(partialRes).toMatchObject({
            ok: false,
            status: 'partial_auth_pending',
            firestoreDeleted: true,
            authDeleted: false,
            recoverable: true,
        });
        expect(authBox.current.pendingAccountDeletion?.stage).toBe('firestore_deleted_auth_pending');
        expect(storageRepository.getPendingAccountDeletion()?.uid).toBe('uid-partial');
        expect(mockDeleteUserCloudData).toHaveBeenCalledTimes(1);

        // Segundo intento (reintento): reautentica, NO vuelve a llamar a deleteUserCloudData y completa deleteUser
        mockReauthenticateWithGoogle.mockResolvedValueOnce({ user: { uid: 'uid-partial' } });
        mockDeleteCurrentAuthUser.mockResolvedValueOnce(undefined);

        let retryRes;
        await act(async () => {
            retryRes = await authBox.current.deleteAccount({ clearLocalData: false });
        });

        expect(retryRes).toEqual({
            ok: true,
            status: 'completed',
            firestoreDeleted: true,
            authDeleted: true,
            localCleared: false,
        });
        expect(mockDeleteUserCloudData).toHaveBeenCalledTimes(1);
        expect(mockDeleteCurrentAuthUser).toHaveBeenCalledTimes(2);
        expect(storageRepository.getPendingAccountDeletion()).toBeNull();
        expect(authBox.current.pendingAccountDeletion).toBeNull();
        expect(authBox.current.isAuthenticated).toBe(false);
    });

    it('tras recargar con eliminación parcial pendiente no reconcilia ni recrea perfil y permite reintentar deleteAccount', async () => {
        storageRepository.setPendingAccountDeletion({
            uid: 'uid-reload-partial',
            email: 'reload@unlu.edu.ar',
            stage: 'firestore_deleted_auth_pending',
            clearLocalData: false,
            firestoreDeletedAt: '2026-11-23T15:00:00.000Z',
            lastErrorCode: 'auth/requires-recent-login',
            lastErrorMessage: 'Reintentar',
        });

        const authBox = renderWithAuth();
        await act(async () => {
            await authObserverCallback({ uid: 'uid-reload-partial', email: 'reload@unlu.edu.ar' });
        });

        expect(mockFetchCloudBundle).not.toHaveBeenCalled();
        expect(authBox.current.pendingAccountDeletion?.uid).toBe('uid-reload-partial');

        mockReauthenticateWithGoogle.mockResolvedValueOnce({ user: { uid: 'uid-reload-partial' } });
        mockDeleteCurrentAuthUser.mockResolvedValueOnce(undefined);

        let res;
        await act(async () => {
            res = await authBox.current.deleteAccount();
        });

        expect(res).toMatchObject({ ok: true, status: 'completed', firestoreDeleted: true, authDeleted: true });
        expect(mockDeleteUserCloudData).not.toHaveBeenCalled();
        expect(storageRepository.getPendingAccountDeletion()).toBeNull();
    });
});
