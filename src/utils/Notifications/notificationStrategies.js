/**
 * notificationStrategies.js
 * Patrón Strategy para generación de alertas académicas del Centro de Notificaciones.
 * Cada estrategia es una función pura `(context) => Notification | null`.
 * Cumple OCP: para agregar o modificar alertas no es necesario tocar NotificationCenter.jsx.
 */

import regularidadUtils from '../Progreso/regularidadUtils';
import { esMateriaIncompleta } from '../Progreso/materiasUtils';
import tituloIntermedioUtils from '../Progreso/tituloIntermedioUtils';

function formatearNombres(materias, limite = 2) {
    const visibles = materias.slice(0, limite).map((m) => m.nombre).join(', ');
    const resto = materias.length - limite;
    return resto > 0 ? `${visibles} y ${resto} más` : visibles;
}

/**
 * 1. Alerta por regularidades con <= 1 cuatrimestre de vigencia restante (Art. 31° RGE).
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

export const DEFAULT_NOTIFICATION_STRATEGIES = [
    estrategiaUltimoIntentoFinal,
    estrategiaVencimientoRegularidad,
    estrategiaTransicionPlan,
    estrategiaTituloIntermedio,
    estrategiaDatosIncompletos,
    estrategiaMateriasDisponibles,
    estrategiaRespaldoCuenta,
];

/**
 * Ejecuta las estrategias registradas en orden de prioridad y devuelve las alertas activas.
 */
export function buildNotifications(context, strategies = DEFAULT_NOTIFICATION_STRATEGIES) {
    return strategies
        .map((strategy) => strategy(context))
        .filter(Boolean);
}
