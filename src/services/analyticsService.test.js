// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import storageRepository, { STORAGE_KEYS } from './storageRepository';
import {
    __resetAnalyticsStateForTests,
    __setAnalyticsTestOverrides,
    getAnalyticsConsent,
    sanitizeEventProperties,
    setAnalyticsConsent,
    syncAnalyticsAuthUser,
    track,
    trackPageView,
} from './analyticsService';

function createFakePostHog() {
    return {
        init: vi.fn(),
        capture: vi.fn(),
        identify: vi.fn(),
        reset: vi.fn(),
        register: vi.fn(),
        opt_out_capturing: vi.fn(),
    };
}

describe('analyticsService - PostHog Cloud EU, consentimiento opt-in e identificación', () => {
    let fakePostHog;
    let loadPostHogMock;

    beforeEach(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
        __resetAnalyticsStateForTests();
        fakePostHog = createFakePostHog();
        loadPostHogMock = vi.fn(async () => ({ default: fakePostHog }));
        __setAnalyticsTestOverrides({
            loadPostHog: loadPostHogMock,
            getEnv: () => ({
                posthogKey: 'phc_test_public_key',
                posthogHost: 'https://eu.i.posthog.com',
                isTestEnv: false,
                isDev: false,
                allowedHostsEnv: 'localhost,mi-avance-academico.vercel.app',
            }),
        });
    });

    afterEach(() => {
        __setAnalyticsTestOverrides(null);
        __resetAnalyticsStateForTests();
    });

    it('no inicializa PostHog ni emite eventos ni persiste identificadores antes del consentimiento opt-in', async () => {
        expect(getAnalyticsConsent()).toBe('pending');

        await trackPageView({ path: '/mis-materias', title: 'Mis Materias' });
        await track('onboarding_completed', { plan: '17.14', method: 'manual', marked_count: 3 });

        expect(loadPostHogMock).not.toHaveBeenCalled();
        expect(fakePostHog.init).not.toHaveBeenCalled();
        expect(fakePostHog.capture).not.toHaveBeenCalled();
        expect(storageRepository.getAnalyticsFirstSeen()).toBeNull();
    });

    it('al aceptar opt-in inicializa Cloud EU sin autocapture/replay, distingue usuario nuevo y emite $pageview actual sin duplicar', async () => {
        await trackPageView({ path: '/simulador', title: 'Simulador' });
        expect(fakePostHog.capture).not.toHaveBeenCalled();

        await setAnalyticsConsent('accepted');

        expect(getAnalyticsConsent()).toBe('accepted');
        expect(fakePostHog.init).toHaveBeenCalledWith(
            'phc_test_public_key',
            expect.objectContaining({
                api_host: 'https://eu.i.posthog.com',
                autocapture: false,
                disable_session_recording: true,
                enable_heatmaps: false,
                capture_pageview: false,
                capture_pageleave: false,
                capture_performance: false,
                persistence: 'localStorage',
            }),
        );
        expect(storageRepository.getAnalyticsFirstSeen()?.userTenure).toBe('new_to_app');
        expect(fakePostHog.capture).toHaveBeenCalledWith(
            'first_visit_recorded',
            expect.objectContaining({ user_tenure: 'new_to_app' }),
        );
        expect(fakePostHog.capture).toHaveBeenCalledWith(
            '$pageview',
            expect.objectContaining({ page_path: '/simulador', page_title: 'Simulador' }),
        );

        // Re-navegar a la misma ruta no duplica $pageview
        const pageviewCallsBefore = fakePostHog.capture.mock.calls.filter(
            ([name]) => name === '$pageview',
        ).length;
        await trackPageView({ path: '/simulador', title: 'Simulador' });
        const pageviewCallsAfter = fakePostHog.capture.mock.calls.filter(
            ([name]) => name === '$pageview',
        ).length;
        expect(pageviewCallsAfter).toBe(pageviewCallsBefore);
    });

    it('distingue usuario histórico previo a PostHog cuando ya existía uso en localStorage', async () => {
        window.localStorage.setItem(STORAGE_KEYS.PLAN_ACTIVO, '17.14');

        await setAnalyticsConsent('accepted');

        expect(storageRepository.getAnalyticsFirstSeen()?.userTenure).toBe('returning_pre_analytics');
        expect(fakePostHog.capture).toHaveBeenCalledWith(
            'first_visit_recorded',
            expect.objectContaining({ user_tenure: 'returning_pre_analytics' }),
        );
    });

    it('al rechazar o revocar detiene capturas, limpia ph_* y first_seen pero conserva unlu_analytics_consent:v1', async () => {
        await setAnalyticsConsent('accepted');
        window.localStorage.setItem('ph_phc_test_public_key_posthog', '{"distinct_id":"anon-1"}');

        await setAnalyticsConsent('rejected');

        expect(fakePostHog.opt_out_capturing).toHaveBeenCalledTimes(1);
        expect(fakePostHog.reset).toHaveBeenCalledTimes(1);
        expect(window.localStorage.getItem('ph_phc_test_public_key_posthog')).toBeNull();
        expect(storageRepository.getAnalyticsFirstSeen()).toBeNull();
        expect(getAnalyticsConsent()).toBe('rejected');

        await track('pdf_exported', { plan: '17.14' });
        expect(loadPostHogMock).toHaveBeenCalledTimes(1);
    });

    it('reconcilia sesión de Firebase Auth restaurada antes de aceptar y evita fusionar cuentas distintas', async () => {
        // Firebase Auth ya restauró uid-A antes del consentimiento
        syncAnalyticsAuthUser('uid-A');
        await setAnalyticsConsent('accepted');

        expect(fakePostHog.identify).toHaveBeenCalledWith('uid-A', {
            auth_state: 'authenticated',
            has_google_account: true,
        });

        // Cambio a otra cuenta Google uid-B en el mismo navegador -> reset() antes de identify(uid-B)
        syncAnalyticsAuthUser('uid-B');
        expect(fakePostHog.reset).toHaveBeenCalledTimes(1);
        expect(fakePostHog.identify).toHaveBeenLastCalledWith('uid-B', {
            auth_state: 'authenticated',
            has_google_account: true,
        });

        // Logout -> reset() pero mantiene preferencia de consentimiento
        syncAnalyticsAuthUser(null);
        expect(fakePostHog.reset).toHaveBeenCalledTimes(2);
        expect(getAnalyticsConsent()).toBe('accepted');
    });

    it('bloquea inicialización en Vitest y hosts no autorizados y resiste errores del proveedor', async () => {
        __setAnalyticsTestOverrides({
            loadPostHog: loadPostHogMock,
            getEnv: () => ({
                posthogKey: 'phc_test_public_key',
                posthogHost: 'https://eu.i.posthog.com',
                isTestEnv: true,
                isDev: true,
                allowedHostsEnv: 'mi-avance-academico.vercel.app',
            }),
        });
        await setAnalyticsConsent('accepted');
        expect(loadPostHogMock).not.toHaveBeenCalled();

        // Host no autorizado
        __setAnalyticsTestOverrides({
            loadPostHog: loadPostHogMock,
            getEnv: () => ({
                posthogKey: 'phc_test_public_key',
                posthogHost: 'https://eu.i.posthog.com',
                isTestEnv: false,
                isDev: false,
                allowedHostsEnv: 'solo-produccion.vercel.app',
            }),
        });
        await track('pdf_exported', { plan: '17.14' });
        expect(loadPostHogMock).not.toHaveBeenCalled();

        // Bloqueo/fallo del SDK en red no rompe el flujo
        __setAnalyticsTestOverrides({
            loadPostHog: vi.fn().mockRejectedValue(new Error('Blocked by adblocker')),
            getEnv: () => ({
                posthogKey: 'phc_test_public_key',
                posthogHost: 'https://eu.i.posthog.com',
                isTestEnv: false,
                isDev: true,
                allowedHostsEnv: 'localhost',
            }),
        });
        await expect(track('pdf_exported', { plan: '17.14' })).resolves.toBeUndefined();
    });

    it('elimina propiedades PII prohibidas y sanitiza URLs', () => {
        const sanitized = sanitizeEventProperties({
            plan: '17.14',
            uid: 'secret-uid',
            email: 'alumno@unlu.edu.ar',
            dni: '40123456',
            nota: 9,
            search_term: 'analisis',
            $current_url: 'https://mi-avance-academico.vercel.app/simulador?dni=123&utm_source=ig',
        });

        expect(sanitized).toEqual({
            plan: '17.14',
            $current_url: 'https://mi-avance-academico.vercel.app/simulador?utm_source=ig',
        });
    });
});
