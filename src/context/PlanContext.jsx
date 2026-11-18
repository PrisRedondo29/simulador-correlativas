import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
    getPlanPolicy,
    canUseFeature,
    getPlanTransitionMeta,
} from '../config/planPolicies';

const PLAN_STORAGE_KEY = 'plan_activo';

const PlanContext = createContext(null);

export function PlanProvider({ children }) {
    const [plan, setPlanState] = useState(() => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(PLAN_STORAGE_KEY);
    });

    useEffect(() => {
        const syncPlan = () => {
            setPlanState(localStorage.getItem(PLAN_STORAGE_KEY));
        };

        window.addEventListener('progress-hydrated', syncPlan);
        window.addEventListener('storage', syncPlan);
        return () => {
            window.removeEventListener('progress-hydrated', syncPlan);
            window.removeEventListener('storage', syncPlan);
        };
    }, []);

    const setPlan = useCallback((nextPlan) => {
        setPlanState(nextPlan);
        if (nextPlan) {
            localStorage.setItem(PLAN_STORAGE_KEY, nextPlan);
        } else {
            localStorage.removeItem(PLAN_STORAGE_KEY);
        }
    }, []);

    const value = useMemo(() => {
        const policy = getPlanPolicy(plan);
        return {
            plan,
            setPlan,
            policy,
            can: (featureName) => canUseFeature(plan, featureName),
            canSimulateTransition: canUseFeature(plan, 'planTransition'),
            transitionInfo: getPlanTransitionMeta(plan),
        };
    }, [plan, setPlan]);

    return (
        <PlanContext.Provider value={value}>
            {children}
        </PlanContext.Provider>
    );
}

PlanProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

// eslint-disable-next-line react-refresh/only-export-components
export function useActivePlan() {
    const ctx = useContext(PlanContext);
    if (!ctx) {
        throw new Error('useActivePlan debe usarse dentro de <PlanProvider>');
    }
    return { plan: ctx.plan, setPlan: ctx.setPlan };
}

/**
 * Hook segregado de capacidades (ISP): expone únicamente permisos/metadatos
 * del plan activo sin acoplar componentes a localStorage ni reglas internas.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function usePlanCapabilities() {
    const ctx = useContext(PlanContext);
    if (!ctx) {
        throw new Error('usePlanCapabilities debe usarse dentro de <PlanProvider>');
    }
    return {
        plan: ctx.plan,
        policy: ctx.policy,
        can: ctx.can,
        canSimulateTransition: ctx.canSimulateTransition,
        transitionInfo: ctx.transitionInfo,
    };
}
