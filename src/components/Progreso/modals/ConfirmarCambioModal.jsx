import { Button, Checkbox, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react';
import { useState } from 'react';

function getWarningText(targetState, nombreMateria, cantidadAfectadas) {
    const labelMateria = nombreMateria ? `"${nombreMateria}"` : 'esta materia';
    if (targetState === 'Aprobado' || targetState === 'Promocionado') {
        if (cantidadAfectadas > 0) {
            return `Al marcar ${labelMateria} como ${targetState}, se aprobarán automáticamente en cascada las siguientes correlativas previas que aún no figuraban aprobadas:`;
        }
        return `Esto marcará como aprobadas todas las materias previas requeridas por correlatividad para ${labelMateria}. ¿Querés confirmar?`;
    }
    if (targetState === 'Regular' || targetState === 'Cursando') {
        if (cantidadAfectadas > 0) {
            return `Para pasar ${labelMateria} a ${targetState}, se actualizarán automáticamente en cascada las siguientes correlativas previas:`;
        }
        return `Se regularizarán automáticamente todas las dependencias y correlativas necesarias para ${labelMateria}. ¿Querés confirmar?`;
    }
    return 'Estás a punto de modificar el estado de una materia de forma que afectará sus correlativas en cascada. ¿Querés confirmar?';
}

function ConfirmarCambioBody({
    closeModal,
    onClose,
    onConfirm,
    setConfirmacion,
    setMostrar,
    targetState,
    nombreMateria,
    materiasAfectadas = [],
}) {
    const [isSelected, setIsSelected] = useState(false);

    const finalizar = () => {
        if (onClose) onClose();
        else closeModal();
    };

    const handleConfirmacion = () => {
        if (isSelected && setMostrar) {
            setMostrar(false);
        }
        if (onConfirm) {
            onConfirm();
        } else if (setConfirmacion) {
            setConfirmacion(true);
        }
        finalizar();
    };

    const handleCancel = () => {
        if (isSelected && setMostrar) {
            setMostrar(false);
        }
        finalizar();
    };

    return (
        <>
            <ModalHeader className="text-[#1E293B] dark:text-[#F1F5F9]">
                Confirmar actualización en cascada
            </ModalHeader>
            <ModalBody className="space-y-3">
                <p className="text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                    {getWarningText(targetState, nombreMateria, materiasAfectadas.length)}
                </p>

                {materiasAfectadas.length > 0 && (
                    <ul
                        aria-label="Materias que se actualizarán en cascada"
                        className="max-h-44 overflow-y-auto rounded-xl bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] divide-y divide-[#E2E8F0] dark:divide-[#24303C] text-xs"
                    >
                        {materiasAfectadas.map((item) => (
                            <li
                                key={item.codigo}
                                className="px-3 py-2 flex items-center justify-between gap-2"
                            >
                                <span className="font-medium text-[#1E293B] dark:text-[#F1F5F9] truncate">
                                    {item.nombre}
                                    <span className="ml-1.5 text-[11px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                                        ({item.codigo})
                                    </span>
                                </span>
                                <span className="shrink-0 font-semibold text-[#005A36] dark:text-[#6EE7B7]">
                                    {item.estadoAnterior} → {item.estadoNuevo}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}

                <Checkbox
                    size="sm"
                    isSelected={isSelected}
                    onValueChange={setIsSelected}
                >
                    No volver a mostrar esta advertencia
                </Checkbox>
            </ModalBody>
            <ModalFooter>
                <Button variant="light" onPress={handleCancel}>
                    Cancelar
                </Button>
                <Button className="bg-[#005A36] text-white font-semibold" onPress={handleConfirmacion}>
                    Confirmar
                </Button>
            </ModalFooter>
        </>
    );
}

function ConfirmarCambioModal({
    onClose,
    isOpen,
    onOpenChange,
    onConfirm,
    setConfirmacion,
    setMostrar,
    targetState,
    nombreMateria,
    materiasAfectadas,
}) {
    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            backdrop="opaque"
            classNames={{
                backdrop: 'bg-black/50',
            }}
        >
            <ModalContent className="bg-[#FFFFFF] dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#24303C]">
                {(closeModal) => (
                    <ConfirmarCambioBody
                        closeModal={closeModal}
                        onClose={onClose}
                        onConfirm={onConfirm}
                        setConfirmacion={setConfirmacion}
                        setMostrar={setMostrar}
                        targetState={targetState}
                        nombreMateria={nombreMateria}
                        materiasAfectadas={materiasAfectadas}
                    />
                )}
            </ModalContent>
        </Modal>
    );
}

export default ConfirmarCambioModal;
