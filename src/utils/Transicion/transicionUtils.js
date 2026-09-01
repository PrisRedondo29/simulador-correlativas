/**
 * transicionUtils.js
 * Motor de cálculo y reglas oficiales de transición entre Plan 17.13 y Plan 17.14
 * de la Licenciatura en Sistemas de Información (UNLu)
 * según RESOLUCIÓN H. CONSEJO SUPERIOR RESHCS : 89 / 2025.
 */

export const OFERTA_RESOLUCION_89_2025 = {
    2024: {
        anio: 2024,
        plan1713: {
            cuatrimestres: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            descripcion: 'Todo el Plan de Estudios'
        },
        plan1714: {
            cuatrimestres: [],
            codigosEspeciales: ['14026'],
            descripcion: 'Taller Introductorio de Interpretación de Problemas'
        }
    },
    2025: {
        anio: 2025,
        plan1713: {
            cuatrimestres: [3, 4, 5, 6, 7, 8, 9, 10, 11],
            descripcion: 'Cuatrimestre III en adelante'
        },
        plan1714: {
            cuatrimestres: [1, 2],
            codigosEspeciales: ['14026', '19054', '39553'],
            descripcion: 'Cuatrimestres I y II (1° Año)'
        }
    },
    2026: {
        anio: 2026,
        plan1713: {
            cuatrimestres: [5, 6, 7, 8, 9, 10, 11],
            descripcion: 'Cuatrimestre V en adelante'
        },
        plan1714: {
            cuatrimestres: [1, 2, 3, 4],
            codigosEspeciales: ['14026', '19054', '39553'],
            descripcion: 'Desde el I al IV Cuatrimestre (1° y 2° Año)'
        }
    },
    2027: {
        anio: 2027,
        plan1713: {
            cuatrimestres: [7, 8, 9, 10, 11],
            descripcion: 'Cuatrimestre VII en adelante'
        },
        plan1714: {
            cuatrimestres: [1, 2, 3, 4, 5, 6],
            codigosEspeciales: ['14026', '19054', '39553'],
            descripcion: 'Desde el I al VI Cuatrimestre (1°, 2° y 3° Año)'
        }
    },
    2028: {
        anio: 2028,
        plan1713: {
            cuatrimestres: [9, 10, 11],
            descripcion: 'Cuatrimestre IX en adelante'
        },
        plan1714: {
            cuatrimestres: [1, 2, 3, 4, 5, 6, 7, 8],
            codigosEspeciales: ['14026', '19054', '39553'],
            descripcion: 'Desde el I al VIII Cuatrimestre (1°, 2°, 3° y 4° Año)'
        }
    },
    2029: {
        anio: 2029,
        plan1713: {
            cuatrimestres: [],
            descripcion: 'A solicitud de los estudiantes regulares'
        },
        plan1714: {
            cuatrimestres: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            codigosEspeciales: [],
            descripcion: 'Todo el Plan de Estudios'
        }
    }
};

/**
 * Obtiene el resumen de materias con final vs materias que quedan fuera de la equivalencia
 */
export const obtenerResumenPaso1 = (progreso = {}, materias1713 = []) => {
    const aprobadasConFinal = [];
    const enCursoORegulares = [];
    const pendientes = [];

    materias1713.forEach(m => {
        const estado = progreso[m.codigo];
        if (estado === 'Aprobado' || estado === 'Promocionado') {
            aprobadasConFinal.push(m);
        } else if (estado === 'Regular' || estado === 'Cursando') {
            enCursoORegulares.push(m);
        } else {
            pendientes.push(m);
        }
    });

    return {
        totalMaterias: materias1713.length,
        aprobadasConFinal,
        enCursoORegulares,
        pendientes,
        cantidadAprobadas: aprobadasConFinal.length,
        cantidadFuera: enCursoORegulares.length
    };
};

/**
 * Evalúa la conveniencia de pasar de 17.13 a 17.14
 */
export const evaluarTransicionCompleta = ({
    progreso = {},
    materias1713 = [],
    materias1714 = [],
    equivalenciasData = {},
    anioAnalisis = 2025
}) => {
    const ofertaAnio = OFERTA_RESOLUCION_89_2025[anioAnalisis] || OFERTA_RESOLUCION_89_2025[2025];

    // 1. Materias con final en 17.13 (las únicas que otorgan equivalencia)
    const codigosFinales1713 = new Set(
        materias1713
            .filter(m => progreso[m.codigo] === 'Aprobado' || progreso[m.codigo] === 'Promocionado')
            .map(m => m.codigo)
    );

    // 2. Determinar materias aprobadas por equivalencia en 17.14
    const aprobadas1714 = [];
    const pendientes1714 = [];

    materias1714.forEach(m14 => {
        const fuentesEquiv = equivalenciasData[m14.codigo];
        let estaAprobada = false;

        if (fuentesEquiv && fuentesEquiv.length > 0) {
            // Requiere que TODAS las materias origen estén aprobadas con final
            estaAprobada = fuentesEquiv.every(cod => codigosFinales1713.has(cod));
        } else {
            // Si no está en el JSON de equivalencias, busca por código idéntico
            estaAprobada = codigosFinales1713.has(m14.codigo);
        }

        if (estaAprobada) {
            aprobadas1714.push(m14);
        } else {
            pendientes1714.push(m14);
        }
    });

    const codigosAprobados1714 = new Set(aprobadas1714.map(m => m.codigo));

    // 3. Evaluar materias pendientes en 17.14: ¿cuáles tienen correlativas cumplidas?
    const habilitadasCorrelativas1714 = [];
    const materiasCursables1714 = [];
    const materiasEnBache1714 = []; // Habilitadas pero la UNLu no las dicta aún en este año

    pendientes1714.forEach(m14 => {
        const correlativas = m14.correlativas || [];
        const cumpleCorrelativas = correlativas.every(c => codigosAprobados1714.has(c));

        if (cumpleCorrelativas) {
            habilitadasCorrelativas1714.push(m14);
            const cuatriNum = Number(m14.cuatrimestre) || 1;
            const seDictaEnAnio = ofertaAnio.plan1714.cuatrimestres.includes(cuatriNum) ||
                (ofertaAnio.plan1714.codigosEspeciales && ofertaAnio.plan1714.codigosEspeciales.includes(m14.codigo));

            if (seDictaEnAnio) {
                materiasCursables1714.push(m14);
            } else {
                materiasEnBache1714.push(m14);
            }
        }
    });

    // 4. Evaluar situación en 17.13 si se queda
    const pendientes1713 = materias1713.filter(m => !codigosFinales1713.has(m.codigo));
    const materiasCursables1713 = [];
    const materiasExtinguidas1713 = [];

    pendientes1713.forEach(m13 => {
        const correlativas = m13.correlativas || [];
        const cumpleCorrelativas = correlativas.every(c => codigosFinales1713.has(c));

        if (cumpleCorrelativas) {
            const cuatriNum = Number(m13.cuatrimestre) || 1;
            const seDictaEn1713 = ofertaAnio.plan1713.cuatrimestres.includes(cuatriNum);

            if (seDictaEn1713) {
                materiasCursables1713.push(m13);
            } else {
                materiasExtinguidas1713.push(m13);
            }
        }
    });

    // 5. Cálculos de Carga Horaria y Porcentajes
    const horasTotales1713 = materias1713.reduce((acc, m) => acc + (Number(m.horas_totales) || 0), 0);
    const horasAprobadas1713 = materias1713
        .filter(m => codigosFinales1713.has(m.codigo))
        .reduce((acc, m) => acc + (Number(m.horas_totales) || 0), 0);
    const horasRestantes1713 = Math.max(0, horasTotales1713 - horasAprobadas1713);
    const porcentaje1713 = materias1713.length > 0
        ? Math.round((codigosFinales1713.size / materias1713.length) * 100)
        : 0;

    const horasTotales1714 = materias1714.reduce((acc, m) => acc + (Number(m.horas_totales) || 0), 0);
    const horasAprobadas1714 = aprobadas1714.reduce((acc, m) => acc + (Number(m.horas_totales) || 0), 0);
    const horasRestantes1714 = Math.max(0, horasTotales1714 - horasAprobadas1714);
    const porcentaje1714 = materias1714.length > 0
        ? Math.round((aprobadas1714.length / materias1714.length) * 100)
        : 0;

    const diferenciaHoras = horasRestantes1713 - horasRestantes1714;

    // 6. Diagnóstico y Veredicto Real
    let escenario = 'A'; // 'A' (Viable) | 'B' (No viable / Consulta)
    const motivosBache = [];

    const tieneBacheBloqueante = materiasEnBache1714.length > 0 && materiasCursables1714.length === 0;
    const pierdeCapacidadCursada = materiasCursables1714.length === 0 && materiasCursables1713.length > 0;
    const riesgoFrenoAcademico = materiasEnBache1714.length >= 2 && materiasCursables1714.length <= 1 && materiasCursables1713.length >= 2;

    if (tieneBacheBloqueante || pierdeCapacidadCursada || riesgoFrenoAcademico) {
        escenario = 'B';
    } else {
        escenario = 'A';
    }

    // Armar causas y explicaciones detalladas para el Escenario B
    const maxCuatriDictado1714 = Math.max(...(ofertaAnio.plan1714.cuatrimestres.length > 0 ? ofertaAnio.plan1714.cuatrimestres : [0]));
    const anioOferta1714 = Math.ceil(maxCuatriDictado1714 / 2);

    if (anioOferta1714 > 0) {
        motivosBache.push(`La oferta del Plan 17.14 para el año ${anioAnalisis} comprende materias hasta ${anioOferta1714}° año (${ofertaAnio.plan1714.descripcion}).`);
    } else {
        motivosBache.push(`El Plan 17.14 aún no cuenta con dictado regular de materias troncales en ${anioAnalisis}.`);
    }

    if (materiasEnBache1714.length > 0) {
        const nombresBache = materiasEnBache1714.slice(0, 3).map(m => `"${m.nombre}"`).join(', ');
        const extraBache = materiasEnBache1714.length > 3 ? ` y ${materiasEnBache1714.length - 3} más` : '';
        motivosBache.push(`Materias que ya tendrías habilitadas pero NO se dictan aún en 17.14: ${nombresBache}${extraBache}.`);
    }

    if (materiasCursables1713.length > 0) {
        const nombres1713 = materiasCursables1713.slice(0, 3).map(m => `"${m.nombre}"`).join(', ');
        const extra1713 = materiasCursables1713.length > 3 ? ` y ${materiasCursables1713.length - 3} más` : '';
        motivosBache.push(`En el Plan 17.13 actual podés continuar cursando de inmediato: ${nombres1713}${extra1713}.`);
    }

    if (materiasCursables1714.length === 0) {
        motivosBache.push(`Pasarte hoy te dejaría sin materias con dictado activo para cursar durante este ciclo lectivo.`);
    }

    motivosBache.push(`Se recomienda permanecer en Plan 17.13 y consultar con la Coordinación de Carrera antes de realizar el trámite.`);

    return {
        anioAnalisis,
        ofertaAnio,
        escenarioReal: escenario, // El resultado computado para el alumno
        // Métricas 17.13
        avance1713: {
            porcentaje: porcentaje1713,
            aprobadas: codigosFinales1713.size,
            totales: materias1713.length,
            horasRestantes: horasRestantes1713,
            horasTotales: horasTotales1713,
            materiasCursables: materiasCursables1713,
            materiasExtinguidas: materiasExtinguidas1713
        },
        // Métricas 17.14
        avance1714: {
            porcentaje: porcentaje1714,
            aprobadas: aprobadas1714.length,
            totales: materias1714.length,
            horasRestantes: horasRestantes1714,
            horasTotales: horasTotales1714,
            materiasCursables: materiasCursables1714,
            materiasEnBache: materiasEnBache1714,
            listaAprobadas: aprobadas1714
        },
        diferenciaHoras, // > 0: reduce horas; < 0: aumenta horas
        motivosBache,
        equivalenciasReconocidasCount: aprobadas1714.length
    };
};

/**
 * Calcula la proyección multianual completa (2025 a 2029) y encuentra el año óptimo de transición
 */
export const calcularProyeccionMultianual = ({
    progreso = {},
    materias1713 = [],
    materias1714 = [],
    equivalenciasData = {},
    anioActual = 2026
}) => {
    const aniosDisponibles = [2025, 2026, 2027, 2028, 2029];
    const proyeccion = aniosDisponibles.map(anio => {
        const res = evaluarTransicionCompleta({
            progreso,
            materias1713,
            materias1714,
            equivalenciasData,
            anioAnalisis: anio
        });
        return {
            anio,
            esViable: res.escenarioReal === 'A',
            resultado: res,
            oferta: OFERTA_RESOLUCION_89_2025[anio]
        };
    });

    const resultadoActual = proyeccion.find(p => p.anio === anioActual) || proyeccion[1];
    const primerAnioViable = proyeccion.find(p => p.anio >= anioActual && p.esViable)?.anio 
        || proyeccion.find(p => p.esViable)?.anio 
        || 2029;

    const esViableActual = resultadoActual.esViable;

    let mensajePrincipal = '';
    let recomendacionCorta = '';

    if (esViableActual) {
        mensajePrincipal = `¡Te conviene cambiarte de plan ahora en ${anioActual}!`;
        recomendacionCorta = `Tenés ${resultadoActual.resultado.avance1714.materiasCursables.length} materias activas para cursar de inmediato y reducís la carga horaria en ${Math.abs(resultadoActual.resultado.diferenciaHoras) || 202} hs.`;
    } else if (primerAnioViable && primerAnioViable > anioActual) {
        mensajePrincipal = `Por ahora te conviene esperar. Tu año óptimo es ${primerAnioViable}.`;
        recomendacionCorta = `En ${anioActual} habría baches por falta de materias intermedias en 17.14. En ${primerAnioViable} abrirá el dictado correspondiente a tu nivel sin demoras.`;
    } else {
        mensajePrincipal = `Te recomendamos consultar con Coordinación de Carrera.`;
        recomendacionCorta = `Tu avance requiere una evaluación personalizada del plan de transición.`;
    }

    return {
        anioActual,
        esViableActual,
        primerAnioViable,
        resultadoActual,
        proyeccion,
        mensajePrincipal,
        recomendacionCorta
    };
};

export default {
    OFERTA_RESOLUCION_89_2025,
    obtenerResumenPaso1,
    evaluarTransicionCompleta,
    calcularProyeccionMultianual
};
