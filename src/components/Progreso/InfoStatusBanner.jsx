import React from 'react'
import { Card, CardBody, Button } from '@heroui/react'
import { AlertCircle, CheckCircle2, Filter } from 'lucide-react'

export const esMateriaIncompleta = (materia, estado, detalles) => {
    if (!estado) return false;
    if (estado === 'Regular') {
        return !detalles?.fechaRegularidad || !detalles?.notaRegularizacion;
    }
    if (estado === 'Aprobado' || estado === 'Promocionado') {
        return !detalles?.notaFinal;
    }
    return false;
};

function InfoStatusBanner({ materias, progreso, progresoDetalles, filtros = [], setFiltros }) {
    if (!progreso || !materias) return null;

    // Calcular materias con información faltante
    const materiasIncompletas = materias.filter(m => {
        const estado = progreso[m.codigo];
        const detalles = progresoDetalles ? progresoDetalles[m.codigo] : null;
        return esMateriaIncompleta(m, estado, detalles);
    });

    const cantidadIncompletas = materiasIncompletas.length;
    const tieneMateriasAprobadas = materias.some(m => ['Aprobado', 'Promocionado', 'Regular'].includes(progreso[m.codigo]));

    // Si no ha iniciado o no tiene materias en curso/aprobadas, no mostrar banner
    if (!tieneMateriasAprobadas) return null;

    const isFiltroActivo = filtros.includes('falta_info');

    const toggleFiltroIncompletas = () => {
        setFiltros(prev => 
            prev.includes('falta_info') 
                ? prev.filter(f => f !== 'falta_info') 
                : [...prev, 'falta_info']
        );
    };

    if (cantidadIncompletas > 0) {
        return (
            <Card className="mb-4 bg-amber-500/10 border border-amber-500/30 dark:bg-amber-950/20 dark:border-amber-500/20 shadow-sm transition-all">
                <CardBody className="py-2.5 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-small">
                    <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
                        <AlertCircle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div>
                            <span className="font-bold">
                                Tenés {cantidadIncompletas} {cantidadIncompletas === 1 ? 'materia' : 'materias'} con datos pendientes 
                            </span>
                            <span className="text-xs block text-amber-700/80 dark:text-amber-400/80">
                                Le falta nota final o fecha de regularidad para completar tu historial.
                            </span>
                        </div>
                    </div>

                    <Button
                        size="sm"
                        color="warning"
                        variant={isFiltroActivo ? "solid" : "flat"}
                        className="font-bold text-xs shrink-0 self-end sm:self-center rounded-xl"
                        startContent={<Filter size={14} />}
                        onPress={toggleFiltroIncompletas}
                    >
                        {isFiltroActivo ? "Viendo incompletas (Quitar filtro)" : "Ver materias a completar"}
                    </Button>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card className="mb-4 bg-emerald-500/10 border border-emerald-500/30 dark:bg-emerald-950/20 dark:border-emerald-500/20 shadow-sm">
            <CardBody className="py-2 px-4 flex items-center justify-between gap-3 text-small">
                <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold text-xs">
                        ¡Información al día! Todas tus materias aprobadas y regulares tienen sus notas y fechas cargadas.
                    </span>
                </div>
            </CardBody>
        </Card>
    );
}

export default InfoStatusBanner;
