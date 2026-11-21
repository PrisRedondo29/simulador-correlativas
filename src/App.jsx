import { useState, useEffect, lazy, Suspense } from 'react';
import NavBar, { TopUtilityBar } from './components/NavBar';
import { BrowserRouter, useLocation } from 'react-router-dom';
import Rutas from './routes/Rutas';
import ScrollToTop from './components/Shared/ScrollToTop';
import AutoScrollTop from './components/Shared/AutoScrollTop';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlanProvider, useActivePlan } from './context/PlanContext';
import { usePageTracking } from './hooks/usePageTracking';
import ServerError from './components/Shared/ServerError';
import ErrorBoundary from './components/Shared/ErrorBoundary';
import OnboardingGate from './components/Onboarding/OnboardingGate';
import storageRepository, { STORAGE_KEYS } from './services/storageRepository';

const Footer = lazy(() => import('./components/Footer'));
const SyncModal = lazy(() => import('./components/SyncModal'));
const PwaUpdatePrompt = lazy(() => import('./components/Pwa/PwaUpdatePrompt'));

function AppContent() {
    const { isCriticalError } = useAuth();
    const { plan, setPlan } = useActivePlan();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(() =>
        Boolean(storageRepository.getJSON(STORAGE_KEYS.SIDEBAR_COLLAPSED, false)),
    );

    usePageTracking();

    useEffect(() => {
        storageRepository.setJSON(STORAGE_KEYS.SIDEBAR_COLLAPSED, isCollapsed, { silent: true });
    }, [isCollapsed]);

    if (isCriticalError) {
        return <ServerError />;
    }

    return (
        <OnboardingGate>
            <div className="flex items-start min-h-screen overflow-x-clip bg-[#F8FAFC] dark:bg-[#0F1419]">
                <NavBar plan={plan} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
                <main className={`flex-1 min-w-0 min-h-screen flex flex-col relative pt-14 lg:pt-0 transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                    <TopUtilityBar plan={plan} />
                    <div className={`flex-1 ${location.pathname === '/simulador' ? 'flex flex-col min-h-0' : ''}`}>
                        <ErrorBoundary scope="page" resetKey={location.pathname}>
                            <Rutas plan={plan} setPlan={setPlan} />
                        </ErrorBoundary>
                    </div>
                    <Suspense fallback={null}>
                        <Footer />
                    </Suspense>
                    <ScrollToTop />
                </main>
            </div>
        </OnboardingGate>
    );
}

function App() {
    return (
        <ErrorBoundary scope="app">
            <AuthProvider>
                <PlanProvider>
                    <BrowserRouter>
                        <AutoScrollTop />
                        <Suspense fallback={null}>
                            <SyncModal />
                            <PwaUpdatePrompt />
                        </Suspense>
                        <AppContent />
                    </BrowserRouter>
                </PlanProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
