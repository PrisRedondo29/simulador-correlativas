import { describe, it, expect, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

describe('ErrorBoundary - Captura segura de errores de render (DEV vs PROD)', () => {
    it('deriva estado de error al recibir una excepción', () => {
        const err = new TypeError('Cannot read properties of undefined');
        const state = ErrorBoundary.getDerivedStateFromError(err);

        expect(state).toEqual({
            hasError: true,
            error: err,
            reportSent: true,
        });
    });

    it('inicializa sin errores y resetea estado cuando cambia resetKey', () => {
        const instance = new ErrorBoundary({ resetKey: '/mis-materias', children: null });
        expect(instance.state).toEqual({ hasError: false, error: null, reportSent: false });

        let nextState = null;
        instance.state = { hasError: true, error: new Error('fallo'), reportSent: true };
        instance.props = { resetKey: '/inicio', children: null };
        instance.setState = (s) => {
            nextState = s;
        };

        instance.componentDidUpdate({ resetKey: '/mis-materias' });
        expect(nextState).toEqual({ hasError: false, error: null, reportSent: false });
    });

    it('en componentDidCatch envía el reporte con persistToDatabase=true para el Panel Admin', () => {
        const mockReport = vi.fn();
        const instance = new ErrorBoundary({
            scope: 'page',
            isDev: false,
            onReportError: mockReport,
            children: null,
        });

        const err = new Error('Fallo interno con dato sensible');
        instance.componentDidCatch(err, { componentStack: '\n    in Progreso\n    in App' });

        expect(mockReport).toHaveBeenCalledWith(err, {
            errorCode: 'ui/error-boundary',
            componentStack: '\n    in Progreso\n    in App',
            persistToDatabase: true,
            context: { scope: 'page' },
        });
    });

    it('en modo Producción (isDev=false) oculta el mensaje técnico y muestra aviso de envío + botón Contacto', () => {
        const secretMsg = 'TypeError: internal token xyz_secret_123 failed';
        const prodInstance = new ErrorBoundary({
            scope: 'app',
            isDev: false,
            children: null,
        });
        prodInstance.state = {
            hasError: true,
            error: new Error(secretMsg),
            reportSent: true,
        };

        const prodTree = JSON.stringify(prodInstance.render());
        expect(prodTree).toContain('El reporte del error fue enviado automáticamente');
        expect(prodTree).toContain('Contacto');
        expect(prodTree).not.toContain(secretMsg);
        expect(prodTree).not.toContain('Ver detalle técnico');

        // En modo Desarrollo (isDev=true) sí incluye el detalle técnico
        const devInstance = new ErrorBoundary({
            scope: 'app',
            isDev: true,
            children: null,
        });
        devInstance.state = {
            hasError: true,
            error: new Error(secretMsg),
            reportSent: true,
        };
        const devTree = JSON.stringify(devInstance.render());
        expect(devTree).toContain(secretMsg);
        expect(devTree).toContain('Ver detalle técnico');
    });
});
