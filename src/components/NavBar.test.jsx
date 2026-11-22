// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        user: null,
        userData: null,
        loading: false,
        isAuthenticated: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        firestoreWarning: null,
        clearFirestoreWarning: vi.fn(),
    }),
}));

vi.mock('../context/PlanContext', () => ({
    useActivePlan: () => ({
        plan: '17.13',
        setPlan: vi.fn(),
    }),
    usePlanCapabilities: () => ({
        plan: '17.13',
        policy: {
            carrera: 'Licenciatura en Sistemas de Información',
            careerShortName: 'LSI',
        },
        tenant: {
            shortName: 'UNLu',
            portalTitle: 'Simulador Estudiantil',
            unofficialNotice: 'Proyecto estudiantil no oficial',
            communityLink: {
                name: 'CODES++ (Comunidad estudiantil)',
                icon: 'fa-solid fa-users',
                url: 'https://www.codesunlu.tech/',
            },
        },
        careersRegistry: undefined,
    }),
}));

vi.mock('./Shared/ThemeSwitcher', () => ({
    default: () => <div data-testid="theme-switcher" />,
}));

vi.mock('./Auth/LoginModal', () => ({
    default: () => null,
}));

vi.mock('./Notifications/NotificationCenter', () => ({
    default: () => <div data-testid="notification-center" />,
}));

vi.mock('./Sync/SyncStatusMenu', () => ({
    default: () => <div data-testid="sync-status-menu" />,
}));

vi.mock('@heroui/react', () => ({
    addToast: vi.fn(),
    useDisclosure: () => ({
        isOpen: false,
        onOpen: vi.fn(),
        onClose: vi.fn(),
        onOpenChange: vi.fn(),
    }),
    Button: ({ children, onPress, className, 'aria-label': ariaLabel, id, title }) => (
        <button
            type="button"
            id={id}
            title={title}
            className={className}
            aria-label={ariaLabel}
            onClick={onPress}
        >
            {children}
        </button>
    ),
    Drawer: ({ isOpen, children }) => (isOpen ? <div>{children}</div> : null),
    DrawerContent: ({ children }) => (
        <div>{typeof children === 'function' ? children(() => {}) : children}</div>
    ),
    DrawerHeader: ({ children }) => <div>{children}</div>,
    DrawerBody: ({ children }) => <div>{children}</div>,
    DrawerFooter: ({ children }) => <div>{children}</div>,
    Avatar: ({ name }) => <span>{name}</span>,
    Tooltip: ({ children }) => <>{children}</>,
}));

import NavBar, { TopUtilityBar } from './NavBar';

describe('NavBar - Jerarquía z-index del botón colapsador sobre el encabezado superior', () => {
    afterEach(() => {
        cleanup();
    });

    it('mantiene el sidebar escritorio (z-40) por encima de TopUtilityBar (z-30) para no tapar el botón colapsador', () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/simulador']}>
                <NavBar plan="17.13" isCollapsed={false} setIsCollapsed={vi.fn()} />
                <TopUtilityBar plan="17.13" />
            </MemoryRouter>,
        );

        const sidebar = container.querySelector('aside');
        expect(sidebar).not.toBeNull();
        expect(sidebar.className).toContain('z-40');

        const headers = container.querySelectorAll('header');
        const desktopUtilityHeader = Array.from(headers).find((h) => h.className.includes('sticky'));
        expect(desktopUtilityHeader).toBeDefined();
        expect(desktopUtilityHeader.className).toContain('z-30');
        expect(desktopUtilityHeader.className).not.toContain('z-40');

        const collapseBtn = screen.getByRole('button', { name: 'Colapsar menú lateral' });
        expect(sidebar.contains(collapseBtn)).toBe(true);
        expect(collapseBtn.className).toContain('-right-3.5');
        expect(collapseBtn.className).toContain('z-10');
        expect(collapseBtn.className).not.toContain('z-[60]');

        expect(sidebar.textContent).toContain('Simulador Estudiantil');
        expect(sidebar.textContent).toContain('No oficial · UNLu');
        expect(screen.queryByText('Portal Estudiantil')).toBeNull();
        expect(screen.getByRole('link', { name: /CODES\+\+ \(Comunidad estudiantil\)/i })).toBeTruthy();
    });
});
