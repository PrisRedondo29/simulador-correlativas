import React, { useState, useSyncExternalStore } from 'react';
import { Chip, Button, Drawer, DrawerBody, DrawerContent, DrawerHeader } from '@heroui/react';
import MateriaCard from '../../Progreso/MateriaCard';
import { MateriaContextContent } from '../../Progreso/MateriaContextPanel';
import { esMateriaIncompleta } from '../../../utils/Progreso/materiasUtils';

function subscribeCompactViewport(callback) {
    if (typeof window === 'undefined') return () => {};
    const mql = window.matchMedia('(max-width: 1023px)');
    mql.addEventListener('change', callback);
    return () => mql.removeEventListener('change', callback);
}

function getCompactViewportSnapshot() {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1023px)').matches;
}

export default function InteractiveMateriaDemo() {
    const [estado, setEstado] = useState('Disponible');
    const [detalles, setDetalles] = useState({});
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const isCompactViewport = useSyncExternalStore(
        subscribeCompactViewport,
        getCompactViewportSnapshot,
        () => false,
    );

    const materiaDemo = {
        codigo: '99001',
        nombre: 'Bases de Datos (Ejemplo)',
        anio: '2',
        cuatrimestre: '1',
        horas_semanales: '6',
        horas_totales: '96',
        correlativas: ['11071'],
        taller: false,
    };

    const mockMaterias = [
        materiaDemo,
        { codigo: '11071', nombre: 'Elementos de Programación', anio: '1', cuatrimestre: '2', correlativas: [] },
    ];

    const mockProgreso = {
        '99001': estado,
        '11071': 'Aprobado',
    };

    const handleCambioEstado = (codigoOrTarget, maybeTarget) => {
        const target = maybeTarget ?? codigoOrTarget;
        if (target === 'Reiniciar') {
            setEstado('Disponible');
            setDetalles({});
        } else {
            setEstado(target);
        }
    };

    const handleUpdateDetalles = (updater) => {
        setDetalles((prevDetalles) => {
            const mapPrev = { [materiaDemo.codigo]: prevDetalles };
            const nextMap = typeof updater === 'function' ? updater(mapPrev) : updater;
            return nextMap?.[materiaDemo.codigo] || {};
        });
    };

    return (
        <div className="flex flex-col gap-5 my-4">
            <div className="flex flex-wrap items-center justify-center gap-2 p-3 bg-white dark:bg-[#161D24] rounded-2xl border border-[#E2E8F0] dark:border-[#2A3540]">
                <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] mr-1">
                    Probar estado:
                </span>
                <Button
                    size="sm"
                    variant={estado === 'Aprobado' ? 'solid' : 'flat'}
                    color="success"
                    onPress={() => {
                        setEstado('Aprobado');
                        setDetalles({ fechaRegularidad: { anio: 2024, cuatrimestre: 1 }, notaFinal: 9 });
                    }}
                    className="font-medium text-xs"
                >
                    Aprobada (Nota 9)
                </Button>
                <Button
                    size="sm"
                    variant={estado === 'Promocionado' ? 'solid' : 'flat'}
                    color="success"
                    onPress={() => {
                        setEstado('Promocionado');
                        setDetalles({ fechaRegularidad: { anio: 2024, cuatrimestre: 2 }, notaFinal: 10 });
                    }}
                    className="font-medium text-xs"
                >
                    Promocionada
                </Button>
                <Button
                    size="sm"
                    variant={estado === 'Regular' && detalles?.fechaRegularidad ? 'solid' : 'flat'}
                    color="warning"
                    onPress={() => {
                        setEstado('Regular');
                        setDetalles({ fechaRegularidad: { anio: 2024, cuatrimestre: 2 }, notaRegularizacion: 7 });
                    }}
                    className="font-medium text-xs"
                >
                    Regular
                </Button>
                <Button
                    size="sm"
                    variant={estado === 'Regular' && !detalles?.fechaRegularidad ? 'solid' : 'flat'}
                    color="danger"
                    onPress={() => {
                        setEstado('Regular');
                        setDetalles({});
                    }}
                    className="font-medium text-xs"
                >
                    Falta Info
                </Button>
                <Button
                    size="sm"
                    variant="light"
                    onPress={() => handleCambioEstado('Reiniciar')}
                    className="font-medium text-xs text-[#64748B]"
                >
                    Reiniciar
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-5 flex flex-col items-center justify-center p-5 bg-[#F1F5F9] dark:bg-[#1E2730] rounded-2xl border border-[#E2E8F0] dark:border-[#2A3540]">
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-3 text-center">
                        Tocá la tarjeta para cambiar el estado o abrir sus detalles
                    </p>

                    <div className="w-full max-w-[290px]">
                        <MateriaCard
                            materia={materiaDemo}
                            estado={estado}
                            isIncomplete={esMateriaIncompleta(materiaDemo, estado, detalles)}
                            isSelected={isDetailOpen}
                            onSelect={() => setIsDetailOpen(true)}
                        />
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[#475569] dark:text-[#CBD5E1] bg-white dark:bg-[#161D24] px-3 py-1 rounded-full border border-[#E2E8F0] dark:border-[#2A3540]">
                        <span>Estado actual: <strong className="text-[#1E293B] dark:text-[#F1F5F9]">{estado}</strong></span>
                    </div>
                </div>

                <div className="lg:col-span-7 space-y-3">
                    <section className="bg-white dark:bg-[#161D24] p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#2A3540]">
                        <h4 className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2 mb-1.5">
                            <i className="fa-solid fa-list-check text-[#005A36] dark:text-[#6EE7B7]" aria-hidden="true" />
                            Gestión de estados
                        </h4>
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                            Al hacer clic sobre la tarjeta se abre su panel de detalle para cambiar entre Cursando, Regular, Aprobado o Promocionado, actualizando correlativas y promedios al instante.
                        </p>
                    </section>

                    <section className="bg-white dark:bg-[#161D24] p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#2A3540]">
                        <h4 className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] mb-2.5">
                            Indicadores automáticos
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="p-3 bg-[#F8FAFC] dark:bg-[#1E2730] rounded-xl border border-[#E2E8F0] dark:border-[#2A3540]">
                                <Chip size="sm" color="warning" variant="flat" className="text-[11px] font-medium mb-1">Falta Info</Chip>
                                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-snug">Indica que falta año de regularidad o nota de final.</p>
                            </div>
                            <div className="p-3 bg-[#F8FAFC] dark:bg-[#1E2730] rounded-xl border border-[#E2E8F0] dark:border-[#2A3540]">
                                <Chip size="sm" variant="flat" className="text-[11px] font-medium mb-1">Vence Mes/Año</Chip>
                                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-snug">Calcula automáticamente los 5 cuatrimestres de vigencia.</p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white dark:bg-[#161D24] p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#2A3540]">
                        <h4 className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2 mb-2">
                            <i className="fa-solid fa-circle-info text-[#005A36] dark:text-[#6EE7B7]" aria-hidden="true" />
                            Panel de detalles y notas
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="flex items-center gap-2 p-2.5 bg-[#F8FAFC] dark:bg-[#1E2730] rounded-xl">
                                <i className="fa-solid fa-calendar-check text-[#005A36] dark:text-[#6EE7B7]" aria-hidden="true" />
                                <span className="font-medium text-[#334155] dark:text-[#E2E8F0]">Año y Notas</span>
                            </div>
                            <div className="flex items-center gap-2 p-2.5 bg-[#F8FAFC] dark:bg-[#1E2730] rounded-xl">
                                <i className="fa-solid fa-list-ol text-[#D97706]" aria-hidden="true" />
                                <span className="font-medium text-[#334155] dark:text-[#E2E8F0]">Intentos de final</span>
                            </div>
                            <div className="flex items-center gap-2 p-2.5 bg-[#F8FAFC] dark:bg-[#1E2730] rounded-xl">
                                <i className="fa-solid fa-diagram-project text-[#478559]" aria-hidden="true" />
                                <span className="font-medium text-[#334155] dark:text-[#E2E8F0]">Correlativas</span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <Drawer
                isOpen={isDetailOpen}
                onOpenChange={setIsDetailOpen}
                placement={isCompactViewport ? 'bottom' : 'right'}
                size={isCompactViewport ? 'lg' : 'md'}
                hideCloseButton
            >
                <DrawerContent className="bg-[#FFFFFF] dark:bg-[#161D24] border-[#E2E8F0] dark:border-[#24303C] max-h-[88vh] lg:max-h-screen">
                    <DrawerHeader className="sr-only">
                        Detalle de {materiaDemo.nombre}
                    </DrawerHeader>
                    <DrawerBody className="p-4 sm:p-5 overflow-y-auto">
                        <MateriaContextContent
                            key={materiaDemo.codigo}
                            materia={materiaDemo}
                            materias={mockMaterias}
                            progreso={mockProgreso}
                            progresoDetalles={{ '99001': detalles }}
                            setProgresoDetalles={handleUpdateDetalles}
                            plan="DEMO"
                            cambioDeEstado={handleCambioEstado}
                            onChangeEstado={handleCambioEstado}
                            onClose={() => setIsDetailOpen(false)}
                        />
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </div>
    );
}
