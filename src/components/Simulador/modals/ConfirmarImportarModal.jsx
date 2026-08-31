import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Progress } from '@heroui/react'
import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'

function ConfirmarImportarModal({ isOpen, onOpenChange, onConfirm, progresoReal, progresoDetalles, materias }) {

    // Calcular completitud de datos
    const stats = useMemo(() => {
        if (!progresoReal || !materias?.length) return null;

        // Materias que tienen algún progreso (no "Disponible" ni "Bloqueado")
        const materiasConProgreso = materias.filter(m => {
            const estado = progresoReal[m.codigo];
            return estado && estado !== 'Disponible' && estado !== 'Bloqueado';
        });

        const total = materiasConProgreso.length;
        if (total === 0) return null;

        // Materias que tienen fecha de regularidad cargada
        const conFecha = materiasConProgreso.filter(m => {
            const detalles = progresoDetalles?.[m.codigo];
            return detalles?.fechaRegularidad?.anio || detalles?.intentosFinal?.some(i => i.fecha) || detalles?.esEquivalencia;
        }).length;

        const sinFecha = total - conFecha;
        const porcentaje = Math.round((conFecha / total) * 100);

        return { total, conFecha, sinFecha, porcentaje };
    }, [progresoReal, progresoDetalles, materias]);

    const completitudBaja = stats && stats.porcentaje < 60;

    return (
        <Modal 
            isOpen={isOpen} 
            onOpenChange={onOpenChange}
            backdrop="blur"
            placement="center"
            className="mx-4"
            size="lg"
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 pb-2">
                            <div className="flex items-center gap-2 text-secondary">
                                <i className="fa-solid fa-cloud-arrow-down" />
                                <h3 className="text-lg font-bold">Importar Progreso Real</h3>
                            </div>
                        </ModalHeader>
                        <ModalBody>
                            <div className="space-y-4">
                                <p className="text-sm text-foreground/80">
                                    Se reconstruirá tu historial basándonos en tus fechas de aprobación y regularización registradas en <strong>Mi Progreso</strong>.
                                </p>

                                {/* Indicador de completitud de datos */}
                                {stats && (
                                    <div className={`rounded-xl border p-4 space-y-3 ${completitudBaja ? 'bg-warning-50/50 dark:bg-warning-500/5 border-warning-200 dark:border-warning-500/20' : 'bg-success-50/50 dark:bg-success-500/5 border-success-200 dark:border-success-500/20'}`}>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <i className={`fa-solid ${completitudBaja ? 'fa-chart-pie text-warning-500' : 'fa-circle-check text-success-500'} text-sm`} />
                                                <span className="text-xs font-bold text-foreground/80">Completitud de tus datos</span>
                                            </div>
                                            <span className={`text-sm font-black ${completitudBaja ? 'text-warning-600 dark:text-warning-400' : 'text-success-600 dark:text-success-400'}`}>
                                                {stats.porcentaje}%
                                            </span>
                                        </div>

                                        <Progress 
                                            value={stats.porcentaje} 
                                            color={completitudBaja ? 'warning' : 'success'}
                                            size="sm"
                                            className="w-full"
                                        />

                                        <div className="flex items-center justify-between text-[11px] text-foreground/60 font-medium">
                                            <span className="flex items-center gap-1">
                                                <i className="fa-solid fa-calendar-check text-success-500" />
                                                {stats.conFecha} con fecha
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <i className="fa-solid fa-question-circle text-warning-500" />
                                                {stats.sinFecha} sin fecha (se estimarán)
                                            </span>
                                        </div>

                                        {completitudBaja && (
                                            <div className="pt-1 border-t border-warning-200/50 dark:border-warning-500/10">
                                                <p className="text-[11px] text-warning-700 dark:text-warning-300 leading-relaxed">
                                                    <strong>💡 Consejo:</strong> Cuantas más fechas cargues en <Link to="/progreso" className="underline font-bold hover:text-warning-600" onClick={onClose}>Mi Progreso</Link>, más precisa será la reconstrucción de tu historial.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!completitudBaja && (
                                    <div className="bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/30 p-2.5 rounded-xl flex gap-2 items-center">
                                        <i className="fa-solid fa-triangle-exclamation text-warning-500 text-xs" />
                                        <p className="text-[11px] text-warning-800 dark:text-warning-300 font-medium">
                                            Esta es una <strong>aproximación</strong> y puede no ser 100% idéntica a tu realidad académica.
                                        </p>
                                    </div>
                                )}

                                <p className="text-xs text-foreground/50 italic">
                                    ¿Continuar? Esto reemplazará cualquier simulación actual.
                                </p>
                            </div>
                        </ModalBody>
                        <ModalFooter className="pt-2">
                            <Button variant="light" onPress={onClose} className="font-bold">
                                Cancelar
                            </Button>
                            <Button color="secondary" onPress={() => { onConfirm(); onClose(); }} className="font-bold shadow-lg shadow-secondary/20">
                                Sí, Importar Avance
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    )
}

export default ConfirmarImportarModal

