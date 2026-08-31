/**
 * Utilidades para importar el progreso real del usuario al simulador.
 */

/**
 * Determina el cuatrimestre actual basándose en la fecha del sistema.
 * Marzo-Julio = C1, Agosto-Febrero = C2
 */
const getCuatrimestreActual = () => {
    const now = new Date();
    const mes = now.getMonth(); // 0-indexed
    const anio = now.getFullYear();

    if (mes >= 2 && mes <= 6) {
        // Marzo (2) a Julio (6) → C1 del año actual
        return { anio, cuatri: '1' };
    } else if (mes >= 7) {
        // Agosto (7) a Diciembre (11) → C2 del año actual
        return { anio, cuatri: '2' };
    } else {
        // Enero (0) y Febrero (1) → C2 del año anterior (mesas de examen)
        return { anio, cuatri: '1' }; // Consideramos que ya arrancó C1
    }
};

/**
 * Reconstruye el historial de semestres basándose en el progreso real y sus detalles.
 * 
 * @param {Object} progresoReal - El objeto de progreso del usuario { codigo: estado }
 * @param {Object} progresoDetalles - Detalles del progreso { codigo: { fechaRegularidad, intentosFinal, ... } }
 * @param {Array} materias - Lista completa de materias del plan de estudios
 * @returns {Object} - { historial, progresoFinal, anioFinal, cuatriFinal }
 */
export const reconstruirHistorial = (progresoReal, progresoDetalles, materias) => {
    if (!progresoReal || !materias) return null;

    // 1. Filtrar materias completadas (Aprobado, Promocionado o Regular)
    const materiasCompletadas = materias.filter(m => {
        const estado = progresoReal[m.codigo];
        return estado === 'Aprobado' || estado === 'Promocionado' || estado === 'Regular';
    });

    if (materiasCompletadas.length === 0) return null;

    // 2. Intentar determinar fecha y periodo para cada materia
    const cursadas = materiasCompletadas.map(m => {
        const detalles = progresoDetalles?.[m.codigo] || {};
        
        let anio = null;
        let cuatri = null;

        // Intentar obtener fecha desde fechaRegularidad (formato { anio, cuatrimestre })
        if (detalles.fechaRegularidad?.anio) {
            anio = detalles.fechaRegularidad.anio;
            cuatri = String(detalles.fechaRegularidad.cuatrimestre || '1');
        }
        // Fallback: Intentar desde intentosFinal si alguno fue aprobado
        else if (detalles.intentosFinal?.length) {
            const aprobado = detalles.intentosFinal.find(i => i.estado === 'aprobado' && i.fecha);
            if (aprobado) {
                const fecha = new Date(aprobado.fecha);
                if (!isNaN(fecha.getTime())) {
                    const mes = fecha.getMonth();
                    anio = fecha.getFullYear();
                    cuatri = (mes >= 2 && mes <= 7) ? '1' : '2';
                    if (mes <= 1) { anio -= 1; cuatri = '2'; }
                }
            }
        }
        // Fallback legacy: fechaRegularizacion/fechaAprobacion como strings
        else {
            const fechaStr = detalles.fechaRegularizacion || detalles.fechaAprobacion;
            if (fechaStr) {
                const fecha = new Date(fechaStr);
                if (!isNaN(fecha.getTime())) {
                    const mes = fecha.getMonth();
                    anio = fecha.getFullYear();
                    cuatri = (mes >= 2 && mes <= 7) ? '1' : '2';
                    if (mes <= 1) { anio -= 1; cuatri = '2'; }
                }
            }
        }

        return {
            ...m,
            anioReal: anio,
            cuatriReal: cuatri,
            anioPlan: Number(m.anio) || 1,
            // Usar el cuatrimestre real de la materia en el plan (1 o 2)
            cuatriPlan: Number(m.cuatrimestre) % 2 === 0 ? '2' : '1'
        };
    });

    // 3. Fallback para materias sin fecha
    const aniosRegistrados = cursadas.filter(c => c.anioReal).map(c => c.anioReal);
    const primerAnioReal = aniosRegistrados.length > 0 ? Math.min(...aniosRegistrados) : new Date().getFullYear() - 2;

    cursadas.forEach(c => {
        if (!c.anioReal) {
            // Estimamos: Primer año real + (Año del plan - 1)
            c.anioReal = primerAnioReal + (c.anioPlan - 1);
            // USAR EL CUATRIMESTRE REAL DE LA MATERIA, no siempre '1'
            c.cuatriReal = c.cuatriPlan;
            c.esAproximado = true;
        }
    });

    // 4. Agrupar por Semestre (Año + Cuatri)
    const semestresMap = {};
    cursadas.forEach(c => {
        const key = `${c.anioReal}-${c.cuatriReal}`;
        if (!semestresMap[key]) {
            semestresMap[key] = {
                anioActual: c.anioReal,
                cuatri: c.cuatriReal,
                materiasDelSemestre: []
            };
        }
        semestresMap[key].materiasDelSemestre.push(c);
    });

    // 5. Ordenar semestres cronológicamente
    const llavesOrdenadas = Object.keys(semestresMap).sort((a, b) => {
        const [anioA, cuatriA] = a.split('-').map(Number);
        const [anioB, cuatriB] = b.split('-').map(Number);
        if (anioA !== anioB) return anioA - anioB;
        return cuatriA - cuatriB;
    });

    // 6. Construir historial con snapshots acumulativos
    const historial = [];
    let progresoAcumulado = {};
    materias.forEach(m => { progresoAcumulado[m.codigo] = 'No Cursado' });

    llavesOrdenadas.forEach(key => {
        const semestre = semestresMap[key];
        const progresoBaseSnapshot = { ...progresoAcumulado };
        
        semestre.materiasDelSemestre.forEach(m => {
            progresoAcumulado[m.codigo] = 'Cursado';
        });

        historial.push({
            anioActual: semestre.anioActual,
            cuatri: semestre.cuatri,
            materiasDelSemestre: semestre.materiasDelSemestre,
            progresoSnapshot: { ...progresoAcumulado },
            progresoBaseSnapshot: progresoBaseSnapshot,
            esImportado: true
        });
    });

    // 7. Auto-avanzar hasta el cuatrimestre ACTUAL del mundo real
    const actual = getCuatrimestreActual();
    const ultimoSemestre = historial[historial.length - 1];
    
    let anioFinal, cuatriFinal;

    // Calcular el siguiente cuatrimestre después del último importado
    let siguienteAnio = ultimoSemestre.anioActual;
    let siguienteCuatri = ultimoSemestre.cuatri === '1' ? '2' : '1';
    if (ultimoSemestre.cuatri === '2') siguienteAnio += 1;

    // Si el cuatrimestre siguiente ya pasó, avanzar hasta el actual
    const siguienteEsPasado = (siguienteAnio < actual.anio) || 
        (siguienteAnio === actual.anio && Number(siguienteCuatri) < Number(actual.cuatri));

    if (siguienteEsPasado) {
        // Rellenar cuatrimestres vacíos entre el último importado y el actual
        let fillAnio = siguienteAnio;
        let fillCuatri = siguienteCuatri;

        while (fillAnio < actual.anio || (fillAnio === actual.anio && Number(fillCuatri) < Number(actual.cuatri))) {
            historial.push({
                anioActual: fillAnio,
                cuatri: fillCuatri,
                materiasDelSemestre: [],
                progresoSnapshot: { ...progresoAcumulado },
                progresoBaseSnapshot: { ...progresoAcumulado },
                esImportado: true,
                esVacio: true
            });

            if (fillCuatri === '1') {
                fillCuatri = '2';
            } else {
                fillCuatri = '1';
                fillAnio += 1;
            }
        }

        anioFinal = actual.anio;
        cuatriFinal = actual.cuatri;
    } else {
        anioFinal = siguienteAnio;
        cuatriFinal = siguienteCuatri;
    }

    return {
        historial,
        progresoFinal: { ...progresoAcumulado },
        anioFinal,
        cuatriFinal
    };
};

export default {
    reconstruirHistorial
};

