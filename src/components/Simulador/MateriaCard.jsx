import { Card, CardHeader, CardBody, CardFooter, Chip } from '@heroui/react';

function MateriaCard({ materia, actualizarEstados, estado }) {
    const estados = [
        {
            name: 'No Seleccionada',
            isCursado: false,
            color: 'default',
            icon: 'fa-regular fa-circle text-[#64748B] dark:text-[#94A3B8]',
            background: 'bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540]',
        },
        {
            name: 'Seleccionada',
            isCursado: true,
            color: 'primary',
            icon: 'fa-solid fa-check-double text-[#005A36] dark:text-[#6EE7B7]',
            background: 'bg-[#F0FDF4] dark:bg-[#122D22] border-2 border-[#005A36] dark:border-[#4A9D68]',
        },
    ];

    const isCursado = estado === 'Cursado';
    const selectedState = isCursado ? estados[1] : estados[0];

    return (
        <Card shadow="none" className={`p-2 transition-colors duration-150 rounded-2xl ${selectedState.background}`}>
            <CardHeader className="flex justify-between items-start pb-1">
                <span className="text-xs font-mono font-medium text-[#64748B] dark:text-[#94A3B8]">
                    {materia.mostrarCodigo === false ? '---' : materia.codigo}
                </span>
                <i className={`${selectedState.icon} text-sm`} aria-hidden="true" />
            </CardHeader>
            <CardBody className="py-1.5">
                <p className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] leading-snug">{materia.nombre}</p>
                {(materia.horas_totales || materia.horas_semanales) && (
                    <div className="flex gap-3 mt-2 text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">
                        {materia.horas_totales && (
                            <span className="flex items-center gap-1 whitespace-nowrap">
                                <i className="fa-regular fa-clock text-[11px]" /> {materia.horas_totales}h
                            </span>
                        )}
                        {materia.horas_semanales && (
                            <span className="flex items-center gap-1 whitespace-nowrap">
                                <i className="fa-solid fa-calendar-week text-[11px]" /> {materia.horas_semanales}h/s
                            </span>
                        )}
                    </div>
                )}
            </CardBody>
            <CardFooter className="pt-2">
                <div className="flex gap-1.5 flex-wrap w-full">
                    {estados.map((est) => (
                        <Chip
                            key={est.name}
                            variant={isCursado === est.isCursado ? 'solid' : 'flat'}
                            color={est.color}
                            size="sm"
                            onClick={() => {
                                if (isCursado !== est.isCursado) {
                                    actualizarEstados();
                                }
                            }}
                            className="cursor-pointer h-7 px-2 font-medium text-xs"
                        >
                            {est.name}
                        </Chip>
                    ))}
                </div>
            </CardFooter>
        </Card>
    );
}

export default MateriaCard;
