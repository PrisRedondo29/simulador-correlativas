/**
 * transicionUtils.js
 * Motor de cálculo y reglas oficiales de transición entre Plan 17.13 y Plan 17.14
 * de la Licenciatura en Sistemas de Información (UNLu)
 * según RESOLUCIÓN H. CONSEJO SUPERIOR RESHCS : 89 / 2025.
 */

/** @typedef {import('../../types/domain').Materia} Materia */
/** @typedef {import('../../types/domain').ProgresoMap} ProgresoMap */
/** @typedef {import('../../types/domain').EquivalenciasMap} EquivalenciasMap */
/** @typedef {import('../../types/domain').OfertaTransicionPorAnio} OfertaTransicionPorAnio */
/** @typedef {import('../../types/domain').ResumenPaso1Transicion} ResumenPaso1Transicion */
/** @typedef {import('../../types/domain').ResultadoTransicion} ResultadoTransicion */
/** @typedef {import('../../types/domain').ElegibilidadTransicion} ElegibilidadTransicion */

/** @type {OfertaTransicionPorAnio} */
export const OFERTA_RESOLUCION_89_2025 = {
    2024: {
        anio: 2024,
        plan1713: {
            cuatrimestres: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            descripcion: 'Todo el Plan de Estudios',
        },
        plan1714: {
            cuatrimestres: [],
            codigosEspeciales: ['14026'],
            descripcion: 'Taller Introductorio de Interpretación de Problemas',
        },
    },
    2025: {
        anio: 2025,
        plan1713: {
            cuatrimestres: [3, 4, 5, 6, 7, 8, 9, 10, 11],
            descripcion: 'Cuatrimestre III en adelante',
        },
        plan1714: {
            cuatrimestres: [1, 2],
            codigosEspeciales: ['14026', '19054', '39553'],
            descripcion: 'Cuatrimestres I y II (1° Año)',
        },
    },
    2026: {
        anio: 2026,
        plan1713: {
            cuatrimestres: [5, 6, 7, 8, 9, 10, 11],
            descripcion: 'Cuatrimestre V en adelante',
        },
        plan1714: {
            cuatrimestres: [1, 2, 3, 4],
            codigosEspeciales: ['14026', '19054', '39553'],
            descripcion: 'Desde el I al IV Cuatrimestre (1° y 2° Año)',
        },
    },
    2027: {
        anio: 2027,
        plan1713: {
            cuatrimestres: [7, 8, 9, 10, 11],
            descripcion: 'Cuatrimestre VII en adelante',
        },
        plan1714: {
            cuatrimestres: [1, 2, 3, 4, 5, 6],
            codigosEspeciales: ['14026', '19054', '39553'],
            descripcion: 'Desde el I al VI Cuatrimestre (1°, 2° y 3° Año)',
        },
    },
    2028: {
        anio: 2028,
        plan1713: {
            cuatrimestres: [9, 10, 11],
            descripcion: 'Cuatrimestre IX en adelante',
        },
        plan1714: {
            cuatrimestres: [1, 2, 3, 4, 5, 6, 7, 8],
            codigosEspeciales: ['14026', '19054', '39553'],
            descripcion: 'Desde el I al VIII Cuatrimestre (1°, 2°, 3° y 4° Año)',
        },
    },
    2029: {
        anio: 2029,
        plan1713: {
            cuatrimestres: [],
            descripcion: 'A solicitud de los estudiantes regulares',
        },
        plan1714: {
            cuatrimestres: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            codigosEspeciales: [],
            descripcion: 'Todo el Plan de Estudios',
        },
    },
};

/**
 * Obtiene el resumen de materias con final vs materias que quedan fuera de la equivalencia.
 * @param {ProgresoMap} [progreso]
 * @param {Materia[]} [materias1713]
 * @returns {ResumenPaso1Transicion}
 */
export const obtenerResumenPaso1 = (progreso = {}, materias1713 = []) => {
    /** @type {Materia[]} */
    const aprobadasConFinal = [];
    /** @type {Materia[]} */
    const enCursoORegulares = [];
    /** @type {Materia[]} */
    const pendientes = [];

    materias1713.forEach((m) => {
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
        cantidadFuera: enCursoORegulares.length,
    };
};

/**
 * Evalúa la conveniencia de pasar del plan origen al plan destino en un año dado.
 * @param {{
 *   progreso?: ProgresoMap,
 *   materias1713?: Materia[],
 *   materias1714?: Materia[],
 *   equivalenciasData?: EquivalenciasMap,
 *   anioAnalisis?: number,
 *   sourcePlan?: string,
 *   targetPlan?: string,
 *   ofertaPorAnio?: OfertaTransicionPorAnio,
 * }} params
 * @returns {ResultadoTransicion}
 */
export const evaluarTransicionCompleta = ({
    progreso = {},
    materias1713 = [],
    materias1714 = [],
    equivalenciasData = {},
    anioAnalisis = 2025,
    sourcePlan = '17.13',
    targetPlan = '17.14',
    ofertaPorAnio = OFERTA_RESOLUCION_89_2025,
}) => {
    const ofertaAnio = ofertaPorAnio[anioAnalisis] || ofertaPorAnio[2025];

    const codigosFinales1713 = new Set(
        materias1713
            .filter((m) => progreso[m.codigo] === 'Aprobado' || progreso[m.codigo] === 'Promocionado')
            .map((m) => m.codigo),
    );

    /** @type {Materia[]} */
    const aprobadas1714 = [];
    /** @type {Materia[]} */
    const pendientes1714 = [];

    materias1714.forEach((m14) => {
        const fuentesEquiv = equivalenciasData[m14.codigo];
        let estaAprobada = false;

        if (fuentesEquiv && fuentesEquiv.length > 0) {
            estaAprobada = fuentesEquiv.every((cod) => codigosFinales1713.has(cod));
        } else {
            estaAprobada = codigosFinales1713.has(m14.codigo);
        }

        if (estaAprobada) {
            aprobadas1714.push(m14);
        } else {
            pendientes1714.push(m14);
        }
    });

    const codigosAprobados1714 = new Set(aprobadas1714.map((m) => m.codigo));

    /** @type {Materia[]} */
    const habilitadasCorrelativas1714 = [];
    /** @type {Materia[]} */
    const materiasCursables1714 = [];
    /** @type {Materia[]} */
    const materiasEnBache1714 = [];

    pendientes1714.forEach((m14) => {
        const correlativas = m14.correlativas || [];
        const cumpleCorrelativas = correlativas.every((c) => codigosAprobados1714.has(c));

        if (cumpleCorrelativas) {
            habilitadasCorrelativas1714.push(m14);
            const cuatriNum = Number(m14.cuatrimestre) || 1;
            const seDictaEnAnio =
                ofertaAnio.plan1714.cuatrimestres.includes(cuatriNum) ||
                Boolean(ofertaAnio.plan1714.codigosEspeciales?.includes(m14.codigo));

            if (seDictaEnAnio) {
                materiasCursables1714.push(m14);
            } else {
                materiasEnBache1714.push(m14);
            }
        }
    });

    const pendientes1713 = materias1713.filter((m) => !codigosFinales1713.has(m.codigo));
    /** @type {Materia[]} */
    const materiasCursables1713 = [];
    /** @type {Materia[]} */
    const materiasExtinguidas1713 = [];

    pendientes1713.forEach((m13) => {
        const correlativas = m13.correlativas || [];
        const cumpleCorrelativas = correlativas.every((c) => codigosFinales1713.has(c));

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

    const horasTotales1713 = materias1713.reduce((acc, m) => acc + (Number(m.horas_totales) || 0), 0);
    const horasAprobadas1713 = materias1713
        .filter((m) => codigosFinales1713.has(m.codigo))
        .reduce((acc, m) => acc + (Number(m.horas_totales) || 0), 0);
    const horasRestantes1713 = Math.max(0, horasTotales1713 - horasAprobadas1713);
    const porcentaje1713 =
        materias1713.length > 0 ? Math.round((codigosFinales1713.size / materias1713.length) * 100) : 0;

    const horasTotales1714 = materias1714.reduce((acc, m) => acc + (Number(m.horas_totales) || 0), 0);
    const horasAprobadas1714 = aprobadas1714.reduce((acc, m) => acc + (Number(m.horas_totales) || 0), 0);
    const horasRestantes1714 = Math.max(0, horasTotales1714 - horasAprobadas1714);
    const porcentaje1714 =
        materias1714.length > 0 ? Math.round((aprobadas1714.length / materias1714.length) * 100) : 0;

    const diferenciaHoras = horasRestantes1713 - horasRestantes1714;

    /** @type {'A' | 'B'} */
    let escenario = 'A';
    /** @type {string[]} */
    const motivosBache = [];

    const tieneBacheBloqueante = materiasEnBache1714.length > 0 && materiasCursables1714.length === 0;
    const pierdeCapacidadCursada = materiasCursables1714.length === 0 && materiasCursables1713.length > 0;
    const riesgoFrenoAcademico =
        materiasEnBache1714.length >= 2 && materiasCursables1714.length <= 1 && materiasCursables1713.length >= 2;

    if (tieneBacheBloqueante || pierdeCapacidadCursada || riesgoFrenoAcademico) {
        escenario = 'B';
    } else {
        escenario = 'A';
    }

    const maxCuatriDictado1714 = Math.max(
        ...(ofertaAnio.plan1714.cuatrimestres.length > 0 ? ofertaAnio.plan1714.cuatrimestres : [0]),
    );
    const anioOferta1714 = Math.ceil(maxCuatriDictado1714 / 2);

    if (anioOferta1714 > 0) {
        motivosBache.push(
            `La oferta del Plan ${targetPlan} para el año ${anioAnalisis} comprende materias hasta ${anioOferta1714}° año (${ofertaAnio.plan1714.descripcion}).`,
        );
    } else {
        motivosBache.push(`El Plan ${targetPlan} aún no cuenta con dictado regular de materias troncales en ${anioAnalisis}.`);
    }

    if (materiasEnBache1714.length > 0) {
        const nombresBache = materiasEnBache1714.slice(0, 3).map((m) => `"${m.nombre}"`).join(', ');
        const extraBache = materiasEnBache1714.length > 3 ? ` y ${materiasEnBache1714.length - 3} más` : '';
        motivosBache.push(
            `Materias que ya tendrías habilitadas pero NO se dictan aún en ${targetPlan}: ${nombresBache}${extraBache}.`,
        );
    }

    if (materiasCursables1713.length > 0) {
        const nombres1713 = materiasCursables1713.slice(0, 3).map((m) => `"${m.nombre}"`).join(', ');
        const extra1713 = materiasCursables1713.length > 3 ? ` y ${materiasCursables1713.length - 3} más` : '';
        motivosBache.push(
            `En el Plan ${sourcePlan} actual podés continuar cursando de inmediato: ${nombres1713}${extra1713}.`,
        );
    }

    if (materiasCursables1714.length === 0) {
        motivosBache.push('Pasarte hoy te dejaría sin materias con dictado activo para cursar durante este ciclo lectivo.');
    }

    motivosBache.push(
        `Se recomienda permanecer en Plan ${sourcePlan} y consultar con la Coordinación de Carrera antes de realizar el trámite.`,
    );

    return {
        anioAnalisis,
        ofertaAnio,
        escenarioReal: escenario,
        avance1713: {
            porcentaje: porcentaje1713,
            aprobadas: codigosFinales1713.size,
            totales: materias1713.length,
            horasRestantes: horasRestantes1713,
            horasTotales: horasTotales1713,
            materiasCursables: materiasCursables1713,
            materiasExtinguidas: materiasExtinguidas1713,
        },
        avance1714: {
            porcentaje: porcentaje1714,
            aprobadas: aprobadas1714.length,
            totales: materias1714.length,
            horasRestantes: horasRestantes1714,
            horasTotales: horasTotales1714,
            materiasCursables: materiasCursables1714,
            materiasEnBache: materiasEnBache1714,
            listaAprobadas: aprobadas1714,
        },
        diferenciaHoras,
        motivosBache,
        equivalenciasReconocidasCount: aprobadas1714.length,
    };
};

/**
 * Calcula la proyección multianual completa (2025 a 2029) y encuentra el año óptimo de transición.
 * @param {{
 *   progreso?: ProgresoMap,
 *   materias1713?: Materia[],
 *   materias1714?: Materia[],
 *   equivalenciasData?: EquivalenciasMap,
 *   anioActual?: number,
 *   sourcePlan?: string,
 *   targetPlan?: string,
 *   ofertaPorAnio?: OfertaTransicionPorAnio,
 * }} params
 */
export const calcularProyeccionMultianual = ({
    progreso = {},
    materias1713 = [],
    materias1714 = [],
    equivalenciasData = {},
    anioActual = 2026,
    sourcePlan = '17.13',
    targetPlan = '17.14',
    ofertaPorAnio = OFERTA_RESOLUCION_89_2025,
}) => {
    const aniosDisponibles = [2025, 2026, 2027, 2028, 2029];
    const proyeccion = aniosDisponibles.map((anio) => {
        const res = evaluarTransicionCompleta({
            progreso,
            materias1713,
            materias1714,
            equivalenciasData,
            anioAnalisis: anio,
            sourcePlan,
            targetPlan,
            ofertaPorAnio,
        });
        return {
            anio,
            esViable: res.escenarioReal === 'A',
            resultado: res,
            oferta: ofertaPorAnio[anio],
        };
    });

    const resultadoActual = proyeccion.find((p) => p.anio === anioActual) || proyeccion[1];
    const primerAnioViable =
        proyeccion.find((p) => p.anio >= anioActual && p.esViable)?.anio ||
        proyeccion.find((p) => p.esViable)?.anio ||
        2029;

    const esViableActual = resultadoActual.esViable;

    let mensajePrincipal = '';
    let recomendacionCorta = '';

    if (esViableActual) {
        mensajePrincipal = `¡Te conviene cambiarte de plan ahora en ${anioActual}!`;
        recomendacionCorta = `Tenés ${resultadoActual.resultado.avance1714.materiasCursables.length} materias activas para cursar de inmediato y reducís la carga horaria en ${Math.abs(resultadoActual.resultado.diferenciaHoras) || 202} hs.`;
    } else if (primerAnioViable && primerAnioViable > anioActual) {
        mensajePrincipal = `Por ahora te conviene esperar. Tu año óptimo es ${primerAnioViable}.`;
        recomendacionCorta = `En ${anioActual} habría baches por falta de materias intermedias en ${targetPlan}. En ${primerAnioViable} abrirá el dictado correspondiente a tu nivel sin demoras.`;
    } else {
        mensajePrincipal = 'Te recomendamos consultar con Coordinación de Carrera.';
        recomendacionCorta = 'Tu avance requiere una evaluación personalizada del plan de transición.';
    }

    return {
        anioActual,
        esViableActual,
        primerAnioViable,
        resultadoActual,
        proyeccion,
        mensajePrincipal,
        recomendacionCorta,
    };
};

/**
 * Evaluación simplificada enfocada en responder:
 * 1) ¿Ya te corresponde cambiarte este año?
 * 2) Si todavía no, ¿en qué año y cuatrimestre vas a poder?
 * No expone estimaciones de años anteriores.
 * @param {{
 *   progreso?: ProgresoMap,
 *   materias1713?: Materia[],
 *   materias1714?: Materia[],
 *   equivalenciasData?: EquivalenciasMap,
 *   anioActual?: number,
 *   cuatrimestreActual?: number,
 *   sourcePlan?: string,
 *   targetPlan?: string,
 *   ofertaPorAnio?: OfertaTransicionPorAnio,
 * }} params
 * @returns {ElegibilidadTransicion}
 */
export const evaluarElegibilidadActual = ({
    progreso = {},
    materias1713 = [],
    materias1714 = [],
    equivalenciasData = {},
    anioActual = new Date().getFullYear(),
    cuatrimestreActual = new Date().getMonth() + 1 <= 6 ? 1 : 2,
    sourcePlan = '17.13',
    targetPlan = '17.14',
    ofertaPorAnio = OFERTA_RESOLUCION_89_2025,
}) => {
    const anioEvaluado = Math.min(Math.max(anioActual, 2025), 2029);
    const proyeccion = calcularProyeccionMultianual({
        progreso,
        materias1713,
        materias1714,
        equivalenciasData,
        anioActual: anioEvaluado,
        sourcePlan,
        targetPlan,
        ofertaPorAnio,
    });

    /** @param {Materia | null | undefined} m */
    const toCuatriAnual = (m) => (Number(m?.cuatrimestre) % 2 === 0 ? 2 : 1);

    const futuros = proyeccion.proyeccion.filter((p) => p.anio >= anioEvaluado);
    const actualItem = futuros.find((p) => p.anio === anioEvaluado) || proyeccion.resultadoActual;
    const puedeCambiarseHoy = Boolean(actualItem?.esViable);

    const itemHabilitado = puedeCambiarseHoy
        ? actualItem
        : futuros.find((p) => p.esViable) || futuros[futuros.length - 1];

    const anioHabilitado = itemHabilitado?.anio || 2029;
    const resultadoHoy = actualItem?.resultado;
    const cursablesHoy = resultadoHoy?.avance1714?.materiasCursables || [];

    let cuatrimestreHabilitado = 1;
    if (puedeCambiarseHoy) {
        const cuatrisHoy = cursablesHoy.map(toCuatriAnual);
        const vigentOrNext = cuatrisHoy.filter((c) => c >= cuatrimestreActual);
        cuatrimestreHabilitado =
            vigentOrNext.length > 0
                ? Math.min(...vigentOrNext)
                : cuatrisHoy.length > 0
                    ? Math.min(...cuatrisHoy)
                    : cuatrimestreActual;
    } else {
        const bacheCodigos = new Set((resultadoHoy?.avance1714?.materiasEnBache || []).map((m) => m.codigo));
        const cursablesFuturo = itemHabilitado?.resultado?.avance1714?.materiasCursables || [];
        const desbloqueadas = cursablesFuturo.filter((m) => bacheCodigos.has(m.codigo));
        const fuente = desbloqueadas.length > 0 ? desbloqueadas : cursablesFuturo;
        const cuatrisFuturo = fuente.map(toCuatriAnual);
        cuatrimestreHabilitado = cuatrisFuturo.length > 0 ? Math.min(...cuatrisFuturo) : 1;
    }

    const periodoHabilitado = `${cuatrimestreHabilitado}° Cuatrimestre de ${anioHabilitado}`;

    const mensajePrincipal = puedeCambiarseHoy
        ? `Ya te corresponde cambiarte al Plan ${targetPlan} (${periodoHabilitado})`
        : `Todavía no te corresponde cambiarte. Vas a poder en el ${periodoHabilitado}.`;

    const recomendacionCorta = puedeCambiarseHoy
        ? cursablesHoy.length > 0
            ? `Con tu avance actual ya tenés ${cursablesHoy.length} ${cursablesHoy.length === 1 ? 'materia habilitada' : 'materias habilitadas'} para cursar en el ${periodoHabilitado} sin demoras por oferta.`
            : `Tu avance actual cumple con las condiciones para realizar el cambio en el ${periodoHabilitado}.`
        : `Este año (${anioEvaluado}) todavía faltan materias intermedias con dictado activo en el Plan ${targetPlan} para tu nivel. En el ${periodoHabilitado} se habilita la oferta correspondiente.`;

    return {
        anioEvaluado,
        puedeCambiarseHoy,
        anioHabilitado,
        cuatrimestreHabilitado,
        periodoHabilitado,
        resultadoHoy,
        mensajePrincipal,
        recomendacionCorta,
    };
};

export default {
    OFERTA_RESOLUCION_89_2025,
    obtenerResumenPaso1,
    evaluarTransicionCompleta,
    calcularProyeccionMultianual,
    evaluarElegibilidadActual,
};
