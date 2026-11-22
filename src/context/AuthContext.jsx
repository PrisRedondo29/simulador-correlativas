import { useContext, useEffect, useState, useCallback, useRef, useReducer } from 'react';
import PropTypes from 'prop-types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import {
    loginConGoogle,
    logout,
    reauthenticateWithGoogle,
    deleteCurrentAuthUser,
} from '../services/authService';
import { isIntentionalAuthCancel } from '../utils/errorCodes';
import { logError } from '../services/logService';
import { trackLogin, trackLogout } from '../services/analyticsService';
import { deleteUserCloudData, getUserData, getUserRole } from '../services/dbService';
import {
    fetchCloudBundle,
    uploadAcademicSnapshot,
    adoptRemoteSnapshot,
    claimLocalSnapshotForAccount,
} from '../services/syncService';
import storageRepository, {
    STORAGE_CHANGE_EVENT,
    STORAGE_KEYS,
    subscribeStorageChanges,
} from '../services/storageRepository';
import {
    SYNC_STATUS,
    SYNC_UNITS,
    buildExportBackupPayload,
    computeBundleHash,
    createInitialSyncState,
    evaluarConciliacionSync,
    parseImportBackupPayload,
    summarizeAcademicBundle,
    transitionSyncState,
} from '../utils/Sync/syncStateMachine';
import { AuthContext } from './authContextInstance';

// ============================================================================
// CONSTANTES Y HELPERS DE SESIÓN
// ============================================================================

const SESSION_KEY = 'auth_session';
const EXPIRY_SHORT = 24 * 60 * 60 * 1000;  // 24 horas
const EXPIRY_LONG = 7 * 24 * 60 * 60 * 1000; // 7 días

const saveSession = (rememberMe) => {
    const expiry = Date.now() + (rememberMe ? EXPIRY_LONG : EXPIRY_SHORT);
    storageRepository.setJSON(SESSION_KEY, { expiry, rememberMe }, { silent: true });
};

const clearSession = () => storageRepository.remove(SESSION_KEY, { silent: true });

const isSessionExpired = () => {
    const parsed = storageRepository.getJSON(SESSION_KEY, null);
    if (!parsed || typeof parsed.expiry !== 'number') return true;
    return Date.now() > parsed.expiry;
};

const isAcademicStorageKey = (key) =>
    Boolean(key) &&
    (key.startsWith('progreso+') ||
        key.startsWith('detalles_progreso+') ||
        key.startsWith('simulacion+') ||
        key.startsWith('cursada+') ||
        key === 'academic_bundle');

const getNavigatorOnline = () =>
    typeof navigator === 'undefined' ? true : Boolean(navigator.onLine);

// ============================================================================
// CONTEXTO
// ============================================================================

/**
 * Hook público para consumir el AuthContext.
 * Provee acceso al estado de autenticación, datos del usuario, máquina de sincronización
 * segura (Patrón State) y acciones de respaldo/restauración.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
    }
    return ctx;
}

// ============================================================================
// PROVIDER
// ============================================================================

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [userRole, setUserRole] = useState('user');
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    const [firestoreWarning, setFirestoreWarning] = useState(null);
    const [isCriticalError, setIsCriticalError] = useState(false);
    const [recoveryBackup, setRecoveryBackup] = useState(() =>
        storageRepository.getRecoveryBackup(),
    );
    const [pendingAccountDeletion, setPendingAccountDeletion] = useState(() =>
        storageRepository.getPendingAccountDeletion(),
    );

    const [syncState, dispatchSync] = useReducer(
        transitionSyncState,
        undefined,
        () =>
            createInitialSyncState({
                isOnline: getNavigatorOnline(),
                currentUid: null,
                localBundle: storageRepository.readAcademicBundle(),
                meta: storageRepository.getSyncMeta(),
            }),
    );

    const userRef = useRef(user);
    const syncStateRef = useRef(syncState);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        syncStateRef.current = syncState;
    }, [syncState]);

    const refreshRecoveryBackup = useCallback(() => {
        setRecoveryBackup(storageRepository.getRecoveryBackup());
    }, []);

    // --- Conectividad ortogonal (online / offline sin pisar `pending`) ---
    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const handleOnline = () => dispatchSync({ type: 'CONNECTIVITY_CHANGED', isOnline: true });
        const handleOffline = () => dispatchSync({ type: 'CONNECTIVITY_CHANGED', isOnline: false });

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // --- Observador reactivo del almacenamiento local (misma pestaña + multi-pestaña) ---
    useEffect(() => {
        const handleStorageEvent = (event) => {
            refreshRecoveryBackup();
            const currentUid = userRef.current?.uid || null;

            // Evento nativo `storage` proviene de OTRA pestaña: rehidratamos bundle + SyncMeta reales
            if (event && event.type === 'storage') {
                const changedKey = event.key;
                if (
                    changedKey &&
                    !isAcademicStorageKey(changedKey) &&
                    changedKey !== STORAGE_KEYS.SYNC_META &&
                    changedKey !== STORAGE_KEYS.SYNC_RECOVERY_BACKUP
                ) {
                    return;
                }
                dispatchSync({
                    type: 'REHYDRATED_FROM_STORAGE',
                    currentUid,
                    localBundle: storageRepository.readAcademicBundle(),
                    meta: storageRepository.getSyncMeta(),
                });
                return;
            }

            // Evento interno en esta pestaña
            if (event && event.type === STORAGE_CHANGE_EVENT) {
                const key = event.detail?.key;
                if (key === STORAGE_KEYS.SYNC_META) {
                    dispatchSync({
                        type: 'REHYDRATED_FROM_STORAGE',
                        currentUid,
                        localBundle: storageRepository.readAcademicBundle(),
                        meta: storageRepository.getSyncMeta(),
                    });
                    return;
                }
                if (isAcademicStorageKey(key)) {
                    const localHash = computeBundleHash(storageRepository.readAcademicBundle());
                    dispatchSync({
                        type: 'LOCAL_MUTATED',
                        localHash,
                        isAuthenticated: Boolean(currentUid),
                    });
                }
            }
        };

        return subscribeStorageChanges(handleStorageEvent);
    }, [refreshRecoveryBackup]);

    // --- Conciliación segura (sin borrados destructivos automáticos) ---
    const reconcileWithCloud = useCallback(
        async (firebaseUser, { prefetchedCloud = null } = {}) => {
            const cloudRes = prefetchedCloud ?? (await fetchCloudBundle(firebaseUser.uid));
            if (cloudRes.rawDoc) {
                setUserData(cloudRes.rawDoc);
            }

            const localBundle = storageRepository.readAcademicBundle();
            const meta = storageRepository.getSyncMeta();
            const conciliation = evaluarConciliacionSync({
                localBundle,
                remoteBundle: cloudRes.bundle,
                currentUid: firebaseUser.uid,
                lastSyncedUid: meta?.lastSyncedUid ?? null,
                remoteSyncRevision: cloudRes.syncRevision,
            });

            const nowIso = new Date().toISOString();

            if (conciliation.outcome === 'adopt_remote') {
                const applyRes = adoptRemoteSnapshot(firebaseUser.uid, {
                    remoteBundle: cloudRes.bundle,
                    remoteRevision: cloudRes.syncRevision,
                    config: cloudRes.config,
                    reason: 'initial_login_adopt',
                    previousUid: meta?.lastSyncedUid ?? null,
                    syncedAt: nowIso,
                });

                refreshRecoveryBackup();

                if (!applyRes.ok) {
                    dispatchSync({
                        type: 'UPLOAD_FAILED',
                        errorCode: applyRes.error || 'sync/adopt-failed',
                        errorMessage:
                            applyRes.message ||
                            'No se pudieron cargar los datos remotos en este dispositivo.',
                    });
                    return { conciliation, applied: false, error: applyRes.message };
                }

                dispatchSync({
                    type: 'CONCILIATION_EVALUATED',
                    conciliation,
                    syncedAt: nowIso,
                });
                return { conciliation, applied: true };
            }

            if (conciliation.outcome === 'in_sync') {
                const syncedAt = meta?.lastSyncedAt || nowIso;
                storageRepository.setSyncMeta(
                    {
                        syncRevision: cloudRes.syncRevision,
                        lastSyncedHash: conciliation.localHash,
                        lastSyncedUid: firebaseUser.uid,
                        lastSyncedAt: syncedAt,
                        unit: SYNC_UNITS.ACADEMIC,
                    },
                    { silent: true },
                );
                dispatchSync({
                    type: 'CONCILIATION_EVALUATED',
                    conciliation,
                    syncedAt,
                });
                return { conciliation, applied: false };
            }

            if (conciliation.outcome === 'keep_local_pending') {
                storageRepository.setSyncMeta(
                    {
                        syncRevision: cloudRes.syncRevision,
                        lastSyncedHash: null,
                        lastSyncedUid: firebaseUser.uid,
                        lastSyncedAt: null,
                        unit: SYNC_UNITS.ACADEMIC,
                    },
                    { silent: true },
                );
                dispatchSync({
                    type: 'CONCILIATION_EVALUATED',
                    conciliation,
                });
                return { conciliation, applied: false };
            }

            // `conflict` o `account_mismatch`: NO se toca localStorage hasta que decida el usuario.
            dispatchSync({
                type: 'CONCILIATION_EVALUATED',
                conciliation,
            });
            return { conciliation, applied: false };
        },
        [refreshRecoveryBackup],
    );

    // --- Efecto Principal: Observer de Autenticación ---
    useEffect(() => {
        if (isSessionExpired()) {
            logout().catch(() => {});
            clearSession();
        }

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true);
            try {
                if (firebaseUser && !isSessionExpired()) {
                    setUser(firebaseUser);
                    userRef.current = firebaseUser;

                    // Rehidratamos inmediatamente contra el storage local antes de ir a red
                    dispatchSync({
                        type: 'REHYDRATED_FROM_STORAGE',
                        currentUid: firebaseUser.uid,
                        localBundle: storageRepository.readAcademicBundle(),
                        meta: storageRepository.getSyncMeta(),
                    });

                    const [cloudRes, role] = await Promise.all([
                        fetchCloudBundle(firebaseUser.uid),
                        getUserRole(firebaseUser.uid),
                    ]);

                    setUserRole(role);
                    await reconcileWithCloud(firebaseUser, { prefetchedCloud: cloudRes });
                } else {
                    setUser(null);
                    userRef.current = null;
                    setUserData(null);
                    setUserRole('user');
                    dispatchSync({ type: 'SIGNED_OUT' });
                }
            } catch (err) {
                if (import.meta.env.DEV) console.error('Error en el observer de Auth:', err);
                logError(err, { route: 'auth/observer' });
                setFirestoreWarning(
                    'No se pudo consultar la nube. Tus datos locales permanecen intactos y podés seguir offline.',
                );
                dispatchSync({
                    type: 'UPLOAD_FAILED',
                    errorCode: 'sync/observer-failed',
                    errorMessage: 'No se pudo consultar el estado en la nube. Podés seguir trabajando localmente.',
                });
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, [reconcileWithCloud]);

    // --- Funciones de Autenticación ---

    const clearAuthError = useCallback(() => setAuthError(null), []);
    const clearFirestoreWarning = useCallback(() => setFirestoreWarning(null), []);

    const signIn = useCallback(
        async (rememberMe = false) => {
            clearAuthError();
            clearFirestoreWarning();
            saveSession(rememberMe);

            try {
                const { user: loggedUser, firestoreWarning: warning } = await loginConGoogle();
                const role = await getUserRole(loggedUser.uid);
                setUserRole(role);

                trackLogin({ userId: loggedUser.uid });
                if (warning) setFirestoreWarning(warning);

                return loggedUser;
            } catch (err) {
                clearSession();
                if (isIntentionalAuthCancel(err)) return null;

                logError(err, { route: window?.location?.pathname });
                setAuthError(err?.message ?? 'No se pudo iniciar sesión. Intentá de nuevo.');
                throw err;
            }
        },
        [clearAuthError, clearFirestoreWarning],
    );

    const signOut = useCallback(async () => {
        clearAuthError();
        clearFirestoreWarning();
        try {
            await logout();
            trackLogout();
        } catch {
            // La limpieza de sesión local es suficiente si falla Firebase Auth
        } finally {
            clearSession();
            setUserRole('user');
            dispatchSync({ type: 'SIGNED_OUT' });
        }
    }, [clearAuthError, clearFirestoreWarning]);

    // --- Escrituras locales (local-first unificado en todos los módulos) ---

    const updateAuthProgreso = useCallback((plan, nuevoProgreso, progresoDetalles = null) => {
        storageRepository.setProgreso(plan, nuevoProgreso);
        if (progresoDetalles) {
            storageRepository.setProgresoDetalles(plan, progresoDetalles);
        }
    }, []);

    const setSimulacionLocal = useCallback((plan, data) => {
        storageRepository.setSimulacion(plan, data);
    }, []);

    // --- Refresco de perfil/configuración SIN tocar el progreso académico local ---

    const refetchUserData = useCallback(async () => {
        const activeUser = userRef.current;
        if (!activeUser) return null;
        try {
            const [cloudDoc, role] = await Promise.all([
                getUserData(activeUser.uid),
                getUserRole(activeUser.uid),
            ]);
            if (cloudDoc) setUserData(cloudDoc);
            setUserRole(role);
            return cloudDoc;
        } catch (err) {
            if (import.meta.env.DEV) console.error('Error refetching user data:', err);
            return null;
        }
    }, []);

    // --- Acciones explícitas de sincronización segura ---

    const saveToCloud = useCallback(
        async ({ forceOverwrite = false, baseRevisionOverride = undefined } = {}) => {
            const activeUser = userRef.current;
            if (!activeUser) {
                return {
                    status: 'error',
                    code: 'sync/unauthenticated',
                    message: 'Iniciá sesión con Google para guardar tus datos en la nube.',
                };
            }

            if (!syncStateRef.current.isOnline) {
                return {
                    status: 'error',
                    code: 'sync/offline',
                    message:
                        'Sin conexión a internet. Tus cambios siguen guardados en este dispositivo y quedan pendientes.',
                };
            }

            if (
                syncStateRef.current.status === SYNC_STATUS.ACCOUNT_MISMATCH &&
                !forceOverwrite &&
                baseRevisionOverride === undefined
            ) {
                return {
                    status: 'conflict',
                    code: 'sync/account-mismatch',
                    message: 'Primero resolvé a qué cuenta corresponden los datos de este dispositivo.',
                };
            }

            const localBundle = storageRepository.readAcademicBundle();
            const uploadingHash = computeBundleHash(localBundle);
            dispatchSync({ type: 'UPLOAD_STARTED', uploadingHash });

            const persistedMeta = storageRepository.getSyncMeta();
            const expectedRevision =
                baseRevisionOverride !== undefined
                    ? baseRevisionOverride
                    : (persistedMeta?.syncRevision ?? syncStateRef.current.syncRevision);

            const result = await uploadAcademicSnapshot(activeUser.uid, {
                expectedRevision,
                forceOverwrite,
                email: activeUser.email,
            });

            if (result.status === 'synced' && typeof result.syncRevision === 'number') {
                dispatchSync({
                    type: 'UPLOAD_SUCCEEDED',
                    uploadedHash: result.uploadedHash ?? uploadingHash,
                    currentLocalHash: result.currentLocalHash,
                    newRevision: result.syncRevision,
                    syncedAt: result.syncedAt ?? new Date().toISOString(),
                    uid: activeUser.uid,
                });

                // Actualizamos metadatos visibles en memoria sin pisar local
                setUserData((prev) => ({
                    ...(prev || {}),
                    syncRevision: result.syncRevision,
                    progreso: localBundle.progreso,
                }));

                return result;
            }

            if (result.status === 'conflict') {
                const liveLocalBundle = storageRepository.readAcademicBundle();
                const remoteBundle = result.remoteBundle ?? null;
                dispatchSync({
                    type: 'UPLOAD_CONFLICT',
                    conflict: {
                        reason: 'revision_conflict',
                        localHash: computeBundleHash(liveLocalBundle),
                        remoteHash: result.remoteHash ?? null,
                        localSummary: summarizeAcademicBundle(liveLocalBundle),
                        remoteSummary: remoteBundle ? summarizeAcademicBundle(remoteBundle) : null,
                        remoteRevision: result.remoteRevision ?? null,
                        remoteBundle,
                        previousUid: persistedMeta?.lastSyncedUid ?? activeUser.uid,
                        currentUid: activeUser.uid,
                    },
                });
                return result;
            }

            dispatchSync({
                type: 'UPLOAD_FAILED',
                errorCode: result.code || 'sync/upload-failed',
                errorMessage:
                    result.message ||
                    'No se pudo guardar en la nube. Tus datos locales siguen intactos.',
            });
            return result;
        },
        [],
    );

    const loadFromCloud = useCallback(
        async ({ skipConflictCheck = false } = {}) => {
            const activeUser = userRef.current;
            if (!activeUser) {
                return { ok: false, message: 'Iniciá sesión para cargar datos desde la nube.' };
            }

            if (!syncStateRef.current.isOnline) {
                return {
                    ok: false,
                    code: 'sync/offline',
                    message: 'Sin conexión a internet. No se puede consultar la nube en este momento.',
                };
            }

            try {
                const cloudRes = await fetchCloudBundle(activeUser.uid);
                if (cloudRes.rawDoc) {
                    setUserData(cloudRes.rawDoc);
                }

                if (!cloudRes.exists || cloudRes.isEmpty) {
                    return {
                        ok: false,
                        empty: true,
                        message: 'Todavía no hay datos guardados en tu cuenta de la nube.',
                    };
                }

                const localBundle = storageRepository.readAcademicBundle();
                const meta = storageRepository.getSyncMeta();
                const conciliation = evaluarConciliacionSync({
                    localBundle,
                    remoteBundle: cloudRes.bundle,
                    currentUid: activeUser.uid,
                    lastSyncedUid: meta?.lastSyncedUid ?? null,
                    remoteSyncRevision: cloudRes.syncRevision,
                });

                if (
                    !skipConflictCheck &&
                    (conciliation.outcome === 'conflict' ||
                        conciliation.outcome === 'account_mismatch')
                ) {
                    dispatchSync({ type: 'CONCILIATION_EVALUATED', conciliation });
                    return {
                        ok: false,
                        requiresResolution: true,
                        outcome: conciliation.outcome,
                    };
                }

                if (conciliation.outcome === 'in_sync') {
                    const syncedAt = meta?.lastSyncedAt || new Date().toISOString();
                    storageRepository.setSyncMeta(
                        {
                            syncRevision: cloudRes.syncRevision,
                            lastSyncedHash: conciliation.localHash,
                            lastSyncedUid: activeUser.uid,
                            lastSyncedAt: syncedAt,
                            unit: SYNC_UNITS.ACADEMIC,
                        },
                        { silent: true },
                    );
                    dispatchSync({
                        type: 'CONCILIATION_EVALUATED',
                        conciliation,
                        syncedAt,
                    });
                    return { ok: true, alreadySynced: true };
                }

                const nowIso = new Date().toISOString();
                const applyRes = adoptRemoteSnapshot(activeUser.uid, {
                    remoteBundle: cloudRes.bundle,
                    remoteRevision: cloudRes.syncRevision,
                    config: cloudRes.config,
                    reason: 'manual_load_cloud',
                    previousUid: meta?.lastSyncedUid ?? activeUser.uid,
                    syncedAt: nowIso,
                });

                refreshRecoveryBackup();

                if (!applyRes.ok || !applyRes.hash) {
                    dispatchSync({
                        type: 'UPLOAD_FAILED',
                        errorCode: applyRes.error || 'sync/load-failed',
                        errorMessage:
                            applyRes.message ||
                            'No se pudieron aplicar los datos remotos. Tu progreso local se mantuvo intacto.',
                    });
                    return { ok: false, message: applyRes.message };
                }

                dispatchSync({
                    type: 'CONFLICT_RESOLVED_REMOTE',
                    remoteHash: applyRes.hash,
                    remoteRevision: cloudRes.syncRevision,
                    uid: activeUser.uid,
                    syncedAt: nowIso,
                });
                return { ok: true, backedUp: applyRes.backedUp };
            } catch (err) {
                if (import.meta.env.DEV) console.error('Error al cargar desde la nube:', err);
                dispatchSync({
                    type: 'UPLOAD_FAILED',
                    errorCode: 'sync/load-failed',
                    errorMessage: 'No se pudo cargar desde la nube. Tus datos locales siguen intactos.',
                });
                return {
                    ok: false,
                    message: 'No se pudo cargar desde la nube. Tus datos locales siguen intactos.',
                };
            }
        },
        [refreshRecoveryBackup],
    );

    const resolveSync = useCallback(
        async (choice) => {
            const activeUser = userRef.current;
            const conflict = syncStateRef.current.conflict;
            if (!activeUser || !conflict) return { ok: false };

            if (choice === 'use_remote' || choice === 'download') {
                let remoteBundle = conflict.remoteBundle;
                let remoteRevision = conflict.remoteRevision ?? 0;
                let remoteConfig = null;

                if (!remoteBundle) {
                    const fresh = await fetchCloudBundle(activeUser.uid);
                    remoteBundle = fresh.bundle;
                    remoteRevision = fresh.syncRevision;
                    remoteConfig = fresh.config;
                    if (fresh.rawDoc) setUserData(fresh.rawDoc);
                }

                const nowIso = new Date().toISOString();
                const applyRes = adoptRemoteSnapshot(activeUser.uid, {
                    remoteBundle,
                    remoteRevision,
                    config: remoteConfig,
                    reason: conflict.reason,
                    previousUid: conflict.previousUid ?? activeUser.uid,
                    syncedAt: nowIso,
                });

                refreshRecoveryBackup();

                if (!applyRes.ok || !applyRes.hash) {
                    return {
                        ok: false,
                        error: applyRes.error,
                        message:
                            applyRes.message ||
                            'No se pudo crear la copia de respaldo previa. Se canceló la sobrescritura para proteger tus datos.',
                    };
                }

                dispatchSync({
                    type: 'CONFLICT_RESOLVED_REMOTE',
                    remoteHash: applyRes.hash,
                    remoteRevision,
                    uid: activeUser.uid,
                    syncedAt: nowIso,
                });
                return { ok: true, backedUp: applyRes.backedUp };
            }

            // `keep_local` o `upload_local` (y alias legacy `upload`)
            const baseRevision = conflict.remoteRevision ?? 0;
            claimLocalSnapshotForAccount(activeUser.uid, { baseRevision });

            const localHash = computeBundleHash(storageRepository.readAcademicBundle());
            dispatchSync({
                type: 'CONFLICT_RESOLVED_LOCAL',
                localHash,
                baseRevision,
                currentUid: activeUser.uid,
            });

            if (choice === 'upload_local' || choice === 'upload') {
                const uploadRes = await saveToCloud({ baseRevisionOverride: baseRevision });
                return {
                    ok: uploadRes.status === 'synced',
                    status: uploadRes.status,
                    message: uploadRes.message,
                };
            }

            return { ok: true, pendingLocal: true };
        },
        [refreshRecoveryBackup, saveToCloud],
    );

    const restorePreviousBackup = useCallback(() => {
        const res = storageRepository.restoreRecoveryBackup();
        refreshRecoveryBackup();
        if (res.ok) {
            dispatchSync({
                type: 'REHYDRATED_FROM_STORAGE',
                currentUid: userRef.current?.uid || null,
                localBundle: storageRepository.readAcademicBundle(),
                meta: storageRepository.getSyncMeta(),
            });
        }
        return res;
    }, [refreshRecoveryBackup]);

    const exportBackupJson = useCallback((activePlan = null) => {
        const bundle = storageRepository.readAcademicBundle();
        const payload = buildExportBackupPayload(bundle, {
            planActivo: activePlan || storageRepository.getPlanActivo(),
            sourceUid: userRef.current?.uid || null,
        });
        const json = JSON.stringify(payload, null, 2);
        const dateStamp = payload.exportedAt.slice(0, 10);
        const filename = `respaldo_unlu_${dateStamp}.json`;

        if (typeof window !== 'undefined' && typeof Blob !== 'undefined') {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            anchor.click();
            URL.revokeObjectURL(url);
        }

        return { ok: true, filename, payload };
    }, []);

    const importBackupJson = useCallback(
        (rawJson) => {
            const parsed = parseImportBackupPayload(rawJson);
            if (!parsed.ok || !parsed.bundle) {
                return { ok: false, error: parsed.error || 'Archivo de respaldo inválido.' };
            }

            const applyRes = storageRepository.applyRemoteBundleSafely(parsed.bundle, {
                reason: 'manual_json_import',
                sourceUid: userRef.current?.uid || null,
                config: parsed.planActivo ? { planActivo: parsed.planActivo } : null,
            });

            refreshRecoveryBackup();

            if (!applyRes.ok) {
                return {
                    ok: false,
                    error:
                        applyRes.message ||
                        'No se pudo importar el respaldo. Tus datos actuales permanecen intactos.',
                };
            }

            dispatchSync({
                type: 'REHYDRATED_FROM_STORAGE',
                currentUid: userRef.current?.uid || null,
                localBundle: storageRepository.readAcademicBundle(),
                meta: storageRepository.getSyncMeta(),
            });

            return {
                ok: true,
                backedUp: applyRes.backedUp,
                planActivo: parsed.planActivo,
            };
        },
        [refreshRecoveryBackup],
    );

    const enterOfflineMode = useCallback(() => {
        setIsCriticalError(false);
        setLoading(false);
    }, []);

    const deleteAccount = useCallback(
        async ({ clearLocalData = false } = {}) => {
            const activeUser = userRef.current;
            if (!activeUser) {
                return {
                    ok: false,
                    status: 'unauthenticated',
                    firestoreDeleted: false,
                    authDeleted: false,
                    message: 'No hay una sesión activa para eliminar.',
                };
            }

            if (!syncStateRef.current.isOnline) {
                return {
                    ok: false,
                    status: 'offline',
                    firestoreDeleted: false,
                    authDeleted: false,
                    message:
                        'Sin conexión a internet. Necesitás conexión para eliminar tu cuenta en la nube.',
                };
            }

            const existingPending = storageRepository.getPendingAccountDeletion();
            const firestoreAlreadyDeleted = Boolean(
                existingPending &&
                    existingPending.uid === activeUser.uid &&
                    existingPending.stage === 'firestore_deleted_auth_pending',
            );
            const effectiveClearLocal = firestoreAlreadyDeleted
                ? Boolean(clearLocalData || existingPending?.clearLocalData)
                : Boolean(clearLocalData);

            /** @param {unknown} err */
            const extractErrInfo = (err, fallbackMessage) => ({
                code:
                    err && typeof err === 'object' && 'code' in err && typeof err.code === 'string'
                        ? err.code
                        : null,
                message:
                    err &&
                    typeof err === 'object' &&
                    'message' in err &&
                    typeof err.message === 'string' &&
                    err.message
                        ? err.message
                        : fallbackMessage,
            });

            // Etapa 1: Reautenticar con Google antes de tocar Firestore o reintentar Auth
            try {
                await reauthenticateWithGoogle(activeUser);
            } catch (err) {
                if (isIntentionalAuthCancel(err)) {
                    return {
                        ok: false,
                        status: 'cancelled',
                        firestoreDeleted: firestoreAlreadyDeleted,
                        authDeleted: false,
                        message: null,
                    };
                }
                const { code, message } = extractErrInfo(
                    err,
                    'No se pudo verificar tu identidad con Google.',
                );
                if (firestoreAlreadyDeleted && existingPending) {
                    const updatedPending = {
                        ...existingPending,
                        clearLocalData: effectiveClearLocal,
                        lastErrorCode: code,
                        lastErrorMessage: message,
                    };
                    storageRepository.setPendingAccountDeletion(updatedPending);
                    setPendingAccountDeletion(updatedPending);
                    return {
                        ok: false,
                        status: 'partial_auth_pending',
                        firestoreDeleted: true,
                        authDeleted: false,
                        recoverable: true,
                        code,
                        message,
                    };
                }
                return {
                    ok: false,
                    status: 'failed_reauth',
                    firestoreDeleted: false,
                    authDeleted: false,
                    code,
                    message,
                };
            }

            // Etapa 2: Eliminar documento en Cloud Firestore (`/users/{uid}`) si aún no fue eliminado
            if (!firestoreAlreadyDeleted) {
                try {
                    await deleteUserCloudData(activeUser.uid);
                } catch (err) {
                    logError(err, {
                        route: '/configuracion',
                        errorCode: 'account/delete-firestore-failed',
                    });
                    const { code, message } = extractErrInfo(
                        err,
                        'No se pudieron eliminar tus datos de Cloud Firestore. Tu cuenta sigue intacta.',
                    );
                    return {
                        ok: false,
                        status: 'failed_firestore',
                        firestoreDeleted: false,
                        authDeleted: false,
                        code,
                        message,
                    };
                }

                const pendingState = {
                    uid: activeUser.uid,
                    email: activeUser.email ?? null,
                    stage: /** @type {const} */ ('firestore_deleted_auth_pending'),
                    clearLocalData: effectiveClearLocal,
                    firestoreDeletedAt: new Date().toISOString(),
                    lastErrorCode: null,
                    lastErrorMessage: null,
                };
                storageRepository.setPendingAccountDeletion(pendingState);
                setPendingAccountDeletion(pendingState);
                storageRepository.clearCloudSyncMetadata();
                setUserData(null);
            }

            // Etapa 3: Eliminar usuario en Firebase Authentication
            try {
                await deleteCurrentAuthUser(activeUser);
            } catch (err) {
                const { code, message } = extractErrInfo(
                    err,
                    'Tus datos en Firestore se eliminaron, pero falló la baja en Firebase Authentication.',
                );
                if (code !== 'auth/user-not-found') {
                    logError(err, {
                        route: '/configuracion',
                        errorCode: 'account/delete-auth-failed',
                    });
                    const currentStored = storageRepository.getPendingAccountDeletion();
                    const updatedPending = {
                        uid: activeUser.uid,
                        email: activeUser.email ?? null,
                        stage: /** @type {const} */ ('firestore_deleted_auth_pending'),
                        clearLocalData: effectiveClearLocal,
                        firestoreDeletedAt:
                            currentStored?.firestoreDeletedAt ?? new Date().toISOString(),
                        lastErrorCode: code,
                        lastErrorMessage: message,
                    };
                    storageRepository.setPendingAccountDeletion(updatedPending);
                    setPendingAccountDeletion(updatedPending);
                    return {
                        ok: false,
                        status: 'partial_auth_pending',
                        firestoreDeleted: true,
                        authDeleted: false,
                        recoverable: true,
                        code,
                        message,
                    };
                }
            }

            // Etapa 4: Completado integral -> limpiar estado pendiente, sesión y (opcional) datos locales
            storageRepository.clearPendingAccountDeletion();
            setPendingAccountDeletion(null);
            clearSession();
            clearAuthError();
            clearFirestoreWarning();

            if (effectiveClearLocal) {
                storageRepository.clearLocalUserData();
                refreshRecoveryBackup();
            } else {
                storageRepository.clearCloudSyncMetadata();
            }

            trackLogout();
            setUser(null);
            userRef.current = null;
            setUserData(null);
            setUserRole('user');
            dispatchSync({ type: 'SIGNED_OUT' });

            return {
                ok: true,
                status: 'completed',
                firestoreDeleted: true,
                authDeleted: true,
                localCleared: effectiveClearLocal,
            };
        },
        [clearAuthError, clearFirestoreWarning, refreshRecoveryBackup],
    );

    // --- Helpers de lectura local vía storageRepository ---
    const getProgresoLocal = useCallback((plan) => storageRepository.getProgreso(plan, null), []);
    const getProgresoDetallesLocal = useCallback(
        (plan) => storageRepository.getProgresoDetalles(plan, null),
        [],
    );
    const getSimulacionLocal = useCallback(
        (plan) => storageRepository.getSimulacion(plan, null),
        [],
    );

    const isAuthenticated = Boolean(user);
    const activePendingAccountDeletion =
        user && pendingAccountDeletion?.uid === user.uid ? pendingAccountDeletion : null;
    const showSyncModal =
        isAuthenticated &&
        (syncState.status === SYNC_STATUS.CONFLICT ||
            syncState.status === SYNC_STATUS.ACCOUNT_MISMATCH) &&
        Boolean(syncState.conflict);

    const value = {
        user,
        userData,
        userRole,
        loading,
        isAuthenticated,
        isAdmin: userRole === 'admin',
        authError,
        firestoreWarning,
        isCriticalError,

        // Estado y acciones de sincronización segura (Patrón State)
        syncState,
        showSyncModal,
        recoveryBackup,
        saveToCloud,
        loadFromCloud,
        resolveSync,
        restorePreviousBackup,
        exportBackupJson,
        importBackupJson,

        // Acciones de cuenta y perfil
        signIn,
        signOut,
        deleteAccount,
        pendingAccountDeletion: activePendingAccountDeletion,
        updateAuthProgreso,
        refetchUserData,
        enterOfflineMode,
        clearAuthError,
        clearFirestoreWarning,

        // Helpers de almacenamiento local
        getProgresoLocal,
        getProgresoDetallesLocal,
        getSimulacionLocal,
        setSimulacionLocal,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
