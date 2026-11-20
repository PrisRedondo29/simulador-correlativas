/**
 * planMigration.js
 * Motor puro de migración por versión de plan de estudios.
 * Cuando desde el Panel Admin se publica una nueva versión de un plan (con mapeo de códigos
 * `codeMappings`, cambios de correlativas y `changelogMessage`), este módulo reconcilia de forma
 * no destructiva el progreso, detalles (notas/intentos), horarios/eventos/bitácora de Mi Cursada
 * y genera el aviso de notificación para que el estudiante conozca qué cambió y por qué.
 */

import {
    ESTADOS_MATERIA,
    calcularEstadoBaseMateria,
    sincronizarTesina,
} from '../Progreso/materiaStateMachine';

/** @typedef {import('../../types/domain').PlanData} PlanData */
/** @typedef {import('../../types/domain').ProgresoMap} ProgresoMap */
/** @typedef {import('../../types/domain').ProgresoDetallesMap} ProgresoDetallesMap */
/** @typedef {import('../../types/domain').CursadaPlanData} CursadaPlanData */
/** @typedef {import('../../types/domain').PlanMigrationResult} PlanMigrationResult */
/** @typedef {import('../../types/domain').PlanUpdateNotice} PlanUpdateNotice */

/** @type {Record<string, number>} */
const PRIORIDAD_ESTADO = {
    [ESTADOS_MATERIA.BLOQUEADO]: 0,
    [ESTADOS_MATERIA.DISPONIBLE]: 1,
    [ESTADOS_MATERIA.LIBRE]: 2,
    [ESTADOS_MATERIA.CURSANDO]: 3,
    [ESTADOS_MATERIA.REGULAR]: 4,
    [ESTADOS_MATERIA.APROBADO]: 5,
    [ESTADOS_MATERIA.PROMOCIONADO]: 6,
};

/**
 * Reconcilia los datos locales del estudiante con una nueva versión publicada del plan.
 *
 * Reglas de seguridad y no-destructividad (SOLID):
 * 1. Si `codeMappings` define `{ "11071": "11071B" }`, migra el estado, las notas/intentos y los
 *    registros de Mi Cursada (`horarios`, `eventos`, `bitacora`) al nuevo código conservando el
 *    estado de mayor avance académico.
 * 2. Jamás degrada una materia ya cursada (`Cursando`, `Regular`, `Aprobado`, `Promocionado`, `Libre`).
 * 3. Recalcula `Disponible` <-> `Bloqueado` para las materias aún no iniciadas según las nuevas correlativas
 *    y sincroniza Tesina / `requisitosEspeciales`.
 * 4. Construye un `PlanUpdateNotice` con el `changelogMessage` del administrador para notificar al alumno.
 *
 * @param {{
 *   planNumero: string,
 *   nuevoPlan: PlanData,
 *   versionNueva: number,
 *   versionAnterior?: number,
 *   codeMappings?: Record<string, string> | null,
 *   changelogMessage?: string | null,
 *   progreso?: ProgresoMap | null,
 *   progresoDetalles?: ProgresoDetallesMap | null,
 *   cursada?: CursadaPlanData | null,
 *   nowIso?: string,
 * }} params
 * @returns {PlanMigrationResult}
 */
export function reconciliarProgresoConNuevaVersionPlan({
    planNumero,
    nuevoPlan,
    versionNueva,
    versionAnterior = 0,
    codeMappings = null,
    changelogMessage = null,
    progreso = null,
    progresoDetalles = null,
    cursada = null,
    nowIso = new Date().toISOString(),
}) {
    const safeProgreso = progreso && typeof progreso === 'object' ? { ...progreso } : {};
    const safeDetalles =
        progresoDetalles && typeof progresoDetalles === 'object' ? { ...progresoDetalles } : {};
    const safeMappings =
        codeMappings && typeof codeMappings === 'object' ? codeMappings : {};

    if (!nuevoPlan || !Array.isArray(nuevoPlan.materias) || versionNueva <= versionAnterior) {
        return {
            applied: false,
            progreso: safeProgreso,
            progresoDetalles: safeDetalles,
            cursada,
            codigosMigrados: [],
            materiasRecalculadas: [],
            notice: null,
        };
    }

    /** @type {Array<{ desde: string, hacia: string }>} */
    const codigosMigrados = [];
    const codigosEnNuevoPlan = new Set(nuevoPlan.materias.map((m) => m.codigo));

    // 1. Aplicar mapeos declarativos de códigos (ej. "11071" -> "11071B")
    Object.entries(safeMappings).forEach(([oldCodeRaw, newCodeRaw]) => {
        const oldCode = String(oldCodeRaw || '').trim();
        const newCode = String(newCodeRaw || '').trim();
        if (!oldCode || !newCode || oldCode === newCode || !codigosEnNuevoPlan.has(newCode)) {
            return;
        }

        let migroAlgo = false;

        if (oldCode in safeProgreso) {
            const estadoViejo = safeProgreso[oldCode];
            const estadoExistenteNuevo = safeProgreso[newCode];
            const prioViejo = PRIORIDAD_ESTADO[estadoViejo] ?? -1;
            const prioNuevo = estadoExistenteNuevo ? (PRIORIDAD_ESTADO[estadoExistenteNuevo] ?? -1) : -1;

            if (prioViejo >= prioNuevo) {
                safeProgreso[newCode] = estadoViejo;
            }
            delete safeProgreso[oldCode];
            migroAlgo = true;
        }

        if (oldCode in safeDetalles && safeDetalles[oldCode]) {
            if (!safeDetalles[newCode]) {
                safeDetalles[newCode] = safeDetalles[oldCode];
            }
            delete safeDetalles[oldCode];
            migroAlgo = true;
        }

        if (migroAlgo) {
            codigosMigrados.push({ desde: oldCode, hacia: newCode });
        }
    });

    // 2. Migrar referencias de código en Mi Cursada (horarios, eventos, bitácora)
    /** @type {CursadaPlanData | null} */
    let cursadaMigrada = cursada;
    if (cursada && typeof cursada === 'object' && Object.keys(safeMappings).length > 0) {
        /** @param {string | null | undefined} cod */
        const mapearCodigo = (cod) => {
            if (!cod || typeof cod !== 'string') return cod;
            const destino = safeMappings[cod];
            return destino && codigosEnNuevoPlan.has(destino) ? destino : cod;
        };

        cursadaMigrada = {
            horarios: Array.isArray(cursada.horarios)
                ? cursada.horarios.map((h) => ({
                      ...h,
                      codigoMateria: /** @type {string} */ (mapearCodigo(h.codigoMateria)),
                  }))
                : [],
            eventos: Array.isArray(cursada.eventos)
                ? cursada.eventos.map((e) => ({
                      ...e,
                      codigoMateria: mapearCodigo(e.codigoMateria),
                  }))
                : [],
            bitacora: Array.isArray(cursada.bitacora)
                ? cursada.bitacora.map((b) => ({
                      ...b,
                      codigoMateria: /** @type {string} */ (mapearCodigo(b.codigoMateria)),
                  }))
                : [],
        };
    }

    // 3. Recalcular estados base (Disponible vs Bloqueado) para materias no iniciadas y nuevas materias
    /** @type {string[]} */
    const materiasRecalculadas = [];
    const tieneProgresoCargado = Object.keys(safeProgreso).length > 0;

    if (tieneProgresoCargado) {
        nuevoPlan.materias.forEach((mat) => {
            const estadoActual = safeProgreso[mat.codigo];
            const esNoIniciada =
                !estadoActual ||
                estadoActual === ESTADOS_MATERIA.BLOQUEADO ||
                estadoActual === ESTADOS_MATERIA.DISPONIBLE;

            if (esNoIniciada) {
                const estadoBase = calcularEstadoBaseMateria(
                    safeProgreso,
                    mat,
                    nuevoPlan.materias,
                );
                if (estadoActual !== estadoBase) {
                    safeProgreso[mat.codigo] = estadoBase;
                    if (estadoActual !== undefined) {
                        materiasRecalculadas.push(mat.codigo);
                    }
                }
            }
        });

        const synced = sincronizarTesina(safeProgreso, nuevoPlan.materias);
        if (synced.huboCambios) {
            Object.entries(synced.progreso).forEach(([cod, est]) => {
                if (safeProgreso[cod] !== est && !materiasRecalculadas.includes(cod)) {
                    materiasRecalculadas.push(cod);
                }
                safeProgreso[cod] = est;
            });
        }
    }

    const cleanMessage =
        typeof changelogMessage === 'string' && changelogMessage.trim().length > 0
            ? changelogMessage.trim()
            : null;

    const debeNotificar =
        Boolean(cleanMessage) ||
        codigosMigrados.length > 0 ||
        materiasRecalculadas.length > 0;

    /** @type {PlanUpdateNotice | null} */
    const notice = debeNotificar
        ? {
              planNumero,
              version: versionNueva,
              previousVersion: versionAnterior,
              changelogMessage: cleanMessage,
              codigosMigrados,
              materiasRecalculadas,
              appliedAt: nowIso,
          }
        : null;

    return {
        applied: true,
        progreso: safeProgreso,
        progresoDetalles: safeDetalles,
        cursada: cursadaMigrada,
        codigosMigrados,
        materiasRecalculadas,
        notice,
    };
}
