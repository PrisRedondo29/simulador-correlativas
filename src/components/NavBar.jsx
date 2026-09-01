import React, { useState, useEffect } from 'react';
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

// ─── Panel de usuario (sección inferior del sidebar) ──────────────────────────
const UserPanel = ({ onSignInPress, isCollapsed }) => {
    const { user, userData, loading, isAuthenticated, signOut } = useAuth();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className={`flex items-center gap-3 p-3 rounded-xl animate-pulse ${isCollapsed ? 'justify-center' : ''}`}>
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
            <div className={`flex flex-col gap-2 ${isCollapsed ? 'items-center w-full' : ''}`}>
                {isCollapsed ? (
                    <Tooltip content="Iniciar Sesión" placement="right">
                        <Button
                            isIconOnly
                            variant="flat"
                            onPress={onSignInPress}
                            className="min-w-0 bg-white/15 text-white hover:bg-white/25"
                        >
                            <i className="fa-brands fa-google" />
                        </Button>
                    </Tooltip>
                ) : (
                    <Button
                        id="btn-iniciar-sesion"
                        variant="flat"
                        className="w-full font-bold bg-white text-[#005a36] hover:bg-emerald-50 shadow-sm"
                        startContent={<i className="fa-brands fa-google" />}
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
                        className="w-full font-medium text-sm text-white/80 hover:text-white hover:bg-white/10"
                        startContent={<i className="fa-solid fa-gear" />}
                        onPress={() => navigate('/config')}
                    >
                        Configuración
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-2 ${isCollapsed ? 'items-center w-full' : ''}`}>
            <div className={`flex items-center gap-3 px-1 py-2 overflow-hidden ${isCollapsed ? 'justify-center' : ''}`}>
                <Tooltip content={isCollapsed ? (userData?.config?.alias || user.displayName) : ""} placement="right">
                    <Avatar
                        src={user.photoURL}
                        name={user.displayName}
                        size="sm"
                        isBordered
                        color="success"
                        className="shrink-0 ring-2 ring-white/30"
                        imgProps={{
                            referrerPolicy: "no-referrer"
                        }}
                    />
                </Tooltip>
                {!isCollapsed && (
                    <div className="flex flex-col min-w-0 flex-1 transition-opacity duration-300">
                        <span className="text-sm font-bold text-white truncate leading-tight">
                            {userData?.config?.alias || (user.displayName?.split(' ')[0] ?? 'Usuario')}
                        </span>
                        <span className="text-[10px] text-white/60 truncate w-full">{user.email}</span>
                    </div>
                )}
            </div>

            {isCollapsed ? (
                <>
                    <Tooltip content="Configuración" placement="right">
                        <Button isIconOnly variant="light" onPress={() => navigate('/config')} className="min-w-0 text-white/80 hover:text-white hover:bg-white/10">
                            <i className="fa-solid fa-gear" />
                        </Button>
                    </Tooltip>
                    <Tooltip content="Cerrar Sesión" placement="right">
                        <Button
                            isIconOnly
                            variant="light"
                            onPress={async () => {
                                await signOut();
                                addToast({ title: 'Sesión cerrada', description: '¡Hasta la próxima!', color: 'success' });
                            }}
                            className="min-w-0 text-rose-300 hover:text-rose-100 hover:bg-white/10"
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
                        className="w-full justify-start font-medium text-sm text-white/80 hover:text-white hover:bg-white/10"
                        startContent={<i className="fa-solid fa-gear" />}
                        onPress={() => navigate('/config')}
                    >
                        Configuración
                    </Button>

                    <Button
                        id="btn-cerrar-sesion"
                        variant="light"
                        className="w-full justify-start font-medium text-sm text-rose-300 hover:text-rose-100 hover:bg-rose-500/10"
                        startContent={<i className="fa-solid fa-right-from-bracket" />}
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

    const menuItems = [
        { name: 'Inicio', icon: 'fa-house', path: '/', isDeactivated: false },
        { name: 'Progreso', icon: 'fa-graduation-cap', path: '/progreso', isDeactivated: false },
        { name: 'Simulador de Avance', icon: 'fa-route', path: '/simulador', isDeactivated: false },
        { name: 'Equivalencias', icon: 'fa-right-left', path: '/equivalencias', isDeactivated: false },
        { 
            name: 'Cambio de Plan', 
            icon: 'fa-arrows-rotate', 
            path: '/cambio-plan', 
            badge: 'Res. 89/25', 
            isDeactivated: false 
        },
        { name: 'Chat IA', icon: 'fa-robot', path: '/chatbot', isDeactivated: true },
        { name: 'Cómo usar', icon: 'fa-circle-question', path: '/como-usar', isDeactivated: false, id: 'btn-como-usar' },
        { name: 'Reportar error', icon: 'fa-bug', path: '/contacto', isDeactivated: false },
        { name: 'CODES', imgIcon: '/imgs/logo-codes.png', path: 'https://www.codesunlu.tech/', isExternal: true, isDeactivated: false },
    ];

    const handleClick = (item) => {
        navigate(item.path);
        if (onItemClick) onItemClick();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <nav className={`flex flex-col gap-1.5 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-3 py-2'}`}>
            {/* Botón Destacado Simular Transición en Sidebar */}
            <div className="mb-2">
                <button
                    onClick={() => {
                        navigate('/cambio-plan');
                        if (onItemClick) onItemClick();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full rounded-2xl bg-gradient-to-br from-[#F5B82E] to-amber-500 text-slate-950 font-black shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2.5 border border-amber-300 ${
                        isCollapsed ? 'p-3 justify-center' : 'p-2.5 px-3.5 text-left'
                    }`}
                >
                    <div className="w-7 h-7 rounded-xl bg-black/10 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-arrows-rotate text-xs text-slate-950" />
                    </div>
                    {!isCollapsed && (
                        <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-black uppercase tracking-wider block leading-none text-slate-900/80">
                                Res. HCS 89/2025
                            </span>
                            <span className="text-xs font-black block truncate text-slate-950">
                                Simular Cambio de Plan
                            </span>
                        </div>
                    )}
                </button>
            </div>

            {menuItems.map((item) => {
                const isActive = !item.isExternal && !item.isTransicionAction && location.pathname === item.path;
                const isDisabled = !isActive && item.isDeactivated;

                if (item.isExternal) {
                    const content = (
                        <a
                            key={item.path}
                            href={item.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-3 rounded-xl transition-all duration-200 group relative ${isCollapsed ? 'p-3 justify-center' : 'px-3.5 py-2.5'} text-white/80 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/10`}
                        >
                            {item.imgIcon ? (
                                <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center p-0.5 shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                    <img src={item.imgIcon} alt={item.name} className="w-full h-full object-contain" />
                                </div>
                            ) : (
                                <i className={`fa-solid ${item.icon} w-5 text-base shrink-0 group-hover:scale-110 transition-transform`} />
                            )}
                            {!isCollapsed && <span className="text-sm font-medium transition-opacity duration-300 whitespace-nowrap overflow-hidden">{item.name}</span>}
                            {!isCollapsed && <i className="fa-solid fa-arrow-up-right-from-square text-[10px] ml-auto opacity-50 group-hover:opacity-100" />}
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
                        onClick={() => isDisabled ? addToast({ title: 'En progreso', description: 'Esta página aún no está disponible', color: 'warning' }) : handleClick(item)}
                        className={`flex items-center gap-3 rounded-xl transition-all duration-200 group relative ${isCollapsed ? 'p-3 justify-center' : 'px-3.5 py-2.5'} ${
                            item.isTransicionAction 
                                ? 'text-amber-300 hover:bg-white/10 hover:text-amber-200 font-bold'
                                : isActive
                                    ? 'bg-white/20 text-white font-bold shadow-sm border border-white/20 backdrop-blur-md'
                                    : isDisabled
                                        ? 'bg-black/10 text-white/30 cursor-not-allowed'
                                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        <i className={`fa-solid ${item.icon} w-5 text-base shrink-0 ${
                            item.isTransicionAction ? 'text-amber-400' : isActive ? 'text-white drop-shadow-sm' : 'group-hover:scale-110 transition-transform'
                        }`} />
                        {!isCollapsed && (
                            <div className="flex items-center justify-between w-full min-w-0">
                                <span className="text-sm font-medium transition-opacity duration-300 whitespace-nowrap overflow-hidden">{item.name}</span>
                                {item.badge && (
                                    <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-[#F5B82E] text-slate-950 ml-2 shrink-0">
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                        )}
                        {isActive && !isCollapsed && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_2px] shadow-emerald-300/80 animate-pulse" />
                        )}
                        {isActive && isCollapsed && (
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-white" />
                        )}
                    </button>
                );

                return isCollapsed ? (
                    <Tooltip key={item.path || item.name} content={item.name} placement="right">
                        {content}
                    </Tooltip>
                ) : content;
            })}
        </nav>
    );
};

NavLinks.propTypes = {
    onItemClick: PropTypes.func,
    isCollapsed: PropTypes.bool,
};

// ─── Sidebar Footer  (tema + auth) ────────────────────────────────────
const SidebarFooter = ({ onSignInPress, id_prefix = 'desktop', isCollapsed }) => {
    return (
        <div className={`mt-auto border-t border-white/10 transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-3'}`}>
            <div className={`bg-black/25 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col gap-3 shadow-sm transition-all duration-300 ${isCollapsed ? 'p-1 py-3' : 'p-3'}`}>
                <div id={`selector-tema-${id_prefix}`}>
                    <ThemeSwitcher isCollapsed={isCollapsed} />
                </div>

                <div className={`${!isCollapsed ? 'border-t border-white/10 pt-3' : 'w-full flex justify-center'}`}>
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

import TransicionModal from './Progreso/modals/TransicionModal';

// ─── NavBar principal ─────────────────────────────────────────────────────────
export default function NavBar({ setPlan, plan, isCollapsed, setIsCollapsed }) {
    const { isOpen: isDrawerOpen, onOpen: onDrawerOpen, onOpenChange: onDrawerOpenChange } = useDisclosure();
    const { isOpen: isLoginOpen, onOpen: onLoginOpen, onClose: onLoginClose } = useDisclosure();
    const { isOpen: isTransicionOpen, onOpen: onTransicionOpen, onOpenChange: onTransicionOpenChange } = useDisclosure();
    const { signIn, firestoreWarning, clearFirestoreWarning } = useAuth();
    const navigate = useNavigate();

    const [progresoGlobal, setProgresoGlobal] = useState({});

    // Cargar progreso del alumno desde localStorage para pasarlo a la simulación
    useEffect(() => {
        const cargarProgreso = () => {
            const p1713 = localStorage.getItem('progreso+17.13');
            const pPlan = plan ? localStorage.getItem(`progreso+${plan}`) : null;
            const data = p1713 || pPlan;
            if (data) {
                try {
                    setProgresoGlobal(JSON.parse(data));
                } catch {
                    setProgresoGlobal({});
                }
            }
        };
        cargarProgreso();
        window.addEventListener('storage', cargarProgreso);
        window.addEventListener('progress-hydrated', cargarProgreso);
        return () => {
            window.removeEventListener('storage', cargarProgreso);
            window.removeEventListener('progress-hydrated', cargarProgreso);
        };
    }, [plan]);

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

            {/* Botón Hamburguesa Móvil */}
            {!isDrawerOpen && (
                <div className="lg:hidden fixed top-4 right-4 z-[100]">
                    <Button
                        isIconOnly
                        radius="full"
                        variant="shadow"
                        onPress={onDrawerOpen}
                        id="btn-menu-mobile"
                        className="bg-[#005a36] text-white border border-white/20 shadow-xl"
                        aria-label="Abrir menú principal"
                        size="lg"
                    >
                        <i className="fa-solid fa-bars text-lg" />
                    </Button>
                </div>
            )}

            <aside
                className={`hidden lg:flex flex-col h-screen fixed left-0 top-0 bg-[#005a36] text-white border-r border-emerald-900/60 z-40 shadow-2xl shadow-black/15 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}
            >
                {/* Botón Toggle */}
                <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    radius="full"
                    onPress={() => setIsCollapsed(!isCollapsed)}
                    className={`hidden lg:flex absolute -right-3 top-10 -translate-y-1/2 bg-[#005a36] text-white border border-emerald-700 shadow-md z-[60] hover:bg-[#004d2e] transition-all duration-300 ${isCollapsed ? 'rotate-180 -right-4' : ''}`}
                >
                    <i className="fa-solid fa-chevron-left text-[10px]" />
                </Button>

                {/* Header */}
                <div className={`p-4 mb-1 flex items-center border-b border-white/10 relative h-20 shrink-0 ${isCollapsed ? 'justify-center' : 'gap-3 px-5'}`}>
                    <div
                        className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center shadow-md border border-white/20 cursor-pointer hover:bg-white/25 hover:scale-105 transition-all duration-300 shrink-0"
                        onClick={() => navigate('/')}
                    >
                        <i className="fa-solid fa-graduation-cap text-white text-xl" />
                    </div>

                    {!isCollapsed && (
                        <div className="flex flex-col transition-opacity duration-300">
                            <span className="font-black text-white text-lg tracking-tight leading-none">UNLu</span>
                            <span className="text-emerald-200 font-semibold text-[11px] tracking-widest uppercase mt-0.5">Portal Estudiantil</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    <NavLinks onTransicionClick={onTransicionOpen} isCollapsed={isCollapsed} />
                </div>

                <SidebarFooter
                    onSignInPress={onLoginOpen}
                    id_prefix="desktop"
                    isCollapsed={isCollapsed}
                />
            </aside>

            {/* Drawer Móvil */}
            <Drawer
                isOpen={isDrawerOpen}
                onOpenChange={onDrawerOpenChange}
                placement="left"
                backdrop="opaque"
                classNames={{
                    base: 'bg-[#005a36] text-white shadow-2xl border-r border-emerald-900',
                    backdrop: 'bg-black/50 backdrop-blur-xs'
                }}
            >
                <DrawerContent>
                    {(onClose) => (
                        <>
                            <DrawerHeader className="p-0">
                                <div className="w-full p-6 border-b border-white/10 flex items-center gap-3">
                                    <div
                                        className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center cursor-pointer border border-white/20"
                                        onClick={() => navigate('/')}
                                    >
                                        <i className="fa-solid fa-graduation-cap text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-black text-white text-lg leading-none">UNLu</span>
                                        <span className="text-emerald-200 text-xs font-semibold uppercase tracking-wider">Portal Estudiantil</span>
                                    </div>
                                </div>
                            </DrawerHeader>

                            <DrawerBody className="py-4">
                                <NavLinks onItemClick={onClose} onTransicionClick={onTransicionOpen} isCollapsed={false} />
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
    setPlan: PropTypes.func,
    plan: PropTypes.string,
    isCollapsed: PropTypes.bool.isRequired,
    setIsCollapsed: PropTypes.func.isRequired,
};