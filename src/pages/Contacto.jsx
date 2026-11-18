import React from 'react';
import ContactForm from '../components/Shared/ContactForm';
import { Button, addToast } from '@heroui/react';

const Contacto = () => {
    const handleCopy = (text, label) => {
        navigator.clipboard.writeText(text);
        addToast({ title: 'Copiado', description: `${label} copiado al portapapeles.`, color: 'success' });
    };

    return (
        <div className="flex flex-col gap-6 py-6 md:py-8 px-4 sm:px-6 md:px-10 max-w-5xl mx-auto animate-in fade-in duration-300">
            {/* Cabecera Institucional Limpia */}
            <header className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#005A36] dark:text-[#86EFAC]">
                    <i className="fa-solid fa-building-columns text-[11px]" aria-hidden="true" />
                    UNLu · Sistemas de Información
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
                    Contacto y Reportes
                </h1>
                <p className="text-[#64748B] dark:text-[#94A3B8] text-xs sm:text-sm max-w-2xl leading-relaxed">
                    Consultas sobre correlatividades, reporte de errores en el plan de estudios o sugerencias de mejora para el simulador.
                </p>
            </header>

            {/* Canales Directos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-envelope text-sm" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] block">Correo de soporte</span>
                            <span className="text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] truncate block">
                                prisredondo29@gmail.com
                            </span>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="flat"
                        className="bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0] font-medium text-xs rounded-xl shrink-0"
                        onPress={() => handleCopy('prisredondo29@gmail.com', 'Correo')}
                        startContent={<i className="fa-regular fa-copy text-xs" />}
                    >
                        Copiar
                    </Button>
                </div>

                <div className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-users text-sm" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] block">Centro de Estudiantes</span>
                            <span className="text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] truncate block">
                                CODES UNLu
                            </span>
                        </div>
                    </div>
                    <Button
                        as="a"
                        href="https://www.codesunlu.tech/"
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        variant="flat"
                        className="bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0] font-medium text-xs rounded-xl shrink-0"
                        endContent={<i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />}
                    >
                        Visitar
                    </Button>
                </div>
            </div>

            {/* Formulario de Contacto */}
            <div className="w-full">
                <ContactForm />
            </div>
        </div>
    );
};

export default Contacto;
