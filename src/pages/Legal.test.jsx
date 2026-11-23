// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanProvider } from '../context/PlanContext';
import Legal from './Legal';

describe('Legal - Transparencia de datos y PostHog Cloud EU', () => {
    afterEach(() => {
        cleanup();
    });

    it('describe PostHog Cloud EU opt-in, SAWeb local, respaldos JSON y aclara límites de eliminación en PostHog', () => {
        render(
            <MemoryRouter>
                <PlanProvider>
                    <Legal />
                </PlanProvider>
            </MemoryRouter>,
        );

        expect(screen.getAllByText(/PostHog Cloud EU/i).length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText(/Respaldos exportados manualmente/i)).toBeTruthy();
        expect(
            screen.getByText(/no elimina automáticamente.*eventos agregados históricos ya enviados a PostHog/i),
        ).toBeTruthy();
    });
});
