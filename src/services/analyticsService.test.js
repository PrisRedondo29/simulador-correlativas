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
    trackActiveFeatureTime,
    trackCloudSyncResult,
    trackPageView,
    trackProyeccionEgreso,
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

    it('verifica contrato completo de first_visit_recorded, first_action_completed (único entre recargas), feature_active_time, simulator_completed y cloud_sync_result', async () => {
        await setAnalyticsConsent('accepted');

        // 1. first_visit_recorded emitido una única vez
        const firstVisitCalls = () =>
            fakePostHog.capture.mock.calls.filter(([name]) => name === 'first_visit_recorded');
        expect(firstVisitCalls()).toHaveLength(1);

        // 2. simulator_completed dispara first_action_completed una única vez
        await trackProyeccionEgreso({
            plan: '17.14',
            semestres_totales: 8,
            anio_proyeccion: 2029,
            isTransition: false,
        });
        expect(fakePostHog.capture).toHaveBeenCalledWith('simulator_completed', {
            plan: '17.14',
            semesters_total: 8,
            projected_year: 2029,
            is_transition: false,
        });
        expect(
            fakePostHog.capture.mock.calls.filter(([name]) => name === 'first_action_completed'),
        ).toHaveLength(1);

        // Simular recarga de página: first_visit_recorded y first_action_completed NO se repiten
        __resetAnalyticsStateForTests();
        await setAnalyticsConsent('accepted');
        await trackProyeccionEgreso({
            plan: '17.14',
            semestres_totales: 9,
            anio_proyeccion: 2030,
            isTransition: true,
        });
        expect(firstVisitCalls()).toHaveLength(1);
        expect(
            fakePostHog.capture.mock.calls.filter(([name]) => name === 'first_action_completed'),
        ).toHaveLength(1);

        // 3. feature_active_time y cloud_sync_result sin PII
        await trackActiveFeatureTime({
            route: '/simulador',
            feature: 'simulador',
            activeSeconds: 42,
        });
        expect(fakePostHog.capture).toHaveBeenCalledWith('feature_active_time', {
            route: '/simulador',
            feature: 'simulador',
            active_seconds: 42,
        });

        await trackCloudSyncResult({ result: 'synced', origin: 'manual' });
        await trackCloudSyncResult({
            result: 'conflict_resolved',
            resolution: 'use_remote',
            origin: 'manual',
        });
        expect(fakePostHog.capture).toHaveBeenCalledWith('cloud_sync_result', {
            result: 'synced',
            origin: 'manual',
        });
        expect(fakePostHog.capture).toHaveBeenCalledWith('cloud_sync_result', {
            result: 'conflict_resolved',
            resolution: 'use_remote',
            origin: 'manual',
        });
    });
});
