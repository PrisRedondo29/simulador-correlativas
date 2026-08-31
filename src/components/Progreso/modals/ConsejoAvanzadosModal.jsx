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
        <div className="bg-primary-50/80 dark:bg-primary-950/40 border border-primary/20 rounded-2xl p-4 md:p-5 mb-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all animate-in fade-in duration-300">
            <div className="flex items-start gap-3 md:gap-4 flex-1">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 dark:bg-primary/20 text-primary rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <i className="fa-solid fa-wand-magic-sparkles text-xl" />
                </div>
                <div className="flex flex-col gap-1">
                    <h4 className="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
                        <span>💡 Tip para avanzados: Marcado automático en cascada</span>
                    </h4>
                    <p className="text-xs md:text-sm text-foreground/80 leading-relaxed">
                        Si ya tenés materias avanzadas, <strong>marcá únicamente tus últimas materias</strong> aprobadas, regulares o promocionadas y el sistema actualizará todas sus correlativas en cascada automáticamente.
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-primary/10">
                <Checkbox 
                    isSelected={noMostrarMas} 
                    onValueChange={setNoMostrarMas}
                    size="sm"
                    classNames={{ label: "text-xs text-foreground/70 font-medium" }}
                >
                    No mostrar más
                </Checkbox>
                <Button 
                    size="sm" 
                    color="primary"
                    variant="flat"
                    className="font-bold text-xs rounded-xl" 
                    onPress={handleDismiss}
                    startContent={<i className="fa-solid fa-check" />}
                >
                    Entendido
                </Button>
            </div>
        </div>
    );
}
