import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { addToast, Button, Spinner, useDisclosure } from '@heroui/react';
import { useAuth } from '../../context/AuthContext';
import { useActivePlan, usePlanCapabilities } from '../../context/PlanContext';
import planService from '../../services/planService';
import storageRepository, {
    CURRENT_ONBOARDING_VERSION,
    subscribeStorageChanges,
} from '../../services/storageRepository';
import {
    canUseFeature,
    getPlanPolicy,
    getPlanTransitionMeta,
} from '../../config/planPolicies';
import {
    trackProgresoInicial,
    trackSeleccionCarrera,
} from '../../services/analyticsService';
import LoginModal from '../Auth/LoginModal';
import { GoogleIcon } from '../Shared/BrandIcons';
import OnboardingPlanStep from './OnboardingPlanStep';
import OnboardingSubjectsStep from './OnboardingSubjectsStep';
import { DEV_SIMULATE_NEWCOMER_EVENT } from './onboardingEvents';

const FREE_ROUTES = ['/como-usar', '/contacto'];

/**
 * Compuerta global de Onboarding inicial para estudiantes:
 *  - Obligatoria en todas las pantallas académicas hasta completar (o omitir si ya usaba la app).
 *  - Deja accesibles `/como-usar` y `/contacto`.
 *  - Permite iniciar sesión con Google arriba para recuperar cuentas ya existentes desde la nube.
 *  - Redirige a `/cambio-plan` con evaluación automática si el alumno cargó materias en Plan 17.13.
 */
export default function OnboardingGate({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated, loading: authLoading, signIn, updateAuthProgreso } = useAuth();
    const { plan, setPlan } = useActivePlan();
    const { availableCareers, catalogCareers, careersRegistry, tenant } = usePlanCapabilities();
    const { isOpen: isLoginOpen, onOpen: onLoginOpen, onClose: onLoginClose } = useDisclosure();

    const [onboardingVersion, setOnboardingVersion] = useState(() =>
        storageRepository.getOnboardingVersionCompleted(),
    );
    const [hasExistingData, setHasExistingData] = useState(() =>
        storageRepository.hasExistingAcademicData(),
    );

    const [step, setStep] = useState(1);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [materias, setMaterias] = useState([]);
    const [loadingPlan, setLoadingPlan] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [devSimulateNewcomer, setDevSimulateNewcomer] = useState(false);
    const awaitingCloudLoginRef = useRef(false);

    useEffect(() => {
        if (!import.meta.env.DEV) return undefined;

        const handleSimulateNewcomer = () => {
            if (storageRepository.hasExistingAcademicData()) {
                storageRepository.saveRecoveryBackup(storageRepository.readAcademicBundle(), {
                    reason: 'pre_dev_simulate_newcomer',
                });
            }
            setStep(1);
            setSelectedPlan(null);
            setMaterias([]);
            setLoadError(null);
            setDevSimulateNewcomer(true);
        };

        window.addEventListener(DEV_SIMULATE_NEWCOMER_EVENT, handleSimulateNewcomer);
        return () => window.removeEventListener(DEV_SIMULATE_NEWCOMER_EVENT, handleSimulateNewcomer);
    }, []);

    useEffect(() => {
        const syncFromStorage = () => {
            const nextVersion = storageRepository.getOnboardingVersionCompleted();
            const nextHasData = storageRepository.hasExistingAcademicData();
            setOnboardingVersion(nextVersion);
            setHasExistingData(nextHasData);

            if (
                awaitingCloudLoginRef.current &&
                nextHasData &&
                nextVersion < CURRENT_ONBOARDING_VERSION
            ) {
                awaitingCloudLoginRef.current = false;
                storageRepository.setOnboardingVersionCompleted(CURRENT_ONBOARDING_VERSION);
                addToast({
                    title: '¡Bienvenido de vuelta!',
                    description: 'Recuperamos tus materias desde la nube.',
                    color: 'success',
                });
            }
        };

        return subscribeStorageChanges(syncFromStorage);
    }, []);

    useEffect(() => {
        if (
            isAuthenticated &&
            awaitingCloudLoginRef.current &&
            hasExistingData &&
            onboardingVersion < CURRENT_ONBOARDING_VERSION
        ) {
            awaitingCloudLoginRef.current = false;
            storageRepository.setOnboardingVersionCompleted(CURRENT_ONBOARDING_VERSION);
        }
    }, [isAuthenticated, hasExistingData, onboardingVersion]);

    const isFreeRoute = FREE_ROUTES.includes(location.pathname);
    const effectiveHasExistingData = devSimulateNewcomer ? false : hasExistingData;
    const shouldShowOnboarding =
        !authLoading &&
        (devSimulateNewcomer || onboardingVersion < CURRENT_ONBOARDING_VERSION) &&
        !isFreeRoute;

    const handleSignIn = async (rememberMe) => {
        awaitingCloudLoginRef.current = true;
        try {
            const loggedUser = await signIn(rememberMe);
            if (!loggedUser) {
                awaitingCloudLoginRef.current = false;
                return null;
            }
            if (storageRepository.hasExistingAcademicData()) {
                awaitingCloudLoginRef.current = false;
                storageRepository.setOnboardingVersionCompleted(CURRENT_ONBOARDING_VERSION);
                addToast({
                    title: '¡Bienvenido de vuelta!',
                    description: 'Recuperamos tus materias desde la nube.',
                    color: 'success',
                });
            } else {
                addToast({
                    title: 'Sesión iniciada',
                    description: 'Completá la configuración inicial para empezar.',
                    color: 'success',
                });
            }
            return loggedUser;
        } catch (err) {
            awaitingCloudLoginRef.current = false;
            throw err;
        }
    };

    const loadSubjectsForPlan = async (planNumero) => {
        setSelectedPlan(planNumero);
        setLoadingPlan(true);
        setLoadError(null);
        setStep(2);

        try {
            const list = await planService.getMateriasByPlan(planNumero);
            setMaterias(Array.isArray(list) ? list : []);
        } catch {
            setLoadError(`No pudimos cargar las materias del Plan ${planNumero}.`);
            setMaterias([]);
        } finally {
            setLoadingPlan(false);
        }
    };

    const handleSkipExisting = () => {
        storageRepository.setOnboardingVersionCompleted(CURRENT_ONBOARDING_VERSION);
    };

    const handleComplete = (progresoDraft, counts) => {
        if (!selectedPlan) return;

        if (hasExistingData) {
            storageRepository.saveRecoveryBackup(storageRepository.readAcademicBundle(), {
                reason: 'pre_onboarding_overwrite',
            });
        }

        const policy = getPlanPolicy(selectedPlan, careersRegistry);
        const supportsTransition = canUseFeature(selectedPlan, 'planTransition', careersRegistry);
        const transitionMeta = getPlanTransitionMeta(selectedPlan, careersRegistry);

        setPlan(selectedPlan);
        updateAuthProgreso(selectedPlan, progresoDraft, {});
        storageRepository.setOnboardingVersionCompleted(CURRENT_ONBOARDING_VERSION);

        trackSeleccionCarrera({
            plan: selectedPlan,
            origen_plan: 'welcome_modal',
            carrera: policy?.carrera,
        });
        trackProgresoInicial({
            plan: selectedPlan,
            aprobadas: counts.aprobadas,
            total: materias.length,
        });

        setStep(1);
        setDevSimulateNewcomer(false);

        if (supportsTransition && counts.totalMarcadas > 0) {
            navigate(transitionMeta?.route || '/cambio-plan', {
                replace: true,
                state: { fromOnboarding: true, autoEvaluate: true },
            });
            return;
        }

        navigate('/mis-materias', { replace: true });
    };

    if (!shouldShowOnboarding) {
        return children;
    }

    const activePolicy = selectedPlan ? getPlanPolicy(selectedPlan, careersRegistry) : null;
    const supportsTransition = selectedPlan
        ? canUseFeature(selectedPlan, 'planTransition', careersRegistry)
        : false;

    return (
        <div className="min-h-screen h-dvh flex flex-col bg-[#F8FAFC] dark:bg-[#0F1419]">
            <LoginModal isOpen={isLoginOpen} onClose={onLoginClose} onConfirm={handleSignIn} />

            {/* Barra superior compacta del asistente */}
            <header className="shrink-0 bg-white/95 dark:bg-[#161D24]/95 border-b border-[#E2E8F0] dark:border-[#2A3540] px-3 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3">
                <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-xl bg-[#005A36] dark:bg-[#2E8B63] text-white flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-graduation-cap text-xs" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] truncate">
                                {tenant?.shortName || 'UNLu'} · Configuración inicial
                            </p>
                            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                                Paso {step} de 2
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {(!isAuthenticated || devSimulateNewcomer) && (
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={onLoginOpen}
                                startContent={<GoogleIcon className="w-3.5 h-3.5" />}
                                className="min-h-11 sm:min-h-9 font-semibold text-xs rounded-xl bg-[#F1F5F9] dark:bg-[#1E2730] text-[#1E293B] dark:text-[#F1F5F9] border border-[#E2E8F0] dark:border-[#2A3540]"
                            >
                                Ya tengo cuenta
                            </Button>
                        )}

                        {effectiveHasExistingData && (
                            <Button
                                size="sm"
                                variant="light"
                                onPress={handleSkipExisting}
                                className="min-h-11 sm:min-h-9 font-semibold text-xs text-[#64748B] dark:text-[#CBD5E1]"
                            >
                                Omitir
                            </Button>
                        )}

                        {import.meta.env.DEV && devSimulateNewcomer && (
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={() => setDevSimulateNewcomer(false)}
                                className="min-h-11 sm:min-h-9 font-semibold text-xs rounded-xl bg-[#FEF3C7] dark:bg-[#2D2210] text-[#92400E] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#5C4318]"
                            >
                                DEV · Salir
                            </Button>
                        )}

                        <Link
                            to="/contacto"
                            className="min-h-11 sm:min-h-9 px-2.5 inline-flex items-center text-xs font-medium text-[#64748B] hover:text-[#005A36] dark:text-[#94A3B8] dark:hover:text-[#6EE7B7]"
                        >
                            Ayuda
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1 min-h-0 flex flex-col overflow-y-auto">
                {step === 1 && (
                    <OnboardingPlanStep
                        availableCareers={availableCareers}
                        catalogCareers={catalogCareers}
                        initialPlan={devSimulateNewcomer ? null : plan}
                        hasExistingData={effectiveHasExistingData}
                        onSelectPlan={loadSubjectsForPlan}
                        onSkip={handleSkipExisting}
                    />
                )}

                {step === 2 && loadingPlan && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
                        <Spinner size="lg" color="success" />
                        <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                            Cargando materias del Plan {selectedPlan}...
                        </p>
                    </div>
                )}

                {step === 2 && !loadingPlan && loadError && (
                    <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-center space-y-3">
                        <p className="text-sm font-semibold text-[#DC2626] dark:text-[#FCA5A5]">
                            {loadError}
                        </p>
                        <div className="flex items-center justify-center gap-2">
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={() => setStep(1)}
                                className="min-h-11 sm:min-h-9 rounded-xl"
                            >
                                Elegir otro plan
                            </Button>
                            <Button
                                size="sm"
                                color="primary"
                                onPress={() => loadSubjectsForPlan(selectedPlan)}
                                className="min-h-11 sm:min-h-9 rounded-xl bg-[#005A36] text-white"
                            >
                                Reintentar
                            </Button>
                        </div>
                    </div>
                )}

                {step === 2 && !loadingPlan && !loadError && (
                    <OnboardingSubjectsStep
                        key={selectedPlan}
                        plan={selectedPlan}
                        careerName={activePolicy?.carrera}
                        materias={materias}
                        supportsTransition={supportsTransition}
                        onBack={() => setStep(1)}
                        onComplete={handleComplete}
                    />
                )}
            </main>
        </div>
    );
}

OnboardingGate.propTypes = {
    children: PropTypes.node.isRequired,
};
