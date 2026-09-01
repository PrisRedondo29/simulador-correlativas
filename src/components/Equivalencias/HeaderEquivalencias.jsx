import React from 'react';
import { Card, CardBody, Progress } from '@heroui/react';

function HeaderEquivalencias({ progresoViejo, progresoNuevo, totalMaterias, equivalenciasAprobadas }) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
      {/* Título Principal */}
      <div className="flex flex-col gap-0.5 sm:gap-1">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-tight">
          Equivalencias <span className="text-primary-700 dark:text-primary-500">Plan 17.14</span>
        </h1>
        <p className="text-default-600 dark:text-default-500 text-xs sm:text-sm max-w-2xl">
          Visualizá el impacto de tus materias del Plan 17.13 en el nuevo plan de estudios.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* Card Plan Viejo */}
        <Card className="bg-default-50/70 dark:bg-default-100/30 border border-default-200/60 shadow-2xs">
          <CardBody className="gap-1.5 p-2.5 sm:p-3.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-default-600 dark:text-default-400">Plan 17.13</span>
              <span className="text-xs sm:text-sm font-black text-default-800 dark:text-default-200">{progresoViejo}%</span>
            </div>
            <Progress 
              aria-label="Progreso Plan Viejo"
              color="default" 
              value={progresoViejo} 
              size="sm"
              className="w-full"
            />
          </CardBody>
        </Card>

        {/* Card Plan Nuevo */}
        <Card className="bg-primary-50/40 dark:bg-primary-950/30 border border-primary-200/60 dark:border-primary-800/40 shadow-2xs">
          <CardBody className="gap-1.5 p-2.5 sm:p-3.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-400">Plan 17.14</span>
              <span className="text-xs sm:text-sm font-black text-primary-700 dark:text-primary-400">{progresoNuevo}%</span>
            </div>
            <Progress 
              aria-label="Progreso Plan Nuevo"
              color="primary" 
              value={progresoNuevo} 
              size="sm"
              className="w-full"
            />
          </CardBody>
        </Card>
      </div>

      {/* Subtítulo de materias completadas integrado */}
      <div className="flex items-center justify-between px-3 py-1.5 sm:py-2 bg-default-100/40 dark:bg-default-100/20 rounded-xl text-xs font-semibold text-foreground">
        <span className="text-default-600 dark:text-default-400">Equivalencias otorgadas:</span>
        <span className="font-bold">
          <span className="text-primary-700 dark:text-primary-400">{equivalenciasAprobadas}</span> de {totalMaterias} materias
        </span>
      </div>
    </div>
  );
}

export default HeaderEquivalencias;