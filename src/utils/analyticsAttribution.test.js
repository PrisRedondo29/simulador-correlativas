import { describe, it, expect } from 'vitest';
import {
    ATTRIBUTION_STORAGE_KEY,
    captureTrafficAttribution,
    extractReferrerHost,
    getTrafficAttributionParams,
    isAnalyticsHostAllowed,
    parseAllowedAnalyticsHosts,
    sanitizeAnalyticsUrl,
} from './analyticsAttribution';

function createMemoryStorage() {
    const map = new Map();
    return {
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, val) => {
            map.set(key, String(val));
        },
        removeItem: (key) => {
            map.delete(key);
        },
        clear: () => map.clear(),
        key: (index) => Array.from(map.keys())[index] ?? null,
        get length() {
            return map.size;
        },
    };
}

describe('analyticsAttribution - filtro de dominios GA4 y persistencia UTM SPA', () => {
    it('permite solo hostnames autorizados en producción y habilita siempre en DEV', () => {
        expect(parseAllowedAnalyticsHosts('')).toEqual(['mi-avance-academico.vercel.app']);
        expect(parseAllowedAnalyticsHosts('avance.unlu.edu.ar, custom.app ')).toEqual([
            'avance.unlu.edu.ar',
            'custom.app',
        ]);

        expect(
            isAnalyticsHostAllowed('mi-avance-academico.vercel.app', { isDev: false, isTestEnv: false }),
        ).toBe(true);
        expect(
            isAnalyticsHostAllowed('clon-externo.netlify.app', { isDev: false, isTestEnv: false }),
        ).toBe(false);
        expect(
            isAnalyticsHostAllowed('dev-simulador.vercel.app', {
                isDev: false,
                isTestEnv: false,
                allowedHostsEnv: 'mi-avance-academico.vercel.app,dev-simulador.vercel.app',
            }),
        ).toBe(true);
        expect(isAnalyticsHostAllowed('localhost', { isDev: true, isTestEnv: false })).toBe(true);
        // En Vitest (isTestEnv por defecto) bloquea incluso hostnames de producción
        expect(isAnalyticsHostAllowed('mi-avance-academico.vercel.app')).toBe(false);
    });

    it('sanitiza URLs eliminando query params arbitrarios y hashes pero conservando UTMs', () => {
        expect(
            sanitizeAnalyticsUrl(
                'https://mi-avance-academico.vercel.app/mis-materias?token=secret123&utm_source=ig&dni=12345678#hash',
            ),
        ).toBe('https://mi-avance-academico.vercel.app/mis-materias?utm_source=ig');
    });

    it('extrae referrer externo excluyendo autoreferencias o URLs inválidas', () => {
        expect(
            extractReferrerHost('https://priscila-redondo.netlify.app/cv', 'mi-avance-academico.vercel.app'),
        ).toBe('priscila-redondo.netlify.app');
        expect(
            extractReferrerHost(
                'https://mi-avance-academico.vercel.app/inicio',
                'mi-avance-academico.vercel.app',
            ),
        ).toBeNull();
        expect(extractReferrerHost('not-a-valid-url', 'mi-avance-academico.vercel.app')).toBeNull();
    });

    it('conserva UTMs y referrer en sessionStorage al navegar internamente y actualiza si llega una campaña nueva', () => {
        const storage = createMemoryStorage();

        const landing = getTrafficAttributionParams({
            search: '?utm_source=portfolio&utm_medium=referral&utm_campaign=lanzamiento',
            referrer: 'https://priscila-redondo.netlify.app/',
            hostname: 'mi-avance-academico.vercel.app',
            storage,
        });

        expect(landing).toEqual({
            app_hostname: 'mi-avance-academico.vercel.app',
            referrer_host: 'priscila-redondo.netlify.app',
            utm_source: 'portfolio',
            utm_medium: 'referral',
            utm_campaign: 'lanzamiento',
        });

        // Navegación interna SPA ya sin query string ni referrer nuevo: preserva atribución inicial
        const internalNav = getTrafficAttributionParams({
            search: '',
            referrer: '',
            hostname: 'mi-avance-academico.vercel.app',
            storage,
        });
        expect(internalNav).toEqual(landing);

        // Si el usuario vuelve a entrar con otra etiqueta UTM explícita, actualiza la sesión
        const updated = captureTrafficAttribution({
            search: '?utm_source=codes&utm_medium=qr',
            referrer: '',
            hostname: 'mi-avance-academico.vercel.app',
            storage,
        });
        expect(updated.utm_source).toBe('codes');
        expect(updated.utm_medium).toBe('qr');
        expect(updated.referrer_host).toBe('priscila-redondo.netlify.app');
        expect(JSON.parse(storage.getItem(ATTRIBUTION_STORAGE_KEY))).toEqual(updated);
    });
});
