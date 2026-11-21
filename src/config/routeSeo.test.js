// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { CANONICAL_ORIGIN, applyRouteSeo, getRouteSeo } from './routeSeo';

describe('routeSeo - metadatos dinámicos y URL canónica por ruta', () => {
    beforeEach(() => {
        document.head.innerHTML = '';
        document.title = '';
    });

    it('normaliza rutas con barra final y devuelve fallback seguro para rutas desconocidas', () => {
        const materiasSeo = getRouteSeo('/mis-materias/');
        expect(materiasSeo.title).toBe('Mis Materias');
        expect(materiasSeo.canonicalUrl).toBe(`${CANONICAL_ORIGIN}/mis-materias`);

        const fallbackSeo = getRouteSeo('/ruta-inexistente');
        expect(fallbackSeo.canonicalUrl).toBe(`${CANONICAL_ORIGIN}/`);
        expect(fallbackSeo.title).toBe('Inicio');
    });

    it('actualiza document.title, description, Open Graph y link rel=canonical en el DOM', () => {
        applyRouteSeo('/simulador');

        expect(document.title).toContain('Simulador de Avance');
        expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
            'cuatrimestre',
        );
        expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
            `${CANONICAL_ORIGIN}/simulador`,
        );
        expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
            `${CANONICAL_ORIGIN}/simulador`,
        );

        applyRouteSeo('/cambio-plan');
        expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
            `${CANONICAL_ORIGIN}/cambio-plan`,
        );
        expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    });
});
