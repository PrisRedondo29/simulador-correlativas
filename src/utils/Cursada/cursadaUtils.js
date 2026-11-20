/**
 * cursadaUtils.js
 * Dominio puro para "Mi Cursada" (Calendario, Horarios semanales y Bitácora liviana).
 *
 * Las fechas se modelan como strings calendario ISO sin zona horaria ("YYYY-MM-DD")
 * y los horarios como reloj local ("HH:mm") para evitar desplazamientos por UTC
 * (ej. UTC-3 en Argentina). Nunca se utiliza `new Date("YYYY-MM-DD")`.
 */

/** @typedef {import('../../types/domain').DiaSemana} DiaSemana */
/** @typedef {import('../../types/domain').TipoEventoCursada} TipoEventoCursada */
/** @typedef {import('../../types/domain').EventoCursada} EventoCursada */
/** @typedef {import('../../types/domain').EventoCursadaProximo} EventoCursadaProximo */
/** @typedef {import('../../types/domain').HorarioClase} HorarioClase */
/** @typedef {import('../../types/domain').EntradaBitacora} EntradaBitacora */
/** @typedef {import('../../types/domain').CursadaPlanData} CursadaPlanData */
/** @typedef {import('../../types/domain').CalendarCell} CalendarCell */
/** @typedef {import('../../types/domain').Materia} Materia */
/** @typedef {import('../../types/domain').ProgresoMap} ProgresoMap */

/** @type {Array<{ id: DiaSemana, nombre: string, corto: string }>} */
export const DIAS_SEMANA = [
    { id: 1, nombre: 'Lunes', corto: 'Lun' },
    { id: 2, nombre: 'Martes', corto: 'Mar' },
    { id: 3, nombre: 'Miércoles', corto: 'Mié' },
    { id: 4, nombre: 'Jueves', corto: 'Jue' },
    { id: 5, nombre: 'Viernes', corto: 'Vie' },
    { id: 6, nombre: 'Sábado', corto: 'Sáb' },
];

export const MODALIDADES_CLASE = /** @type {const} */ (['Presencial', 'Virtual', 'Híbrida']);

/**
 * @type {Record<TipoEventoCursada, { label: string, icon: string, badgeClass: string, dotClass: string }>}
 */
export const TIPOS_EVENTO = {
    parcial: {
        label: 'Parcial',
        icon: 'fa-solid fa-file-pen',
        badgeClass: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA] dark:bg-[#2D1619] dark:text-[#FCA5A5] dark:border-[#5C262B]',
        dotClass: 'bg-[#DC2626] dark:bg-[#F87171]',
    },
    recuperatorio: {
        label: 'Recuperatorio',
        icon: 'fa-solid fa-rotate-right',
        badgeClass: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] dark:bg-[#2D2210] dark:text-[#FCD34D] dark:border-[#5C4318]',
        dotClass: 'bg-[#D97706] dark:bg-[#FBBF24]',
    },
    final: {
        label: 'Mesa de Final',
        icon: 'fa-solid fa-graduation-cap',
        badgeClass: 'bg-[#ECFDF5] text-[#005A36] border-[#A7F3D0] dark:bg-[#102A20] dark:text-[#86EFAC] dark:border-[#1E4D38]',
        dotClass: 'bg-[#005A36] dark:bg-[#34D399]',
    },
    tp: {
        label: 'Entrega TP',
        icon: 'fa-solid fa-laptop-code',
        badgeClass: 'bg-[#E0F2FE] text-[#075985] border-[#BAE6FD] dark:bg-[#0F2636] dark:text-[#7DD3FC] dark:border-[#1E4E6E]',
        dotClass: 'bg-[#0284C7] dark:bg-[#38BDF8]',
    },
    otro: {
        label: 'Otro',
        icon: 'fa-regular fa-calendar-check',
        badgeClass: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0] dark:bg-[#1E2730] dark:text-[#CBD5E1] dark:border-[#2A3540]',
        dotClass: 'bg-[#64748B] dark:bg-[#94A3B8]',
    },
};

const MESES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MESES_CORTOS_ES = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

const MS_PER_DAY = 86_400_000;

/**
 * @returns {CursadaPlanData}
 */
export function createEmptyCursadaData() {
    return {
        horarios: [],
        eventos: [],
        bitacora: [],
    };
}

/**
 * Normaliza un objeto de cursada parcial o proveniente de storage/Firestore.
 * @param {unknown} raw
 * @returns {CursadaPlanData}
 */
export function normalizarCursadaData(raw) {
    if (!raw || typeof raw !== 'object') return createEmptyCursadaData();
    const record = /** @type {Record<string, unknown>} */ (raw);
    return {
        horarios: Array.isArray(record.horarios) ? /** @type {HorarioClase[]} */ (record.horarios) : [],
        eventos: Array.isArray(record.eventos) ? /** @type {EventoCursada[]} */ (record.eventos) : [],
        bitacora: Array.isArray(record.bitacora) ? /** @type {EntradaBitacora[]} */ (record.bitacora) : [],
    };
}

/**
 * Genera un identificador único corto para registros locales.
 * @param {string} prefix
 * @returns {string}
 */
export function generarIdCursada(prefix = 'item') {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * @param {number} n
 * @returns {string}
 */
function pad2(n) {
    return String(n).padStart(2, '0');
}

/**
 * Devuelve la fecha local de hoy en formato calendario puro YYYY-MM-DD (sin desfase UTC).
 * @param {Date} [now]
 * @returns {string}
 */
export function getTodayISODate(now = new Date()) {
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/**
 * Parsea un string YYYY-MM-DD validando calendario real (incluyendo años bisiestos).
 * @param {string | null | undefined} isoDate
 * @returns {{ year: number, month: number, day: number } | null}
 */
export function parseISODateParts(isoDate) {
    if (typeof isoDate !== 'string') return null;
    const match = isoDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    const probe = new Date(Date.UTC(year, month - 1, day));
    if (
        probe.getUTCFullYear() !== year ||
        probe.getUTCMonth() + 1 !== month ||
        probe.getUTCDate() !== day
    ) {
        return null;
    }

    return { year, month, day };
}

/**
 * Calcula la diferencia exacta en días calendario (`toISO - fromISO`) sin deriva de zona horaria.
 * @param {string} fromISO
 * @param {string} toISO
 * @returns {number | null}
 */
export function diffDaysISO(fromISO, toISO) {
    const a = parseISODateParts(fromISO);
    const b = parseISODateParts(toISO);
    if (!a || !b) return null;

    const utcA = Date.UTC(a.year, a.month - 1, a.day);
    const utcB = Date.UTC(b.year, b.month - 1, b.day);
    return Math.round((utcB - utcA) / MS_PER_DAY);
}

/**
 * Formatea una fecha YYYY-MM-DD a etiqueta legible corta (ej: "15 may 2026").
 * @param {string} isoDate
 * @returns {string}
 */
export function formatFechaCorta(isoDate) {
    const parts = parseISODateParts(isoDate);
    if (!parts) return isoDate || '';
    return `${parts.day} ${MESES_CORTOS_ES[parts.month - 1]} ${parts.year}`;
}

/**
 * Devuelve nombre legible de mes y año (ej: "Mayo 2026").
 * @param {number} year
 * @param {number} month - 1..12
 * @returns {string}
 */
export function formatMesAnio(year, month) {
    const name = MESES_ES[month - 1] || '';
    return `${name} ${year}`;
}

/**
 * Construye la grilla mensual empezando en Lunes (35 o 42 celdas).
 * @param {number} year
 * @param {number} month - 1..12
 * @returns {CalendarCell[]}
 */
export function buildCalendarMonthGrid(year, month) {
    const firstWeekdayUTC = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=Dom .. 6=Sab
    const leadingDays = (firstWeekdayUTC + 6) % 7; // Lunes = 0 .. Domingo = 6
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const totalCells = leadingDays + daysInMonth <= 35 ? 35 : 42;

    /** @type {CalendarCell[]} */
    const cells = [];

    for (let i = 0; i < totalCells; i++) {
        const offsetDay = i - leadingDays + 1;
        const d = new Date(Date.UTC(year, month - 1, offsetDay));
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth() + 1;
        const day = d.getUTCDate();

        cells.push({
            iso: `${y}-${pad2(m)}-${pad2(day)}`,
            day,
            inCurrentMonth: y === year && m === month,
        });
    }

    return cells;
}

/**
 * Convierte un horario de reloj "HH:mm" a minutos desde medianoche.
 * @param {string | null | undefined} hhmm
 * @returns {number | null}
 */
export function parseTimeToMinutes(hhmm) {
    if (typeof hhmm !== 'string') return null;
    const match = hhmm.trim().match(/^(\d{2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const mins = Number(match[2]);
    if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null;
    return hours * 60 + mins;
}

/**
 * Ordena horarios por día de la semana y hora de inicio ascendente.
 * @param {HorarioClase[]} [horarios]
 * @returns {HorarioClase[]}
 */
export function ordenarHorarios(horarios = []) {
    return [...horarios].sort((a, b) => {
        if (a.dia !== b.dia) return a.dia - b.dia;
        const minA = parseTimeToMinutes(a.horaInicio) ?? 0;
        const minB = parseTimeToMinutes(b.horaInicio) ?? 0;
        return minA - minB;
    });
}

/**
 * Detecta bloques horarios superpuestos el mismo día (estricto: fin == inicio NO es conflicto).
 * Devuelve el Set de IDs involucrados en alguna superposición.
 * @param {HorarioClase[]} [horarios]
 * @returns {Set<string>}
 */
export function detectarSuperposicionesHorarios(horarios = []) {
    /** @type {Set<string>} */
    const conflictos = new Set();

    for (let i = 0; i < horarios.length; i++) {
        const a = horarios[i];
        const startA = parseTimeToMinutes(a.horaInicio);
        const endA = parseTimeToMinutes(a.horaFin);
        if (startA === null || endA === null || endA <= startA) continue;

        for (let j = i + 1; j < horarios.length; j++) {
            const b = horarios[j];
            if (a.dia !== b.dia) continue;
            const startB = parseTimeToMinutes(b.horaInicio);
            const endB = parseTimeToMinutes(b.horaFin);
            if (startB === null || endB === null || endB <= startB) continue;

            if (startA < endB && startB < endA) {
                conflictos.add(a.id);
                conflictos.add(b.id);
            }
        }
    }

    return conflictos;
}

/**
 * Ordena eventos cronológicamente por fecha y hora ascendente.
 * @param {EventoCursada[]} [eventos]
 * @returns {EventoCursada[]}
 */
export function ordenarEventos(eventos = []) {
    return [...eventos].sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
        return (a.hora || '99:99').localeCompare(b.hora || '99:99');
    });
}

/**
 * Filtra los eventos dentro de los próximos `dias` días (inclusive hoy = 0),
 * ordenados cronológicamente y enriquecidos con `diasRestantes`.
 * @param {EventoCursada[]} [eventos]
 * @param {{ dias?: number, hoyISO?: string }} [options]
 * @returns {EventoCursadaProximo[]}
 */
export function obtenerEventosProximos(eventos = [], { dias = 7, hoyISO = getTodayISODate() } = {}) {
    /** @type {EventoCursadaProximo[]} */
    const proximos = [];

    for (const ev of eventos) {
        const diff = diffDaysISO(hoyISO, ev.fecha);
        if (diff !== null && diff >= 0 && diff <= dias) {
            proximos.push({ ...ev, diasRestantes: diff });
        }
    }

    return /** @type {EventoCursadaProximo[]} */ (ordenarEventos(proximos));
}

/**
 * @param {string} text
 * @returns {string}
 */
function normalizeSearch(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Filtra entradas de bitácora por materia y búsqueda de texto (insensible a tildes),
 * ordenadas de más reciente a más antigua.
 * @param {EntradaBitacora[]} [entradas]
 * @param {{ codigoMateria?: string, busqueda?: string }} [filtros]
 * @returns {EntradaBitacora[]}
 */
export function filtrarBitacora(entradas = [], { codigoMateria = 'todas', busqueda = '' } = {}) {
    const query = normalizeSearch(busqueda.trim());

    return [...entradas]
        .filter((entry) => {
            if (codigoMateria && codigoMateria !== 'todas' && entry.codigoMateria !== codigoMateria) {
                return false;
            }
            if (!query) return true;
            const hayTema = normalizeSearch(entry.tema || '').includes(query);
            const hayNotas = normalizeSearch(entry.notas || '').includes(query);
            return hayTema || hayNotas;
        })
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/**
 * Devuelve el día de la semana ISO (1 = Lunes .. 6 = Sábado, 7 = Domingo) para una fecha YYYY-MM-DD.
 * @param {string} isoDate
 * @returns {number | null}
 */
export function getWeekdayFromISODate(isoDate) {
    const parts = parseISODateParts(isoDate);
    if (!parts) return null;
    const dayUTC = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay(); // 0=Dom..6=Sab
    return dayUTC === 0 ? 7 : dayUTC;
}

/**
 * Ordena materias por cuatrimestre ascendente y luego alfabéticamente por nombre.
 * @param {Materia[]} materias
 * @returns {Materia[]}
 */
function ordenarMateriasPorCuatrimestre(materias) {
    return [...materias].sort((a, b) => {
        const cuatriA = Number(a.cuatrimestre) || 99;
        const cuatriB = Number(b.cuatrimestre) || 99;
        if (cuatriA !== cuatriB) return cuatriA - cuatriB;
        return (a.nombre || '').localeCompare(b.nombre || '', 'es');
    });
}

/**
 * Agrupa las materias del plan para selectores de Mi Cursada:
 * - Prioriza Cursando, Regular (final pendiente) y Libre (recursar o rendir libre), ordenadas por cuatrimestre.
 * - Agrupa las pendientes restantes por cuatrimestre (1° Año · 1° Cuatrimestre, etc.).
 * - Deja las Aprobadas / Promocionadas al final para no estorbar la selección diaria.
 * @param {Materia[]} [materias]
 * @param {ProgresoMap} [progreso]
 * @returns {{
 *   cursando: Materia[],
 *   regulares: Materia[],
 *   libres: Materia[],
 *   pendientesPorCuatrimestre: Array<{ key: string, cuatrimestre: number, label: string, items: Materia[] }>,
 *   aprobadas: Materia[],
 *   otras: Materia[],
 * }}
 */
export function agruparMateriasSelector(materias = [], progreso = {}) {
    /** @type {Materia[]} */
    const cursando = [];
    /** @type {Materia[]} */
    const regulares = [];
    /** @type {Materia[]} */
    const libres = [];
    /** @type {Materia[]} */
    const pendientes = [];
    /** @type {Materia[]} */
    const aprobadas = [];

    for (const m of materias) {
        const estado = progreso[m.codigo];
        if (estado === 'Cursando') {
            cursando.push(m);
        } else if (estado === 'Regular') {
            regulares.push(m);
        } else if (estado === 'Libre') {
            libres.push(m);
        } else if (estado === 'Aprobado' || estado === 'Promocionado') {
            aprobadas.push(m);
        } else {
            pendientes.push(m);
        }
    }

    const pendientesOrdenadas = ordenarMateriasPorCuatrimestre(pendientes);
    /** @type {Map<number, { key: string, cuatrimestre: number, label: string, items: Materia[] }>} */
    const gruposPorCuatri = new Map();

    for (const m of pendientesOrdenadas) {
        const cuatri = Number(m.cuatrimestre) || 0;
        const anio = Number(m.anio) || (cuatri > 0 ? Math.ceil(cuatri / 2) : 0);
        if (!gruposPorCuatri.has(cuatri)) {
            const label =
                cuatri > 0
                    ? `${anio}° Año · ${cuatri}° Cuatrimestre`
                    : 'Otras materias del plan';
            gruposPorCuatri.set(cuatri, {
                key: `cuatri-${cuatri}`,
                cuatrimestre: cuatri,
                label,
                items: [],
            });
        }
        gruposPorCuatri.get(cuatri)?.items.push(m);
    }

    const aprobadasOrdenadas = ordenarMateriasPorCuatrimestre(aprobadas);

    return {
        cursando: ordenarMateriasPorCuatrimestre(cursando),
        regulares: ordenarMateriasPorCuatrimestre(regulares),
        libres: ordenarMateriasPorCuatrimestre(libres),
        pendientesPorCuatrimestre: Array.from(gruposPorCuatri.values()),
        aprobadas: aprobadasOrdenadas,
        otras: [...pendientesOrdenadas, ...aprobadasOrdenadas],
    };
}

/**
 * Etiqueta humana de cuenta regresiva para un evento próximo.
 * @param {number} diasRestantes
 * @returns {string}
 */
export function formatCuentaRegresiva(diasRestantes) {
    if (diasRestantes === 0) return 'Hoy';
    if (diasRestantes === 1) return 'Mañana';
    return `En ${diasRestantes} días`;
}
