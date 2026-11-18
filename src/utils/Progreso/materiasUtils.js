//Estilos de los estados (Semáforo Calmo UNLu)
const obtenerEstiloPorEstado = (estado) => {
    switch (estado) {
        case "Promocionado":
            return { icon: "fa-award", accent: "success", colorText: "text-[#005A36] dark:text-[#A7F3D0]", bgSoft: "bg-[#ECFDF5] dark:bg-[#112E22]" }
        case "Aprobado":
            return { icon: "fa-circle-check", accent: "success", colorText: "text-[#478559] dark:text-[#86EFAC]", bgSoft: "bg-[#ECFDF5] dark:bg-[#102A20]" }
        case "Disponible":
            return { icon: "fa-unlock", accent: "primary", colorText: "text-[#075985] dark:text-[#7DD3FC]", bgSoft: "bg-[#E0F2FE] dark:bg-[#0F2636]" }
        case "Cursando":
            return { icon: "fa-pen", accent: "primary", colorText: "text-[#005A36] dark:text-[#6EE7B7]", bgSoft: "bg-[#F0FDF4] dark:bg-[#122D22]" }
        case "Regular":
            return { icon: "fa-clock", accent: "warning", colorText: "text-[#92400E] dark:text-[#FCD34D]", bgSoft: "bg-[#FEF3C7] dark:bg-[#2D2210]" }
        case "Libre":
            return { icon: "fa-user-slash", accent: "danger", colorText: "text-[#991B1B] dark:text-[#FCA5A5]", bgSoft: "bg-[#FEF2F2] dark:bg-[#2D1619]" }
        case "Bloqueado":
        default:
            return { icon: "fa-lock", accent: "default", colorText: "text-[#64748B] dark:text-[#94A3B8]", bgSoft: "bg-[#F1F5F9] dark:bg-[#1A2129]" }
    }
}

//Obtener las materias Correlativas Disponibles
const buscarMateriasCorrelativas = (codigosCorrelativas, materias) => {
    let materiasEncontradas = []
    materias.forEach((m) => {
        if (codigosCorrelativas.includes(m.codigo)) {

            materiasEncontradas.push(m)
        }
    })
    return materiasEncontradas
}

const estadosPosibles = ['Disponible', 'Regular', 'Aprobado', 'Libre', 'Promocionado']
const estadosActivos = ['Regular', 'Aprobado', 'Cursando'] // Los que cuentan como "en curso o terminado"
const bloquear = 'Bloqueado'

// Calcula cuántas materias dependen directa o indirectamente de una materia específica
const calcularImpactoTapon = (codigoMateria, materias) => {
    let bloqueadas = new Set();

    const encontrarDependientes = (codigo) => {
        materias.forEach(m => {
            if (m.correlativas.includes(codigo) && !bloqueadas.has(m.codigo)) {
                bloqueadas.add(m.codigo);
                encontrarDependientes(m.codigo);
            }
        });
    };

    encontrarDependientes(codigoMateria);
    return bloqueadas.size;
};

export const esMateriaIncompleta = (materia, estado, detalles) => {
    if (!estado) return false;
    if (estado === 'Regular') {
        return !detalles?.fechaRegularidad || !detalles?.notaRegularizacion;
    }
    if (estado === 'Aprobado' || estado === 'Promocionado') {
        return !detalles?.notaFinal;
    }
    return false;
};

export default {
    estadosPosibles,
    estadosActivos,
    buscarMateriasCorrelativas,
    obtenerEstiloPorEstado,
    bloquear,
    calcularImpactoTapon,
    esMateriaIncompleta
}