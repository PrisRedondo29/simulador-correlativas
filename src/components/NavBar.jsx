import React from 'react';
import {
    addToast,
    Button,
    Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader,
    useDisclosure,
    Avatar,
    Tooltip,
} from '@heroui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext';

import ThemeSwitcher from './Shared/ThemeSwitcher';
import LoginModal from './Auth/LoginModal';
import NotificationCenter from './Notifications/NotificationCenter';
import { DEFAULT_PLAN, getAcademicNavItems } from '../config/planPolicies';
import { useActivePlan, usePlanCapabilities } from '../context/PlanContext';

const ROUTE_TITLES = {
    '/': 'Inicio',
    '/progreso': 'Mi Progreso',
    '/simulador': 'Simulador de Avance',
    '/equivalencias': 'Equivalencias',
    '/cambio-plan': 'Cambio de Plan',
    '/transicion': 'Cambio de Plan',
    '/como-usar': 'Cómo usar',
    '/config': 'Configuración',
    '/contacto': 'Contacto',
    '/admin': 'Administración',
};

// ─── Panel de usuario (sección inferior del sidebar) ──────────────────────────
const UserPanel = ({ onSignInPress, isCollapsed }) => {
    const { user, userData, loading, isAuthenticated, signOut } = useAuth();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className={`flex items-center gap-3 p-2.5 rounded-xl animate-pulse ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-white/20 shrink-0" />
                {!isCollapsed && (
                    <div className="flex flex-col gap-1 flex-1">
                        <div className="h-2.5 w-24 bg-white/20 rounded" />
                        <div className="h-2 w-16 bg-white/10 rounded" />
                    </div>
                )}
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className={`flex flex-col gap-1.5 ${isCollapsed ? 'items-center w-full' : ''}`}>
                {isCollapsed ? (
                    <Tooltip content="Iniciar Sesión" placement="right">
                        <Button
                            isIconOnly
                            variant="flat"
                            onPress={onSignInPress}
                            aria-label="Iniciar Sesión"
                            className="min-w-0 bg-white/15 text-white hover:bg-white/25"
                        >
                            <i className="fa-brands fa-google" />
                        </Button>
                    </Tooltip>
                ) : (
                    <Button
                        id="btn-iniciar-sesion"
                        variant="flat"
                        size="sm"
                        className="w-full font-semibold bg-white text-[#005A36] hover:bg-[#F8FAFC] h-9 rounded-xl"
                        startContent={<i className="fa-brands fa-google text-xs" />}
                        onPress={onSignInPress}
                    >
                        Iniciar Sesión
                    </Button>
                )}

                {isCollapsed ? (
                    <Tooltip content="Configuración" placement="right">
                        <Button
                            isIconOnly
                            variant="light"
                            aria-label="Configuración"
                            onPress={() => navigate('/config')}
                            className="min-w-0 text-white/80 hover:text-white hover:bg-white/10"
                        >
                            <i className="fa-solid fa-gear" />
                        </Button>
                    </Tooltip>
                ) : (
                    <Button
                        id="btn-configuracion-guest"
                        variant="light"
                        size="sm"
                        className="w-full font-medium text-xs text-white/85 hover:text-white hover:bg-white/10 h-8 rounded-xl"
                        startContent={<i className="fa-solid fa-gear text-xs" />}
                        onPress={() => navigate('/config')}
                    >
                        Configuración
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-1.5 ${isCollapsed ? 'items-center w-full' : ''}`}>
            <div className={`flex items-center gap-2.5 px-1 py-1.5 overflow-hidden ${isCollapsed ? 'justify-center' : ''}`}>
                <Tooltip content={isCollapsed ? (userData?.config?.alias || user.displayName) : ''} placement="right">
                    <Avatar
                        src={user.photoURL}
                        name={user.displayName}
                        size="sm"
                        className="shrink-0 ring-2 ring-white/30"
                        imgProps={{ referrerPolicy: 'no-referrer' }}
                    />
                </Tooltip>
                {!isCollapsed && (
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-semibold text-white truncate leading-tight">
                            {userData?.config?.alias || (user.displayName?.split(' ')[0] ?? 'Usuario')}
                        </span>
                        <span className="text-[11px] text-white/65 truncate w-full">{user.email}</span>
                    </div>
                )}
            </div>

            {isCollapsed ? (
                <>
                    <Tooltip content="Configuración" placement="right">
                        <Button isIconOnly variant="light" aria-label="Configuración" onPress={() => navigate('/config')} className="min-w-0 text-white/80 hover:text-white hover:bg-white/10">
                            <i className="fa-solid fa-gear" />
                        </Button>
                    </Tooltip>
                    <Tooltip content="Cerrar Sesión" placement="right">
                        <Button
                            isIconOnly
                            variant="light"
                            aria-label="Cerrar Sesión"
                            onPress={async () => {
                                await signOut();
                                addToast({ title: 'Sesión cerrada', description: '¡Hasta la próxima!', color: 'success' });
                            }}
                            className="min-w-0 text-white/75 hover:text-white hover:bg-white/10"
                        >
                            <i className="fa-solid fa-right-from-bracket" />
                        </Button>
                    </Tooltip>
                </>
            ) : (
                <>
                    <Button
                        id="btn-configuracion"
                        variant="light"
                        size="sm"
                        className="w-full justify-start font-medium text-xs text-white/85 hover:text-white hover:bg-white/10 h-8 rounded-xl"
                        startContent={<i className="fa-solid fa-gear text-xs" />}
                        onPress={() => navigate('/config')}
                    >
                        Configuración
                    </Button>

                    <Button
                        id="btn-cerrar-sesion"
                        variant="light"
                        size="sm"
                        className="w-full justify-start font-medium text-xs text-white/75 hover:text-white hover:bg-white/10 h-8 rounded-xl"
                        startContent={<i className="fa-solid fa-right-from-bracket text-xs" />}
                        onPress={async () => {
                            await signOut();
                            addToast({ title: 'Sesión cerrada', description: '¡Hasta la próxima!', color: 'success' });
                        }}
                    >
                        Cerrar Sesión
                    </Button>
                </>
            )}
        </div>
    );
};

UserPanel.propTypes = {
    onSignInPress: PropTypes.func.isRequired,
    isCollapsed: PropTypes.bool,
};

// ─── Links de navegación ───────────────────────────────────────────────────────
const NavLinks = ({ onItemClick, isCollapsed }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { plan } = useActivePlan();

    const menuGroups = [
        {
            title: 'Académico',
            items: getAcademicNavItems(plan),
        },
        {
            title: 'Ayuda y Comunidad',
            items: [
                { name: 'Cómo usar', icon: 'fa-circle-question', path: '/como-usar', id: 'btn-como-usar' },
                { name: 'Reportar error', icon: 'fa-bug', path: '/contacto' },
                { name: 'CODES UNLu', imgIcon: '/imgs/logo-codes.png', path: 'https://www.codesunlu.tech/', isExternal: true },
            ],
        },
    ];

    const handleClick = (item) => {
        navigate(item.path);
        if (onItemClick) onItemClick();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <nav aria-label="Navegación principal" className={`flex flex-col gap-4 transition-all duration-200 ${isCollapsed ? 'px-2 py-3' : 'px-3 py-3'}`}>
            {menuGroups.map((group, gIdx) => (
                <div key={gIdx} className="flex flex-col gap-1">
                    {!isCollapsed && (
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/55 px-3 pt-1 pb-1 block">
                            {group.title}
                        </span>
                    )}
                    {isCollapsed && gIdx > 0 && (
                        <div className="w-8 h-px bg-white/15 mx-auto my-1" />
                    )}

                    {group.items.map((item) => {
                        const isActive = !item.isExternal && (
                            location.pathname === item.path ||
                            (item.path === '/cambio-plan' && location.pathname === '/transicion')
                        );

                        if (item.isExternal) {
                            const content = (
                                <a
                                    key={item.path}
                                    href={item.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-3 rounded-xl transition-colors duration-150 group ${
                                        isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2'
                                    } text-white/80 hover:bg-white/10 hover:text-white`}
                                >
                                    {item.imgIcon ? (
                                        <div className="w-5 h-5 bg-white rounded-md flex items-center justify-center p-0.5 shrink-0">
                                            <img src={item.imgIcon} alt="" className="w-full h-full object-contain" />
                                        </div>
                                    ) : (
                                        <i className={`fa-solid ${item.icon} w-5 text-sm shrink-0`} />
                                    )}
                                    {!isCollapsed && (
                                        <div className="flex items-center justify-between w-full min-w-0">
                                            <span className="text-sm font-medium truncate">{item.name}</span>
                                            <i className="fa-solid fa-arrow-up-right-from-square text-[10px] opacity-60 ml-1.5 shrink-0" />
                                        </div>
                                    )}
                                </a>
                            );
                            return isCollapsed ? (
                                <Tooltip key={item.path} content={item.name} placement="right">
                                    {content}
                                </Tooltip>
                            ) : content;
                        }

                        const content = (
                            <button
                                key={item.path || item.name}
                                id={item.id}
                                type="button"
                                aria-current={isActive ? 'page' : undefined}
                                onClick={() => handleClick(item)}
                                className={`flex items-center gap-2.5 rounded-xl transition-colors duration-150 relative text-left w-full cursor-pointer ${
                                    isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2'
                                } ${
                                    isActive
                                        ? 'bg-white/18 text-white font-semibold border border-white/20'
                                        : 'text-white/80 hover:bg-white/10 hover:text-white border border-transparent'
                                }`}
                            >
                                <i className={`fa-solid ${item.icon} w-5 text-center text-sm shrink-0 ${isActive ? 'text-white' : 'text-white/80'}`} />
                                {!isCollapsed && (
                                    <div className="flex items-center justify-between w-full min-w-0">
                                        <span className={`text-sm truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                            {item.name}
                                        </span>
                                        {item.badge && (
                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/15 text-[#FDE68A] ml-1.5 shrink-0">
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                )}
                                {isActive && isCollapsed && (
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-white" />
                                )}
                            </button>
                        );

                        return isCollapsed ? (
                            <Tooltip key={item.path || item.name} content={item.badge ? `${item.name} (${item.badge})` : item.name} placement="right">
                                {content}
                            </Tooltip>
                        ) : content;
                    })}
                </div>
            ))}
        </nav>
    );
};

NavLinks.propTypes = {
    onItemClick: PropTypes.func,
    isCollapsed: PropTypes.bool,
};

// ─── Sidebar Footer (tema + auth) ─────────────────────────────────────────────
const SidebarFooter = ({ onSignInPress, id_prefix = 'desktop', isCollapsed }) => {
    return (
        <div className={`mt-auto border-t border-white/10 transition-all duration-200 ${isCollapsed ? 'p-2' : 'p-3'}`}>
            <div className={`bg-black/20 rounded-2xl border border-white/10 flex flex-col gap-2.5 ${isCollapsed ? 'p-1.5 py-2' : 'p-2.5'}`}>
                <div id={`selector-tema-${id_prefix}`}>
                    <ThemeSwitcher isCollapsed={isCollapsed} />
                </div>

                <div className={`${!isCollapsed ? 'border-t border-white/10 pt-2' : 'w-full flex justify-center'}`}>
                    <UserPanel onSignInPress={onSignInPress} isCollapsed={isCollapsed} />
                </div>
            </div>
        </div>
    );
};

SidebarFooter.propTypes = {
    onSignInPress: PropTypes.func.isRequired,
    id_prefix: PropTypes.string,
    isCollapsed: PropTypes.bool,
};

// ─── Barra Superior Utilitaria en Escritorio ──────────────────────────────────
export function TopUtilityBar({ plan }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { policy } = usePlanCapabilities();
    const pageTitle = ROUTE_TITLES[location.pathname] || 'Portal Estudiantil';
    const activePlan = plan || DEFAULT_PLAN;

    return (
        <header className="hidden lg:flex h-14 sticky top-0 z-30 bg-white/95 dark:bg-[#161D24]/95 border-b border-[#E2E8F0] dark:border-[#2A3540] px-8 items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] truncate">
                    {pageTitle}
                </span>
                <span className="text-[#CBD5E1] dark:text-[#3B4958]" aria-hidden="true">/</span>
                <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8] truncate">
                    {policy.carrera} · UNLu
                </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <button
                    type="button"
                    onClick={() => navigate('/config')}
                    title="Cambiar plan de estudios en Configuración"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F1F5F9] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540] text-xs font-medium text-[#334155] dark:text-[#E2E8F0] hover:border-[#005A36]/40 dark:hover:border-[#4A9D68]/50 transition-colors cursor-pointer"
                >
                    <i className="fa-solid fa-scroll text-[11px] text-[#005A36] dark:text-[#6EE7B7]" />
                    <span>Plan {activePlan}</span>
                </button>
                <NotificationCenter plan={activePlan} variant="light-bar" />
            </div>
        </header>
    );
}

TopUtilityBar.propTypes = {
    plan: PropTypes.string,
};

// ─── NavBar principal (Top bar móvil + Sidebar escritorio) ────────────────────
export default function NavBar({ plan, isCollapsed, setIsCollapsed }) {
    const { isOpen: isDrawerOpen, onOpen: onDrawerOpen, onOpenChange: onDrawerOpenChange } = useDisclosure();
    const { isOpen: isLoginOpen, onOpen: onLoginOpen, onClose: onLoginClose } = useDisclosure();
    const { signIn, firestoreWarning, clearFirestoreWarning } = useAuth();
    const { policy } = usePlanCapabilities();
    const navigate = useNavigate();
    const location = useLocation();
    const pageTitle = ROUTE_TITLES[location.pathname] || 'Portal Estudiantil';
    const activePlan = plan || DEFAULT_PLAN;

    const handleSignIn = async (rememberMe) => {
        try {
            const loggedUser = await signIn(rememberMe);
            if (loggedUser) {
                addToast({ title: '¡Bienvenido!', description: 'Sesión iniciada correctamente', color: 'success' });
                if (firestoreWarning) {
                    addToast({ title: 'Aviso de sincronización', description: firestoreWarning, color: 'warning' });
                    clearFirestoreWarning();
                }
                return loggedUser;
            }
            return null;
        } catch {
            return null;
        }
    };

    return (
        <>
            <LoginModal isOpen={isLoginOpen} onClose={onLoginClose} onConfirm={handleSignIn} />

            {/* Top Navbar Institucional Móvil (< lg) */}
            <header className="lg:hidden fixed top-0 inset-x-0 h-14 z-40 bg-[#005A36] dark:bg-[#11221B] text-white border-b border-black/10 dark:border-[#2A3540] px-3 flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                    <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        radius="lg"
                        onPress={onDrawerOpen}
                        id="btn-menu-mobile"
                        className="text-white hover:bg-white/15 min-w-10 w-10 h-10"
                        aria-label="Abrir menú principal"
                    >
                        <i className="fa-solid fa-bars text-base" />
                    </Button>

                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 min-w-0 text-left cursor-pointer"
                    >
                        <span className="w-7 h-7 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-graduation-cap text-xs text-white" />
                        </span>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-white truncate leading-tight">
                                {pageTitle}
                            </span>
                            <span className="text-[10px] text-white/75 truncate leading-tight">
                                UNLu · {policy.careerShortName}
                            </span>
                        </div>
                    </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => navigate('/config')}
                        className="px-2 py-1 rounded-lg bg-white/15 text-[11px] font-medium text-white border border-white/20 cursor-pointer"
                        aria-label={`Plan activo ${activePlan}`}
                    >
                        Plan {activePlan}
                    </button>
                    <NotificationCenter plan={activePlan} variant="dark-header" />
                </div>
            </header>

            {/* Sidebar Fijo Escritorio (>= lg) */}
            <aside
                className={`hidden lg:flex flex-col h-screen fixed left-0 top-0 bg-[#005A36] dark:bg-[#11221B] text-white border-r border-[#00472B] dark:border-[#24382F] z-40 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}
            >
                <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    radius="full"
                    aria-label={isCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
                    onPress={() => setIsCollapsed(!isCollapsed)}
                    className={`hidden lg:flex absolute -right-3.5 top-10 -translate-y-1/2 bg-[#005A36] dark:bg-[#11221B] text-white border border-white/25 shadow-sm z-[60] hover:bg-[#00472B] transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
                >
                    <i className="fa-solid fa-chevron-left text-[10px]" />
                </Button>

                <div className={`p-4 flex items-center border-b border-white/10 h-16 shrink-0 ${isCollapsed ? 'justify-center' : 'gap-3 px-5'}`}>
                    <button
                        type="button"
                        aria-label="Ir al inicio"
                        className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center border border-white/20 cursor-pointer hover:bg-white/20 transition-colors shrink-0"
                        onClick={() => navigate('/')}
                    >
                        <i className="fa-solid fa-graduation-cap text-white text-base" />
                    </button>

                    {!isCollapsed && (
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-white text-base tracking-tight leading-none">UNLu</span>
                            <span className="text-white/75 font-medium text-[11px] tracking-wider uppercase mt-0.5">Portal Estudiantil</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    <NavLinks isCollapsed={isCollapsed} />
                </div>

                <SidebarFooter
                    onSignInPress={onLoginOpen}
                    id_prefix="desktop"
                    isCollapsed={isCollapsed}
                />
            </aside>

            {/* Drawer Off-canvas Móvil */}
            <Drawer
                isOpen={isDrawerOpen}
                onOpenChange={onDrawerOpenChange}
                placement="left"
                backdrop="opaque"
                classNames={{
                    base: 'bg-[#005A36] dark:bg-[#11221B] text-white shadow-xl border-r border-white/10 max-w-[82vw] sm:max-w-[320px]',
                    backdrop: 'bg-black/45',
                }}
            >
                <DrawerContent>
                    {(onClose) => (
                        <>
                            <DrawerHeader className="p-0">
                                <div className="w-full px-5 py-4 border-b border-white/10 flex items-center gap-3">
                                    <button
                                        type="button"
                                        aria-label="Ir al inicio"
                                        className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center cursor-pointer border border-white/20"
                                        onClick={() => {
                                            navigate('/');
                                            onClose();
                                        }}
                                    >
                                        <i className="fa-solid fa-graduation-cap text-white" />
                                    </button>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white text-base leading-none">UNLu</span>
                                        <span className="text-white/75 text-[11px] font-medium uppercase tracking-wider mt-0.5">Portal Estudiantil</span>
                                    </div>
                                </div>
                            </DrawerHeader>

                            <DrawerBody className="py-3 px-1">
                                <NavLinks onItemClick={onClose} isCollapsed={false} />
                            </DrawerBody>

                            <DrawerFooter className="p-0 block">
                                <SidebarFooter
                                    onSignInPress={() => { onClose(); onLoginOpen(); }}
                                    id_prefix="mobile"
                                    isCollapsed={false}
                                />
                            </DrawerFooter>
                        </>
                    )}
                </DrawerContent>
            </Drawer>
        </>
    );
}

NavBar.propTypes = {
    plan: PropTypes.string,
    isCollapsed: PropTypes.bool.isRequired,
    setIsCollapsed: PropTypes.func.isRequired,
};
