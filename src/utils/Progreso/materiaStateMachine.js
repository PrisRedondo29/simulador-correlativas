/**
 * materiaStateMachine.js
 * Máquina de estados pura (Patrón State) para las transiciones académicas
 * de materias, correlativas canónicas v2 (cursada vs. final, condiciones mixtas
 * regular/aprobada y requisitos especiales por umbral), bloqueos en cascada,
 * protección defensiva contra ciclos y regla especial de Tesina.
 *
 * No depende de React, localStorage ni Firebase para facilitar su prueba unitaria.
 */

/** @typedef {import('../../types/domain').EstadoMateria} EstadoMateria */
/** @typedef {import('../../types/domain').Materia} Materia */
/** @typedef {import('../../types/domain').ProgresoMap} ProgresoMap */
/** @typedef {import('../../types/domain').CambioEstadoResult} CambioEstadoResult */
/** @typedef {import('../../types/domain').CambioMasivoResult} CambioMasivoResult */
/** @typedef {import('../../types/domain').SincronizarTesinaResult} SincronizarTesinaResult */
/** @typedef {import('../../types/domain').CondicionCorrelativa} CondicionCorrelativa */
/** @typedef {import('../../types/domain').RequisitoCorrelativa} RequisitoCorrelativa */
/** @typedef {import('../../types/domain').EntradaCorrelativa} EntradaCorrelativa */
/** @typedef {import('../../types/domain').RequisitoFaltanteCorrelativa} RequisitoFaltanteCorrelativa */
/** @typedef {import('../../types/domain').RequisitoFaltanteEspecial} RequisitoFaltanteEspecial */
/** @typedef {import('../../types/domain').ElegibilidadMateriaResult} ElegibilidadMateriaResult */
/** @typedef {import('../../types/domain').MateriaCascadaPreview} MateriaCascadaPreview */

export const ESTADOS_MATERIA = Object.freeze({
    BLOQUEADO: /** @type {'Bloqueado'} */ ('Bloqueado'),
    DISPONIBLE: /** @type {'Disponible'} */ ('Disponible'),
    CURSANDO: /** @type {'Cursando'} */ ('Cursando'),
    REGULAR: /** @type {'Regular'} */ ('Regular'),
    APROBADO: /** @type {'Aprobado'} */ ('Aprobado'),
    PROMOCIONADO: /** @type {'Promocionado'} */ ('Promocionado'),
    LIBRE: /** @type {'Libre'} */ ('Libre'),
});

/** @type {EstadoMateria[]} */
const ESTADOS_ORDEN_CICLO = [
    ESTADOS_MATERIA.DISPONIBLE,
    ESTADOS_MATERIA.REGULAR,
    ESTADOS_MATERIA.APROBADO,
    ESTADOS_MATERIA.LIBRE,
    ESTADOS_MATERIA.PROMOCIONADO,
];

/** @type {EstadoMateria[]} */
const ESTADOS_APROBACION_FINAL = [
    ESTADOS_MATERIA.APROBADO,
    ESTADOS_MATERIA.PROMOCIONADO,
];

/** @type {EstadoMateria[]} */
const ESTADOS_REGULAR_O_MEJOR = [
    ESTADOS_MATERIA.REGULAR,
    ESTADOS_MATERIA.APROBADO,
    ESTADOS_MATERIA.PROMOCIONADO,
];

/** @type {EstadoMateria[]} */
const ESTADOS_VALIDOS_DESBLOQUEO = [
    ESTADOS_MATERIA.REGULAR,
    ESTADOS_MATERIA.APROBADO,
    ESTADOS_MATERIA.PROMOCIONADO,
    ESTADOS_MATERIA.CURSANDO,
];

// ─── Normalizadores y Evaluador Canónico v2 ──────────────────────────────────

/**
 * Normaliza una entrada de correlativa (string u objeto) a `{ codigo, condicion }`.
 * @param {EntradaCorrelativa | null | undefined} entry
 * @param {CondicionCorrelativa} [defaultCondicion]
 * @returns {Required<RequisitoCorrelativa> | null}
 */
export function normalizarEntradaCorrelativa(entry, defaultCondicion = 'regular') {
    if (!entry) return null;
    if (typeof entry === 'string') {
        const codigo = entry.trim();
        return codigo ? { codigo, condicion: defaultCondicion } : null;
    }
    if (typeof entry === 'object' && typeof entry.codigo === 'string') {
        const codigo = entry.codigo.trim();
        if (!codigo) return null;
        const condicion = entry.condicion === 'aprobada' || entry.condicion === 'regular'
            ? entry.condicion
            : defaultCondicion;
        return { codigo, condicion };
    }
    return null;
}

/**
 * Deduplica una lista de requisitos de correlativas priorizando `'aprobada'` sobre `'regular'`.
 * @param {Array<Required<RequisitoCorrelativa> | null>} lista
 * @returns {Required<RequisitoCorrelativa>[]}
 */
function deduplicarRequisitosCorrelativa(lista) {
    /** @type {Map<string, Required<RequisitoCorrelativa>>} */
    const mapa = new Map();
    lista.forEach((item) => {
        if (!item) return;
        const prev = mapa.get(item.codigo);
        if (!prev || item.condicion === 'aprobada') {
            mapa.set(item.codigo, item);
        }
    });
    return Array.from(mapa.values());
}

/**
 * Devuelve los requisitos de correlativas para CURSAR una materia.
 * - Si define `correlativasCursada`, normaliza sus elementos (default `'regular'`).
 * - De lo contrario, usa `correlativas` v1 con condición `'regular'`.
 * @param {Materia | null | undefined} materia
 * @returns {Required<RequisitoCorrelativa>[]}
 */
export function obtenerRequisitosCursada(materia) {
    if (!materia) return [];
    if (Array.isArray(materia.correlativasCursada)) {
        return deduplicarRequisitosCorrelativa(
            materia.correlativasCursada.map((e) => normalizarEntradaCorrelativa(e, 'regular')),
        );
    }
    const base = Array.isArray(materia.correlativas) ? materia.correlativas : [];
    return deduplicarRequisitosCorrelativa(
        base.map((c) => normalizarEntradaCorrelativa(c, 'regular')),
    );
}

/**
 * Devuelve los requisitos de correlativas para RENDIR FINAL o PROMOCIONAR una materia.
 * - Si define `correlativasFinal`, normaliza sus elementos (default `'aprobada'`).
 * - Si no define `correlativasFinal` pero tiene `correlativas` v1, exige `'aprobada'` para todas.
 * - Si solo define `correlativasCursada`, eleva esos códigos a `'aprobada'`.
 * @param {Materia | null | undefined} materia
 * @returns {Required<RequisitoCorrelativa>[]}
 */
export function obtenerRequisitosFinal(materia) {
    if (!materia) return [];
    if (Array.isArray(materia.correlativasFinal)) {
        return deduplicarRequisitosCorrelativa(
            materia.correlativasFinal.map((e) => normalizarEntradaCorrelativa(e, 'aprobada')),
        );
    }
    if (Array.isArray(materia.correlativas) && materia.correlativas.length > 0) {
        return deduplicarRequisitosCorrelativa(
            materia.correlativas.map((c) => normalizarEntradaCorrelativa(c, 'aprobada')),
        );
    }
    return obtenerRequisitosCursada(materia).map((req) => ({
        codigo: req.codigo,
        condicion: 'aprobada',
    }));
}

/**
 * Devuelve la unión de todos los códigos de materias correlativas (cursada y final)
 * que inciden sobre `materia`.
 * @param {Materia | null | undefined} materia
 * @returns {string[]}
 */
export function obtenerCodigosCorrelativasMateria(materia) {
    if (!materia) return [];
    /** @type {Set<string>} */
    const codigos = new Set();
    if (Array.isArray(materia.correlativas)) {
        materia.correlativas.forEach((c) => {
            if (typeof c === 'string' && c.trim()) codigos.add(c.trim());
        });
    }
    obtenerRequisitosCursada(materia).forEach((r) => codigos.add(r.codigo));
    obtenerRequisitosFinal(materia).forEach((r) => codigos.add(r.codigo));
    return Array.from(codigos);
}

/**
 * Verifica si el estado actual de una materia correlativa satisface la condición requerida.
 * @param {EstadoMateria | undefined} estadoActual
 * @param {CondicionCorrelativa} condicionRequerida
 * @param {{ incluirCursando?: boolean }} [options]
 * @returns {boolean}
 */
export function cumpleCondicionCorrelativa(
    estadoActual,
    condicionRequerida,
    { incluirCursando = true } = {},
) {
    if (!estadoActual) return false;
    if (condicionRequerida === 'aprobada') {
        return ESTADOS_APROBACION_FINAL.includes(estadoActual);
    }
    const validosRegular = incluirCursando ? ESTADOS_VALIDOS_DESBLOQUEO : ESTADOS_REGULAR_O_MEJOR;
    return validosRegular.includes(estadoActual);
}

/**
 * Evalúa si una materia posee reglas especiales (`tesis` o `requisitosEspeciales`)
 * y devuelve la lista detallada de requisitos especiales aún no cumplidos.
 * @param {Materia | null | undefined} materia
 * @param {ProgresoMap} [progreso]
 * @param {Materia[]} [materias]
 * @returns {RequisitoFaltanteEspecial[]}
 */
export function evaluarRequisitosEspeciales(materia, progreso = {}, materias = []) {
    if (!materia) return [];
    /** @type {RequisitoFaltanteEspecial[]} */
    const faltantes = [];
    const req = materia.requisitosEspeciales || null;
    const exigeTodasAprobadas = Boolean(materia.tesis || req?.todasLasMateriasAprobadas);

    const otrasMaterias = materias.filter((m) => m.codigo !== materia.codigo && !m.tesis);
    const materiasAprobadas = otrasMaterias.filter((m) =>
        ESTADOS_APROBACION_FINAL.includes(progreso[m.codigo]),
    );

    if (exigeTodasAprobadas && otrasMaterias.length > 0) {
        if (materiasAprobadas.length < otrasMaterias.length) {
            faltantes.push({
                tipo: 'todas_aprobadas',
                mensaje: `Aprobar la totalidad de las materias del plan (${materiasAprobadas.length}/${otrasMaterias.length})`,
                actual: materiasAprobadas.length,
                requerido: otrasMaterias.length,
            });
        }
    }

    if (!req) return faltantes;

    if (
        typeof req.minimoMateriasAprobadas === 'number' &&
        req.minimoMateriasAprobadas > 0 &&
        materiasAprobadas.length < req.minimoMateriasAprobadas
    ) {
        faltantes.push({
            tipo: 'minimo_materias_aprobadas',
            mensaje: `Mínimo ${req.minimoMateriasAprobadas} materias aprobadas (actual: ${materiasAprobadas.length})`,
            actual: materiasAprobadas.length,
            requerido: req.minimoMateriasAprobadas,
        });
    }

    if (typeof req.minimoHorasAprobadas === 'number' && req.minimoHorasAprobadas > 0) {
        const horasAprobadas = materiasAprobadas.reduce(
            (acc, m) => acc + (Number(m.horas_totales) || 0),
            0,
        );
        if (horasAprobadas < req.minimoHorasAprobadas) {
            faltantes.push({
                tipo: 'minimo_horas_aprobadas',
                mensaje: `Mínimo ${req.minimoHorasAprobadas} hs aprobadas (actual: ${horasAprobadas} hs)`,
                actual: horasAprobadas,
                requerido: req.minimoHorasAprobadas,
            });
        }
    }

    if (typeof req.minimoCreditos === 'number' && req.minimoCreditos > 0) {
        const creditosAprobados = materiasAprobadas.reduce(
            (acc, m) => acc + (Number(m.creditos) || 0),
            0,
        );
        if (creditosAprobados < req.minimoCreditos) {
            faltantes.push({
                tipo: 'minimo_creditos',
                mensaje: `Mínimo ${req.minimoCreditos} créditos aprobados (actual: ${creditosAprobados})`,
                actual: creditosAprobados,
                requerido: req.minimoCreditos,
            });
        }
    }

    if (Array.isArray(req.aniosCompletosAprobados) && req.aniosCompletosAprobados.length > 0) {
        req.aniosCompletosAprobados.forEach((anioRaw) => {
            const anioNum = Number(anioRaw);
            if (Number.isNaN(anioNum)) return;
            const materiasDelAnio = otrasMaterias.filter((m) => Number(m.anio) === anioNum);
            if (materiasDelAnio.length === 0) return;
            const aprobadasDelAnio = materiasDelAnio.filter((m) =>
                ESTADOS_APROBACION_FINAL.includes(progreso[m.codigo]),
            );
            if (aprobadasDelAnio.length < materiasDelAnio.length) {
                faltantes.push({
                    tipo: 'anio_completo_aprobado',
                    mensaje: `${anioNum}° año completo aprobado (${aprobadasDelAnio.length}/${materiasDelAnio.length})`,
                    actual: aprobadasDelAnio.length,
                    requerido: materiasDelAnio.length,
                    anio: anioNum,
                });
            }
        });
    }

    return faltantes;
}

/**
 * Evalúa la elegibilidad completa de una materia para CURSAR y para RENDIR FINAL/PROMOCIONAR.
 * Mantiene los 7 estados persistidos intactos y expone los faltantes detallados para la UI.
 * @param {Materia | null | undefined} materia
 * @param {ProgresoMap} [progreso]
 * @param {Materia[]} [materias]
 * @returns {ElegibilidadMateriaResult}
 */
export function evaluarElegibilidadMateria(materia, progreso = {}, materias = []) {
    if (!materia) {
        return {
            puedeCursar: true,
            puedeRendirFinal: true,
            requisitosCursada: [],
            requisitosFinal: [],
            faltantesParaCursar: [],
            faltantesParaFinal: [],
            requisitosEspecialesFaltantes: [],
            tieneReglasDiferenciadas: false,
        };
    }

    const mapaMaterias = new Map(materias.map((m) => [m.codigo, m]));
    const requisitosCursada = obtenerRequisitosCursada(materia);
    const requisitosFinal = obtenerRequisitosFinal(materia);

    /** @type {RequisitoFaltanteCorrelativa[]} */
    const faltantesParaCursar = [];
    requisitosCursada.forEach((req) => {
        const estadoActual = progreso[req.codigo] || ESTADOS_MATERIA.BLOQUEADO;
        if (!cumpleCondicionCorrelativa(estadoActual, req.condicion, { incluirCursando: true })) {
            const matCorr = mapaMaterias.get(req.codigo);
            faltantesParaCursar.push({
                tipo: 'correlativa',
                codigo: req.codigo,
                nombre: matCorr?.nombre || req.codigo,
                condicionRequerida: req.condicion,
                estadoActual,
            });
        }
    });

    /** @type {RequisitoFaltanteCorrelativa[]} */
    const faltantesParaFinal = [];
    requisitosFinal.forEach((req) => {
        const estadoActual = progreso[req.codigo] || ESTADOS_MATERIA.BLOQUEADO;
        if (!cumpleCondicionCorrelativa(estadoActual, req.condicion, { incluirCursando: false })) {
            const matCorr = mapaMaterias.get(req.codigo);
            faltantesParaFinal.push({
                tipo: 'correlativa',
                codigo: req.codigo,
                nombre: matCorr?.nombre || req.codigo,
                condicionRequerida: req.condicion,
                estadoActual,
            });
        }
    });

    const requisitosEspecialesFaltantes = evaluarRequisitosEspeciales(materia, progreso, materias);
    const puedeCursar =
        faltantesParaCursar.length === 0 && requisitosEspecialesFaltantes.length === 0;
    const puedeRendirFinal =
        puedeCursar &&
        faltantesParaFinal.length === 0 &&
        requisitosEspecialesFaltantes.length === 0;

    const tieneReglasDiferenciadas =
        Array.isArray(materia.correlativasCursada) ||
        Array.isArray(materia.correlativasFinal) ||
        requisitosCursada.some((r) => r.condicion === 'aprobada') ||
        Boolean(materia.requisitosEspeciales);

    return {
        puedeCursar,
        puedeRendirFinal,
        requisitosCursada,
        requisitosFinal,
        faltantesParaCursar,
        faltantesParaFinal,
        requisitosEspecialesFaltantes,
        tieneReglasDiferenciadas,
    };
}

/**
 * Determina el siguiente estado cuando se hace un avance cíclico sin target explícito.
 * @param {EstadoMateria | undefined} estadoActual
 * @returns {EstadoMateria}
 */
export function obtenerSiguienteEstadoCiclico(estadoActual) {
    const posEstado = estadoActual ? ESTADOS_ORDEN_CICLO.indexOf(estadoActual) : -1;
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
 * según el cumplimiento actual de sus correlativas de cursada, requisitos especiales o regla de Tesina.
 * @param {ProgresoMap} [progreso]
 * @param {Materia | null | undefined} [materia]
 * @param {Materia[]} [materias]
 * @returns {EstadoMateria}
 */
export function calcularEstadoBaseMateria(progreso = {}, materia, materias = []) {
    if (!materia) return ESTADOS_MATERIA.DISPONIBLE;

    const elegibilidad = evaluarElegibilidadMateria(materia, progreso, materias);
    return elegibilidad.puedeCursar ? ESTADOS_MATERIA.DISPONIBLE : ESTADOS_MATERIA.BLOQUEADO;
}

/**
 * Detecta si una transición implica recursada (regresión o vuelta desde Libre).
 * @param {EstadoMateria | undefined} estadoInicial
 * @param {EstadoMateria} estadoNuevo
 * @returns {boolean}
 */
export function esTransicionRecursada(estadoInicial, estadoNuevo) {
    /** @type {EstadoMateria[]} */
    const estadosPostRecursada = [
        ESTADOS_MATERIA.CURSANDO,
        ESTADOS_MATERIA.DISPONIBLE,
        ESTADOS_MATERIA.BLOQUEADO,
        ESTADOS_MATERIA.REGULAR,
        ESTADOS_MATERIA.APROBADO,
        ESTADOS_MATERIA.PROMOCIONADO,
    ];
    /** @type {EstadoMateria[]} */
    const estadosRegresionDestino = [
        ESTADOS_MATERIA.CURSANDO,
        ESTADOS_MATERIA.DISPONIBLE,
        ESTADOS_MATERIA.BLOQUEADO,
    ];
    const esRecursadaDesdeLibre =
        estadoInicial === ESTADOS_MATERIA.LIBRE && estadosPostRecursada.includes(estadoNuevo);
    const esRegresionDeEstado =
        Boolean(estadoInicial) &&
        ESTADOS_REGULAR_O_MEJOR.includes(/** @type {EstadoMateria} */ (estadoInicial)) &&
        estadosRegresionDestino.includes(estadoNuevo);

    return esRecursadaDesdeLibre || esRegresionDeEstado;
}

/**
 * Sincroniza el estado de la Tesina y de cualquier materia con `requisitosEspeciales`
 * según si se cumplen sus umbrales y correlativas.
 * Corrige el caso en que materias Promocionadas mantenían bloqueada la Tesina.
 * @param {ProgresoMap} [progreso]
 * @param {Materia[]} [materias]
 * @returns {SincronizarTesinaResult}
 */
export function sincronizarTesina(progreso = {}, materias = []) {
    if (!progreso || Object.keys(progreso).length === 0 || materias.length === 0) {
        return { progreso, huboCambios: false };
    }

    const materiasConReglaGlobal = materias.filter(
        (m) => Boolean(m.tesis || m.requisitosEspeciales),
    );
    if (materiasConReglaGlobal.length === 0) {
        return { progreso, huboCambios: false };
    }

    let huboCambios = false;
    /** @type {ProgresoMap} */
    const siguienteProgreso = { ...progreso };

    materiasConReglaGlobal.forEach((mat) => {
        const elegibilidad = evaluarElegibilidadMateria(mat, siguienteProgreso, materias);
        const estadoActual = siguienteProgreso[mat.codigo];

        if (mat.tesis) {
            if (!elegibilidad.puedeCursar && estadoActual !== ESTADOS_MATERIA.BLOQUEADO) {
                siguienteProgreso[mat.codigo] = ESTADOS_MATERIA.BLOQUEADO;
                huboCambios = true;
            } else if (elegibilidad.puedeCursar && estadoActual === ESTADOS_MATERIA.BLOQUEADO) {
                siguienteProgreso[mat.codigo] = ESTADOS_MATERIA.DISPONIBLE;
                huboCambios = true;
            }
            return;
        }

        // Para materias con requisitosEspeciales (ej. PPS, Optativas con umbral de horas/materias):
        // se desbloquean automáticamente de Bloqueado -> Disponible al cumplir requisitos,
        // y vuelven a Bloqueado si estaban en Disponible y dejan de cumplirlos.
        if (!elegibilidad.puedeCursar && estadoActual === ESTADOS_MATERIA.DISPONIBLE) {
            siguienteProgreso[mat.codigo] = ESTADOS_MATERIA.BLOQUEADO;
            huboCambios = true;
        } else if (elegibilidad.puedeCursar && estadoActual === ESTADOS_MATERIA.BLOQUEADO) {
            siguienteProgreso[mat.codigo] = ESTADOS_MATERIA.DISPONIBLE;
            huboCambios = true;
        }
    });

    return {
        progreso: huboCambios ? siguienteProgreso : progreso,
        huboCambios,
    };
}

/**
 * @param {Materia[]} materias
 * @param {ProgresoMap} nuevoProgreso
 * @param {string[]} materiasModificadas
 */
function aprobarTodas(materias, nuevoProgreso, materiasModificadas) {
    materias.forEach((m) => {
        if (!ESTADOS_APROBACION_FINAL.includes(nuevoProgreso[m.codigo])) {
            nuevoProgreso[m.codigo] = ESTADOS_MATERIA.APROBADO;
            materiasModificadas.push(m.codigo);
        }
    });
}

/**
 * Satisface en cascada los requisitos para CURSAR una materia (respetando si cada correlativa
 * pide `'regular'` o `'aprobada'`), con protección defensiva contra ciclos (`visited`).
 * @param {Materia[]} materias
 * @param {Required<RequisitoCorrelativa>[]} requisitos
 * @param {ProgresoMap} nuevoProgreso
 * @param {string[]} materiasModificadas
 * @param {Set<string>} [visited]
 */
function satisfacerRequisitosCursada(
    materias,
    requisitos,
    nuevoProgreso,
    materiasModificadas,
    visited = new Set(),
) {
    requisitos.forEach((req) => {
        if (req.condicion === 'aprobada') {
            aprobarCorrelativas(
                materias,
                [req.codigo],
                nuevoProgreso,
                materiasModificadas,
                visited,
            );
            return;
        }

        const visitKey = `${req.codigo}:regular`;
        if (visited.has(visitKey)) return;
        visited.add(visitKey);

        if (!ESTADOS_REGULAR_O_MEJOR.includes(nuevoProgreso[req.codigo])) {
            nuevoProgreso[req.codigo] = ESTADOS_MATERIA.REGULAR;
            if (!materiasModificadas.includes(req.codigo)) {
                materiasModificadas.push(req.codigo);
            }
            const materiaActual = materias.find((m) => m.codigo === req.codigo);
            if (materiaActual) {
                const subRequisitos = obtenerRequisitosCursada(materiaActual);
                if (subRequisitos.length > 0) {
                    satisfacerRequisitosCursada(
                        materias,
                        subRequisitos,
                        nuevoProgreso,
                        materiasModificadas,
                        visited,
                    );
                }
            }
        }
    });
}

/**
 * Aprueba en cascada las correlativas requeridas para aprobar/promocionar una materia,
 * con protección defensiva contra ciclos (`visited`).
 * @param {Materia[]} materias
 * @param {string[]} codigosCorrelativas
 * @param {ProgresoMap} nuevoProgreso
 * @param {string[]} materiasModificadas
 * @param {Set<string>} [visited]
 */
function aprobarCorrelativas(
    materias,
    codigosCorrelativas,
    nuevoProgreso,
    materiasModificadas,
    visited = new Set(),
) {
    codigosCorrelativas.forEach((codigo) => {
        const visitKey = `${codigo}:aprobada`;
        if (visited.has(visitKey)) return;
        visited.add(visitKey);

        if (!ESTADOS_APROBACION_FINAL.includes(nuevoProgreso[codigo])) {
            nuevoProgreso[codigo] = ESTADOS_MATERIA.APROBADO;
            if (!materiasModificadas.includes(codigo)) {
                materiasModificadas.push(codigo);
            }
            const materiaActual = materias.find((m) => m.codigo === codigo);
            if (materiaActual) {
                const subCodigos = obtenerCodigosCorrelativasMateria(materiaActual);
                if (subCodigos.length > 0) {
                    aprobarCorrelativas(
                        materias,
                        subCodigos,
                        nuevoProgreso,
                        materiasModificadas,
                        visited,
                    );
                }
            }
        }
    });
}

/**
 * Bloquea en cascada las materias dependientes que dejaron de cumplir sus requisitos de cursada,
 * con protección defensiva contra ciclos (`visited`).
 * @param {Materia[]} materias
 * @param {string} codigoMateria
 * @param {ProgresoMap} nuevoProgreso
 * @param {Set<string>} [visited]
 */
function bloquearDependencias(materias, codigoMateria, nuevoProgreso, visited = new Set()) {
    if (visited.has(codigoMateria)) return;
    visited.add(codigoMateria);

    materias.forEach((m) => {
        const codigosCorr = obtenerCodigosCorrelativasMateria(m);
        if (!codigosCorr.includes(codigoMateria)) return;

        const elegibilidad = evaluarElegibilidadMateria(m, nuevoProgreso, materias);
        if (!elegibilidad.puedeCursar && nuevoProgreso[m.codigo] !== ESTADOS_MATERIA.BLOQUEADO) {
            nuevoProgreso[m.codigo] = ESTADOS_MATERIA.BLOQUEADO;
            bloquearDependencias(materias, m.codigo, nuevoProgreso, visited);
        }
    });
}

/**
 * Regla UNLu al quedar Libre: las materias dependientes que ya obtuvieron
 * Regular, Cursando, Aprobado o Promocionado conservan su estado.
 * Solo pasan a Bloqueado aquellas que aún estaban en Disponible (sin cursar)
 * y dejaron de cumplir sus requisitos de cursada.
 * @param {Materia[]} materias
 * @param {string} codigoMateria
 * @param {ProgresoMap} nuevoProgreso
 */
function bloquearDependenciasDisponibles(materias, codigoMateria, nuevoProgreso) {
    materias.forEach((m) => {
        const codigosCorr = obtenerCodigosCorrelativasMateria(m);
        if (!codigosCorr.includes(codigoMateria)) return;
        if (nuevoProgreso[m.codigo] !== ESTADOS_MATERIA.DISPONIBLE) return;

        const elegibilidad = evaluarElegibilidadMateria(m, nuevoProgreso, materias);
        if (!elegibilidad.puedeCursar) {
            nuevoProgreso[m.codigo] = ESTADOS_MATERIA.BLOQUEADO;
        }
    });
}

/**
 * Desbloquea las materias dependientes cuyos requisitos de cursada y especiales quedaron cumplidos.
 * @param {Materia[]} materias
 * @param {string} codigoMateria
 * @param {ProgresoMap} nuevoProgreso
 */
function desbloquearDependencias(materias, codigoMateria, nuevoProgreso) {
    materias.forEach((m) => {
        if (m.tesis) return;
        const codigosCorr = obtenerCodigosCorrelativasMateria(m);
        if (!codigosCorr.includes(codigoMateria)) return;

        const elegibilidad = evaluarElegibilidadMateria(m, nuevoProgreso, materias);
        const yaEnEstadoValido = ESTADOS_VALIDOS_DESBLOQUEO.includes(nuevoProgreso[m.codigo]);
        if (elegibilidad.puedeCursar && !yaEnEstadoValido) {
            nuevoProgreso[m.codigo] = ESTADOS_MATERIA.DISPONIBLE;
        }
    });
}

/**
 * @typedef {{
 *   materias: Materia[],
 *   materiaActual: Materia,
 *   nuevoProgreso: ProgresoMap,
 *   materiasModificadas: string[],
 * }} TransitionHandlerContext
 */

// Tabla declarativa de efectos de transición por estado destino (Patrón State)
/** @type {Record<EstadoMateria, (ctx: TransitionHandlerContext) => void>} */
const STATE_TRANSITION_HANDLERS = {
    [ESTADOS_MATERIA.CURSANDO]: ({ materias, materiaActual, nuevoProgreso, materiasModificadas }) => {
        const requisitos = obtenerRequisitosCursada(materiaActual);
        if (requisitos.length > 0) {
            satisfacerRequisitosCursada(
                materias,
                requisitos,
                nuevoProgreso,
                materiasModificadas,
                new Set([`${materiaActual.codigo}:regular`]),
            );
        }
    },
    [ESTADOS_MATERIA.REGULAR]: ({ materias, materiaActual, nuevoProgreso, materiasModificadas }) => {
        const requisitos = obtenerRequisitosCursada(materiaActual);
        if (requisitos.length > 0) {
            satisfacerRequisitosCursada(
                materias,
                requisitos,
                nuevoProgreso,
                materiasModificadas,
                new Set([`${materiaActual.codigo}:regular`]),
            );
        }
    },
    [ESTADOS_MATERIA.APROBADO]: ({ materias, materiaActual, nuevoProgreso, materiasModificadas }) => {
        const codigos = obtenerCodigosCorrelativasMateria(materiaActual);
        if (codigos.length > 0) {
            aprobarCorrelativas(
                materias,
                codigos,
                nuevoProgreso,
                materiasModificadas,
                new Set([`${materiaActual.codigo}:aprobada`]),
            );
        }
    },
    [ESTADOS_MATERIA.PROMOCIONADO]: ({ materias, materiaActual, nuevoProgreso, materiasModificadas }) => {
        const codigos = obtenerCodigosCorrelativasMateria(materiaActual);
        if (codigos.length > 0) {
            aprobarCorrelativas(
                materias,
                codigos,
                nuevoProgreso,
                materiasModificadas,
                new Set([`${materiaActual.codigo}:aprobada`]),
            );
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
 * @param {ProgresoMap} [progreso]
 * @param {Materia[]} [materias]
 * @param {string} [codigoMateria]
 * @param {EstadoMateria | null} [targetState]
 * @returns {CambioEstadoResult}
 */
export function aplicarCambioEstado(progreso = {}, materias = [], codigoMateria = '', targetState = null) {
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

    /** @type {ProgresoMap} */
    const nuevoProgreso = { ...progreso, [codigoMateria]: estadoNuevo };
    /** @type {string[]} */
    const materiasModificadas = [materiaActual.codigo];

    if (materiaActual.tesis && ESTADOS_REGULAR_O_MEJOR.includes(estadoNuevo)) {
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
 * Simula una transición de estado y devuelve las materias correlativas previas
 * que cambiarán automáticamente en cascada (excluyendo la propia materia objetivo).
 * @param {ProgresoMap} [progreso]
 * @param {Materia[]} [materias]
 * @param {string} [codigoMateria]
 * @param {EstadoMateria | null} [targetState]
 * @returns {MateriaCascadaPreview[]}
 */
export function previsualizarCascadaCambioEstado(
    progreso = {},
    materias = [],
    codigoMateria = '',
    targetState = null,
) {
    if (!codigoMateria || !targetState) return [];
    /** @type {EstadoMateria[]} */
    const estadosConCascadaHaciaAtras = [
        ESTADOS_MATERIA.CURSANDO,
        ESTADOS_MATERIA.REGULAR,
        ESTADOS_MATERIA.APROBADO,
        ESTADOS_MATERIA.PROMOCIONADO,
    ];
    if (!estadosConCascadaHaciaAtras.includes(targetState)) {
        return [];
    }

    const simulacion = aplicarCambioEstado(progreso, materias, codigoMateria, targetState);
    const mapaMaterias = new Map(materias.map((m) => [m.codigo, m]));

    /** @type {MateriaCascadaPreview[]} */
    const afectadas = [];
    simulacion.materiasModificadas.forEach((cod) => {
        if (cod === codigoMateria) return;
        const estadoAnterior = progreso[cod] || ESTADOS_MATERIA.BLOQUEADO;
        const estadoNuevo = simulacion.nuevoProgreso[cod];
        if (estadoNuevo && estadoNuevo !== estadoAnterior) {
            const mat = mapaMaterias.get(cod);
            afectadas.push({
                codigo: cod,
                nombre: mat?.nombre || cod,
                estadoAnterior,
                estadoNuevo,
            });
        }
    });

    return afectadas;
}

/**
 * Aplica una transición masiva (ej. "Aprobar año" o "Aprobar hasta...") excluyendo Tesina y "N/A".
 * @param {ProgresoMap} [progreso]
 * @param {Materia[]} [materias]
 * @param {string[]} [codigosMaterias]
 * @param {EstadoMateria} [targetState]
 * @returns {CambioMasivoResult}
 */
export function aplicarCambioMasivo(
    progreso = {},
    materias = [],
    codigosMaterias = [],
    targetState = ESTADOS_MATERIA.APROBADO,
) {
    /** @type {ProgresoMap} */
    const nuevoProgreso = { ...progreso };
    /** @type {string[]} */
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
