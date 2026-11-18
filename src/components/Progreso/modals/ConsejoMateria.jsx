import React from 'react';
import PropTypes from 'prop-types';

const ConsejoMateria = ({ estadoActual, statusPlan, detallesLocales, infoMateria }) => {
    if (!infoMateria || !estadoActual) return null;

    let mensaje = "";
    let icono = "💡";
    let colorClass = "";

    switch (estadoActual) {
        case 'Regular':
            colorClass = "bg-[#FFFBEB] dark:bg-[#2D2210]/70 border-[#FDE68A] dark:border-[#5C4318] text-[#92400E] dark:text-[#FCD34D]";
            if (statusPlan.cuatrimestresRestantes <= 1) {
                icono = "⚠️";
                mensaje = `¡Atención! Estás a punto de perder la regularidad por tiempo. Te queda(n) ${statusPlan.cuatrimestresRestantes} cuatrimestre(s) para rendir el final.`;
            } else if (statusPlan.intentosRestantes <= 2) {
                icono = "⚠️";
                mensaje = `¡Cuidado! Te quedan solo ${statusPlan.intentosRestantes} intentos para aprobar el final antes de quedar libre.`;
            } else if (!detallesLocales.notaRegularizacion) {
                icono = "📝";
                mensaje = "Acordate de cargar la nota con la que regularizaste para poder darte estadísticas más precisas sobre tu desempeño.";
            } else {
                mensaje = "Recordá rendir el examen final antes de que se venza la regularidad (tenés 5 cuatrimestres o 5 llamados desde que aprobaste la cursada).";
            }
            break;

        case 'Aprobado':
            colorClass = "bg-[#ECFDF5] dark:bg-[#102A20]/80 border-[#A7F3D0] dark:border-[#1E4D38] text-[#166534] dark:text-[#86EFAC]";
            icono = "🎉";
            if (!detallesLocales.notaFinal) {
                mensaje = "¡Felicidades por aprobar! Acordate de subir la nota del final para poder calcular correctamente tu promedio general de la carrera.";
            } else {
                mensaje = "¡Felicidades por meter esta materia! Ya diste un paso más hacia tu título. ¡A seguir así!";
            }
            break;

        case 'Promocionado':
            colorClass = "bg-[#ECFDF5] dark:bg-[#112E22] border-[#A7F3D0] dark:border-[#2E8B63] text-[#005A36] dark:text-[#A7F3D0]";
            icono = "🌟";
            mensaje = "¡Felicidades por finalizar la materia con una nota destacada! Promocionar es un gran logro.";
            break;

        case 'Disponible':
            colorClass = "bg-[#F0F9FF] dark:bg-[#0F2636]/70 border-[#BAE6FD] dark:border-[#1E4E6E] text-[#075985] dark:text-[#BAE6FD]";
            icono = "📅";
            const cuatrimestreNum = Number(infoMateria.cuatrimestre) % 2 === 0 ? 2 : 1;
            const baseDisponible = "Ya cumplís con los requisitos para cursarla. ¡Muchos éxitos cuando decidas arrancarla! ";
            if (cuatrimestreNum === 1) {
                mensaje = baseDisponible + "Acordate de anotarte a esta materia en el primer cuatrimestre para seguir el ritmo de tu plan de estudios y no atrasarte.";
            } else {
                mensaje = baseDisponible + "Esta materia suele dictarse en el segundo cuatrimestre. ¡Tenela en el radar para la segunda mitad del año!";
            }
            break;

        case 'Bloqueado':
            colorClass = "bg-[#F1F5F9] dark:bg-[#1A2129] border-[#E2E8F0] dark:border-[#2D3743] text-[#475569] dark:text-[#94A3B8]";
            icono = "🔒";
            mensaje = "Todavía te faltan requisitos. Enfocate en regularizar o aprobar las materias correlativas previas para desbloquear esta asignatura.";
            break;

        case 'Libre':
            colorClass = "bg-[#FEF2F2] dark:bg-[#2D1619]/70 border-[#FECACA] dark:border-[#5C262B] text-[#991B1B] dark:text-[#FCA5A5]";
            icono = "❌";
            mensaje = "Te quedaste libre en esta asignatura. Vas a tener que volver a cursarla o prepararla para rendir en condición de libre.";
            break;

        default:
            return null;
    }

    return (
        <div className={`mt-2 p-4 rounded-xl border flex items-start gap-3 ${colorClass} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
            <span className="text-xl leading-none pt-0.5">{icono}</span>
            <p className="text-sm font-medium leading-relaxed">
                {mensaje}
            </p>
        </div>
    );
};

ConsejoMateria.propTypes = {
    estadoActual: PropTypes.string,
    statusPlan: PropTypes.shape({
        cuatrimestresRestantes: PropTypes.number,
        intentosRestantes: PropTypes.number
    }),
    detallesLocales: PropTypes.object,
    infoMateria: PropTypes.object
};

export default ConsejoMateria;
