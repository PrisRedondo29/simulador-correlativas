// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import usePwaInstall, { __resetPwaInstallStoreForTests } from './usePwaInstall';

describe('usePwaInstall - Instalación progresiva (Web Install API + beforeinstallprompt fallback)', () => {
    const originalInstall = Navigator.prototype.install;

    const clearManifestLinks = () => {
        document.querySelectorAll('link[rel="manifest"]').forEach((el) => el.remove());
    };

    const addManifestLink = () => {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/manifest.webmanifest';
        document.head.appendChild(link);
    };

    beforeEach(() => {
        vi.clearAllMocks();
        __resetPwaInstallStoreForTests();
        clearManifestLinks();
        delete Navigator.prototype.install;
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn().mockReturnValue({ matches: false }),
        });
    });

    afterEach(() => {
        __resetPwaInstallStoreForTests();
        clearManifestLinks();
        if (originalInstall) {
            Navigator.prototype.install = originalInstall;
        } else {
            delete Navigator.prototype.install;
        }
        cleanup();
    });

    it('oculta la opción de instalación (canInstall: false) cuando no hay soporte ni evento capturado', () => {
        const { result } = renderHook(() => usePwaInstall());
        expect(result.current.canInstall).toBe(false);
        expect(result.current.isInstalled).toBe(false);
    });

    it('oculta la opción de instalación (canInstall: false) si existe navigator.install pero falta link[rel="manifest"] (modo dev)', () => {
        Navigator.prototype.install = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => usePwaInstall());
        expect(result.current.canInstall).toBe(false);
    });

    it('captura beforeinstallprompt, descarta el evento de un solo uso antes de esperar y oculta el botón tras aceptar', async () => {
        const { result } = renderHook(() => usePwaInstall());

        const promptSpy = vi.fn().mockResolvedValue(undefined);
        const fakeEvent = new Event('beforeinstallprompt');
        fakeEvent.preventDefault = vi.fn();
        fakeEvent.prompt = promptSpy;
        fakeEvent.userChoice = Promise.resolve({ outcome: 'accepted' });

        act(() => {
            window.dispatchEvent(fakeEvent);
        });

        expect(fakeEvent.preventDefault).toHaveBeenCalledTimes(1);
        expect(result.current.canInstall).toBe(true);

        let installRes;
        await act(async () => {
            installRes = await result.current.triggerInstall();
        });

        expect(promptSpy).toHaveBeenCalledTimes(1);
        expect(installRes.outcome).toBe('accepted');
        expect(result.current.isInstalled).toBe(true);
        expect(result.current.canInstall).toBe(false);
    });

    it('prioriza navigator.install() cuando hay manifest y conserva el botón ante AbortError', async () => {
        addManifestLink();
        const mockNavInstall = vi
            .fn()
            .mockRejectedValueOnce(Object.assign(new Error('cancel'), { name: 'AbortError' }))
            .mockResolvedValueOnce(undefined);

        Navigator.prototype.install = mockNavInstall;

        const { result } = renderHook(() => usePwaInstall());
        expect(result.current.canInstall).toBe(true);

        let first;
        await act(async () => {
            first = await result.current.triggerInstall();
        });
        expect(first.outcome).toBe('aborted');
        expect(result.current.canInstall).toBe(true);

        let second;
        await act(async () => {
            second = await result.current.triggerInstall();
        });
        expect(second.outcome).toBe('accepted');
        expect(result.current.isInstalled).toBe(true);
        expect(result.current.canInstall).toBe(false);
    });

    it('detecta modo standalone ya instalado y nunca muestra canInstall', () => {
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn().mockReturnValue({ matches: true }),
        });
        const { result } = renderHook(() => usePwaInstall());
        expect(result.current.isInstalled).toBe(true);
        expect(result.current.canInstall).toBe(false);
    });
});
