import React from 'react';
import { Button, Modal, ModalBody, ModalContent, addToast } from '@heroui/react';
import { FileDown, GraduationCap, History, Map, Save } from 'lucide-react';
import storageRepository from '../../../services/storageRepository';

/**
 * Modal de finalización del Simulador para escritorio.
 * Mantiene el grafo completo visible detrás y ofrece acciones claras de cierre
 * (guardar simulación, exportar PDF, inspeccionar historial o volver al mapa).
 */
function SimulacionFinalizadaModal({
    isOpen,
    onOpenChange,
    onClose,
    anioActual,
    cuatri,
    plan,
    historialSemestres,
    progresoSimulado,
    progresoBase,
    simulacionTerminada,
    onGuardarOpen,
    onGuardarSimulacion,
    handleDownloadPDF,
    descargandoPDF,
    onOpenHistory,
}) {
    const handleGuardar = () => {
        if (onGuardarSimulacion) {
            onGuardarSimulacion();
            return;
        }
        const existe = storageRepository.getSimulacion(plan, null);
        if (existe) {
            onGuardarOpen();
        } else {
            storageRepository.setSimulacion(plan, {
                historialSemestres,
                progresoSimulado,
                progresoBase,
                anioActual,
                cuatri,
                simulacionTerminada,
            });
            addToast({ title: 'Éxito', description: 'Simulación guardada', color: 'success' });
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size="md"
            placement="center"
            backdrop="opaque"
            classNames={{
                backdrop: 'bg-slate-900/55 backdrop-blur-xs',
                base: 'bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl shadow-xl',
            }}
        >
            <ModalContent>
                <ModalBody className="p-6 text-center space-y-5">
                    <div className="space-y-2.5">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#ECFDF5] dark:bg-[#102A20] border border-[#A7F3D0] dark:border-[#1E4D38] text-[#005A36] dark:text-[#6EE7B7] flex items-center justify-center">
                            <GraduationCap size={28} aria-hidden="true" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
                                ¡Simulación Finalizada!
                            </h2>
                            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                                Completaste todas las materias del Plan {plan}.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#0F1419] border border-[#E2E8F0] dark:border-[#2A3540] p-2.5">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] block">
                                Egreso estimado
                            </span>
                            <span className="text-sm font-bold text-[#005A36] dark:text-[#6EE7B7] tabular-nums">
                                {anioActual} · C{cuatri}
                            </span>
                        </div>
                        <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#0F1419] border border-[#E2E8F0] dark:border-[#2A3540] p-2.5">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] block">
                                Cuatrimestres
                            </span>
                            <span className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                                {historialSemestres.length}
                            </span>
                        </div>
                        <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#0F1419] border border-[#E2E8F0] dark:border-[#2A3540] p-2.5">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] block">
                                Plan
                            </span>
                            <span className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] tabular-nums">
                                {plan}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <Button
                            size="md"
                            onPress={handleGuardar}
                            startContent={<Save size={16} />}
                            className="w-full font-semibold rounded-xl bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] dark:hover:bg-[#246B4E] text-white"
                        >
                            Guardar simulación
                        </Button>

                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={handleDownloadPDF}
                                isLoading={descargandoPDF}
                                startContent={!descargandoPDF && <FileDown size={15} className="text-[#005A36] dark:text-[#6EE7B7]" />}
                                className="font-semibold rounded-xl h-10 bg-[#F1F5F9] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540] text-[#1E293B] dark:text-[#F1F5F9]"
                            >
                                {descargandoPDF ? 'Generando...' : 'Descargar PDF'}
                            </Button>
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={() => {
                                    onClose?.();
                                    onOpenHistory?.();
                                }}
                                startContent={<History size={15} className="text-[#005A36] dark:text-[#6EE7B7]" />}
                                className="font-semibold rounded-xl h-10 bg-[#F1F5F9] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540] text-[#1E293B] dark:text-[#F1F5F9]"
                            >
                                Ver historial
                            </Button>
                        </div>

                        <Button
                            size="sm"
                            variant="light"
                            onPress={onClose}
                            startContent={<Map size={14} />}
                            className="w-full font-medium text-xs text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F1F5F9] rounded-xl h-9"
                        >
                            Seguir viendo el mapa
                        </Button>
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}

export default SimulacionFinalizadaModal;
