import React from 'react';
import { Card, CardBody, Button, addToast } from '@heroui/react';

/**
 * Pantalla de carrera finalizada: muestra el año de egreso estimado
 * y permite guardar o descargar el PDF del historial.
 */
function CarreraFinalizada({ anioActual, plan, historialSemestres, progresoSimulado, progresoBase, cuatri, simulacionTerminada, onGuardarOpen, handleDownloadPDF, descargandoPDF }) {
    const handleGuardar = () => {
        const existe = localStorage.getItem(`simulacion+${plan}`);
        if (existe) {
            onGuardarOpen();
        } else {
            localStorage.setItem(`simulacion+${plan}`, JSON.stringify({
                historialSemestres, progresoSimulado, progresoBase, anioActual, cuatri, simulacionTerminada,
            }));
            addToast({ title: 'Éxito', description: 'Simulación guardada', color: 'success' });
        }
    };

    return (
        <div className="flex flex-col gap-5 w-full mt-2">
            <Card shadow="none" className="bg-[#005A36] dark:bg-[#11221B] text-white border border-[#00472B] dark:border-[#24382F] rounded-2xl w-full">
                <CardBody className="p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-3">
                    <div className="bg-white/15 p-4 rounded-2xl border border-white/20">
                        <i className="fa-solid fa-graduation-cap text-3xl sm:text-4xl" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">¡Carrera Finalizada!</h2>
                    <p className="text-white/90 text-xs sm:text-sm max-w-md leading-relaxed">
                        Completaste todas las materias del Plan {plan}. Según esta simulación, tu egreso proyectado sería en <strong>{anioActual}</strong>.
                    </p>
                </CardBody>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                <Button
                    size="md"
                    className="bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] dark:hover:bg-[#246B4E] font-semibold rounded-xl text-white w-full sm:w-auto px-6"
                    onPress={handleGuardar}
                    startContent={<i className="fa-solid fa-floppy-disk" />}
                >
                    Guardar simulación
                </Button>
                <Button
                    variant="flat"
                    size="md"
                    className="font-semibold rounded-xl w-full sm:w-auto px-6 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-[#1E293B] dark:text-[#F1F5F9]"
                    onPress={handleDownloadPDF}
                    isLoading={descargandoPDF}
                    startContent={!descargandoPDF && <i className="fa-solid fa-file-pdf text-[#005A36] dark:text-[#6EE7B7]" />}
                >
                    {descargandoPDF ? 'Generando PDF...' : 'Descargar en PDF'}
                </Button>
            </div>
        </div>
    );
}

export default CarreraFinalizada;
