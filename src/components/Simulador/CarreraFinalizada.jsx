import React from 'react';
import { Card, CardBody, Button } from '@heroui/react';

/**
 * Pantalla de carrera finalizada: muestra el año de egreso estimado
 * y permite descargar el PDF del historial.
 */
function CarreraFinalizada({ anioActual, plan, handleDownloadPDF, descargandoPDF }) {
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
                    onPress={handleDownloadPDF}
                    isLoading={descargandoPDF}
                    startContent={!descargandoPDF && <i className="fa-solid fa-file-pdf" />}
                >
                    {descargandoPDF ? 'Generando PDF...' : 'Descargar en PDF'}
                </Button>
            </div>
        </div>
    );
}

export default CarreraFinalizada;
