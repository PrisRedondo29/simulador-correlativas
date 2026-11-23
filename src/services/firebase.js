import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
