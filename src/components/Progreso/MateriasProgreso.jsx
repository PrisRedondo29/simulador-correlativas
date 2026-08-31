import { Card, CardBody } from '@heroui/card'
import { CircularProgress, useDisclosure } from '@heroui/react'
import React, { useEffect, useState } from 'react'
import FiltroMateriasModal from './modals/FiltroMateriasModal'

function MateriasProgreso({ progreso, materias }) {
    const [seleccionada, setSeleccionada] = useState()
    // 1. Cálculos de datos (Lógica optimizada)
    const materiasTotales = materias.length
    const stats = [
        {
            label: "Disponibles",
            estado: "Disponible",
            count: materias.filter(m => progreso[m.codigo] === "Disponible").length,
            horas_semanales: materias.filter(m => progreso[m.codigo] === "Disponible")
                .reduce((acumulador, materia) => {
                    const horas = Number(materia.horas_semanales) || 0
                    return acumulador + horas
                }, 0),
            horas_totales: materias.filter(m => progreso[m.codigo] === "Disponible")
                .reduce((acumulador, materia) => {
                    const horas = Number(materia.horas_totales) || 0
                    return acumulador + horas
                }, 0),
            color: "primary",
            icon: "fa-solid fa-unlock",
            accent: "bg-primary-300 border-primary-400/50 shadow-primary",
            tittle: "Materias disponibles",
            text: "Son las materias que podes cursar en el cuatrimestre correspondiente",
            bg: "bg-primary/5"
        },
        {
            label: "Regulares",
            estado: "Regular",
            count: materias.filter(m => progreso[m.codigo] === "Regular").length,
            horas_semanales: materias.filter(m => progreso[m.codigo] === "Regular")
                .reduce((acumulador, materia) => {
                    const horas = Number(materia.horas_semanales) || 0
                    return acumulador + horas
                }, 0),
            horas_totales: materias.filter(m => progreso[m.codigo] === "Regular")
                .reduce((acumulador, materia) => {
                    const horas = Number(materia.horas_totales) || 0
                    return acumulador + horas
                }, 0),
            color: "warning",
            icon: "fa-regular fa-clock",
            accent: "bg-warning-300 border-warning-400/50 shadow-warning",
            tittle: "Materias regulares",
            text: "Tenes que rendir exámen final",
            bg: "bg-warning-50/50"
        },
        {
            label: "Aprobadas",
            estado: "Aprobado",
            count: materias.filter(m => progreso[m.codigo] === "Aprobado").length,
            horas_semanales: materias.filter(m => progreso[m.codigo] === "Aprobado")
                .reduce((acumulador, materia) => {
                    const horas = Number(materia.horas_semanales) || 0
                    return acumulador + horas
                }, 0),
            horas_totales: materias.filter(m => progreso[m.codigo] === "Aprobado")
                .reduce((acumulador, materia) => {
                    const horas = Number(materia.horas_totales) || 0
                    return acumulador + horas
                }, 0),
            color: "success",
            icon: "fa-regular fa-circle-check",
            accent: "bg-success-300 border-success-400/50 shadow-success",
            tittle: "Materias aprobadas",
            text: "Un peso menos",
            bg: "bg-success-50/50"
        },
        {
            label: "Promocionadas",
            estado: "Promocionado",
            count: materias.filter(m => progreso[m.codigo] === "Promocionado").length,
            horas_semanales: materias.filter(m => progreso[m.codigo] === "Promocionado")
                .reduce((acumulador, materia) => {
                    const horas = Number(materia.horas_semanales) || 0
                    return acumulador + horas
                }, 0),
            horas_totales: materias.filter(m => progreso[m.codigo] === "Promocionado")
                .reduce((acumulador, materia) => {
                    const horas = Number(materia.horas_totales) || 0
                    return acumulador + horas
                }, 0),
            color: "success",
            icon: "fa-solid fa-star",
            accent: "bg-success-300 border-success-400/50 shadow-success",
            tittle: "Materias promocionadas",
            text: "Eximido de final",
            bg: "bg-success-50/50"
        },
        {
            label: "Bloqueadas",
            estado: "Bloqueado",
            count: materias.filter(m => progreso[m.codigo] === "Bloqueado").length,
            horas_semanales: materias.filter(m => progreso[m.codigo] === "Bloqueado")
                .reduce((acumulador, materia) => {
                    const horas = Number(materia.horas_semanales) || 0
                    return acumulador + horas
                }, 0),
            horas_totales: materias.filter(m => progreso[m.codigo] === "Bloqueado")
                .reduce((acumulador, materia) => {
                    const horas = Number(materia.horas_totales) || 0
                    return acumulador + horas
                }, 0),
            color: "default",
            icon: "fa-solid fa-lock",
            accent: "bg-default-300 border-default-400/50 shadow-default",
            tittle: "Materias bloqueadas",
            text: "Tenes que regularizar las materias correlativas para cursarlas",
            bg: "bg-default-50/50"
        }
    ]

    const horasTotalesCarrera = materias.reduce((acc, m) => acc + (Number(m.horas_totales) || 0), 0)
    const horasConsumidas = materias.reduce((acc, m) => {
        const estado = progreso[m.codigo];
        if (["Aprobado", "Regular", "Cursando"].includes(estado)) {
            return acc + (Number(m.horas_totales) || 0);
        }
        return acc;
    }, 0);

    const resumenStats = []

    const calcularPorcentaje = (cant) => (materiasTotales > 0 ? (cant * 100) / materiasTotales : 0)
    const { isOpen, onOpen, onOpenChange } = useDisclosure()
    const {
        isOpen: isDetailOpen,
        onOpen: onDetailOpen,
        onOpenChange: onDetailOpenChange,
        onClose: onDetailClose
    } = useDisclosure()
    const [titulo, setTitulo] = useState()
    const handleClick = (estado, titulo) => {
        setSeleccionada(estado)
        setTitulo(titulo)
        onOpen()

        window.history.pushState({ modalOpen: true }, "")
    }

    useEffect(() => {
        const handlePopState = () => {
            if (!isDetailOpen) {
                onOpenChange(false)
            }
        }
        if (isOpen) {
            window.addEventListener("popstate", handlePopState)
        }
        return () => {
            window.removeEventListener("popstate", handlePopState)
        }
    }, [isOpen, onOpenChange, isDetailOpen])

    return (
        <div className="grid grid-cols-2 min-[425px]:grid-cols-3 min-[550px]:grid-cols-5 gap-3 sm:gap-4 lg:gap-5 mt-2 mb-4 tracking-wider">
            {stats.map((stat) => {
                const porcentaje = Math.round(calcularPorcentaje(stat.count))
                const colorTheme = {
                    primary: {
                        text: "text-primary dark:text-primary-400",
                        border: "border-primary/30 hover:border-primary",
                        bg: "bg-primary-50/40 dark:bg-primary-950/20",
                        badge: "bg-primary/10 text-primary"
                    },
                    warning: {
                        text: "text-amber-600 dark:text-amber-400",
                        border: "border-amber-400/30 hover:border-amber-500",
                        bg: "bg-amber-50/40 dark:bg-amber-950/20",
                        badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    },
                    success: {
                        text: "text-emerald-600 dark:text-emerald-400",
                        border: "border-emerald-400/30 hover:border-emerald-500",
                        bg: "bg-emerald-50/40 dark:bg-emerald-950/20",
                        badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    },
                    default: {
                        text: "text-slate-500 dark:text-zinc-400",
                        border: "border-slate-200 hover:border-slate-400 dark:border-zinc-700/80 dark:hover:border-zinc-500",
                        bg: "bg-slate-50/50 dark:bg-zinc-800/40",
                        badge: "bg-slate-200/60 dark:bg-zinc-700/60 text-slate-600 dark:text-zinc-300"
                    }
                }[stat.color] || colorTheme.default

                return (
                    <Card
                        isPressable
                        key={stat.estado}
                        className={`bg-white dark:bg-zinc-800/90 border ${colorTheme.border} transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-1 w-full group relative overflow-hidden rounded-2xl cursor-pointer`}
                        onPress={() => handleClick(stat.estado, stat.label)}
                    >
                        {/* Indicador sutil superior derecho */}
                        <div className="absolute top-2.5 right-2.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <i className="fa-solid fa-arrow-up-right-from-square text-[9px] lg:text-[10px] text-slate-400 group-hover:text-foreground" />
                        </div>

                        <CardBody className="py-3.5 sm:py-5 lg:py-6 px-3 lg:px-4 flex flex-col items-center justify-between gap-3 lg:gap-4 overflow-hidden">
                            <div className="relative flex items-center justify-center">
                                <CircularProgress
                                    value={porcentaje}
                                    size="lg"
                                    color={stat.color}
                                    showValueLabel={false}
                                    aria-label={`Progreso circular ${stat.label}`}
                                    classNames={{
                                        svg: "w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 drop-shadow-2xs group-hover:scale-105 transition-transform duration-200",
                                        track: "stroke-slate-100 dark:stroke-zinc-700/60",
                                    }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <i className={`${stat.icon} text-xs lg:text-sm text-slate-400 dark:text-zinc-400 group-hover:scale-110 transition-transform`} />
                                </div>
                            </div>

                            <div className="flex flex-col items-center text-center w-full">
                                <span className="text-[11px] lg:text-xs font-extrabold text-foreground/80 leading-tight uppercase tracking-wider">{stat.label}</span>
                                <span className={`text-base sm:text-xl lg:text-2xl font-black ${colorTheme.text} tabular-nums mt-0.5 lg:mt-1`}>
                                    {porcentaje}%
                                </span>
                                <span className="text-[9px] lg:text-[11px] font-bold text-slate-400 dark:text-zinc-400 tabular-nums mt-0.5">
                                    {stat.count} {stat.count === 1 ? 'materia' : 'materias'}
                                </span>
                            </div>
                        </CardBody>
                    </Card>
                )
            })}

            <FiltroMateriasModal
                estado={seleccionada}
                materias={materias}
                progreso={progreso}
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                titulo={titulo}
                isDetailOpen={isDetailOpen}
                onDetailOpen={onDetailOpen}
                onDetailOpenChange={onDetailOpenChange}
                onDetailClose={onDetailClose}
            />
        </div>
    )
}

export default MateriasProgreso