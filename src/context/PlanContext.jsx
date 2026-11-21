import { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
    getPlanPolicy,
    canUseFeature,
    getPlanTransitionMeta,
    getPlanEquivalenciasMeta,
    getIntermediateTitleConfig,
    getCareerMeta,
} from '../config/planPolicies';
import {
    getAvailableCareers,
    getAvailablePlans,
    getCatalogCareers,
    mergeDynamicCatalogCareers,
} from '../config/careersRegistry';
import { getActiveTenantConfig } from '../config/tenantConfig';
import storageRepository, { subscribeStorageChanges } from '../services/storageRepository';
import { PlanContext } from './planContextInstance';

export function PlanProvider({ children }) {
    const [plan, setPlanState] = useState(() => storageRepository.getPlanActivo());
    const [catalogMeta, setCatalogMeta] = useState(() =>
        storageRepository.getCatalogMetaCache(),
    );

    useEffect(() => {
        const syncPlan = () => {
            setPlanState(storageRepository.getPlanActivo());
            setCatalogMeta(storageRepository.getCatalogMetaCache());
        };

        return subscribeStorageChanges(syncPlan);
    }, []);

    const setPlan = useCallback((nextPlan) => {
        setPlanState(nextPlan);
        storageRepository.setPlanActivo(nextPlan);
    }, []);

    const value = useMemo(() => {
        const effectiveRegistry = mergeDynamicCatalogCareers(catalogMeta?.plans);
        const tenant = getActiveTenantConfig();
        const policy = getPlanPolicy(plan, effectiveRegistry);
        const career = getCareerMeta(plan, effectiveRegistry);
        const availableCareers = getAvailableCareers(effectiveRegistry);
        const catalogCareers = getCatalogCareers(effectiveRegistry);
        const availablePlans = getAvailablePlans(effectiveRegistry);

        return {
            plan,
            setPlan,
            tenant,
            policy,
            career,
            availableCareers,
            catalogCareers,
            availablePlans,
            careersRegistry: effectiveRegistry,
            can: (featureName) => canUseFeature(plan, featureName, effectiveRegistry),
            canSimulateTransition: canUseFeature(plan, 'planTransition', effectiveRegistry),
            transitionInfo: getPlanTransitionMeta(plan, effectiveRegistry),
            equivalenciasInfo: getPlanEquivalenciasMeta(plan, effectiveRegistry),
            intermediateTitleInfo: getIntermediateTitleConfig(plan, effectiveRegistry),
        };
    }, [plan, setPlan, catalogMeta]);

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
 * Hook segregado de capacidades (ISP): expone únicamente permisos y metadatos
 * del plan y carrera activos sin acoplar componentes a localStorage ni reglas internas.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function usePlanCapabilities() {
    const ctx = useContext(PlanContext);
    if (!ctx) {
        throw new Error('usePlanCapabilities debe usarse dentro de <PlanProvider>');
    }
    return {
        plan: ctx.plan,
        tenant: ctx.tenant,
        policy: ctx.policy,
        career: ctx.career,
        availableCareers: ctx.availableCareers,
        catalogCareers: ctx.catalogCareers,
        availablePlans: ctx.availablePlans,
        careersRegistry: ctx.careersRegistry,
        can: ctx.can,
        canSimulateTransition: ctx.canSimulateTransition,
        transitionInfo: ctx.transitionInfo,
        equivalenciasInfo: ctx.equivalenciasInfo,
        intermediateTitleInfo: ctx.intermediateTitleInfo,
    };
}
