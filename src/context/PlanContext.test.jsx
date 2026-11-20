// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import storageRepository from '../services/storageRepository';
import { PlanProvider, useActivePlan, usePlanCapabilities } from './PlanContext';

const wrapper = ({ children }) => <PlanProvider>{children}</PlanProvider>;

describe('PlanContext - Plan activo, capacidades por carrera y sincronización con storage', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    afterEach(() => {
        cleanup();
    });

    it('inicializa desde storageRepository, actualiza capacidades al cambiar plan y reacciona a hidratación externa', () => {
        storageRepository.setPlanActivo('17.14', { silent: true });

        const { result } = renderHook(
            () => ({
                active: useActivePlan(),
                caps: usePlanCapabilities(),
            }),
            { wrapper },
        );

        expect(result.current.active.plan).toBe('17.14');
        expect(result.current.caps.can('planTransition')).toBe(false);
        expect(result.current.caps.can('equivalencias')).toBe(true);
        expect(result.current.caps.career?.id).toBe('sistemas');

        // Cambiar a 17.13 actualiza storage y habilita planTransition
        act(() => {
            result.current.active.setPlan('17.13');
        });

        expect(storageRepository.getPlanActivo()).toBe('17.13');
        expect(result.current.active.plan).toBe('17.13');
        expect(result.current.caps.can('planTransition')).toBe(true);
        expect(result.current.caps.transitionInfo?.targetPlan).toBe('17.14');

        // Cambio externo en storage + progress-hydrated sincroniza el contexto
        storageRepository.setPlanActivo('17.14', { silent: true });
        act(() => {
            window.dispatchEvent(new Event('progress-hydrated'));
        });
        expect(result.current.active.plan).toBe('17.14');
    });

    it('lanza error claro si useActivePlan o usePlanCapabilities se usan fuera de <PlanProvider>', () => {
        expect(() => renderHook(() => useActivePlan())).toThrow(/PlanProvider/);
        expect(() => renderHook(() => usePlanCapabilities())).toThrow(/PlanProvider/);
    });
});
