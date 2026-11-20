import React, { useState, useEffect, useMemo } from 'react';
import { Button, Popover, PopoverTrigger, PopoverContent } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePlanCapabilities } from '../../context/PlanContext';
import { DEFAULT_PLAN } from '../../config/planPolicies';
import planService from '../../services/planService';
import storageRepository, { subscribeStorageChanges } from '../../services/storageRepository';
import { buildNotifications } from '../../utils/Notifications/notificationStrategies';
import PropTypes from 'prop-types';

/**
 * Centro visual de notificaciones académicas en la barra superior.
 * Genera alertas contextuales a partir del avance local del estudiante sin backend.
 */
export default function NotificationCenter({ plan, variant = 'light-bar' }) {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { policy, canSimulateTransition, transitionInfo } = usePlanCapabilities();
    const [isOpen, setIsOpen] = useState(false);
    const [progreso, setProgreso] = useState({});
    const [progresoDetalles, setProgresoDetalles] = useState({});
    const [cursada, setCursada] = useState(null);
    const [materiasPlan, setMateriasPlan] = useState([]);
    const [readIds, setReadIds] = useState(() => storageRepository.getNotificationReadIds());

    const activePlan = plan || storageRepository.getPlanActivo() || DEFAULT_PLAN;

    useEffect(() => {
        const cargarDatos = () => {
            setProgreso(storageRepository.getProgreso(activePlan, {}));
            setProgresoDetalles(storageRepository.getProgresoDetalles(activePlan, {}));
            setCursada(storageRepository.getCursada(activePlan, null));
        };

        cargarDatos();
        return subscribeStorageChanges(cargarDatos);
    }, [activePlan, isOpen]);

    useEffect(() => {
        let active = true;
        planService.getPlanByNumber(activePlan).then((planData) => {
            if (active) setMateriasPlan(planData?.materias || []);
        });
        return () => { active = false; };
    }, [activePlan]);

    const notificaciones = useMemo(() => {
        return buildNotifications({
            activePlan,
            careerShortName: policy?.careerShortName,
            materias: materiasPlan,
            progreso,
            progresoDetalles,
            cursada,
            isAuthenticated,
            canSimulateTransition,
            transitionInfo,
        });
    }, [activePlan, policy?.careerShortName, materiasPlan, progreso, progresoDetalles, cursada, isAuthenticated, canSimulateTransition, transitionInfo]);

    const unreadCount = useMemo(
        () => notificaciones.filter(n => !readIds.includes(n.id)).length,
        [notificaciones, readIds]
    );

    const persistRead = (nextIds) => {
        setReadIds(nextIds);
        storageRepository.setNotificationReadIds(nextIds);
    };

    const handleMarkAllRead = () => {
        const allIds = Array.from(new Set([...readIds, ...notificaciones.map(n => n.id)]));
        persistRead(allIds);
    };

    const handleNotificationClick = (item) => {
        if (!readIds.includes(item.id)) {
            persistRead([...readIds, item.id]);
        }
        setIsOpen(false);
        if (item.path) navigate(item.path);
    };

    const toneClasses = {
        danger: 'bg-[#FEE2E2] text-[#991B1B] dark:bg-[#2D1619] dark:text-[#FCA5A5]',
        info: 'bg-[#E0F2FE] text-[#075985] dark:bg-[#0F2636] dark:text-[#7DD3FC]',
        warning: 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#2D2210] dark:text-[#FCD34D]',
        brand: 'bg-[#ECFDF5] text-[#005A36] dark:bg-[#102A20] dark:text-[#86EFAC]',
        neutral: 'bg-[#F1F5F9] text-[#475569] dark:bg-[#1E2730] dark:text-[#94A3B8]',
    };

    const isDarkHeader = variant === 'dark-header';

    return (
        <Popover
            isOpen={isOpen}
            onOpenChange={setIsOpen}
            placement="bottom-end"
            offset={10}
            shadow="md"
        >
            <PopoverTrigger>
                <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    radius="full"
                    aria-label={unreadCount > 0 ? `Notificaciones (${unreadCount} sin leer)` : 'Notificaciones'}
                    className={`relative min-w-9 w-9 h-9 transition-colors ${
                        isDarkHeader
                            ? 'text-white/90 hover:text-white hover:bg-white/15'
                            : 'text-[#475569] dark:text-[#CBD5E1] hover:text-[#1E293B] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1E2730]'
                    }`}
                >
                    <i className="fa-regular fa-bell text-base" />
                    {unreadCount > 0 && (
                        <span
                            aria-hidden="true"
                            className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#F59E0B] ring-2 ${
                                isDarkHeader ? 'ring-[#005A36] dark:ring-[#11221B]' : 'ring-white dark:ring-[#161D24]'
                            }`}
                        />
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[min(92vw,360px)] p-0 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl overflow-hidden shadow-lg">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] dark:border-[#2A3540]">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                            Notificaciones
                        </span>
                        {unreadCount > 0 && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#075985] dark:bg-[#0F2636] dark:text-[#7DD3FC] tabular-nums">
                                {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={handleMarkAllRead}
                            className="text-xs font-medium text-[#005A36] dark:text-[#6EE7B7] hover:underline cursor-pointer"
                        >
                            Marcar todas como leídas
                        </button>
                    )}
                </div>

                <div className="max-h-[340px] overflow-y-auto divide-y divide-[#F1F5F9] dark:divide-[#2A3540]">
                    {notificaciones.length === 0 ? (
                        <div className="py-8 px-4 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
                            Estás al día con tus avisos académicos.
                        </div>
                    ) : (
                        notificaciones.map((item) => {
                            const isUnread = !readIds.includes(item.id);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleNotificationClick(item)}
                                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer ${
                                        isUnread
                                            ? 'bg-[#F0F9FF] dark:bg-[#132636] hover:bg-[#E0F2FE]/60 dark:hover:bg-[#173145]'
                                            : 'bg-white dark:bg-[#161D24] hover:bg-[#F8FAFC] dark:hover:bg-[#1E2730]'
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${toneClasses[item.tone] || toneClasses.neutral}`}>
                                        <i className={`${item.icon} text-xs`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9] truncate">
                                                {item.title}
                                            </span>
                                            {isUnread && (
                                                <span
                                                    aria-label="No leída"
                                                    className="w-2 h-2 rounded-full bg-[#075985] dark:bg-[#7DD3FC] shrink-0"
                                                />
                                            )}
                                        </div>
                                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed mt-0.5">
                                            {item.description}
                                        </p>
                                        <span className="text-[11px] font-medium text-[#64748B]/80 dark:text-[#94A3B8]/80 mt-1 block">
                                            {item.time}
                                        </span>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

NotificationCenter.propTypes = {
    plan: PropTypes.string,
    variant: PropTypes.oneOf(['light-bar', 'dark-header']),
};
