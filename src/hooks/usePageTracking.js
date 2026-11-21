/**
 * Hook que actualiza metadatos SEO por ruta y trackea cada vista como `page_view` en GA4.
 * Se monta una sola vez en App.jsx y no necesita props.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applyRouteSeo } from '../config/routeSeo';
import { trackPageView } from '../services/analyticsService';

export function usePageTracking() {
    const location = useLocation();

    useEffect(() => {
        const seo = applyRouteSeo(location.pathname);
        trackPageView({ path: location.pathname, title: seo.title });
    }, [location.pathname]);
}
