import { Button, Checkbox, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react';
import { useState } from 'react';

function getWarningText(targetState) {
    if (targetState === 'Regular') {
        return 'Se regularizarán automáticamente todas las dependencias y correlativas necesarias para esta materia. ¿Quieres confirmar?';
    }
    if (targetState === 'Aprobado' || targetState === 'Promocionado') {
        return 'Esto marcará opcionalmente como aprobadas todas las materias previas requeridas por correlatividad. ¿Quieres confirmar?';
    }
    return 'Estás a punto de modificar el estado de una materia de forma que afectará sus correlativas. ¿Quieres confirmar?';
}

function ConfirmarCambioBody({ closeModal, onClose, onConfirm, setConfirmacion, setMostrar, targetState }) {
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
            <ModalBody>
                <p className="text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                    {getWarningText(targetState)}
                </p>
                <Checkbox
                    size="sm"
                    isSelected={isSelected}
                    onValueChange={setIsSelected}
                >
                    No volver a mostrar este aviso
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

function ConfirmarCambioModal({ onClose, isOpen, onOpenChange, onConfirm, setConfirmacion, setMostrar, targetState }) {
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
                    />
                )}
            </ModalContent>
        </Modal>
    );
}

export default ConfirmarCambioModal;
