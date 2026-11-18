import React from 'react';
import { Button, Card, CardBody } from '@heroui/react';
import { useAuth } from '../../context/AuthContext';

const ServerError = () => {
    const { enterOfflineMode } = useAuth();

    const handleRetry = () => {
        window.location.reload();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#F8FAFC]/90 dark:bg-[#0F1419]/90 animate-in fade-in duration-300">
            <Card className="max-w-md w-full shadow-md border border-[#E2E8F0] dark:border-[#2A3540] bg-white dark:bg-[#161D24]">
                <CardBody className="p-7 text-center flex flex-col gap-5">
                    <div className="w-16 h-16 bg-[#FEF2F2] dark:bg-[#2D1619] rounded-2xl flex items-center justify-center mx-auto border border-[#FECACA] dark:border-[#5C262B]">
                        <i className="fa-solid fa-cloud-slash text-2xl text-[#991B1B] dark:text-[#FCA5A5]"></i>
                    </div>
                    
                    <div className="space-y-1.5">
                        <h1 className="text-xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">Error de Sincronización</h1>
                        <p className="text-[#64748B] dark:text-[#94A3B8] text-sm leading-relaxed">
                            No logramos conectar con los servidores de Google. Esto puede deberse a problemas de red o bloqueos de firewall en tu institución.
                        </p>
                    </div>

                    <div className="bg-[#FFFBEB] dark:bg-[#2D2210] p-4 rounded-xl border border-[#FDE68A] dark:border-[#5C4318] text-left">
                        <p className="text-xs text-[#92400E] dark:text-[#FCD34D] font-semibold flex items-center gap-2">
                            <i className="fa-solid fa-circle-info"></i>
                            ¿Qué significa el Modo Offline?
                        </p>
                        <p className="text-xs text-[#92400E]/90 dark:text-[#FCD34D]/85 mt-1 leading-relaxed">
                            Podrás usar el simulador con normalidad y los cambios se guardarán en este dispositivo. Se sincronizarán con la nube automáticamente cuando vuelva la conexión.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2.5 pt-1">
                        <Button 
                            color="primary" 
                            variant="solid" 
                            size="md" 
                            className="font-semibold rounded-xl"
                            onPress={handleRetry}
                        >
                            <i className="fa-solid fa-rotate-right mr-2"></i>
                            Reintentar Conexión
                        </Button>
                        
                        <Button 
                            color="default" 
                            variant="flat" 
                            size="md" 
                            className="font-medium rounded-xl"
                            onPress={enterOfflineMode}
                        >
                            <i className="fa-solid fa-plug-circle-xmark mr-2"></i>
                            Continuar Offline
                        </Button>
                    </div>
                    
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium mt-1">
                        Simulador de Correlativas UNLu
                    </p>
                </CardBody>
            </Card>
        </div>
    );
};

export default ServerError;
