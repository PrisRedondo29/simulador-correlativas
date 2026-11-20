/**
 * materiaStateMachine.js
 * Máquina de estados pura (Patrón State) para las transiciones académicas
 * de materias, correlativas, bloqueos en cascada y regla especial de Tesina.
 *
 * No depende de React, localStorage ni Firebase para facilitar su prueba unitaria.
 */

export const ESTADOS_MATERIA = {
    BLOQUEADO: 'Bloqueado',
    DISPONIBLE: 'Disponible',
    CURSANDO: 'Cursando',
    REGULAR: 'Regular',
    APROBADO: 'Aprobado',
    PROMOCIONADO: 'Promocionado',
    LIBRE: 'Libre',
};

const ESTADOS_ORDEN_CICLO = [
    ESTADOS_MATERIA.DISPONIBLE,
    ESTADOS_MATERIA.REGULAR,
    ESTADOS_MATERIA.APROBADO,
    ESTADOS_MATERIA.LIBRE,
    ESTADOS_MATERIA.PROMOCIONADO,
];

const ESTADOS_APROBACION_FINAL = [
    ESTADOS_MATERIA.APROBADO,
    ESTADOS_MATERIA.PROMOCIONADO,
];

const ESTADOS_REGULAR_O_MEJOR = [
    ESTADOS_MATERIA.REGULAR,
    ESTADOS_MATERIA.APROBADO,
    ESTADOS_MATERIA.PROMOCIONADO,
];

const ESTADOS_VALIDOS_DESBLOQUEO = [
    ESTADOS_MATERIA.REGULAR,
    ESTADOS_MATERIA.APROBADO,
    ESTADOS_MATERIA.PROMOCIONADO,
    ESTADOS_MATERIA.CURSANDO,
];

/**
 * Determina el siguiente estado cuando se hace un avance cíclico sin target explícito.
 */
export function obtenerSiguienteEstadoCiclico(estadoActual) {
    const posEstado = ESTADOS_ORDEN_CICLO.indexOf(estadoActual);
    if (posEstado === 0) {
        return ESTADOS_ORDEN_CICLO[1]; // Disponible -> Regular
    }
    if (estadoActual === ESTADOS_MATERIA.BLOQUEADO) {
        return ESTADOS_MATERIA.REGULAR;
    }
    if (posEstado === ESTADOS_ORDEN_CICLO.length - 1) {
        return ESTADOS_MATERIA.DISPONIBLE; // Promocionado -> Disponible
    }
    return ESTADOS_MATERIA.APROBADO;
}

/**
 * Calcula el estado base al reiniciar una materia (Disponible o Bloqueado)
 * según el cumplimiento actual de sus correlativas o regla de Tesina.
 */
export function calcularEstadoBaseMateria(progreso = {}, materia, materias = []) {
    if (!materia) return ESTADOS_MATERIA.DISPONIBLE;

    if (materia.tesis && materias.length > 0) {
        const hayPendientes = materias.some(
            (m) => !m.tesis && !ESTADOS_APROBACION_FINAL.includes(progreso[m.codigo]),
        );
        return hayPendientes ? ESTADOS_MATERIA.BLOQUEADO : ESTADOS_MATERIA.DISPONIBLE;
    }

    const correlativas = materia.correlativas || [];
    const todasBien =
        correlativas.length === 0 ||
        correlativas.every((c) => ESTADOS_VALIDOS_DESBLOQUEO.includes(progreso[c]));

    return todasBien ? ESTADOS_MATERIA.DISPONIBLE : ESTADOS_MATERIA.BLOQUEADO;
}

/**
 * Detecta si una transición implica recursada (regresión o vuelta desde Libre).
 */
export function esTransicionRecursada(estadoInicial, estadoNuevo) {
    const estadosPostRecursada = [
        ESTADOS_MATERIA.CURSANDO,
        ESTADOS_MATERIA.DISPONIBLE,
        ESTADOS_MATERIA.BLOQUEADO,
        ESTADOS_MATERIA.REGULAR,
        ESTADOS_MATERIA.APROBADO,
        ESTADOS_MATERIA.PROMOCIONADO,
    ];
    const esRecursadaDesdeLibre =
        estadoInicial === ESTADOS_MATERIA.LIBRE && estadosPostRecursada.includes(estadoNuevo);
    const esRegresionDeEstado =
        [ESTADOS_MATERIA.REGULAR, ESTADOS_MATERIA.APROBADO, ESTADOS_MATERIA.PROMOCIONADO].includes(estadoInicial) &&
        [ESTADOS_MATERIA.CURSANDO, ESTADOS_MATERIA.DISPONIBLE, ESTADOS_MATERIA.BLOQUEADO].includes(estadoNuevo);

    return esRecursadaDesdeLibre || esRegresionDeEstado;
}

/**
 * Sincroniza el estado de la Tesina según si quedan materias sin aprobar/promocionar.
 * Corrige el caso en que materias Promocionadas mantenían bloqueada la Tesina.
 */
export function sincronizarTesina(progreso = {}, materias = []) {
    const tesina = materias.find((m) => m.tesis);
    if (!tesina || !progreso || Object.keys(progreso).length === 0) {
        return { progreso, huboCambios: false };
    }

    const hayMateriasPendientes = materias.some(
        (m) => !m.tesis && !ESTADOS_APROBACION_FINAL.includes(progreso[m.codigo]),
    );

    if (hayMateriasPendientes && progreso[tesina.codigo] !== ESTADOS_MATERIA.BLOQUEADO) {
        return {
            progreso: { ...progreso, [tesina.codigo]: ESTADOS_MATERIA.BLOQUEADO },
            huboCambios: true,
        };
    }

    if (!hayMateriasPendientes && progreso[tesina.codigo] === ESTADOS_MATERIA.BLOQUEADO) {
        return {
            progreso: { ...progreso, [tesina.codigo]: ESTADOS_MATERIA.DISPONIBLE },
            huboCambios: true,
        };
    }

    return { progreso, huboCambios: false };
}

function aprobarTodas(materias, nuevoProgreso, materiasModificadas) {
    materias.forEach((m) => {
        if (!ESTADOS_APROBACION_FINAL.includes(nuevoProgreso[m.codigo])) {
            nuevoProgreso[m.codigo] = ESTADOS_MATERIA.APROBADO;
            materiasModificadas.push(m.codigo);
        }
    });
}

function regularizarCorrelativas(materias, codigosCorrelativas, nuevoProgreso, materiasModificadas) {
    codigosCorrelativas.forEach((codigo) => {
        if (!ESTADOS_REGULAR_O_MEJOR.includes(nuevoProgreso[codigo])) {
            nuevoProgreso[codigo] = ESTADOS_MATERIA.REGULAR;
            materiasModificadas.push(codigo);
            const materiaActual = materias.find((m) => m.codigo === codigo);
            if (materiaActual?.correlativas?.length > 0) {
                regularizarCorrelativas(materias, materiaActual.correlativas, nuevoProgreso, materiasModificadas);
            }
        }
    });
}

function aprobarCorrelativas(materias, codigosCorrelativas, nuevoProgreso, materiasModificadas) {
    codigosCorrelativas.forEach((codigo) => {
        if (!ESTADOS_APROBACION_FINAL.includes(nuevoProgreso[codigo])) {
            nuevoProgreso[codigo] = ESTADOS_MATERIA.APROBADO;
            materiasModificadas.push(codigo);
            const materiaActual = materias.find((m) => m.codigo === codigo);
            if (materiaActual?.correlativas?.length > 0) {
                aprobarCorrelativas(materias, materiaActual.correlativas, nuevoProgreso, materiasModificadas);
            }
        }
    });
}

function bloquearDependencias(materias, codigoMateria, nuevoProgreso) {
    materias.forEach((m) => {
        if (m.correlativas?.includes(codigoMateria) && nuevoProgreso[m.codigo] !== ESTADOS_MATERIA.BLOQUEADO) {
            nuevoProgreso[m.codigo] = ESTADOS_MATERIA.BLOQUEADO;
            bloquearDependencias(materias, m.codigo, nuevoProgreso);
        }
    });
}

/**
 * Regla UNLu al quedar Libre: las materias dependientes que ya obtuvieron
 * Regular, Cursando, Aprobado o Promocionado conservan su estado.
 * Solo pasan a Bloqueado aquellas que aún estaban en Disponible (sin cursar).
 */
function bloquearDependenciasDisponibles(materias, codigoMateria, nuevoProgreso) {
    materias.forEach((m) => {
        if (m.correlativas?.includes(codigoMateria) && nuevoProgreso[m.codigo] === ESTADOS_MATERIA.DISPONIBLE) {
            nuevoProgreso[m.codigo] = ESTADOS_MATERIA.BLOQUEADO;
        }
    });
}

function desbloquearDependencias(materias, codigoMateria, nuevoProgreso) {
    materias.forEach((m) => {
        if (m.tesis) return;
        const todasBien = (m.correlativas || []).every((c) =>
            ESTADOS_VALIDOS_DESBLOQUEO.includes(nuevoProgreso[c]),
        );
        const yaEnEstadoValido = ESTADOS_VALIDOS_DESBLOQUEO.includes(nuevoProgreso[m.codigo]);
        if (m.correlativas?.includes(codigoMateria) && todasBien && !yaEnEstadoValido) {
            nuevoProgreso[m.codigo] = ESTADOS_MATERIA.DISPONIBLE;
        }
    });
}

// Tabla declarativa de efectos de transición por estado destino (Patrón State)
const STATE_TRANSITION_HANDLERS = {
    [ESTADOS_MATERIA.CURSANDO]: ({ materias, materiaActual, nuevoProgreso, materiasModificadas }) => {
        if (materiaActual.correlativas?.length > 0) {
            regularizarCorrelativas(materias, materiaActual.correlativas, nuevoProgreso, materiasModificadas);
        }
    },
    [ESTADOS_MATERIA.REGULAR]: ({ materias, materiaActual, nuevoProgreso, materiasModificadas }) => {
        if (materiaActual.correlativas?.length > 0) {
            regularizarCorrelativas(materias, materiaActual.correlativas, nuevoProgreso, materiasModificadas);
        }
    },
    [ESTADOS_MATERIA.APROBADO]: ({ materias, materiaActual, nuevoProgreso, materiasModificadas }) => {
        if (materiaActual.correlativas?.length > 0) {
            aprobarCorrelativas(materias, materiaActual.correlativas, nuevoProgreso, materiasModificadas);
        }
    },
    [ESTADOS_MATERIA.PROMOCIONADO]: ({ materias, materiaActual, nuevoProgreso, materiasModificadas }) => {
        if (materiaActual.correlativas?.length > 0) {
            aprobarCorrelativas(materias, materiaActual.correlativas, nuevoProgreso, materiasModificadas);
        }
    },
    [ESTADOS_MATERIA.DISPONIBLE]: ({ materias, materiaActual, nuevoProgreso }) => {
        bloquearDependencias(materias, materiaActual.codigo, nuevoProgreso);
    },
    [ESTADOS_MATERIA.BLOQUEADO]: ({ materias, materiaActual, nuevoProgreso }) => {
        bloquearDependencias(materias, materiaActual.codigo, nuevoProgreso);
    },
    [ESTADOS_MATERIA.LIBRE]: ({ materias, materiaActual, nuevoProgreso }) => {
        bloquearDependenciasDisponibles(materias, materiaActual.codigo, nuevoProgreso);
    },
};

/**
 * Aplica una transición individual sobre una materia y recalcula correlativas/dependencias/Tesina.
 */
export function aplicarCambioEstado(progreso = {}, materias = [], codigoMateria, targetState = null) {
    const materiaActual = materias.find((m) => m.codigo === codigoMateria);
    if (!materiaActual) {
        return {
            nuevoProgreso: progreso,
            materiaActual: null,
            estadoInicial: null,
            estadoNuevo: null,
            materiasModificadas: [],
            esRecursada: false,
        };
    }

    const estadoInicial = progreso[codigoMateria];
    const estadoNuevo = targetState || obtenerSiguienteEstadoCiclico(estadoInicial);

    const nuevoProgreso = { ...progreso, [codigoMateria]: estadoNuevo };
    const materiasModificadas = [materiaActual.codigo];

    if (
        materiaActual.tesis &&
        [ESTADOS_MATERIA.REGULAR, ESTADOS_MATERIA.APROBADO, ESTADOS_MATERIA.PROMOCIONADO].includes(estadoNuevo)
    ) {
        aprobarTodas(materias, nuevoProgreso, materiasModificadas);
    } else {
        const handler = STATE_TRANSITION_HANDLERS[estadoNuevo];
        if (handler) {
            handler({ materias, materiaActual, nuevoProgreso, materiasModificadas });
        }
    }

    materiasModificadas.forEach((cod) => {
        desbloquearDependencias(materias, cod, nuevoProgreso);
    });

    const synced = sincronizarTesina(nuevoProgreso, materias);

    return {
        nuevoProgreso: synced.progreso,
        materiaActual,
        estadoInicial,
        estadoNuevo,
        materiasModificadas,
        esRecursada: esTransicionRecursada(estadoInicial, estadoNuevo),
    };
}

/**
 * Aplica una transición masiva (ej. "Aprobar año" o "Aprobar hasta...") excluyendo Tesina y "N/A".
 */
export function aplicarCambioMasivo(progreso = {}, materias = [], codigosMaterias = [], targetState) {
    const nuevoProgreso = { ...progreso };
    const materiasModificadas = [];

    codigosMaterias.forEach((codigoMateria) => {
        const materiaActual = materias.find((m) => m.codigo === codigoMateria);
        if (!materiaActual || materiaActual.tesis || materiaActual.codigo === 'N/A') {
            return;
        }

        if (
            nuevoProgreso[codigoMateria] === targetState ||
            (targetState === ESTADOS_MATERIA.APROBADO &&
                nuevoProgreso[codigoMateria] === ESTADOS_MATERIA.PROMOCIONADO)
        ) {
            return;
        }

        nuevoProgreso[codigoMateria] = targetState;
        materiasModificadas.push(codigoMateria);

        const handler = STATE_TRANSITION_HANDLERS[targetState];
        if (handler) {
            handler({ materias, materiaActual, nuevoProgreso, materiasModificadas });
        }
    });

    if (materiasModificadas.length > 0) {
        materiasModificadas.forEach((cod) => {
            desbloquearDependencias(materias, cod, nuevoProgreso);
        });
    }

    const synced = sincronizarTesina(nuevoProgreso, materias);

    return {
        nuevoProgreso: synced.progreso,
        materiasModificadas,
    };
}
