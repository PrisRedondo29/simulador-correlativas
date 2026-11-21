// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import InteractiveTourOverlay from './InteractiveTourOverlay';
import storageRepository from '../../services/storageRepository';

vi.mock('../../services/analyticsService', () => ({
    trackTutorial: vi.fn(),
}));

vi.mock('@heroui/react', () => ({
    addToast: vi.fn(),
    Button: ({ children, onPress, isDisabled }) => (
        <button type="button" onClick={onPress} disabled={isDisabled}>
            {children}
        </button>
    ),
}));

const SAMPLE_TOUR = {
    id: 'mis_materias',
    version: 1,
    title: 'Mis Materias',
    steps: [
        {
            id: 'step1',
            target: '[data-tour="btn-uno"]',
            title: 'Paso Uno',
            description: 'Descripción paso uno.',
        },
        {
            id: 'step2',
            target: '[data-tour="btn-dos"]',
            title: 'Paso Dos',
            description: 'Descripción paso dos.',
        },
    ],
};

function renderTour(tour = SAMPLE_TOUR, initialEntry = '/mis-materias') {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
                <Route
                    path="/mis-materias"
                    element={
                        <div>
                            <button type="button" data-tour="btn-uno">
                                Uno
                            </button>
                            <button type="button" data-tour="btn-dos">
                                Dos
                            </button>
                            <InteractiveTourOverlay tour={tour} ready={true} />
                        </div>
                    }
                />
            </Routes>
        </MemoryRouter>,
    );
}

describe('InteractiveTourOverlay', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('arranca automáticamente en la primera visita y persiste la versión al finalizar', () => {
        renderTour();

        expect(screen.queryByRole('dialog')).toBeNull();
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(screen.getByText('Paso Uno')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
        expect(screen.getByText('Paso Dos')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Finalizar/i }));
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(storageRepository.getTutorialVersionSeen('mis_materias')).toBe(1);
    });

    it('no arranca automáticamente si ya vio la versión, pero vuelve a arrancar si sube a v2', () => {
        storageRepository.setTutorialVersionSeen('mis_materias', 1);
        const { unmount } = renderTour(SAMPLE_TOUR);

        act(() => {
            vi.advanceTimersByTime(600);
        });
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(screen.getByRole('button', { name: /^Ver tutorial$/i })).toBeTruthy();

        unmount();
        renderTour({ ...SAMPLE_TOUR, version: 2 });
        act(() => {
            vi.advanceTimersByTime(600);
        });
        expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('permite desactivar guías automáticas y relanzar manualmente vía state.startTour', () => {
        renderTour();
        act(() => {
            vi.advanceTimersByTime(500);
        });

        fireEvent.click(screen.getByRole('button', { name: /No volver a mostrar/i }));
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(storageRepository.getTutorialPrefs().autoDisabled).toBe(true);
        expect(screen.queryByRole('button', { name: /^Ver tutorial$/i })).toBeNull();

        cleanup();
        renderTour(SAMPLE_TOUR, { pathname: '/mis-materias', state: { startTour: 'mis_materias' } });
        act(() => {
            vi.advanceTimersByTime(350);
        });
        expect(screen.getByRole('dialog')).toBeTruthy();
    });
});
