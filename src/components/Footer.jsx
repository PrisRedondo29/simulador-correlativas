import React from 'react';
import { Button } from '@heroui/react';
import { Link, useLocation } from 'react-router-dom';

function Footer() {
    const location = useLocation();
    const showFullAuthorCard = location.pathname === '/contacto';

    if (!showFullAuthorCard) {
        return (
            <footer className="w-full border-t border-[#E2E8F0] dark:border-[#2A3540] py-4 px-4 sm:px-8 mt-8">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
                    <span>
                        Simulador de Correlativas · Licenciatura en Sistemas de Información (UNLu)
                    </span>
                    <div className="flex items-center gap-3">
                        <span>Desarrollado por Priscila Redondo</span>
                        <span aria-hidden="true">·</span>
                        <Link to="/contacto" className="font-medium text-[#005A36] dark:text-[#6EE7B7] hover:underline">
                            Contacto
                        </Link>
                    </div>
                </div>
            </footer>
        );
    }

    return (
        <footer className="w-full py-10 px-4 md:px-8 mt-auto flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-6 sm:p-7 shadow-xs">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    <img
                        src="/imgs/Priscila Redondo.jpeg"
                        alt="Priscila Redondo"
                        className="w-22 h-26 sm:w-24 sm:h-28 object-cover rounded-xl border border-[#E2E8F0] dark:border-[#2A3540] shrink-0"
                    />

                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1.5 flex-1 min-w-0">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] font-medium text-[11px] border border-[#A7F3D0] dark:border-[#1E4D38]">
                            Desarrollado por
                        </span>

                        <div>
                            <h3 className="text-xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
                                Priscila Redondo
                            </h3>
                            <p className="text-xs sm:text-sm font-medium text-[#478559] dark:text-[#86EFAC] mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
                                <i className="fa-solid fa-graduation-cap text-xs" />
                                Licenciatura en Sistemas de Información · UNLu
                            </p>
                        </div>

                        <p className="text-[#64748B] dark:text-[#94A3B8] text-xs sm:text-sm leading-relaxed mt-0.5">
                            Proyecto estudiantil pensado para planificar cursadas con claridad y reducir la incertidumbre académica.
                        </p>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2.5 w-full">
                            <Button
                                as="a"
                                href="https://priscila-redondo.netlify.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                                size="sm"
                                className="bg-[#005A36] hover:bg-[#00472B] text-white font-medium text-xs rounded-xl px-3.5"
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
                                variant="flat"
                                className="bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0] font-medium text-xs rounded-xl px-3.5 border border-[#E2E8F0] dark:border-[#2A3540]"
                                startContent={<i className="fa-brands fa-linkedin text-xs" />}
                            >
                                LinkedIn
                            </Button>

                            <Button
                                as="a"
                                href="mailto:prisredondo29@gmail.com"
                                size="sm"
                                variant="flat"
                                className="bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0] font-medium text-xs rounded-xl px-3.5 border border-[#E2E8F0] dark:border-[#2A3540]"
                                startContent={<i className="fa-solid fa-envelope text-xs" />}
                            >
                                Email
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
