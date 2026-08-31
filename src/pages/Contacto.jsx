import React from 'react';
import ContactForm from '../components/Shared/ContactForm';
import { Button, addToast } from '@heroui/react';

const Contacto = () => {
    const handleCopy = (text, label) => {
        navigator.clipboard.writeText(text);
        addToast({ title: 'Copiado', description: `${label} copiado al portapapeles.`, color: 'success' });
    };

    return (
        <div className="flex flex-col gap-8 py-6 md:py-10 px-4 md:px-10 max-w-6xl mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)]">
            {/* Institutional Hero Banner (Image 3) */}
            <div className="bg-linear-to-r from-[#005a36] to-[#004d2e] text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-emerald-200 text-xs font-semibold uppercase tracking-wider">
                        <i className="fa-solid fa-building-columns" /> UNLu Sistemas de Información
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                        Ponete en contacto con nosotros
                    </h1>
                    <p className="text-white/85 text-sm sm:text-base max-w-xl font-normal leading-relaxed">
                        Consultas sobre correlatividades, reporte de errores en el plan de estudios o sugerencias de mejora para el simulador.
                    </p>
                </div>

                {/* Right-side quick contact badges */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                                <i className="fa-solid fa-envelope text-lg" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider">Correo</span>
                                <span className="text-xs sm:text-sm font-semibold text-white">prisredondo29@gmail.com</span>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="flat"
                            className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg px-3"
                            onPress={() => handleCopy('prisredondo29@gmail.com', 'Correo')}
                            startContent={<i className="fa-regular fa-copy text-[11px]" />}
                        >
                            Copiar
                        </Button>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                                <i className="fa-solid fa-users text-lg" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider">Centro de Estudiantes</span>
                                <span className="text-xs sm:text-sm font-semibold text-white">CODES UNLu</span>
                            </div>
                        </div>
                        <Button
                            as="a"
                            href="https://www.codesunlu.tech/"
                            target="_blank"
                            rel="noopener noreferrer"
                            size="sm"
                            variant="flat"
                            className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg px-3"
                            endContent={<i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />}
                        >
                            Visitar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Banner Atención al Público / Horarios */}
            <div className="bg-emerald-900 text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-800 flex items-center justify-center text-emerald-300 shrink-0">
                        <i className="fa-regular fa-clock text-2xl" />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">Atención y Soporte</span>
                        <h3 className="text-base sm:text-lg font-bold text-white">Canales Online Activos</h3>
                        <p className="text-xs sm:text-sm text-emerald-200/80">Revisamos los mensajes y reportes enviados a través del formulario de contacto.</p>
                    </div>
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

