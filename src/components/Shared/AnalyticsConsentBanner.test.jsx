// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockSetAnalyticsConsent = vi.fn();
let mockConsentState = 'pending';

vi.mock('../../services/analyticsService', () => ({
    getAnalyticsConsent: () => mockConsentState,
    setAnalyticsConsent: async (next) => {
        mockConsentState = next;
        return mockSetAnalyticsConsent(next);
    },
}));

vi.mock('@heroui/react', () => ({
    Button: ({ children, onPress, isDisabled }) => (
        <button type="button" disabled={isDisabled} onClick={onPress}>
            {children}
        </button>
    ),
}));

import AnalyticsConsentBanner from './AnalyticsConsentBanner';

describe('AnalyticsConsentBanner - Consentimiento opt-in visible', () => {
    beforeEach(() => {
        mockConsentState = 'pending';
        mockSetAnalyticsConsent.mockClear();
    });

    afterEach(() => {
        cleanup();
    });

    it('se muestra cuando está pendiente y permite aceptar o rechazar', async () => {
        render(
            <MemoryRouter>
                <AnalyticsConsentBanner />
            </MemoryRouter>,
        );

        expect(screen.getByText(/Métricas opcionales de uso \(PostHog EU\)/i)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Rechazar/i }));

        await waitFor(() => {
            expect(mockSetAnalyticsConsent).toHaveBeenCalledWith('rejected');
            expect(screen.queryByText(/Métricas opcionales de uso/i)).toBeNull();
        });
    });
});
