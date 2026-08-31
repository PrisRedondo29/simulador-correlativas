import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, Tab, Card, CardBody, Button, Input } from '@heroui/react'
import { Search } from 'lucide-react'
import ProgresoHelp from '../components/Tutorial/sections/ProgresoHelp'
import SimuladorHelp from '../components/Tutorial/sections/SimuladorHelp'
import EquivalenciasHelp from '../components/Tutorial/sections/EquivalenciasHelp'

export default function ComoUsar() {
    const navigate = useNavigate()
    const [busquedaAyuda, setBusquedaAyuda] = useState('')

    return (
        <div className="min-h-screen bg-background py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="w-16 h-16 bg-[#005a36] rounded-2xl flex items-center justify-center mb-4 shadow-md text-white">
                        <i className="fa-solid fa-book-open-reader text-2xl sm:text-3xl text-white"></i>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-2">
                        Centro de Ayuda y Tutoriales
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-sm sm:text-base max-w-2xl">
                        Aprendé a exprimir al máximo todas las herramientas que el simulador tiene para ofrecerte.
                    </p>
                </div>

                {/* Buscador de Ayuda */}
                <div className="max-w-xl mx-auto mb-8">
                    <Input
                        isClearable
                        radius="full"
                        size="lg"
                        placeholder="Buscar tema en la ayuda... (ej. correlativas, promedios, equivalencias)"
                        startContent={<Search size={20} className="text-default-400" />}
                        value={busquedaAyuda}
                        onValueChange={setBusquedaAyuda}
                        onClear={() => setBusquedaAyuda("")}
                        classNames={{
                            input: "text-sm sm:text-base",
                            inputWrapper: "bg-background border-default-200 shadow-md hover:border-default-300 focus-within:ring-2 ring-primary/20",
                        }}
                    />
                </div>

                {/* Tabs de Navegación */}
                <Tabs
                    fullWidth
                    aria-label="Opciones de ayuda"
                    color="primary"
                    variant="underlined"
                    classNames={{
                        tabList: "w-full relative rounded-none border-b border-divider p-0 gap-0",
                        cursor: "w-full bg-primary",
                        tab: "max-w-full px-1 h-12",
                        tabContent: "group-data-[selected=true]:text-primary font-bold text-[13px] sm:text-base"
                    }}
                >
                    <Tab
                        key="progreso"
                        title={
                            <div className="flex items-center space-x-2">
                                <i className="fa-solid fa-chart-line"></i>
                                <span>Mi Progreso</span>
                            </div>
                        }
                    >
                        <ProgresoHelp />
                    </Tab>
                    <Tab
                        key="simulador"
                        title={
                            <div className="flex items-center space-x-2">
                                <i className="fa-solid fa-wand-magic-sparkles"></i>
                                <span>Simulador</span>
                            </div>
                        }
                    >
                        <SimuladorHelp />
                    </Tab>
                    <Tab
                        key="equivalencias"
                        title={
                            <div className="flex items-center space-x-2">
                                <i className="fa-solid fa-right-left"></i>
                                <span>Equivalencias</span>
                            </div>
                        }
                    >
                        <EquivalenciasHelp />
                    </Tab>
                </Tabs>

                {/* Footer de la página */}
                <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button
                        variant="flat"
                        color="primary"
                        onPress={() => navigate('/progreso')}
                        startContent={<i className="fa-solid fa-arrow-left"></i>}
                        className="font-bold px-8"
                    >
                        Volver a mi carrera
                    </Button>
                    <Button
                        variant="light"
                        onPress={() => navigate('/')}
                        className="font-medium"
                    >
                        Ir al Inicio
                    </Button>
                </div>
            </div>
        </div>
    )
}
