import React from 'react';
import { Button } from '@heroui/react';
import { AlertCircle, Filter } from 'lucide-react';
import { esMateriaIncompleta } from '../../utils/Progreso/materiasUtils';

function InfoStatusBanner({ materias, progreso, progresoDetalles, filtros = [], setFiltros }) {
    if (!progreso || !materias) return null;

    const materiasIncompletas = materias.filter(m => {
        const estado = progreso[m.codigo];
        const detalles = progresoDetalles ? progresoDetalles[m.codigo] : null;
        return esMateriaIncompleta(m, estado, detalles);
    });

    const cantidadIncompletas = materiasIncompletas.length;
    const tieneMateriasAprobadas = materias.some(m => ['Aprobado', 'Promocionado', 'Regular'].includes(progreso[m.codigo]));

    if (!tieneMateriasAprobadas || cantidadIncompletas === 0) return null;

    const isFiltroActivo = filtros.includes('falta_info');

    const toggleFiltroIncompletas = () => {
        setFiltros(prev =>
            prev.includes('falta_info')
                ? prev.filter(f => f !== 'falta_info')
                : [...prev, 'falta_info']
        );
    };

    return (
        <div className="mb-4 bg-[#FFFBEB] dark:bg-[#2D2210]/70 border border-[#FDE68A] dark:border-[#5C4318] rounded-xl px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 text-[#92400E] dark:text-[#FCD34D] text-xs sm:text-sm">
                <AlertCircle className="size-4 shrink-0" />
                <span>
                    Tenés <strong className="font-semibold">{cantidadIncompletas}</strong> {cantidadIncompletas === 1 ? 'materia' : 'materias'} sin nota o fecha de regularidad para completar tu historial.
                </span>
            </div>

            <Button
                size="sm"
                color="warning"
                variant={isFiltroActivo ? 'solid' : 'flat'}
                className="font-semibold text-xs shrink-0 self-end sm:self-center rounded-lg h-7"
                startContent={<Filter size={13} />}
                onPress={toggleFiltroIncompletas}
            >
                {isFiltroActivo ? 'Quitar filtro incompletas' : 'Ver incompletas'}
            </Button>
        </div>
    );
}

export default InfoStatusBanner;
