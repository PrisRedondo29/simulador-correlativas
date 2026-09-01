import React, { useState, useEffect } from 'react';
import { Button, Tooltip } from '@heroui/react';
import { useTheme } from 'next-themes';
import PropTypes from 'prop-types';
import { trackCambioTema } from '../../services/analyticsService';

const ThemeSwitcher = ({ isCollapsed }) => {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();

    useEffect(() => { setMounted(true); }, []);
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
                        className="bg-white/10 text-white hover:bg-white/20 min-w-8 h-8 rounded-xl"
                        onPress={() => handleToggle(isDark ? 'light' : 'dark')}
                    >
                        <i className={`fa-solid ${isDark ? 'fa-moon text-amber-300' : 'fa-sun text-amber-400'}`} />
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
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                        !isDark 
                            ? 'bg-white text-[#005a36] shadow-xs' 
                            : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <i className={`fa-solid fa-sun text-xs ${!isDark ? 'text-amber-500' : 'text-white/60'}`} />
                    <span>Claro</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleToggle('dark')}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                        isDark 
                            ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700' 
                            : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <i className={`fa-solid fa-moon text-xs ${isDark ? 'text-amber-300' : 'text-white/60'}`} />
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