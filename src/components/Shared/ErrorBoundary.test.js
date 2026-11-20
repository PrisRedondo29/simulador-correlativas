import { describe, it, expect } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

describe('ErrorBoundary - Captura segura de errores de render', () => {
    it('deriva estado de error al recibir una excepción', () => {
        const err = new TypeError('Cannot read properties of undefined');
        const state = ErrorBoundary.getDerivedStateFromError(err);

        expect(state).toEqual({
            hasError: true,
            error: err,
        });
    });

    it('inicializa sin errores y resetea estado cuando cambia resetKey', () => {
        const instance = new ErrorBoundary({ resetKey: '/progreso', children: null });
        expect(instance.state).toEqual({ hasError: false, error: null });

        let nextState = null;
        instance.state = { hasError: true, error: new Error('fallo') };
        instance.props = { resetKey: '/inicio', children: null };
        instance.setState = (s) => {
            nextState = s;
        };

        instance.componentDidUpdate({ resetKey: '/progreso' });
        expect(nextState).toEqual({ hasError: false, error: null });
    });
});
