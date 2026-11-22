import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { isAnalyticsHostAllowed } from '../utils/analyticsAttribution';

const isTestEnv = import.meta.env.MODE === 'test' || Boolean(import.meta.env.VITEST);

const firebaseConfig = {
    apiKey:
        import.meta.env.VITE_FIREBASE_API_KEY ||
        (isTestEnv ? 'AIzaSyFakeKeyForCiTestingAndMocking12345' : undefined),
    authDomain:
        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
        (isTestEnv ? 'localhost' : undefined),
    projectId:
        import.meta.env.VITE_FIREBASE_PROJECT_ID ||
        (isTestEnv ? 'demo-simulador-unlu' : undefined),
    storageBucket:
        import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
        (isTestEnv ? 'demo-simulador-unlu.firebasestorage.app' : undefined),
    messagingSenderId:
        import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
        (isTestEnv ? '000000000000' : undefined),
    appId:
        import.meta.env.VITE_FIREBASE_APP_ID ||
        (isTestEnv ? '1:000000000000:web:000000000000' : undefined),
    measurementId:
        import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ||
        (isTestEnv ? 'G-0000000000' : undefined),
};

export const app = initializeApp(firebaseConfig);
if (import.meta.env.DEV) console.log('[Firebase] App inicializada. MeasurementID:', firebaseConfig.measurementId);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Lazy inicialización de analytics solo en entornos o dominios autorizados
/** @type {import('firebase/analytics').Analytics | null} */
export let analytics = null;
if (typeof window !== 'undefined' && isAnalyticsHostAllowed(window.location?.hostname)) {
    if (import.meta.env.DEV) console.log('[Firebase] Intentando cargar Analytics...');
    import('firebase/analytics')
        .then(({ getAnalytics }) => {
            if (import.meta.env.DEV) console.log('[Firebase] SDK de Analytics importado');
            analytics = getAnalytics(app);
            if (import.meta.env.DEV) console.log('[Firebase] Analytics inicializado correctamente:', analytics);
        })
        .catch((err) => {
            if (import.meta.env.DEV) console.error('[Firebase] Error cargando analytics:', err);
        });
}
