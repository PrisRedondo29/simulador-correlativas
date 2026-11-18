import React, { useSyncExternalStore } from 'react';
import { Button, Tooltip } from '@heroui/react';
import { useTheme } from 'next-themes';
import PropTypes from 'prop-types';
import { trackCambioTema } from '../../services/analyticsService';

const emptySubscribe = () => () => {};

const ThemeSwitcher = ({ isCollapsed }) => {
    const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
    const { theme, setTheme } = useTheme();

    if (!mounted) return null;

    const isDark = theme === 'dark';

    const handleToggle = (newTheme) => {
        setTheme(newTheme);
        trackCambioTema({ tema: newTheme });
    };

    if (isCollapsed) {
        return (
            <div className="flex justify-center w-full">
                <Tooltip content={isDark ? 'Modo Oscuro' : 'Modo Claro'} placement="right">
                    <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                        className="bg-white/10 text-white hover:bg-white/20 min-w-8 h-8 rounded-xl"
                        onPress={() => handleToggle(isDark ? 'light' : 'dark')}
                    >
                        <i className={`fa-solid ${isDark ? 'fa-moon text-[#FDE68A]' : 'fa-sun text-[#FDE68A]'}`} />
                    </Button>
                </Tooltip>
            </div>
        );
    }

    return (
        <div className="w-full transition-opacity duration-300">
            <div className="bg-black/30 p-1 rounded-xl flex items-center gap-1 border border-white/10">
                <button
                    type="button"
                    onClick={() => handleToggle('light')}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer ${
                        !isDark 
                            ? 'bg-white text-[#005A36] shadow-xs font-semibold' 
                            : 'text-white/75 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <i className={`fa-solid fa-sun text-xs ${!isDark ? 'text-[#D97706]' : 'text-white/60'}`} />
                    <span>Claro</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleToggle('dark')}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer ${
                        isDark 
                            ? 'bg-[#1E2730] text-white shadow-xs border border-white/15 font-semibold' 
                            : 'text-white/75 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <i className={`fa-solid fa-moon text-xs ${isDark ? 'text-[#FDE68A]' : 'text-white/60'}`} />
                    <span>Oscuro</span>
                </button>
            </div>
        </div>
    );
};

ThemeSwitcher.propTypes = {
    isCollapsed: PropTypes.bool,
};

export default ThemeSwitcher;