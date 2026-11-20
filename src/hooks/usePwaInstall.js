import { useState, useEffect, useCallback, useRef } from 'react';

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

/**
 * Hook de mejora progresiva para instalar la PWA siguiendo el estándar moderno:
 *  - Prioriza Web Install API (`navigator.install()`) cuando esté disponible.
 *  - Usa `beforeinstallprompt` como fallback (descartando el evento de un solo uso antes de esperar `userChoice`).
 *  - Expone `canInstall: false` cuando la app ya está instalada o el navegador no soporta
 *    ningún mecanismo programático (degradación elegante sin botones rotos).
 */
export default function usePwaInstall() {
    const [isInstalled, setIsInstalled] = useState(() => detectStandalone());
    const [supportsWebInstall] = useState(() => detectWebInstallSupport());
    const [hasDeferredPrompt, setHasDeferredPrompt] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);

    const deferredPromptRef = useRef(null);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const handleBeforeInstallPrompt = (event) => {
            event.preventDefault();
            deferredPromptRef.current = event;
            setHasDeferredPrompt(true);
        };

        const handleAppInstalled = () => {
            deferredPromptRef.current = null;
            setHasDeferredPrompt(false);
            setIsInstalled(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const triggerInstall = useCallback(async () => {
        if (isInstalling || isInstalled) {
            return { outcome: 'ignored' };
        }

        setIsInstalling(true);
        try {
            if (supportsWebInstall && typeof navigator.install === 'function') {
                // Invocación directa durante el clic para preservar transient user activation
                await navigator.install();
                setIsInstalled(true);
                return { outcome: 'accepted' };
            }

            if (deferredPromptRef.current) {
                // El evento beforeinstallprompt es de un solo uso: limpiarlo antes de await
                const promptEvent = deferredPromptRef.current;
                deferredPromptRef.current = null;
                setHasDeferredPrompt(false);

                await promptEvent.prompt();
                const choice = await promptEvent.userChoice;
                if (choice?.outcome === 'accepted') {
                    setIsInstalled(true);
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
    }, [isInstalled, isInstalling, supportsWebInstall]);

    const canInstall = !isInstalled && (supportsWebInstall || hasDeferredPrompt);

    return {
        canInstall,
        isInstalled,
        isInstalling,
        triggerInstall,
    };
}
