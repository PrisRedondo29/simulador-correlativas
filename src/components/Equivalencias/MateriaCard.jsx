import React from 'react';
import { Chip } from '@heroui/react';
import { Clock, Calendar, CheckCircle2, AlertCircle, Circle, HelpCircle, Unlock } from 'lucide-react';
import materiasUtils from '../../utils/Progreso/materiasUtils';

const MateriaCard = ({ materia, estado, isNewPlan = false, onClick }) => {

    // Configuración de estilos por estado (Respetando estados originales)
    const getStatusConfig = () => {
        switch (estado) {
            case "Aprobado":
                return {
                    border: "border-success-200",
                    shadow: "shadow-success-100",
                    sideBar: "bg-success-500",
                    bg: "bg-success-50/30",
                    accent: "text-success-600",
                    chip: "success",
                    icon: <CheckCircle2 size={12} strokeWidth={3} />,
                    label: "Aprobada"
                };
            case "Regular":
                return {
                    border: "border-warning-200",
                    shadow: "shadow-warning-100",
                    sideBar: "bg-warning-500",
                    bg: "bg-warning-50/30",
                    accent: "text-warning-600",
                    chip: "warning",
                    icon: <AlertCircle size={12} strokeWidth={3} />,
                    label: "Regular"
                };
            case "Sin equivalencia":
                return {
                    border: "border-default-100 border-dashed",
                    shadow: "shadow-none",
                    sideBar: "bg-default-200 opacity-50",
                    bg: "bg-transparent opacity-60",
                    accent: "text-default-400",
                    chip: "default",
                    icon: <HelpCircle size={12} />,
                    label: "N/A"
                };
            case "Disponible":
            default:
                return {
                    border: isNewPlan ? "border-primary-100" : "border-default-100",
                    shadow: "shadow-md",
                    sideBar: isNewPlan ? "bg-primary-500" : "bg-secondary-400",
                    bg: "bg-white dark:bg-zinc-900",
                    accent: isNewPlan ? "text-primary-600" : "text-secondary-600",
                    chip: isNewPlan ? "primary" : "secondary",
                    icon: isNewPlan ? <Unlock size={12} strokeWidth={2.5} /> : <Circle size={12} />,
                    label: isNewPlan ? "Disponible" : "Pendiente"
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div
            onClick={onClick}
            className={`group relative flex items-stretch overflow-hidden rounded-2xl border transition-all duration-300 ${config.border} ${config.bg} ${config.shadow} ${onClick ? "cursor-pointer hover:translate-y-[-2px] active:scale-[0.98]" : ""
                }`}
        >
            {/* Bloque de color lateral para identificación rápida */}
            <div className={`w-1 sm:w-1.5 shrink-0 ${config.sideBar}`} />

            <div className="flex flex-col grow p-2 sm:p-3.5 gap-1.5 sm:gap-2.5 min-w-0">
                {/* Fila Superior: Código a la izquierda + Badge a la derecha */}
                <div className="flex items-center justify-between gap-1 w-full">
                    <span className={`text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider ${config.accent}`}>
                        {materia.mostrarCodigo === false ? '---' : materia.codigo}
                    </span>

                    <Chip
                        size="sm"
                        variant="flat"
                        color={config.chip}
                        startContent={config.icon}
                        className="h-5 sm:h-6 text-[9px] sm:text-xs font-black uppercase px-1.5 sm:px-2 shadow-2xs border border-white/20 shrink-0"
                    >
                        {config.label}
                    </Chip>
                </div>

                {/* Fila Central: Nombre de la materia con el 100% de ancho disponible */}
                <h4 className="text-[11px] sm:text-[14px] font-black text-foreground leading-snug tracking-tight line-clamp-3 sm:line-clamp-2 group-hover:text-primary transition-colors">
                    {materia.nombre}
                </h4>

                {/* Fila Inferior: Horas totales y semanales */}
                <div className="flex items-center gap-1.5 sm:gap-2 mt-auto flex-wrap pt-1 border-t border-default-200/40">
                    <div className="flex items-center gap-1 text-[9px] sm:text-xs text-foreground font-bold bg-default-100 dark:bg-default-200 px-1.5 py-0.5 rounded-md shrink-0">
                        <Clock size={10} className="text-default-500 dark:text-default-400 shrink-0" />
                        <span>{materia.horas_totales}h</span>
                    </div>
                    {materia.horas_semanales && (
                        <div className="flex items-center gap-1 text-[9px] sm:text-xs text-foreground font-bold bg-default-100 dark:bg-default-200 px-1.5 py-0.5 rounded-md shrink-0">
                            <Calendar size={10} className="text-default-500 dark:text-default-400 shrink-0" />
                            <span>{materia.horas_semanales}h/s</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MateriaCard;
