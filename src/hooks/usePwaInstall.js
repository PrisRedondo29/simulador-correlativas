import { useState, useCallback, useSyncExternalStore } from 'react';
import { trackPwaStatusChanged } from '../services/analyticsService';

function detectStandalone() {
    if (typeof window === 'undefined') return false;
    try {
        const mediaMatch =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(display-mode: standalone)').matches;
        const iosStandalone = Boolean(
            typeof navigator !== 'undefined' && navigator.standalone === true,
        );
        return mediaMatch || iosStandalone;
    } catch {
        return false;
    }
}

function detectWebInstallSupport() {
    if (typeof Navigator === 'undefined') return false;
    return typeof Navigator.prototype?.install === 'function';
}

function hasWebManifest() {
    if (typeof document === 'undefined') return false;
    return Boolean(document.querySelector('link[rel="manifest"]'));
}

// ─── Store singleton global para capturar `beforeinstallprompt` desde main.jsx ─

let storeSnapshot = {
    deferredPrompt: null,
    installed: false,
};
let listenersAttached = false;
const subscribers = new Set();

function notifySubscribers() {
    subscribers.forEach((cb) => cb());
}

function handleBeforeInstallPrompt(event) {
    event.preventDefault();
    storeSnapshot = { ...storeSnapshot, deferredPrompt: event };
    notifySubscribers();
}

function handleAppInstalled() {
    storeSnapshot = { deferredPrompt: null, installed: true };
    notifySubscribers();
    trackPwaStatusChanged({ state: 'installed' });
}

function markInstalled() {
    storeSnapshot = { ...storeSnapshot, installed: true };
    notifySubscribers();
}

function consumeDeferredPrompt() {
    const promptEvent = storeSnapshot.deferredPrompt;
    if (promptEvent) {
        storeSnapshot = { ...storeSnapshot, deferredPrompt: null };
        notifySubscribers();
    }
    return promptEvent;
}

/**
 * Registra los listeners globales de instalación PWA una sola vez en `window`
 * para no perder `beforeinstallprompt` cuando el usuario entra por otra ruta antes de ir a Configuración.
 */
export function initPwaInstallListener() {
    if (typeof window === 'undefined' || listenersAttached) return;
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    listenersAttached = true;
}

/**
 * Restablece el estado del store global entre tests unitarios.
 */
export function __resetPwaInstallStoreForTests() {
    if (typeof window !== 'undefined' && listenersAttached) {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
    }
    storeSnapshot = { deferredPrompt: null, installed: false };
    listenersAttached = false;
    subscribers.clear();
}

function subscribePwaInstall(callback) {
    initPwaInstallListener();
    subscribers.add(callback);
    return () => {
        subscribers.delete(callback);
    };
}

function getPwaInstallSnapshot() {
    return storeSnapshot;
}

/**
 * Hook de mejora progresiva para instalar la PWA en PC o celular:
 *  - Requiere manifest Web real cuando evalúa `navigator.install()` para evitar botones rotos en dev.
 *  - Usa store global inicializado en `main.jsx` para conservar `beforeinstallprompt` entre rutas.
 *  - Expone `canInstall: false` cuando la app ya está instalada o el navegador/entorno no permite instalarla.
 */
export default function usePwaInstall() {
    const snapshot = useSyncExternalStore(
        subscribePwaInstall,
        getPwaInstallSnapshot,
        getPwaInstallSnapshot,
    );
    const [isStandalone] = useState(() => detectStandalone());
    const [supportsWebInstall] = useState(() => detectWebInstallSupport());
    const [hasManifest] = useState(() => hasWebManifest());
    const [isInstalling, setIsInstalling] = useState(false);

    const isInstalled = isStandalone || snapshot.installed;
    const hasDeferredPrompt = Boolean(snapshot.deferredPrompt);
    const canInstall = !isInstalled && (hasDeferredPrompt || (supportsWebInstall && hasManifest));

    const triggerInstall = useCallback(async () => {
        if (isInstalling || isInstalled) {
            return { outcome: 'ignored' };
        }

        setIsInstalling(true);
        try {
            if (supportsWebInstall && hasManifest && typeof navigator.install === 'function') {
                try {
                    // Invocación directa durante el clic para preservar transient user activation
                    await navigator.install();
                    markInstalled();
                    return { outcome: 'accepted' };
                } catch (navError) {
                    if (navError?.name === 'AbortError') {
                        return { outcome: 'aborted' };
                    }
                    if (!getPwaInstallSnapshot().deferredPrompt) {
                        if (import.meta.env.DEV) {
                            console.error('Error al iniciar instalación PWA:', navError);
                        }
                        return { outcome: 'error', error: navError };
                    }
                }
            }

            // El evento beforeinstallprompt es de un solo uso: limpiarlo antes de await
            const promptEvent = consumeDeferredPrompt();
            if (promptEvent) {
                await promptEvent.prompt();
                const choice = await promptEvent.userChoice;
                if (choice?.outcome === 'accepted') {
                    markInstalled();
                }
                return { outcome: choice?.outcome || 'dismissed' };
            }

            return { outcome: 'unsupported' };
        } catch (error) {
            if (error?.name === 'AbortError') {
                return { outcome: 'aborted' };
            }
            if (import.meta.env.DEV) console.error('Error al iniciar instalación PWA:', error);
            return { outcome: 'error', error };
        } finally {
            setIsInstalling(false);
        }
    }, [hasManifest, isInstalled, isInstalling, supportsWebInstall]);

    return {
        canInstall,
        isInstalled,
        isInstalling,
        triggerInstall,
    };
}
