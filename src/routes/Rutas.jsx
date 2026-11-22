import React, { Suspense, lazy } from 'react';
import { Navigate, useRoutes } from 'react-router-dom';
import { Spinner } from '@heroui/react';
import PlanFeatureRoute from '../components/Auth/PlanFeatureRoute';

const Inicio = lazy(() => import('../pages/Inicio'));
const Progreso = lazy(() => import('../pages/Progreso'));
const Cursada = lazy(() => import('../pages/Cursada'));
const Simulador = lazy(() => import('../pages/Simulador'));
const Estadisticas = lazy(() => import('../pages/Estadisticas'));
const Equivalencias = lazy(() => import('../pages/Equivalencias'));
const TransicionPlan = lazy(() => import('../pages/TransicionPlan'));
const ComoUsar = lazy(() => import('../pages/ComoUsar'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const Contacto = lazy(() => import('../pages/Contacto'));
const Legal = lazy(() => import('../pages/Legal'));

const LoadingFallback = () => (
    <div className="flex h-screen w-full items-center justify-center bg-background">
        <Spinner size="lg" color="primary" label="Cargando..." />
    </div>
);

const Rutas = ({ plan, setPlan }) => {
    const componentesRutas = useRoutes([
        {
            path: '/',
            element: <Inicio />,
        },
        {
            path: '/mis-materias',
            element: <Progreso plan={plan} setPlan={setPlan} />,
        },
        {
            path: '/progreso',
            element: <Navigate to="/mis-materias" replace />,
        },
        {
            path: '/mi-agenda',
            element: <Cursada plan={plan} />,
        },
        {
            path: '/cursada',
            element: <Navigate to="/mi-agenda" replace />,
        },
        {
            path: '/simulador',
            element: <Simulador plan={plan} setPlan={setPlan} />,
        },
        {
            path: '/estadisticas',
            element: <Estadisticas />,
        },
        {
            path: '/equivalencias',
            element: (
                <PlanFeatureRoute feature="equivalencias">
                    <Equivalencias />
                </PlanFeatureRoute>
            ),
        },
        {
            path: '/cambio-plan',
            element: (
                <PlanFeatureRoute feature="planTransition">
                    <TransicionPlan plan={plan} setPlan={setPlan} />
                </PlanFeatureRoute>
            ),
        },
        {
            path: '/transicion',
            element: <Navigate to="/cambio-plan" replace />,
        },
        {
            path: '/como-usar',
            element: <ComoUsar />,
        },
        {
            path: '/configuracion',
            element: <SettingsPage plan={plan} setPlan={setPlan} />,
        },
        {
            path: '/config',
            element: <Navigate to="/configuracion" replace />,
        },
        {
            path: '/contacto',
            element: <Contacto />,
        },
        {
            path: '/legal',
            element: <Legal />,
        },
        {
            path: '/privacidad',
            element: <Navigate to="/legal" replace />,
        },
    ]);

    return (
        <Suspense fallback={<LoadingFallback />}>
            {componentesRutas}
        </Suspense>
    );
};

export default Rutas;
