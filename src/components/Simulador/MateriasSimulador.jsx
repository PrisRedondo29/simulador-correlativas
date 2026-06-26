import MateriaCard from './MateriaCard'
import GhostCard from './GhostCard'

const EMPTY_ARRAY = [];

function MateriasSimulador({ progreso, materiasCursables, materiasBloqueadas = EMPTY_ARRAY, cambioDeEstado }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                    {/* Materias que SÍ puede cursar */}
            {materiasCursables.map((materia) => (
                <MateriaCard key={materia.codigo}
                    materia={materia}
                    actualizarEstados={() => cambioDeEstado(materia.codigo)}
                    estado={progreso[materia.codigo]}
                />
            ))}

            {/* Materias "Fantasma" (bloqueadas de este cuatrimestre) */}
            {materiasBloqueadas.map((materia) => (
                <GhostCard key={materia.codigo} 
                    materia={materia} 
                />
            ))}
        </div>
    )
}

export default MateriasSimulador
