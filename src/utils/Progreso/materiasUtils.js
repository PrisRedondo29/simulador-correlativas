/** @typedef {import('../../types/domain').EstadoMateria} EstadoMateria */
/** @typedef {import('../../types/domain').Materia} Materia */
/** @typedef {import('../../types/domain').MateriaDetalle} MateriaDetalle */

import { obtenerCodigosCorrelativasMateria } from './materiaStateMachine';

/**
 * Estilos de los estados (Semáforo Calmo UNLu).
 * @param {EstadoMateria | string | null | undefined} estado
 * @returns {{ icon: string, accent: string, colorText: string, bgSoft: string }}
 */
const obtenerEstiloPorEstado = (estado) => {
    switch (estado) {
        case 'Promocionado':
            return { icon: 'fa-award', accent: 'success', colorText: 'text-[#005A36] dark:text-[#A7F3D0]', bgSoft: 'bg-[#ECFDF5] dark:bg-[#112E22]' };
        case 'Aprobado':
            return { icon: 'fa-circle-check', accent: 'success', colorText: 'text-[#478559] dark:text-[#86EFAC]', bgSoft: 'bg-[#ECFDF5] dark:bg-[#102A20]' };
        case 'Disponible':
            return { icon: 'fa-unlock', accent: 'primary', colorText: 'text-[#075985] dark:text-[#7DD3FC]', bgSoft: 'bg-[#E0F2FE] dark:bg-[#0F2636]' };
        case 'Cursando':
            return { icon: 'fa-pen', accent: 'primary', colorText: 'text-[#3730A3] dark:text-[#C7D2FE]', bgSoft: 'bg-[#E0E7FF] dark:bg-[#312E81]/80' };
        case 'Regular':
            return { icon: 'fa-clock', accent: 'warning', colorText: 'text-[#92400E] dark:text-[#FCD34D]', bgSoft: 'bg-[#FEF3C7] dark:bg-[#2D2210]' };
        case 'Libre':
            return { icon: 'fa-user-slash', accent: 'danger', colorText: 'text-[#991B1B] dark:text-[#FCA5A5]', bgSoft: 'bg-[#FEF2F2] dark:bg-[#2D1619]' };
        case 'Bloqueado':
        default:
            return { icon: 'fa-lock', accent: 'default', colorText: 'text-[#64748B] dark:text-[#94A3B8]', bgSoft: 'bg-[#F1F5F9] dark:bg-[#1A2129]' };
    }
};

/**
 * Obtener las materias correlativas encontradas dentro del listado del plan.
 * @param {string[]} codigosCorrelativas
 * @param {Materia[]} materias
 * @returns {Materia[]}
 */
const buscarMateriasCorrelativas = (codigosCorrelativas, materias) => {
    /** @type {Materia[]} */
    const materiasEncontradas = [];
    materias.forEach((m) => {
        if (codigosCorrelativas.includes(m.codigo)) {
            materiasEncontradas.push(m);
        }
    });
    return materiasEncontradas;
};

/** @type {EstadoMateria[]} */
const estadosPosibles = ['Disponible', 'Regular', 'Aprobado', 'Libre', 'Promocionado'];
/** @type {EstadoMateria[]} */
const estadosActivos = ['Regular', 'Aprobado', 'Cursando'];
/** @type {EstadoMateria} */
const bloquear = 'Bloqueado';

/**
 * Calcula cuántas materias dependen directa o indirectamente de una materia específica.
 * Compatible con correlativas v1 (`correlativas`) y v2 (`correlativasCursada` / `correlativasFinal`),
 * y protegido contra grafos cíclicos mediante `bloqueadas`.
 * @param {string} codigoMateria
 * @param {Materia[]} materias
 * @returns {number}
 */
const calcularImpactoTapon = (codigoMateria, materias) => {
    /** @type {Set<string>} */
    const bloqueadas = new Set();

    /** @param {string} codigo */
    const encontrarDependientes = (codigo) => {
        materias.forEach((m) => {
            const codigosCorr = obtenerCodigosCorrelativasMateria(m);
            if (codigosCorr.includes(codigo) && m.codigo !== codigoMateria && !bloqueadas.has(m.codigo)) {
                bloqueadas.add(m.codigo);
                encontrarDependientes(m.codigo);
            }
        });
    };

    encontrarDependientes(codigoMateria);
    return bloqueadas.size;
};

/**
 * Determina si una materia en estado Regular/Aprobado/Promocionado tiene datos faltantes.
 * @param {Materia | null | undefined} materia
 * @param {EstadoMateria | string | null | undefined} estado
 * @param {MateriaDetalle | null | undefined} detalles
 * @returns {boolean}
 */
export const esMateriaIncompleta = (materia, estado, detalles) => {
    if (!materia || !estado) return false;
    if (estado === 'Regular') {
        return !detalles?.fechaRegularidad || !detalles?.notaRegularizacion;
    }
    if (estado === 'Promocionado') {
        return (detalles?.notaRegularizacion ?? detalles?.notaFinal) == null;
    }
    if (estado === 'Aprobado') {
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
    esMateriaIncompleta,
};
