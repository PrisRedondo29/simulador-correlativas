import { Card, CardBody, CardFooter } from '@heroui/card'
import { Chip, Button, Link } from '@heroui/react'
import React from 'react'

function Footer() {
    return (
        <footer className="w-full pb-8 pt-10 px-4 md:px-8 mt-auto">
            <Card className="max-w-2xl mx-auto shadow-xs hover:shadow-sm transition-shadow duration-300 border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl">
                <CardBody className='flex flex-col md:flex-row items-center justify-center gap-6 p-6 sm:p-8'>
                    {/* Contenedor de Imagen con Efecto Reflejo */}
                    <div className="relative group shrink-0">
                        <img
                            src='/imgs/Priscila Redondo.jpeg'
                            className='w-24 h-32 object-cover rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-105 relative z-10 border-2 border-slate-100 dark:border-zinc-800'
                            alt='Priscila Redondo'
                        />
                    </div>

                    {/* Información del Creador */}
                    <div className='flex flex-col items-center md:items-start gap-2 w-full'>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#005a36] dark:text-emerald-400 font-black text-[10px] uppercase tracking-wider border border-emerald-200/50">
                            Desarrollado por
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-zinc-100 tracking-tight text-center md:text-left">
                            Priscila Redondo
                        </h3>
                        <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm font-normal text-center md:text-left leading-relaxed">
                            Licenciatura en Sistemas de Información · UNLu. <br className="hidden md:block" />
                            Apasionada por crear interfaces digitales estéticas, funcionales y que aporten valor real.
                        </p>
                    </div>
                </CardBody>

                {/* Panel de Redes Sociales y Enlaces */}
                <CardFooter className="flex flex-wrap justify-center items-center gap-3 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 rounded-b-3xl">
                    <span className="text-slate-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-wider mr-2 w-full sm:w-auto text-center mb-1 sm:mb-0">
                        Contacto:
                    </span>

                    <Button
                        as={Link}
                        href="https://priscila-redondo.netlify.app/"
                        target="_blank"
                        isExternal
                        variant="flat"
                        color="secondary"
                        radius="full"
                        size="sm"
                        className="font-bold shadow-2xs text-xs"
                        startContent={<i className="fa-solid fa-globe"></i>}
                    >
                        Portfolio
                    </Button>

                    <Button
                        as={Link}
                        href="https://www.linkedin.com/in/priscila-redondo/"
                        target="_blank"
                        isExternal
                        variant="flat"
                        color="primary"
                        radius="full"
                        size="sm"
                        className="font-bold shadow-2xs text-xs"
                        startContent={<i className="fa-brands fa-linkedin text-sm"></i>}
                    >
                        LinkedIn
                    </Button>

                    <Button
                        as={Link}
                        href="mailto:prisredondo29@gmail.com"
                        variant="flat"
                        color="warning"
                        radius="full"
                        size="sm"
                        className="font-bold text-warning-700 shadow-2xs text-xs"
                        startContent={<i className="fa-solid fa-envelope"></i>}
                    >
                        Email
                    </Button>
                </CardFooter>
            </Card>
        </footer>
    )
}

export default Footer