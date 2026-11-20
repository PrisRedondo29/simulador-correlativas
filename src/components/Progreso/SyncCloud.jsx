import React, { useState } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger, Spinner, addToast } from '@heroui/react';
import { useAuth } from '../../context/AuthContext';
import { trackProgresoInicial } from '../../services/analyticsService';
import planService from '../../services/planService';

export default function SyncCloud({ plan }) {
    const { user, userData, uploadPlanProgress, downloadAllProgress } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [action, setAction] = useState('');

    const handleUpload = async () => {
        if (!user || !plan) return;
        setIsLoading(true);
        setAction('Guardando...');
        try {
            const esPrimerGuardado = !userData?.progreso || !userData?.progreso[plan];

            await uploadPlanProgress(user.uid, plan);
            addToast({ title: '¡Éxito!', description: 'Tu progreso se guardó en la nube.', color: 'success' });

            if (esPrimerGuardado) {
                const progresoLocal = JSON.parse(localStorage.getItem(`progreso+${plan}`)) || {};
                const planData = await planService.getPlanByNumber(plan);
                const materiasPlan = planData?.materias || [];
                const aprobadas = Object.values(progresoLocal).filter(s => s === 'Aprobado' || s === 'Promocionado').length;

                trackProgresoInicial({
                    plan,
                    aprobadas,
                    total: materiasPlan.length,
                });
            }
        } catch {
            addToast({ title: 'Error', description: 'No se pudo guardar en la nube.', color: 'danger' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!user) return;
        setIsLoading(true);
        setAction('Cargando...');
        try {
            const success = await downloadAllProgress(user.uid);
            if (success) {
                addToast({ title: '¡Éxito!', description: 'Se cargó tu progreso desde la nube.', color: 'success' });
            } else {
                addToast({ title: 'Aviso', description: 'No se encontraron datos en la nube.', color: 'warning' });
            }
        } catch {
            addToast({ title: 'Error', description: 'No se pudo cargar desde la nube.', color: 'danger' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 px-2">
                <Spinner size="sm" color="primary" />
                <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">{action}</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 rounded-xl bg-white dark:bg-[#161D24] p-1 border border-[#E2E8F0] dark:border-[#2A3540]">
            <Popover placement="bottom" showArrow>
                <PopoverTrigger>
                    <Button isIconOnly size="sm" variant="light" aria-label="Información sobre sincronización" className="text-[#64748B] h-7 w-7 min-w-7">
                        <i className="fa-solid fa-circle-info text-xs" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540]">
                    <div className="px-1 py-2 max-w-xs">
                        <div className="text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9]">Sincronización Manual</div>
                        <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                            Guardá tu progreso en la nube para usarlo en otros dispositivos, o cargá la última versión guardada.
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            <Button
                size="sm"
                variant="light"
                onPress={handleUpload}
                startContent={<i className="fa-solid fa-cloud-arrow-up text-xs text-[#005A36] dark:text-[#6EE7B7]" />}
                className="font-medium text-xs h-7 px-2.5 text-[#334155] dark:text-[#E2E8F0]"
            >
                Guardar
            </Button>
            <Button
                size="sm"
                variant="light"
                onPress={handleDownload}
                startContent={<i className="fa-solid fa-cloud-arrow-down text-xs text-[#475569] dark:text-[#94A3B8]" />}
                className="font-medium text-xs h-7 px-2.5 text-[#334155] dark:text-[#E2E8F0]"
            >
                Cargar
            </Button>
        </div>
    );
}
