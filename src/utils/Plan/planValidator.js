/**
 * planValidator.js
 * Validador canónico, normalizador y comparador (Diff "Antes vs. Después") de planes de estudio.
 * Diseñado como módulo puro sin dependencias de UI ni de red para ser utilizado tanto por
 * el Simulador Estudiantil como por la aplicación local independiente del Panel Admin.
 */

import {
    obtenerCodigosCorrelativasMateria,
    obtenerRequisitosCursada,
    obtenerRequisitosFinal,
} from '../Progreso/materiaStateMachine';

/** @typedef {import('../../types/domain').Materia} Materia */
/** @typedef {import('../../types/domain').PlanData} PlanData */
/** @typedef {import('../../types/domain').PlanValidationIssue} PlanValidationIssue */
/** @typedef {import('../../types/domain').PlanValidationResult} PlanValidationResult */
/** @typedef {import('../../types/domain').PlanVersionDiff} PlanVersionDiff */
/** @typedef {import('../../types/domain').PlanDiffCambioCorrelativa} PlanDiffCambioCorrelativa */

/**
 * Normaliza una materia asegurando que el array `correlativas` sea siempre
 * la unión canónica de `correlativas`, `correlativasCursada` y `correlativasFinal`.
 * Esto garantiza compatibilidad automática con el grafo visual y comparadores v1.
 *
 * @param {Materia} materia
 * @returns {Materia}
 */
export function normalizarMateriaCanonica(materia) {
    const codigo = typeof materia?.codigo === 'string' ? materia.codigo.trim() : '';
    const nombre = typeof materia?.nombre === 'string' ? materia.nombre.trim() : '';
    const correlativasUnificadas = obtenerCodigosCorrelativasMateria({
        ...materia,
        codigo,
        nombre,
    });

    return {
        ...materia,
        codigo,
        nombre,
        correlativas: correlativasUnificadas,
    };
}

/**
 * Devuelve una copia normalizada del plan con todas sus materias canónicas.
 * @param {PlanData} planData
 * @returns {PlanData}
 */
export function normalizarPlanCanonico(planData) {
    const planNumero =
        typeof planData?.plan_numero === 'string' ? planData.plan_numero.trim() : '';
    const materias = Array.isArray(planData?.materias)
        ? planData.materias.map((m) => normalizarMateriaCanonica(m))
        : [];

    return {
        ...planData,
        plan_numero: planNumero,
        materias,
    };
}

/**
 * Detecta todos los ciclos dirigidos en el grafo de correlativas del plan usando DFS de 3 colores.
 * @param {Materia[]} materias
 * @returns {string[][]} Lista de caminos cíclicos (ej. `[['11071', '11072', '11071']]`)
 */
export function detectarCiclosCorrelativas(materias) {
    /** @type {Map<string, string[]>} */
    const grafo = new Map();
    const codigosValidos = new Set(materias.map((m) => m.codigo).filter(Boolean));

    materias.forEach((m) => {
        if (!m.codigo) return;
        const deps = obtenerCodigosCorrelativasMateria(m).filter(
            (c) => c !== m.codigo && codigosValidos.has(c),
        );
        const prev = grafo.get(m.codigo) || [];
        grafo.set(m.codigo, Array.from(new Set([...prev, ...deps])));
    });

    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;

    /** @type {Map<string, number>} */
    const color = new Map();
    codigosValidos.forEach((c) => color.set(c, WHITE));

    /** @type {string[]} */
    const pila = [];
    /** @type {string[][]} */
    const ciclos = [];
    /** @type {Set<string>} */
    const firmasCiclos = new Set();

    /** @param {string} nodo */
    const dfs = (nodo) => {
        color.set(nodo, GRAY);
        pila.push(nodo);

        const vecinos = grafo.get(nodo) || [];
        vecinos.forEach((vecino) => {
            const estadoVecino = color.get(vecino) ?? WHITE;
            if (estadoVecino === GRAY) {
                const idxInicio = pila.indexOf(vecino);
                if (idxInicio !== -1) {
                    const ciclo = [...pila.slice(idxInicio), vecino];
                    const firma = [...pila.slice(idxInicio)].sort().join('->');
                    if (!firmasCiclos.has(firma)) {
                        firmasCiclos.add(firma);
                        ciclos.push(ciclo);
                    }
                }
            } else if (estadoVecino === WHITE) {
                dfs(vecino);
            }
        });

        pila.pop();
        color.set(nodo, BLACK);
    };

    codigosValidos.forEach((cod) => {
        if ((color.get(cod) ?? WHITE) === WHITE) {
            dfs(cod);
        }
    });

    return ciclos;
}

/**
 * Valida integralmente un plan de estudios antes de publicarlo o hidratarlo:
 * - Metadatos obligatorios (`plan_numero`, lista no vacía de `materias`)
 * - Códigos o nombres vacíos
 * - Códigos de materia duplicados
 * - Auto-referencias (`A` es correlativa de `A`)
 * - Correlativas huérfanas (referencian un código que no existe en el plan)
 * - Ciclos en el grafo de correlativas (`A -> B -> A`)
 *
 * @param {PlanData | null | undefined} planData
 * @returns {PlanValidationResult}
 */
export function validarPlanEstudios(planData) {
    /** @type {PlanValidationIssue[]} */
    const errores = [];
    /** @type {PlanValidationIssue[]} */
    const advertencias = [];

    if (!planData || typeof planData !== 'object') {
        errores.push({
            code: 'INVALID_PLAN_METADATA',
            severity: 'error',
            mensaje: 'El objeto del plan de estudios es inválido o está vacío.',
        });
        return {
            ok: false,
            errores,
            advertencias,
            ciclos: [],
            planNormalizado: null,
        };
    }

    const planNormalizado = normalizarPlanCanonico(planData);

    if (!planNormalizado.plan_numero) {
        errores.push({
            code: 'INVALID_PLAN_METADATA',
            severity: 'error',
            mensaje: 'El campo "plan_numero" es obligatorio.',
        });
    }

    if (!Array.isArray(planData.materias) || planNormalizado.materias.length === 0) {
        errores.push({
            code: 'EMPTY_SUBJECTS',
            severity: 'error',
            mensaje: 'El plan debe contener al menos una materia.',
        });
        return {
            ok: false,
            errores,
            advertencias,
            ciclos: [],
            planNormalizado: null,
        };
    }

    /** @type {Set<string>} */
    const codigosVistos = new Set();

    planNormalizado.materias.forEach((mat, index) => {
        if (!mat.codigo) {
            errores.push({
                code: 'INVALID_SUBJECT_FIELD',
                severity: 'error',
                mensaje: `La materia en la posición #${index + 1} no tiene un código válido.`,
            });
            return;
        }
        if (!mat.nombre) {
            errores.push({
                code: 'INVALID_SUBJECT_FIELD',
                severity: 'error',
                codigoMateria: mat.codigo,
                mensaje: `La materia "${mat.codigo}" no tiene nombre.`,
            });
        }
        if (codigosVistos.has(mat.codigo)) {
            errores.push({
                code: 'DUPLICATE_CODE',
                severity: 'error',
                codigoMateria: mat.codigo,
                mensaje: `El código de materia "${mat.codigo}" está duplicado en el plan.`,
            });
        }
        codigosVistos.add(mat.codigo);
    });

    planNormalizado.materias.forEach((mat) => {
        if (!mat.codigo) return;
        const referencias = obtenerCodigosCorrelativasMateria(mat);

        referencias.forEach((codRef) => {
            if (codRef === mat.codigo) {
                errores.push({
                    code: 'SELF_DEPENDENCY',
                    severity: 'error',
                    codigoMateria: mat.codigo,
                    mensaje: `La materia "${mat.nombre || mat.codigo}" (${mat.codigo}) se referencia a sí misma como correlativa.`,
                });
                return;
            }
            if (!codigosVistos.has(codRef)) {
                errores.push({
                    code: 'DANGLING_PREREQUISITE',
                    severity: 'error',
                    codigoMateria: mat.codigo,
                    mensaje: `La materia "${mat.nombre || mat.codigo}" (${mat.codigo}) referencia la correlativa inexistente "${codRef}".`,
                    detalles: { correlativaInexistente: codRef },
                });
            }
        });
    });

    const ciclos = detectarCiclosCorrelativas(planNormalizado.materias);
    ciclos.forEach((ciclo) => {
        errores.push({
            code: 'CYCLE_DETECTED',
            severity: 'error',
            codigoMateria: ciclo[0],
            mensaje: `Se detectó una dependencia circular de correlativas: ${ciclo.join(' → ')}.`,
            detalles: { ciclo },
        });
    });

    return {
        ok: errores.length === 0,
        errores,
        advertencias,
        ciclos,
        planNormalizado: errores.length === 0 ? planNormalizado : null,
    };
}

/**
 * Serializa de forma determinística una lista de requisitos para comparación de Diff.
 * @param {Array<{ codigo: string, condicion: string }>} reqs
 * @returns {string}
 */
function serializarRequisitos(reqs) {
    return [...reqs]
        .sort((a, b) => a.codigo.localeCompare(b.codigo))
        .map((r) => `${r.codigo}:${r.condicion}`)
        .join('|');
}

/**
 * Compara dos versiones de un plan de estudios ("Antes vs. Después") para el Panel Admin
 * y determina si la actualización elimina/renombra códigos o modifica correlativas.
 *
 * @param {PlanData | null | undefined} planAnterior
 * @param {PlanData | null | undefined} planNuevo
 * @returns {PlanVersionDiff}
 */
export function compararVersionesPlan(planAnterior, planNuevo) {
    const prevMaterias = Array.isArray(planAnterior?.materias)
        ? planAnterior.materias.map(normalizarMateriaCanonica)
        : [];
    const nextMaterias = Array.isArray(planNuevo?.materias)
        ? planNuevo.materias.map(normalizarMateriaCanonica)
        : [];

    const prevMap = new Map(prevMaterias.map((m) => [m.codigo, m]));
    const nextMap = new Map(nextMaterias.map((m) => [m.codigo, m]));

    /** @type {Array<{ codigo: string, nombre: string }>} */
    const materiasAgregadas = [];
    /** @type {Array<{ codigo: string, nombre: string }>} */
    const materiasEliminadas = [];
    /** @type {Array<{ codigo: string, nombreAntes: string, nombreDespues: string }>} */
    const materiasRenombradas = [];
    /** @type {PlanDiffCambioCorrelativa[]} */
    const cambiosCorrelativas = [];

    nextMaterias.forEach((matNueva) => {
        const matVieja = prevMap.get(matNueva.codigo);
        if (!matVieja) {
            materiasAgregadas.push({ codigo: matNueva.codigo, nombre: matNueva.nombre });
            return;
        }

        if (matVieja.nombre !== matNueva.nombre) {
            materiasRenombradas.push({
                codigo: matNueva.codigo,
                nombreAntes: matVieja.nombre,
                nombreDespues: matNueva.nombre,
            });
        }

        const cursadaAntes = obtenerRequisitosCursada(matVieja);
        const cursadaDespues = obtenerRequisitosCursada(matNueva);
        const finalAntes = obtenerRequisitosFinal(matVieja);
        const finalDespues = obtenerRequisitosFinal(matNueva);
        const especialesAntes = JSON.stringify(matVieja.requisitosEspeciales || null);
        const especialesDespues = JSON.stringify(matNueva.requisitosEspeciales || null);

        if (
            serializarRequisitos(cursadaAntes) !== serializarRequisitos(cursadaDespues) ||
            serializarRequisitos(finalAntes) !== serializarRequisitos(finalDespues) ||
            especialesAntes !== especialesDespues
        ) {
            cambiosCorrelativas.push({
                codigo: matNueva.codigo,
                nombre: matNueva.nombre,
                correlativasAntes: [...matVieja.correlativas].sort(),
                correlativasDespues: [...matNueva.correlativas].sort(),
                cursadaAntes,
                cursadaDespues,
                finalAntes,
                finalDespues,
            });
        }
    });

    prevMaterias.forEach((matVieja) => {
        if (!nextMap.has(matVieja.codigo)) {
            materiasEliminadas.push({ codigo: matVieja.codigo, nombre: matVieja.nombre });
        }
    });

    const requiereMapeoCodigos = materiasEliminadas.length > 0;
    const tieneImpactoCascada =
        materiasEliminadas.length > 0 || cambiosCorrelativas.length > 0;
    const totalCambios =
        materiasAgregadas.length +
        materiasEliminadas.length +
        materiasRenombradas.length +
        cambiosCorrelativas.length;

    return {
        materiasAgregadas,
        materiasEliminadas,
        materiasRenombradas,
        cambiosCorrelativas,
        requiereMapeoCodigos,
        tieneImpactoCascada,
        totalCambios,
    };
}
