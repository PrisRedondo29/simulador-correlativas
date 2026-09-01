import React, { useState } from 'react';
import { Card, CardBody, Chip, Button, Divider, Popover, PopoverTrigger, PopoverContent } from '@heroui/react';
import MateriaCard from '../../Progreso/MateriaCard';
import DetalleMateriaModal from '../../Progreso/modals/DetalleMateriaModal';

export default function InteractiveMateriaDemo() {
    const [estado, setEstado] = useState('Disponible');
    const [detalles, setDetalles] = useState({});
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Datos de ejemplo para la materia demo
    const materiaDemo = {
        codigo: "99001",
        nombre: "Materia de Ejemplo",
        anio: "1",
        cuatrimestre: "1",
        horas_semanales: "6",
        horas_totales: "96",
        correlativas: ["11071"],
        taller: false
    };

    const mockMaterias = [
        materiaDemo,
        { codigo: "11071", nombre: "Materia Correlativa Previa", anio: "1", cuatrimestre: "1", correlativas: [] }
    ];

    const mockProgreso = {
        "99001": estado,
        "11071": "Aprobado"
    };

    const handleCambioEstado = (target) => {
        if (target === 'Reiniciar') {
            setEstado('Disponible');
            setDetalles({});
        } else {
            setEstado(target);
            // Simular carga de año si es Aprobado/Promocionado para evitar chips de falta info
            if (target === 'Aprobado' || target === 'Promocionado') {
                setDetalles(prev => ({ ...prev, fechaRegularidad: { anio: 2024, cuatrimestre: 1 }, notaFinal: 10 }));
            }
        }
    };

    const handleUpdateDetalles = (nuevosDetalles) => {
        setDetalles(nuevosDetalles[materiaDemo.codigo]);
    };

    return (
        <div className="flex flex-col gap-6 my-6">
            {/* Barra de Presets Rápidos */}
            <div className="flex flex-wrap items-center justify-center gap-2 p-3 bg-default-100 dark:bg-default-50/50 rounded-2xl border border-default-200">
                <span className="text-xs font-black text-foreground/60 uppercase tracking-wider mr-2 flex items-center gap-1.5">
                    <i className="fa-solid fa-wand-magic-sparkles text-[#F5B82E]" />
                    Prueba rápida:
                </span>
                <Button
                    size="sm"
                    variant={estado === 'Aprobado' ? 'solid' : 'flat'}
                    color="success"
                    onPress={() => {
                        setEstado('Aprobado');
                        setDetalles({ fechaRegularidad: { anio: 2024, cuatrimestre: 1 }, notaFinal: 9 });
                    }}
                    className="font-bold text-xs"
                    startContent={<i className="fa-solid fa-check" />}
                >
                    Aprobada (Nota 9)
                </Button>
                <Button
                    size="sm"
                    variant={estado === 'Promocionado' ? 'solid' : 'flat'}
                    color="secondary"
                    onPress={() => {
                        setEstado('Promocionado');
                        setDetalles({ fechaRegularidad: { anio: 2024, cuatrimestre: 2 }, notaFinal: 10 });
                    }}
                    className="font-bold text-xs"
                    startContent={<i className="fa-solid fa-star" />}
                >
                    Promocionada
                </Button>
                <Button
                    size="sm"
                    variant={estado === 'Regular' && detalles?.fechaRegularidad ? 'solid' : 'flat'}
                    color="warning"
                    onPress={() => {
                        setEstado('Regular');
                        setDetalles({ fechaRegularidad: { anio: 2023, cuatrimestre: 2 }, notaCursada: 7 });
                    }}
                    className="font-bold text-xs text-slate-900"
                    startContent={<i className="fa-solid fa-clock" />}
                >
                    Regular (Con Vencimiento)
                </Button>
                <Button
                    size="sm"
                    variant={estado === 'Regular' && !detalles?.fechaRegularidad ? 'solid' : 'flat'}
                    color="danger"
                    onPress={() => {
                        setEstado('Regular');
                        setDetalles({});
                    }}
                    className="font-bold text-xs"
                    startContent={<i className="fa-solid fa-triangle-exclamation" />}
                >
                    Falta Info
                </Button>
                <Button
                    size="sm"
                    variant="light"
                    onPress={() => handleCambioEstado('Reiniciar')}
                    className="font-bold text-xs text-foreground/60 hover:text-foreground"
                    startContent={<i className="fa-solid fa-rotate-left" />}
                >
                    Reiniciar
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Columna de la Tarjeta (Demo) */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-default-50 dark:bg-default-100/40 rounded-3xl border border-default-200">
                    <div className="text-center mb-4">
                        <span className="text-[11px] font-bold text-foreground/50 uppercase tracking-wider block">
                            Tarjeta interactiva de prueba
                        </span>
                        <p className="text-xs text-foreground/70 mt-0.5">
                            Tocá la tarjeta para abrir el menú o los 3 puntos para ver detalles.
                        </p>
                    </div>

                    <div className="w-full max-w-[300px]">
                        <MateriaCard
                            materia={materiaDemo}
                            estado={estado}
                            detalles={detalles}
                            actualizarEstados={handleCambioEstado}
                            abrirInfo={() => setIsDetailOpen(true)}
                        />
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-foreground/60 bg-background px-3 py-1.5 rounded-full border border-default-200 shadow-2xs">
                        <i className="fa-solid fa-hand-pointer text-[#005a36] dark:text-emerald-400 animate-bounce" />
                        <span>Estado actual: <b className="text-foreground">{estado}</b></span>
                    </div>
                </div>

                {/* Columna de Explicación */}
                <div className="lg:col-span-7 space-y-4">
                    <section className="bg-background p-5 rounded-2xl border border-default-200 shadow-xs">
                        <h4 className="text-sm font-black text-foreground flex items-center gap-2 mb-2">
                            <i className="fa-solid fa-list-check text-[#005a36] dark:text-emerald-400" />
                            Gestión de Estados
                        </h4>
                        <p className="text-xs text-foreground/70 leading-relaxed">
                            Al hacer <b>clic sobre la tarjeta</b> se despliega el menú de estados: <b>Libre</b>, <b>Regular</b>, <b>Aprobada</b> o <b>Promocionada</b>. Cada uno actualiza instantáneamente el color de la tarjeta y el porcentaje de tu carrera.
                        </p>
                    </section>

                    <section className="bg-default-100/60 p-5 rounded-2xl border border-default-200">
                        <h4 className="text-xs font-black text-foreground/80 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <i className="fa-solid fa-tags text-amber-500" />
                            Guía de Indicadores Automáticos
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 bg-background rounded-xl border border-default-200/80">
                                <div className="flex items-center gap-2 mb-1">
                                    <Chip size="sm" color="danger" variant="flat" className="text-[10px] font-bold">Falta Info</Chip>
                                </div>
                                <p className="text-[11px] text-foreground/60 leading-tight">Aparece en Regular si aún no cargaste año o nota de cursada.</p>
                            </div>
                            <div className="p-3 bg-background rounded-xl border border-default-200/80">
                                <div className="flex items-center gap-2 mb-1">
                                    <Chip size="sm" color="warning" variant="dot" className="text-[10px] font-bold">Vence: Fecha</Chip>
                                </div>
                                <p className="text-[11px] text-foreground/60 leading-tight">El sistema proyecta cuándo expira tu regularidad para que no se te pase la fecha.</p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-background p-5 rounded-2xl border border-default-200 shadow-xs">
                        <h4 className="text-sm font-black text-foreground flex items-center gap-2 mb-2">
                            <i className="fa-solid fa-circle-info text-[#005a36] dark:text-emerald-400" />
                            Panel de Detalles Completo
                        </h4>
                        <p className="text-xs text-foreground/70 leading-relaxed mb-3">
                            Al presionar el botón de información en la tarjeta podés registrar:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="flex items-center gap-2 p-2 bg-default-100/50 rounded-lg">
                                <i className="fa-solid fa-calendar-check text-[#005a36] dark:text-emerald-400 text-xs shrink-0" />
                                <span className="text-[11px] font-semibold text-foreground/80">Año y Notas</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-default-100/50 rounded-lg">
                                <i className="fa-solid fa-list-ol text-amber-500 text-xs shrink-0" />
                                <span className="text-[11px] font-semibold text-foreground/80">Intentos de final</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-default-100/50 rounded-lg">
                                <i className="fa-solid fa-diagram-project text-indigo-500 text-xs shrink-0" />
                                <span className="text-[11px] font-semibold text-foreground/80">Correlativas</span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* Modal de Detalles para la Demo */}
            <DetalleMateriaModal
                isOpen={isDetailOpen}
                onOpenChange={setIsDetailOpen}
                infoMateria={materiaDemo}
                materias={mockMaterias}
                progreso={mockProgreso}
                progresoDetalles={{ "99001": detalles }}
                setProgresoDetalles={handleUpdateDetalles}
                plan="DEMO"
                cambioDeEstado={handleCambioEstado}
            />
        </div>
    );
}
