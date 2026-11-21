export const DEV_SIMULATE_NEWCOMER_EVENT = 'unlu-dev-simulate-newcomer';

/**
 * Dispara el modo de simulación de ingresante nuevo en desarrollo local
 * para probar el onboarding completo desde cero sin perder los datos guardados.
 */
export function triggerDevSimulateNewcomer() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(DEV_SIMULATE_NEWCOMER_EVENT));
    }
}
