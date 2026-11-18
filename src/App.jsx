import { useState, useEffect, lazy, Suspense } from 'react';
import NavBar, { TopUtilityBar } from './components/NavBar';
import { BrowserRouter } from 'react-router-dom';
import Rutas from './routes/Rutas';
import ScrollToTop from './components/Shared/ScrollToTop';
import AutoScrollTop from './components/Shared/AutoScrollTop';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlanProvider, useActivePlan } from './context/PlanContext';
import { usePageTracking } from './hooks/usePageTracking';
import ServerError from './components/Shared/ServerError';

const Footer = lazy(() => import('./components/Footer'));
const SyncModal = lazy(() => import('./components/SyncModal'));

function AppContent() {
    const { isCriticalError } = useAuth();
    const { plan, setPlan } = useActivePlan();
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebar_collapsed:v1');
        return saved ? JSON.parse(saved) : false;
    });

    usePageTracking();

    useEffect(() => {
        localStorage.setItem('sidebar_collapsed:v1', JSON.stringify(isCollapsed));
    }, [isCollapsed]);

    if (isCriticalError) {
        return <ServerError />;
    }

    return (
        <div className="flex items-start min-h-screen overflow-x-clip bg-[#F8FAFC] dark:bg-[#0F1419]">
            <NavBar plan={plan} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
            <main className={`flex-1 min-w-0 min-h-screen flex flex-col relative pt-14 lg:pt-0 transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                <TopUtilityBar plan={plan} />
                <div className="flex-1">
                    <Rutas plan={plan} setPlan={setPlan} />
                </div>
                <Suspense fallback={null}>
                    <Footer />
                </Suspense>
                <ScrollToTop />
            </main>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <PlanProvider>
                <BrowserRouter>
                    <AutoScrollTop />
                    <Suspense fallback={null}>
                        <SyncModal />
                    </Suspense>
                    <AppContent />
                </BrowserRouter>
            </PlanProvider>
        </AuthProvider>
    );
}

export default App;
