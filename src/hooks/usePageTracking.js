/**
 * Hook que actualiza metadatos SEO por ruta, trackea cada vista única (`$pageview`)
 * y mide tiempo activo estimado por pantalla descontando inactividad y pestaña oculta.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { applyRouteSeo } from '../config/routeSeo';
import { trackActiveFeatureTime, trackPageView } from '../services/analyticsService';
import { createActiveTimeTracker } from '../utils/analyticsActiveTime';

const INTERACTION_THROTTLE_MS = 2000;

export function usePageTracking() {
    const location = useLocation();
    const trackerRef = useRef(null);

    if (!trackerRef.current) {
        trackerRef.current = createActiveTimeTracker({
            onFlush: ({ route, feature, activeSeconds }) => {
                trackActiveFeatureTime({ route, feature, activeSeconds });
            },
            initialVisible:
                typeof document === 'undefined' ? true : document.visibilityState !== 'hidden',
        });
    }

    useEffect(() => {
        const seo = applyRouteSeo(location.pathname);
        trackPageView({ path: location.pathname, title: seo.title });
        trackerRef.current?.startRoute(location.pathname);
    }, [location.pathname]);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
        const tracker = trackerRef.current;
        if (!tracker) return undefined;

        let lastRecordedInteraction = 0;
        const handleInteraction = () => {
            const now = Date.now();
            if (now - lastRecordedInteraction < INTERACTION_THROTTLE_MS) return;
            lastRecordedInteraction = now;
            tracker.recordInteraction();
        };

        const handleVisibilityChange = () => {
            tracker.setVisible(document.visibilityState !== 'hidden');
        };

        const handlePageHide = () => {
            tracker.flush();
        };

        const interactionEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
        interactionEvents.forEach((ev) =>
            window.addEventListener(ev, handleInteraction, { passive: true }),
        );
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);

        return () => {
            interactionEvents.forEach((ev) => window.removeEventListener(ev, handleInteraction));
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
            tracker.flush();
        };
    }, []);
}
