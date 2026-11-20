/**
 * notificationStrategies.js
 * Patrón Strategy para generación de alertas académicas del Centro de Notificaciones.
 * Cada estrategia es una función pura `(context) => NotificationItem | null`.
 * Cumple OCP: para agregar o modificar alertas no es necesario tocar NotificationCenter.jsx.
 */

import regularidadUtils from '../Progreso/regularidadUtils';
import { esMateriaIncompleta } from '../Progreso/materiasUtils';
import tituloIntermedioUtils from '../Progreso/tituloIntermedioUtils';
import {
    obtenerEventosProximos,
    formatCuentaRegresiva,
    TIPOS_EVENTO,
} from '../Cursada/cursadaUtils';

/** @typedef {import('../../types/domain').Materia} Materia */
/** @typedef {import('../../types/domain').NotificationContext} NotificationContext */
/** @typedef {import('../../types/domain').NotificationItem} NotificationItem */
/** @typedef {import('../../types/domain').NotificationStrategy} NotificationStrategy */

/**
 * @param {Materia[]} materias
 * @param {number} [limite]
 * @returns {string}
 */
function formatearNombres(materias, limite = 2) {
    const visibles = materias.slice(0, limite).map((m) => m.nombre).join(', ');
    const resto = materias.length - limite;
    return resto > 0 ? `${visibles} y ${resto} más` : visibles;
}

/**
 * 0-A. Alerta institucional cuando el Plan de Estudios activo recibió una actualización
 * publicada desde el Panel Admin (con motivo del cambio y/o migración de códigos/correlativas).
 * @type {NotificationStrategy}
 */
export function estrategiaActualizacionPlan({ activePlan, planUpdateNotice }) {
    if (!planUpdateNotice || planUpdateNotice.planNumero !== activePlan) {
        return null;
    }

    /** @type {string[]} */
    const fragmentos = [];
    if (planUpdateNotice.changelogMessage) {
        fragmentos.push(`Motivo: "${planUpdateNotice.changelogMessage}"`);
    }
    if (planUpdateNotice.codigosMigrados?.length > 0) {
        const mapeos = planUpdateNotice.codigosMigrados
            .slice(0, 2)
            .map((m) => `${m.desde} → ${m.hacia}`)
            .join(', ');
        fragmentos.push(`Se actualizó tu progreso en los códigos (${mapeos})`);
    }
    if (planUpdateNotice.materiasRecalculadas?.length > 0) {
        const cant = planUpdateNotice.materiasRecalculadas.length;
        fragmentos.push(
            `Se recalcularon correlativas en ${cant} ${cant === 1 ? 'materia' : 'materias'}`,
        );
    }

    const detalle =
        fragmentos.length > 0
            ? `${fragmentos.join(' · ')}.`
            : `Se aplicó la versión ${planUpdateNotice.version} del Plan ${activePlan} conservando tu progreso.`;

    return {
        id: `plan-update-${activePlan}-v${planUpdateNotice.version}`,
        icon: 'fa-solid fa-wand-magic-sparkles',
        tone: 'info',
        title: `Plan ${activePlan} actualizado (v${planUpdateNotice.version})`,
        description: detalle,
        path: '/progreso',
        time: `Versión ${planUpdateNotice.version}`,
    };
}

/**
 * 0-B. Alerta por evaluaciones o entregas registradas en Mi Cursada dentro de los próximos 7 días.
 * @type {NotificationStrategy}
 */
export function estrategiaEventosProximos({ activePlan, cursada, materias = [] }) {
    const eventos = cursada?.eventos || [];
    if (eventos.length === 0) return null;

    const proximos = obtenerEventosProximos(eventos, { dias: 7 });
    if (proximos.length === 0) return null;

    const materiaPorCodigo = new Map(materias.map((m) => [m.codigo, m.nombre]));
    const inminentes = proximos.filter((e) => e.diasRestantes <= 1);
    const esUrgente = inminentes.length > 0;
    const destacados = (esUrgente ? inminentes : proximos).slice(0, 2);

    const resumen = destacados
        .map((ev) => {
            const tipoLabel = TIPOS_EVENTO[ev.tipo]?.label || 'Evento';
            const matNombre = ev.codigoMateria ? materiaPorCodigo.get(ev.codigoMateria) : null;
            const contexto = matNombre ? `${ev.titulo} (${matNombre})` : `${tipoLabel}: ${ev.titulo}`;
            return `${contexto} — ${formatCuentaRegresiva(ev.diasRestantes)}`;
        })
        .join(' · ');

    const resto = proximos.length - destacados.length;
    const suffix = resto > 0 ? ` y ${resto} más` : '';

    return {
        id: `cursada-proximos-${activePlan}-${proximos.map((e) => `${e.id}:${e.fecha}`).sort().join('-')}`,
        icon: esUrgente ? 'fa-solid fa-calendar-day' : 'fa-regular fa-calendar-check',
        tone: esUrgente ? 'danger' : 'warning',
        title: esUrgente ? 'Evaluación o entrega inminente' : 'Próximas fechas de cursada',
        description: `${resumen}${suffix}.`,
        path: '/cursada',
        time: esUrgente ? 'Próximas 24h' : 'Próximos 7 días',
    };
}

/**
 * 1. Alerta por regularidades con <= 1 cuatrimestre de vigencia restante (Art. 31° RGE).
 * @type {NotificationStrategy}
 */
export function estrategiaVencimientoRegularidad({ activePlan, materias = [], progreso = {}, progresoDetalles = {} }) {
    const enRiesgo = materias.filter((m) => {
        if (progreso[m.codigo] !== 'Regular') return false;
        const det = progresoDetalles?.[m.codigo];
        if (!det?.fechaRegularidad) return false;
        try {
            const info = regularidadUtils.obtenerPlanificacionInstancias(det.fechaRegularidad, det.intentosFinal);
            return info && info.cuatrimestresRestantes <= 1;
        } catch {
            return false;
        }
    });

    if (enRiesgo.length === 0) return null;

    return {
        id: `vencimiento-${activePlan}-${enRiesgo.map((m) => m.codigo).sort().join('-')}`,
        icon: 'fa-regular fa-clock',
        tone: 'warning',
        title: 'Regularidades próximas a vencer',
        description: `Con 1 cuatrimestre o menos de vigencia: ${formatearNombres(enRiesgo)}.`,
        path: '/progreso',
        time: 'Urgente',
    };
}

/**
 * 2. Alerta por última oportunidad de examen final (Art. 32° RGE: 3 desaprobaciones acumuladas).
 * Respeta que los ausentes no descuentan intentos.
 * @type {NotificationStrategy}
 */
export function estrategiaUltimoIntentoFinal({ activePlan, materias = [], progreso = {}, progresoDetalles = {} }) {
    const enUltimaOportunidad = materias.filter((m) => {
        if (progreso[m.codigo] !== 'Regular') return false;
        const det = progresoDetalles?.[m.codigo];
        if (!det?.intentosFinal?.length) return false;
        const info = regularidadUtils.obtenerPlanificacionInstancias(det.fechaRegularidad, det.intentosFinal);
        return info && info.intentosRestantes === 1;
    });

    if (enUltimaOportunidad.length === 0) return null;

    return {
        id: `ultimo-intento-${activePlan}-${enUltimaOportunidad.map((m) => m.codigo).sort().join('-')}`,
        icon: 'fa-solid fa-triangle-exclamation',
        tone: 'danger',
        title: 'Última oportunidad de final',
        description: `Te queda 1 oportunidad antes de perder la regularidad en: ${formatearNombres(enUltimaOportunidad)}.`,
        path: '/progreso',
        time: 'RGE Art. 32°',
    };
}

/**
 * 3. Alerta de transición de plan (solo si el plan activo tiene la capacidad habilitada).
 * @type {NotificationStrategy}
 */
export function estrategiaTransicionPlan({ activePlan, careerShortName, canSimulateTransition, transitionInfo }) {
    if (!canSimulateTransition || !transitionInfo) return null;

    return {
        id: `transicion-${activePlan}-${transitionInfo.targetPlan}`,
        icon: 'fa-solid fa-scale-balanced',
        tone: 'brand',
        title: `Transición de Plan (${transitionInfo.shortBadge})`,
        description: `Evaluá si ya te corresponde pasar del Plan ${activePlan} al Plan ${transitionInfo.targetPlan}.`,
        path: transitionInfo.route,
        time: careerShortName ? `UNLu ${careerShortName}` : 'UNLu',
    };
}

/**
 * 4. Notificación positiva cuando el estudiante está a <= 2 materias del Título Intermedio o lo completó.
 * @type {NotificationStrategy}
 */
export function estrategiaTituloIntermedio({ activePlan, materias = [], progreso = {} }) {
    const nombre = tituloIntermedioUtils.getTituloIntermedioNombre(activePlan);
    if (!nombre || materias.length === 0) return null;

    const materiasIntermedio = tituloIntermedioUtils.getMateriasIntermedio(activePlan, materias);
    const { completadas, totales } = tituloIntermedioUtils.calcularProgresoIntermedio(materiasIntermedio, progreso);

    if (totales === 0) return null;
    const faltantes = totales - completadas;

    if (faltantes === 0) {
        return {
            id: `intermedio-completo-${activePlan}`,
            icon: 'fa-solid fa-graduation-cap',
            tone: 'brand',
            title: '¡Completaste el Título Intermedio!',
            description: `Aprobaste las ${totales} materias requeridas para ${nombre}.`,
            path: '/progreso',
            time: 'Logro',
        };
    }

    if (faltantes > 0 && faltantes <= 2) {
        return {
            id: `intermedio-cerca-${activePlan}-${faltantes}`,
            icon: 'fa-solid fa-award',
            tone: 'brand',
            title: 'Muy cerca del Título Intermedio',
            description: `Te ${faltantes === 1 ? 'falta solo 1 materia' : `faltan solo ${faltantes} materias`} para completar ${nombre}.`,
            path: '/progreso',
            time: 'Avance',
        };
    }

    return null;
}

/**
 * 5. Alerta por materias aprobadas o regulares sin nota/fecha cargada.
 * @type {NotificationStrategy}
 */
export function estrategiaDatosIncompletos({ activePlan, materias = [], progreso = {}, progresoDetalles = {} }) {
    const incompletas = materias.filter((m) =>
        esMateriaIncompleta(m, progreso[m.codigo], progresoDetalles?.[m.codigo]),
    ).length;

    if (incompletas === 0) return null;

    return {
        id: `incompletas-${activePlan}-${incompletas}`,
        icon: 'fa-solid fa-pen-to-square',
        tone: 'warning',
        title: 'Datos pendientes de carga',
        description: `Hay ${incompletas} ${incompletas === 1 ? 'materia' : 'materias'} sin nota final o fecha de regularidad para calcular tu promedio.`,
        path: '/progreso',
        time: 'Historial',
    };
}

/**
 * 6. Recordatorio de materias disponibles para cursar.
 * @type {NotificationStrategy}
 */
export function estrategiaMateriasDisponibles({ activePlan, materias = [], progreso = {} }) {
    const disponibles = materias.filter((m) => progreso[m.codigo] === 'Disponible').length;
    if (disponibles === 0) return null;

    return {
        id: `disponibles-${activePlan}-${disponibles}`,
        icon: 'fa-solid fa-lock-open',
        tone: 'info',
        title: 'Correlativas habilitadas',
        description: `Tenés ${disponibles} ${disponibles === 1 ? 'materia disponible' : 'materias disponibles'} para cursar en el Plan ${activePlan}.`,
        path: '/progreso',
        time: 'Plan de estudios',
    };
}

/**
 * 7. Tip de respaldo en la nube para usuarios en modo visitante.
 * @type {NotificationStrategy}
 */
export function estrategiaRespaldoCuenta({ isAuthenticated }) {
    if (isAuthenticated) return null;

    return {
        id: 'sync-tip',
        icon: 'fa-solid fa-cloud-arrow-up',
        tone: 'neutral',
        title: 'Respaldo de progreso',
        description: 'Iniciá sesión con Google desde Configuración o el menú para sincronizar tus avances en otros dispositivos.',
        path: '/config',
        time: 'Cuenta',
    };
}

/** @type {NotificationStrategy[]} */
export const DEFAULT_NOTIFICATION_STRATEGIES = [
    estrategiaActualizacionPlan,
    estrategiaUltimoIntentoFinal,
    estrategiaEventosProximos,
    estrategiaVencimientoRegularidad,
    estrategiaTransicionPlan,
    estrategiaTituloIntermedio,
    estrategiaDatosIncompletos,
    estrategiaMateriasDisponibles,
    estrategiaRespaldoCuenta,
];

/**
 * Ejecuta las estrategias registradas en orden de prioridad y devuelve las alertas activas.
 * @param {NotificationContext} context
 * @param {NotificationStrategy[]} [strategies]
 * @returns {NotificationItem[]}
 */
export function buildNotifications(context, strategies = DEFAULT_NOTIFICATION_STRATEGIES) {
    return strategies
        .map((strategy) => strategy(context))
        .filter(/** @returns {item is NotificationItem} */ (item) => Boolean(item));
}
