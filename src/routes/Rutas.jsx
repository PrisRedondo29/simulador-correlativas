import React, { Suspense, lazy } from 'react';
import { useRoutes } from 'react-router-dom';
import { Spinner } from '@heroui/react';
import PlanFeatureRoute from '../components/Auth/PlanFeatureRoute';

const Inicio = lazy(() => import('../pages/Inicio'));
const Progreso = lazy(() => import('../pages/Progreso'));
const Cursada = lazy(() => import('../pages/Cursada'));
const Simulador = lazy(() => import('../pages/Simulador'));
const Equivalencias = lazy(() => import('../pages/Equivalencias'));
const TransicionPlan = lazy(() => import('../pages/TransicionPlan'));
const ComoUsar = lazy(() => import('../pages/ComoUsar'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const Contacto = lazy(() => import('../pages/Contacto'));

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
            path: '/progreso',
            element: <Progreso plan={plan} setPlan={setPlan} />,
        },
        {
            path: '/cursada',
            element: <Cursada plan={plan} />,
        },
        {
            path: '/simulador',
            element: <Simulador plan={plan} setPlan={setPlan} />,
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
            element: (
                <PlanFeatureRoute feature="planTransition">
                    <TransicionPlan plan={plan} setPlan={setPlan} />
                </PlanFeatureRoute>
            ),
        },
        {
            path: '/como-usar',
            element: <ComoUsar />,
        },
        {
            path: '/config',
            element: <SettingsPage plan={plan} setPlan={setPlan} />,
        },
        {
            path: '/contacto',
            element: <Contacto />,
        },
    ]);

    return (
        <Suspense fallback={<LoadingFallback />}>
            {componentesRutas}
        </Suspense>
    );
};

export default Rutas;
