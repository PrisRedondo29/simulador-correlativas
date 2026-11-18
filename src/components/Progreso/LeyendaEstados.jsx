import { Accordion, AccordionItem, Chip } from '@heroui/react';
import materiasUtils from '../../utils/Progreso/materiasUtils';

function LeyendaEstados({ materias = [] }) {
    const estados = [
        { name: 'Aprobado', desc: 'Materia completada' },
        { name: 'Regular', desc: 'Cursada vigente (final pendiente)' },
        { name: 'Disponible', desc: 'Lista para cursar' },
        { name: 'Bloqueado', desc: 'Faltan correlativas previas' },
    ];

    const horasTotales = materias.reduce((acumulador, materia) => {
        const horas = Number(materia.horas_totales) || 0;
        return acumulador + horas;
    }, 0);

    return (
        <Accordion
            variant="bordered"
            className="px-0"
            itemClasses={{
                base: 'bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl shadow-none px-4',
                title: 'text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]',
                subtitle: 'text-xs text-[#64748B] dark:text-[#94A3B8]',
                trigger: 'py-3.5',
                content: 'pb-5 pt-1',
            }}
        >
            <AccordionItem
                key="referencias"
                aria-label="Referencias de estados y Estatuto UNLu"
                title="Referencias de estados y Estatuto UNLu"
                subtitle={`Carga horaria total del plan: ${horasTotales} hs`}
                startContent={
                    <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] dark:bg-[#1E2730] text-[#005A36] dark:text-[#86EFAC] flex items-center justify-center">
                        <i className="fa-solid fa-scale-balanced text-xs" aria-hidden="true" />
                    </div>
                }
            >
                <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {estados.map((estado) => {
                            const estilo = materiasUtils.obtenerEstiloPorEstado(estado.name);
                            return (
                                <div
                                    key={estado.name}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540]"
                                >
                                    <div className={`${estilo.bgSoft} w-9 h-9 rounded-lg flex items-center justify-center shrink-0`}>
                                        <i className={`fa-solid ${estilo.icon} ${estilo.colorText} text-sm`} aria-hidden="true" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                                            {estado.name}
                                        </span>
                                        <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                            {estado.desc}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="border-t border-[#E2E8F0] dark:border-[#2A3540] pt-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
                                <i className="fa-solid fa-building-columns text-[#005A36] dark:text-[#6EE7B7]" aria-hidden="true" />
                                Estatuto UNLu · Régimen General de Estudios
                            </span>
                            <a
                                href="https://www.unlu.edu.ar/estatuto_unlu.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#005A36] dark:text-[#6EE7B7] hover:underline flex items-center gap-1 font-medium"
                            >
                                <i className="fa-solid fa-file-pdf" aria-hidden="true" />
                                Ver Estatuto Completo (PDF)
                            </a>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex gap-3 items-start bg-[#F8FAFC] dark:bg-[#1E2730] p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#2A3540]">
                                <Chip size="sm" variant="flat" color="primary" className="font-semibold shrink-0">
                                    Art. 16
                                </Chip>
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-semibold text-xs text-[#1E293B] dark:text-[#F1F5F9]">
                                        Vigencia de la Regularidad
                                    </span>
                                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                                        La condición de regular tiene una vigencia de <strong>5 cuatrimestres</strong> consecutivos desde su obtención.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 items-start bg-[#F8FAFC] dark:bg-[#1E2730] p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#2A3540]">
                                <div className="w-7 h-7 rounded-lg bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] flex items-center justify-center shrink-0">
                                    <i className="fa-solid fa-shield-halved text-xs" aria-hidden="true" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-semibold text-xs text-[#1E293B] dark:text-[#F1F5F9]">
                                        Independencia de las Cursadas
                                    </span>
                                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                                        Si se vence la regularidad de una materia previa, las cursadas ya regularizadas de materias posteriores no se pierden automáticamente.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AccordionItem>
        </Accordion>
    );
}

export default LeyendaEstados;
