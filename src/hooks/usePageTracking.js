/**
 * Hook que trackea automáticamente cada cambio de ruta como un page_view en GA4.
 * Se monta una sola vez en App.jsx y no necesita props.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../services/analyticsService';

// Mapeo de rutas a títulos legibles para GA4
const PAGE_TITLES = {
    '/':              'Inicio',
    '/mis-materias':  'Mis Materias',
    '/mi-agenda':     'Mi Agenda',
    '/simulador':     'Simulador de Avance',
    '/equivalencias': 'Equivalencias entre Planes',
    '/cambio-plan':   'Cambio de Plan',
    '/como-usar':     'Cómo Usar',
    '/configuracion': 'Configuración',
    '/contacto':      'Contacto',
};

export function usePageTracking() {
    const location = useLocation();

    useEffect(() => {
        const title = PAGE_TITLES[location.pathname] ?? location.pathname;
        trackPageView({ path: location.pathname, title });
    }, [location.pathname]);
}
