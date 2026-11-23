import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignInWithPopup = vi.fn();
const mockSignOut = vi.fn();
const mockReauthenticateWithPopup = vi.fn();
const mockDeleteUser = vi.fn();
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDoc = vi.fn((_db, col, id) => ({ path: `${col}/${id}`, id }));
const mockServerTimestamp = vi.fn(() => 'SERVER_TS');
const mockGetPendingAccountDeletion = vi.fn(() => null);

vi.mock('firebase/auth', () => ({
    GoogleAuthProvider: vi.fn(),
    signInWithPopup: (...args) => mockSignInWithPopup(...args),
    signOut: (...args) => mockSignOut(...args),
    reauthenticateWithPopup: (...args) => mockReauthenticateWithPopup(...args),
    deleteUser: (...args) => mockDeleteUser(...args),
}));

vi.mock('firebase/firestore', () => ({
    doc: (...args) => mockDoc(...args),
    getDoc: (...args) => mockGetDoc(...args),
    setDoc: (...args) => mockSetDoc(...args),
    serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('./firebase', () => ({
    auth: {},
    db: {},
}));

vi.mock('./storageRepository', () => ({
    default: {
        getPendingAccountDeletion: (...args) => mockGetPendingAccountDeletion(...args),
    },
}));

import {
    loginConGoogle,
    logout,
    reauthenticateWithGoogle,
    deleteCurrentAuthUser,
} from './authService';

describe('authService - Registro seguro sin fugas de localStorage entre cuentas', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('al registrar una cuenta nueva crea solo el perfil con syncRevision: 0 y NUNCA sube progreso local de otra sesión', async () => {
        // Simulamos un localStorage con datos previos de otro usuario en el navegador
        const fakeStorage = new Map([
            ['progreso+17.14', JSON.stringify({ '11071': 'Aprobado' })],
            ['cursada+17.14', JSON.stringify({ horarios: [], eventos: [{ id: 'ev1' }], bitacora: [] })],
        ]);
        const originalLocalStorage = globalThis.localStorage;
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: {
                get length() {
                    return fakeStorage.size;
                },
                key: (i) => Array.from(fakeStorage.keys())[i] ?? null,
                getItem: (k) => fakeStorage.get(k) ?? null,
            },
        });

        try {
            mockSignInWithPopup.mockResolvedValue({
                user: {
                    uid: 'uid-nueva-cuenta-B',
                    email: 'nueva@unlu.edu.ar',
                    displayName: 'Cuenta B',
                    photoURL: 'https://example.com/b.png',
                },
            });
            mockGetDoc.mockResolvedValue({ exists: () => false });
            mockSetDoc.mockResolvedValue(undefined);

            const { user, firestoreWarning } = await loginConGoogle();

            expect(user.uid).toBe('uid-nueva-cuenta-B');
            expect(firestoreWarning).toBeNull();
            expect(mockSetDoc).toHaveBeenCalledTimes(1);

            const writtenDoc = mockSetDoc.mock.calls[0][1];
            expect(writtenDoc).toMatchObject({
                uid: 'uid-nueva-cuenta-B',
                email: 'nueva@unlu.edu.ar',
                syncRevision: 0,
            });
            // Crítico: no se transfirió progreso ni campos muertos legacy a la cuenta nueva
            expect(writtenDoc.materiasAprobadas).toBeUndefined();
            expect(writtenDoc.progreso).toBeUndefined();
            expect(writtenDoc.progresoDetalles).toBeUndefined();
            expect(writtenDoc.cursada).toBeUndefined();
            expect(writtenDoc.simulaciones).toBeUndefined();
        } finally {
            Object.defineProperty(globalThis, 'localStorage', {
                configurable: true,
                value: originalLocalStorage,
            });
        }
    });

    it('no recrea el documento en Firestore durante loginConGoogle si existe una eliminación parcial pendiente para ese UID', async () => {
        mockGetPendingAccountDeletion.mockReturnValueOnce({
            uid: 'uid-pending-del',
            stage: 'firestore_deleted_auth_pending',
            clearLocalData: false,
        });
        mockSignInWithPopup.mockResolvedValue({
            user: {
                uid: 'uid-pending-del',
                email: 'pending@unlu.edu.ar',
                displayName: 'Pendiente',
                photoURL: null,
            },
        });
        mockGetDoc.mockResolvedValue({ exists: () => false });

        const { user, firestoreWarning } = await loginConGoogle();

        expect(user.uid).toBe('uid-pending-del');
        expect(firestoreWarning).toBeNull();
        expect(mockSetDoc).not.toHaveBeenCalled();
        expect(mockGetDoc).not.toHaveBeenCalled();
    });

    it('no sobrescribe el documento en Firestore cuando el usuario ya existe', async () => {
        mockSignInWithPopup.mockResolvedValue({
            user: {
                uid: 'uid-existente',
                email: 'yaexiste@unlu.edu.ar',
                displayName: 'Alumno',
                photoURL: null,
            },
        });
        mockGetDoc.mockResolvedValue({ exists: () => true });

        await loginConGoogle();

        expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it('propaga cancelación silenciosa (message: null) cuando el usuario cierra el popup de Google', async () => {
        mockSignInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' });

        await expect(loginConGoogle()).rejects.toMatchObject({
            code: 'auth/popup-closed-by-user',
            message: null,
        });
        expect(mockGetDoc).not.toHaveBeenCalled();
    });

    it('cierra sesión correctamente invocando Firebase signOut', async () => {
        mockSignOut.mockResolvedValue(undefined);
        await logout();
        expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('reauthenticateWithGoogle reautentica al usuario, propaga cancelación silenciosa y mapea cuenta distinta', async () => {
        const fakeUser = { uid: 'uid-1', email: 'est@unlu.edu.ar' };
        mockReauthenticateWithPopup.mockResolvedValueOnce({ user: fakeUser });
        await reauthenticateWithGoogle(/** @type {any} */ (fakeUser));
        expect(mockReauthenticateWithPopup).toHaveBeenCalledTimes(1);

        mockReauthenticateWithPopup.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });
        await expect(
            reauthenticateWithGoogle(/** @type {any} */ (fakeUser)),
        ).rejects.toMatchObject({
            code: 'auth/popup-closed-by-user',
            message: null,
        });

        mockReauthenticateWithPopup.mockRejectedValueOnce({ code: 'auth/user-mismatch' });
        await expect(
            reauthenticateWithGoogle(/** @type {any} */ (fakeUser)),
        ).rejects.toMatchObject({
            code: 'auth/user-mismatch',
            message: expect.stringMatching(/no coincide con la sesión actual/i),
        });
    });

    it('deleteCurrentAuthUser invoca deleteUser y traduce auth/requires-recent-login', async () => {
        const fakeUser = { uid: 'uid-1' };
        mockDeleteUser.mockResolvedValueOnce(undefined);
        await deleteCurrentAuthUser(/** @type {any} */ (fakeUser));
        expect(mockDeleteUser).toHaveBeenCalledWith(fakeUser);

        mockDeleteUser.mockRejectedValueOnce({ code: 'auth/requires-recent-login' });
        await expect(
            deleteCurrentAuthUser(/** @type {any} */ (fakeUser)),
        ).rejects.toMatchObject({
            code: 'auth/requires-recent-login',
            message: expect.stringMatching(/confirmar tu identidad con Google/i),
        });
    });
});
