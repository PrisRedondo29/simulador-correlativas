import { Card, CardHeader, CardBody, Chip, Tooltip } from '@heroui/react';

function GhostCard({ materia }) {
    return (
        <Card shadow="none" className="p-2 border border-dashed border-[#CBD5E1] dark:border-[#2A3540] bg-[#F1F5F9] dark:bg-[#1A2129] rounded-2xl">
            <CardHeader className="flex justify-between items-start pb-1">
                <span className="text-xs font-mono font-medium text-[#64748B] dark:text-[#94A3B8]">
                    {materia.mostrarCodigo === false ? '---' : materia.codigo}
                </span>
                <Tooltip content="Materia bloqueada por correlativas" closeDelay={0}>
                    <i className="fa-solid fa-lock text-xs text-[#64748B] dark:text-[#94A3B8]" />
                </Tooltip>
            </CardHeader>
            <CardBody className="py-1.5">
                <p className="font-semibold text-[#475569] dark:text-[#CBD5E1] leading-snug text-sm">{materia.nombre}</p>

                <div className="mt-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">Bloqueada por</span>
                        <div className="h-px flex-1 bg-[#E2E8F0] dark:bg-[#2A3540]" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {materia.correlativasFaltantes.map((f) => (
                            <Chip
                                key={f}
                                size="sm"
                                variant="flat"
                                className="h-5 text-[11px] font-medium bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] text-[#475569] dark:text-[#94A3B8]"
                            >
                                {f}
                            </Chip>
                        ))}
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}

export default GhostCard;
