import React from 'react';
import { Button } from '@heroui/react';

function Footer() {
    return (
        <footer className="w-full py-12 px-4 md:px-8 mt-auto flex flex-col items-center justify-center relative overflow-hidden">
            {/* Resplandor sutil de fondo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
                <div className="w-96 h-40 bg-emerald-500/5 dark:bg-emerald-500/10 blur-3xl rounded-full" />
            </div>

            {/* Tarjeta Principal */}
            <div className="w-full max-w-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-lg shadow-slate-200/50 dark:shadow-none hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden group">
                
                {/* Detalle decorativo de esquina superior */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#005a36] via-emerald-400 to-[#F5B82E] opacity-90" />
                
                {/* Marca de agua de código */}
                <i className="fa-solid fa-code absolute -right-4 -bottom-4 text-7xl text-slate-100 dark:text-zinc-800/30 -rotate-12 pointer-events-none select-none transition-transform duration-500 group-hover:scale-110 group-hover:rotate-0" />

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                    
                    {/* Contenedor de Avatar con Marco Gradiente */}
                    <div className="relative shrink-0">
                        <div className="p-1 rounded-2xl bg-gradient-to-tr from-[#005a36] via-emerald-500 to-[#F5B82E] shadow-md group-hover:shadow-lg transition-shadow duration-300">
                            <img
                                src="/imgs/Priscila Redondo.jpeg"
                                alt="Priscila Redondo"
                                className="w-24 h-28 sm:w-28 sm:h-32 object-cover rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                        </div>
                        {/* Insignia flotante */}
                        <div className="absolute -bottom-2 -right-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-full p-1.5 shadow-sm text-[#005a36] dark:text-emerald-400">
                            <i className="fa-solid fa-laptop-code text-xs" />
                        </div>
                    </div>

                    {/* Contenido / Info */}
                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2 flex-1 min-w-0">
                        
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-[#005a36] dark:text-emerald-400 font-extrabold text-[11px] uppercase tracking-wider border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Desarrollado por
                            </span>
                        </div>

                        <div>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                                Priscila Redondo
                            </h3>
                            <p className="text-xs sm:text-sm font-bold text-[#005a36] dark:text-emerald-400 mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
                                <i className="fa-solid fa-graduation-cap text-xs" />
                                Licenciatura en Sistemas de Información · UNLu
                            </p>
                        </div>

                        <p className="text-slate-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed font-normal mt-0.5">
                            Apasionada por crear interfaces digitales estéticas, funcionales y que aporten valor real a la comunidad universitaria.
                        </p>

                        {/* Botones de Acción / Redes */}
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-3 w-full">
                            <Button
                                as="a"
                                href="https://priscila-redondo.netlify.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl px-4 py-2 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                                startContent={<i className="fa-solid fa-globe text-xs" />}
                            >
                                Portfolio
                            </Button>

                            <Button
                                as="a"
                                href="https://www.linkedin.com/in/priscila-redondo/"
                                target="_blank"
                                rel="noopener noreferrer"
                                size="sm"
                                className="bg-[#0a66c2] hover:bg-[#004182] text-white font-bold text-xs rounded-xl px-4 py-2 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                                startContent={<i className="fa-brands fa-linkedin text-sm" />}
                            >
                                LinkedIn
                            </Button>

                            <Button
                                as="a"
                                href="mailto:prisredondo29@gmail.com"
                                size="sm"
                                className="bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold text-xs rounded-xl px-4 py-2 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                                startContent={<i className="fa-solid fa-envelope text-xs text-amber-400" />}
                            >
                                Email
                            </Button>
                        </div>

                    </div>

                </div>

            </div>
            
            {/* Texto sutil debajo */}
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 text-center mt-4 font-medium">
                Hecho con <i className="fa-solid fa-heart text-rose-500 text-[10px] mx-0.5" /> para estudiantes de LSI
            </p>
        </footer>
    );
}

export default Footer;