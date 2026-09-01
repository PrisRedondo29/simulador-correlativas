import React, { useState, useEffect } from 'react';
import { Button, Checkbox } from '@heroui/react';

export default function ConsejoAvanzadosBanner() {
    const [visible, setVisible] = useState(false);
    const [noMostrarMas, setNoMostrarMas] = useState(false);

    useEffect(() => {
        const ocultar = localStorage.getItem('ocultar_consejo_avanzados');
        if (ocultar !== 'true') {
            setVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        if (noMostrarMas) {
            localStorage.setItem('ocultar_consejo_avanzados', 'true');
        }
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 rounded-2xl p-3.5 sm:p-4 mb-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-all animate-in fade-in duration-300">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 md:w-9 md:h-9 bg-emerald-100 dark:bg-emerald-900/60 text-[#005a36] dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-check-double text-sm" />
                </div>
                <div className="flex flex-col gap-0.5 text-left min-w-0">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5 leading-snug">
                        <span>Tip para avanzados: Registrá tu avance rápido con "Aprobar hasta..."</span>
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-600 dark:text-zinc-400 leading-normal">
                        ¿Ya cursaste varios años? Usá el botón verde <strong className="text-emerald-800 dark:text-emerald-300 font-bold">"Aprobar hasta..."</strong> para aprobar bloques de años enteros con un clic, o marcá tus últimas materias y las correlativas se completarán solas.
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-emerald-200/40 dark:border-emerald-800/40">
                <Checkbox 
                    isSelected={noMostrarMas} 
                    onValueChange={setNoMostrarMas}
                    size="sm"
                    classNames={{ label: "text-[11px] text-slate-600 dark:text-zinc-400 font-medium" }}
                >
                    No mostrar más
                </Checkbox>
                <Button 
                    size="sm" 
                    color="success"
                    variant="flat"
                    className="font-bold text-xs h-7 px-3 rounded-lg" 
                    onPress={handleDismiss}
                    startContent={<i className="fa-solid fa-check text-[10px]" />}
                >
                    Entendido
                </Button>
            </div>
        </div>
    );
}
