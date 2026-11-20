/**
 * syncStateMachine.js
 * Motor puro de integridad y sincronización (Patrón State + Serialización Canónica).
 *
 * Responsabilidades:
 *  - Normalización de mapas legacy de Firestore (claves con punto anidadas o literales).
 *  - Serialización determinista canónica y cálculo de hash de contenido (`lastSyncedHash`).
 *  - Verificación de tamaño de payload contra el límite seguro de 1 MiB de Firestore.
 *  - Conciliación segura entre datos locales y remotos diferenciando `conflict` vs `account_mismatch`.
 *  - Máquina de estados pura con conectividad (`isOnline`) ortogonal al estado principal.
 *  - Contratos de exportación e importación de respaldo manual en JSON.
 *
 * Cero dependencias de React, DOM o Firebase para máxima testabilidad en Vitest.
 */

/** @typedef {import('../../types/domain').AcademicSyncBundle} AcademicSyncBundle */
/** @typedef {import('../../types/domain').CursadaPlanData} CursadaPlanData */
/** @typedef {import('../../types/domain').ExportBackupPayload} ExportBackupPayload */
/** @typedef {import('../../types/domain').ParseImportBackupResult} ParseImportBackupResult */
/** @typedef {import('../../types/domain').ProgresoDetallesMap} ProgresoDetallesMap */
/** @typedef {import('../../types/domain').ProgresoMap} ProgresoMap */
/** @typedef {import('../../types/domain').SyncAction} SyncAction */
/** @typedef {import('../../types/domain').SyncBundleSummary} SyncBundleSummary */
/** @typedef {import('../../types/domain').SyncConciliationResult} SyncConciliationResult */
/** @typedef {import('../../types/domain').SyncConflictContext} SyncConflictContext */
/** @typedef {import('../../types/domain').SyncMeta} SyncMeta */
/** @typedef {import('../../types/domain').SyncState} SyncState */
/** @typedef {import('../../types/domain').SyncStatus} SyncStatus */

export const SYNC_STATUS = Object.freeze(
    /** @type {const} */ ({
        LOCAL: 'local',
        SYNCED: 'synced',
        PENDING: 'pending',
        SYNCING: 'syncing',
        CONFLICT: 'conflict',
        ACCOUNT_MISMATCH: 'account_mismatch',
        ERROR: 'error',
    }),
);

export const SYNC_UNITS = Object.freeze(
    /** @type {const} */ ({
        ACADEMIC: 'academic',
    }),
);

/** Margen de seguridad por debajo del límite estricto de 1 MiB (1,048,576 bytes) por documento de Firestore. */
export const MAX_SAFE_FIRESTORE_BYTES = 900 * 1024;

export const EXPORT_BACKUP_VERSION = 1;

/** Estados de materia que representan progreso real registrado por el estudiante (no inicialización por defecto). */
const MEANINGFUL_PROGRESO_STATES = new Set([
    'Cursando',
    'Regular',
    'Aprobado',
    'Promocionado',
    'Libre',
]);

/** Campos volátiles o de metadatos que NUNCA deben alterar el hash de contenido académico. */
const VOLATILE_KEYS = new Set([
    'updatedAt',
    'createdAt',
    'progresoUpdatedAt',
    'cursadaUpdatedAt',
    'simulacionUpdatedAt',
    'academicUpdatedAt',
    'configUpdatedAt',
    'syncRevision',
    'academicHash',
    'schemaVersion',
    'uid',
    'email',
    'lastSyncedAt',
    'lastSyncedHash',
    'lastSyncedUid',
]);

/**
 * Comparador lexicográfico determinista independiente del locale del navegador/SO.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareCodeUnits(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, any>}
 */
function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Crea un bundle académico vacío en formato canónico.
 * @returns {AcademicSyncBundle}
 */
export function createEmptyAcademicBundle() {
    return {
        progreso: {},
        progresoDetalles: {},
        cursada: {},
        simulaciones: {},
    };
}

/**
 * Aplana mapas anidados que Firestore pudo generar cuando un ID de plan contiene punto
 * (ej: { "17": { "14": { "11071": "Aprobado" } } } -> { "17.14": { "11071": "Aprobado" } }).
 * Funciona de forma genérica para cualquier prefijo de carrera (17.14, 20.08, etc.).
 * @param {Record<string, any>} [rawMap]
 * @returns {Record<string, any>}
 */
export function normalizeNestedPlanMap(rawMap = {}) {
    if (!isPlainObject(rawMap)) return {};

    /** @type {Record<string, any>} */
    const normalized = { ...rawMap };

    for (const [key, value] of Object.entries(rawMap)) {
        if (!/^\d+$/.test(key) || !isPlainObject(value)) {
            continue;
        }

        const nestedNumericEntries = Object.entries(value).filter(
            ([subKey, subVal]) => /^\d+$/.test(subKey) && subVal && typeof subVal === 'object',
        );

        if (nestedNumericEntries.length > 0) {
            for (const [subKey, subVal] of nestedNumericEntries) {
                const flatPlanKey = `${key}.${subKey}`;
                if (!normalized[flatPlanKey]) {
                    normalized[flatPlanKey] = subVal;
                }
            }
            delete normalized[key];
        }
    }

    return normalized;
}

/**
 * Extrae una revisión optimista válida desde un documento de Firestore.
 * Documentos legacy sin `syncRevision` devuelven `0`.
 * @param {Record<string, any> | null | undefined} cloudDoc
 * @returns {number}
 */
export function getSafeSyncRevision(cloudDoc) {
    if (!isPlainObject(cloudDoc)) return 0;
    const rev = cloudDoc.syncRevision;
    if (typeof rev === 'number' && Number.isInteger(rev) && rev >= 0) {
        return rev;
    }
    return 0;
}

/**
 * Extrae y normaliza el bloque académico desde un documento Firestore (soportando
 * mapas modernos, mapas anidados legacy `{ "17": { "14": ... } }` y claves literales `"progreso.17.14"`).
 * Los campos canónicos siempre prevalecen sobre claves legacy con punto literal.
 * @param {Record<string, any> | null | undefined} cloudData
 * @returns {AcademicSyncBundle}
 */
export function extractAcademicBundleFromCloudDoc(cloudData) {
    if (!isPlainObject(cloudData)) return createEmptyAcademicBundle();

    const progreso = normalizeNestedPlanMap(cloudData.progreso || {});
    const progresoDetalles = normalizeNestedPlanMap(cloudData.progresoDetalles || {});
    const simulaciones = normalizeNestedPlanMap(cloudData.simulaciones || {});
    const cursada = normalizeNestedPlanMap(cloudData.cursada || {});

    for (const key of Object.keys(cloudData)) {
        if (key.startsWith('progreso.')) {
            const plan = key.substring('progreso.'.length);
            if (plan && !progreso[plan] && isPlainObject(cloudData[key])) {
                progreso[plan] = cloudData[key];
            }
        } else if (key.startsWith('progresoDetalles.')) {
            const plan = key.substring('progresoDetalles.'.length);
            if (plan && !progresoDetalles[plan] && isPlainObject(cloudData[key])) {
                progresoDetalles[plan] = cloudData[key];
            }
        } else if (key.startsWith('simulaciones.')) {
            const plan = key.substring('simulaciones.'.length);
            if (plan && !simulaciones[plan] && cloudData[key] != null) {
                simulaciones[plan] = cloudData[key];
            }
        } else if (key.startsWith('cursada.')) {
            const plan = key.substring('cursada.'.length);
            if (plan && !cursada[plan] && isPlainObject(cloudData[key])) {
                cursada[plan] = cloudData[key];
            }
        }
    }

    return canonicalizeAcademicBundle({
        progreso,
        progresoDetalles,
        cursada,
        simulaciones,
    });
}

/**
 * Normaliza recursivamente cualquier valor para serialización determinista:
 * - Ordena todas las claves de objetos lexicográficamente.
 * - Omite propiedades `undefined` y claves volátiles.
 * @param {unknown} value
 * @returns {any}
 */
function canonicalizeValue(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string' || typeof value === 'boolean') {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => canonicalizeValue(item));
    }
    if (isPlainObject(value)) {
        /** @type {Record<string, any>} */
        const sorted = {};
        const keys = Object.keys(value).sort(compareCodeUnits);
        for (const key of keys) {
            if (VOLATILE_KEYS.has(key)) continue;
            const entry = value[key];
            if (entry === undefined) continue;
            sorted[key] = canonicalizeValue(entry);
        }
        return sorted;
    }
    return null;
}

/**
 * Determina si un objeto de detalles de materia contiene algún dato real.
 * @param {unknown} detail
 * @returns {boolean}
 */
function hasMeaningfulDetail(detail) {
    if (!isPlainObject(detail)) return false;
    for (const [key, val] of Object.entries(detail)) {
        if (VOLATILE_KEYS.has(key)) continue;
        if (val === null || val === undefined || val === '') continue;
        if (Array.isArray(val)) {
            if (val.length > 0) return true;
            continue;
        }
        if (isPlainObject(val)) {
            if (Object.keys(val).length > 0) return true;
            continue;
        }
        return true;
    }
    return false;
}

/**
 * Determina si un mapa de progreso de un plan tiene al menos una materia marcada
 * por el estudiante (excluyendo mapas inicializados solo con Bloqueado/Disponible).
 * @param {unknown} planProgreso
 * @returns {boolean}
 */
function hasMeaningfulProgreso(planProgreso) {
    if (!isPlainObject(planProgreso)) return false;
    return Object.values(planProgreso).some((estado) =>
        MEANINGFUL_PROGRESO_STATES.has(String(estado)),
    );
}

/**
 * Normaliza un objeto CursadaPlanData garantizando listas canónicas ordenadas en claves.
 * Devuelve `null` si no tiene horarios, eventos ni entradas de bitácora.
 * @param {unknown} rawCursada
 * @returns {CursadaPlanData | null}
 */
function canonicalizeCursadaPlan(rawCursada) {
    if (!isPlainObject(rawCursada)) return null;
    const bitacora = Array.isArray(rawCursada.bitacora)
        ? rawCursada.bitacora.filter(isPlainObject).map((item) => canonicalizeValue(item))
        : [];
    const eventos = Array.isArray(rawCursada.eventos)
        ? rawCursada.eventos.filter(isPlainObject).map((item) => canonicalizeValue(item))
        : [];
    const horarios = Array.isArray(rawCursada.horarios)
        ? rawCursada.horarios.filter(isPlainObject).map((item) => canonicalizeValue(item))
        : [];

    if (bitacora.length === 0 && eventos.length === 0 && horarios.length === 0) {
        return null;
    }

    return {
        bitacora,
        eventos,
        horarios,
    };
}

/**
 * Determina si una simulación de un plan tiene contenido real.
 * @param {unknown} sim
 * @returns {boolean}
 */
function hasMeaningfulSimulation(sim) {
    if (sim === null || sim === undefined) return false;
    if (Array.isArray(sim)) return sim.length > 0;
    if (isPlainObject(sim)) {
        const clean = canonicalizeValue(sim);
        return Object.keys(clean).length > 0;
    }
    return false;
}

/**
 * Construye una representación canónica y determinista del bloque académico completo:
 * - Excluye campos volátiles (`updatedAt`, `syncRevision`, etc.).
 * - Ordena todas las claves de planes, materias y propiedades de forma determinista.
 * - Descarta planes vacíos o únicamente inicializados por defecto (sin avance real),
 *   detalles vacíos y cursadas vacías para evitar falsos positivos de conflicto o pendiente.
 * @param {Partial<AcademicSyncBundle> | null | undefined} rawBundle
 * @returns {AcademicSyncBundle}
 */
export function canonicalizeAcademicBundle(rawBundle) {
    const source = isPlainObject(rawBundle) ? rawBundle : {};

    /** @type {Record<string, ProgresoMap>} */
    const progreso = {};
    if (isPlainObject(source.progreso)) {
        const planKeys = Object.keys(source.progreso).sort(compareCodeUnits);
        for (const plan of planKeys) {
            const planMap = source.progreso[plan];
            if (!hasMeaningfulProgreso(planMap)) continue;
            /** @type {ProgresoMap} */
            const sortedPlan = {};
            const subjectKeys = Object.keys(planMap).sort(compareCodeUnits);
            for (const code of subjectKeys) {
                const state = planMap[code];
                if (typeof state === 'string' && state.length > 0) {
                    sortedPlan[code] = /** @type {any} */ (state);
                }
            }
            if (Object.keys(sortedPlan).length > 0) {
                progreso[plan] = sortedPlan;
            }
        }
    }

    /** @type {Record<string, ProgresoDetallesMap>} */
    const progresoDetalles = {};
    if (isPlainObject(source.progresoDetalles)) {
        const planKeys = Object.keys(source.progresoDetalles).sort(compareCodeUnits);
        for (const plan of planKeys) {
            const planDetalles = source.progresoDetalles[plan];
            if (!isPlainObject(planDetalles)) continue;
            /** @type {ProgresoDetallesMap} */
            const sortedPlanDetalles = {};
            const subjectKeys = Object.keys(planDetalles).sort(compareCodeUnits);
            for (const code of subjectKeys) {
                const detail = planDetalles[code];
                if (!hasMeaningfulDetail(detail)) continue;
                sortedPlanDetalles[code] = canonicalizeValue(detail);
            }
            if (Object.keys(sortedPlanDetalles).length > 0) {
                progresoDetalles[plan] = sortedPlanDetalles;
            }
        }
    }

    /** @type {Record<string, CursadaPlanData>} */
    const cursada = {};
    if (isPlainObject(source.cursada)) {
        const planKeys = Object.keys(source.cursada).sort(compareCodeUnits);
        for (const plan of planKeys) {
            const normalizedPlan = canonicalizeCursadaPlan(source.cursada[plan]);
            if (normalizedPlan) {
                cursada[plan] = normalizedPlan;
            }
        }
    }

    /** @type {Record<string, unknown>} */
    const simulaciones = {};
    if (isPlainObject(source.simulaciones)) {
        const planKeys = Object.keys(source.simulaciones).sort(compareCodeUnits);
        for (const plan of planKeys) {
            const sim = source.simulaciones[plan];
            if (!hasMeaningfulSimulation(sim)) continue;
            simulaciones[plan] = canonicalizeValue(sim);
        }
    }

    return {
        cursada,
        progreso,
        progresoDetalles,
        simulaciones,
    };
}

/**
 * Serializa el bundle académico en un JSON canónico determinista.
 * Dos objetos con el mismo contenido y distinto orden de propiedades producen exactamente el mismo string.
 * @param {Partial<AcademicSyncBundle> | null | undefined} rawBundle
 * @returns {string}
 */
export function serializeCanonicalBundle(rawBundle) {
    return JSON.stringify(canonicalizeAcademicBundle(rawBundle));
}

/**
 * Calcula un hash de contenido determinista de 64 bits (`v1:<16 hex>`) sobre la
 * serialización canónica del bundle académico (síncrono, puro y sin dependencias externas).
 * @param {Partial<AcademicSyncBundle> | null | undefined} rawBundle
 * @returns {string}
 */
export function computeBundleHash(rawBundle) {
    const canonicalJson = serializeCanonicalBundle(rawBundle);

    // Dos carriles independientes de 32 bits estilo FNV-1a + mezcla avalanche final (64 bits totales)
    let h1 = 0x811c9dc5;
    let h2 = 0xdeadbeef;

    for (let i = 0; i < canonicalJson.length; i++) {
        const ch = canonicalJson.charCodeAt(i);
        h1 ^= ch;
        h1 = Math.imul(h1, 0x01000193);
        h2 ^= ch ^ ((i + 1) & 0xff);
        h2 = Math.imul(h2, 0x85ebca6b);
    }

    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 0x85ebca6b);
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 0xc2b2ae35);
    h1 ^= h1 >>> 16;

    h2 ^= h2 >>> 16;
    h2 = Math.imul(h2, 0x7feb352d);
    h2 ^= h2 >>> 15;
    h2 = Math.imul(h2, 0x846ca68b);
    h2 ^= h2 >>> 16;

    const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
    const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
    return `v1:${hex1}${hex2}`;
}

/**
 * Estima el tamaño real en bytes UTF-8 de un payload JSON antes de subirlo a Firestore.
 * @param {unknown} payload
 * @returns {number}
 */
export function estimatePayloadBytes(payload) {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
    if (typeof TextEncoder !== 'undefined') {
        return new TextEncoder().encode(serialized).length;
    }
    let bytes = 0;
    for (let i = 0; i < serialized.length; i++) {
        const code = serialized.charCodeAt(i);
        if (code < 0x80) bytes += 1;
        else if (code < 0x800) bytes += 2;
        else if (code >= 0xd800 && code <= 0xdbff) {
            bytes += 4;
            i += 1;
        } else {
            bytes += 3;
        }
    }
    return bytes;
}

/**
 * Indica si un bundle académico está efectivamente vacío (sin progreso real, detalles, cursada ni simulaciones).
 * @param {Partial<AcademicSyncBundle> | null | undefined} rawBundle
 * @returns {boolean}
 */
export function isAcademicBundleEmpty(rawBundle) {
    const canonical = canonicalizeAcademicBundle(rawBundle);
    return (
        Object.keys(canonical.progreso).length === 0 &&
        Object.keys(canonical.progresoDetalles).length === 0 &&
        Object.keys(canonical.cursada).length === 0 &&
        Object.keys(canonical.simulaciones).length === 0
    );
}

/**
 * Genera un resumen legible de un bundle académico para presentar comparativas en
 * modales de conflicto o cambio de cuenta ("Este dispositivo vs. Nube").
 * @param {Partial<AcademicSyncBundle> | null | undefined} rawBundle
 * @returns {SyncBundleSummary}
 */
export function summarizeAcademicBundle(rawBundle) {
    const canonical = canonicalizeAcademicBundle(rawBundle);
    const planSet = new Set([
        ...Object.keys(canonical.progreso),
        ...Object.keys(canonical.progresoDetalles),
        ...Object.keys(canonical.cursada),
        ...Object.keys(canonical.simulaciones),
    ]);

    let materiasAprobadas = 0;
    let materiasActivas = 0;
    let materiasLibres = 0;

    for (const planMap of Object.values(canonical.progreso)) {
        for (const estado of Object.values(planMap)) {
            if (estado === 'Aprobado' || estado === 'Promocionado') materiasAprobadas += 1;
            else if (estado === 'Cursando' || estado === 'Regular') materiasActivas += 1;
            else if (estado === 'Libre') materiasLibres += 1;
        }
    }

    let eventosCursada = 0;
    let horariosCursada = 0;
    let entradasBitacora = 0;

    for (const cursadaPlan of Object.values(canonical.cursada)) {
        eventosCursada += cursadaPlan.eventos.length;
        horariosCursada += cursadaPlan.horarios.length;
        entradasBitacora += cursadaPlan.bitacora.length;
    }

    const simulaciones = Object.keys(canonical.simulaciones).length;
    const totalItems =
        materiasAprobadas +
        materiasActivas +
        materiasLibres +
        eventosCursada +
        horariosCursada +
        entradasBitacora +
        simulaciones;

    const isEmpty = isAcademicBundleEmpty(canonical);

    return {
        planes: Array.from(planSet).sort(compareCodeUnits),
        materiasAprobadas,
        materiasActivas,
        materiasLibres,
        eventosCursada,
        horariosCursada,
        entradasBitacora,
        simulaciones,
        totalItems,
        isEmpty,
    };
}

/**
 * Evalúa la conciliación segura entre datos locales y remotos al iniciar sesión
 * o al inspeccionar la nube.
 *
 * Garantías:
 *  - Nunca mezcla silenciosamente datos locales de un `lastSyncedUid` con otra cuenta (`account_mismatch`).
 *  - Nunca decide sobrescribir datos divergentes sin intervención del usuario (`conflict`).
 *  - Si el contenido canónico coincide (`localHash === remoteHash`), declara `in_sync`.
 *
 * @param {{
 *   localBundle: Partial<AcademicSyncBundle> | null | undefined,
 *   remoteBundle: Partial<AcademicSyncBundle> | null | undefined,
 *   currentUid: string | null | undefined,
 *   lastSyncedUid?: string | null,
 *   remoteSyncRevision?: number,
 * }} params
 * @returns {SyncConciliationResult}
 */
export function evaluarConciliacionSync({
    localBundle,
    remoteBundle,
    currentUid,
    lastSyncedUid = null,
    remoteSyncRevision = 0,
}) {
    const canonicalLocal = canonicalizeAcademicBundle(localBundle);
    const canonicalRemote = canonicalizeAcademicBundle(remoteBundle);

    const localHash = computeBundleHash(canonicalLocal);
    const remoteHash = computeBundleHash(canonicalRemote);
    const localSummary = summarizeAcademicBundle(canonicalLocal);
    const remoteSummary = summarizeAcademicBundle(canonicalRemote);

    const normalizedCurrentUid = currentUid || null;
    const normalizedLastUid = lastSyncedUid || null;

    /** @type {SyncConciliationResult['outcome']} */
    let outcome;

    if (
        normalizedLastUid &&
        normalizedCurrentUid &&
        normalizedLastUid !== normalizedCurrentUid &&
        !localSummary.isEmpty
    ) {
        outcome = 'account_mismatch';
    } else if (localSummary.isEmpty && remoteSummary.isEmpty) {
        outcome = 'in_sync';
    } else if (localSummary.isEmpty && !remoteSummary.isEmpty) {
        outcome = 'adopt_remote';
    } else if (!localSummary.isEmpty && remoteSummary.isEmpty) {
        outcome = 'keep_local_pending';
    } else if (localHash === remoteHash) {
        outcome = 'in_sync';
    } else {
        outcome = 'conflict';
    }

    return {
        outcome,
        localHash,
        remoteHash,
        localSummary,
        remoteSummary,
        remoteRevision: remoteSyncRevision,
        remoteBundle: canonicalRemote,
        previousUid: normalizedLastUid,
        currentUid: normalizedCurrentUid,
    };
}

/**
 * Construye el payload portable para exportación manual a JSON (respaldo independiente del navegador).
 * @param {Partial<AcademicSyncBundle> | null | undefined} bundle
 * @param {{ planActivo?: string | null, sourceUid?: string | null, exportedAt?: string }} [options]
 * @returns {ExportBackupPayload}
 */
export function buildExportBackupPayload(
    bundle,
    { planActivo = null, sourceUid = null, exportedAt = new Date().toISOString() } = {},
) {
    const canonical = canonicalizeAcademicBundle(bundle);
    return {
        app: 'simulador-correlativas-unlu',
        version: EXPORT_BACKUP_VERSION,
        exportedAt,
        planActivo,
        sourceUid,
        hash: computeBundleHash(canonical),
        summary: summarizeAcademicBundle(canonical),
        bundle: canonical,
    };
}

/**
 * Valida y parsea un archivo JSON de respaldo exportado manualmente.
 * @param {string | Record<string, any>} rawInput
 * @returns {ParseImportBackupResult}
 */
export function parseImportBackupPayload(rawInput) {
    /** @type {any} */
    let parsed;
    if (typeof rawInput === 'string') {
        try {
            parsed = JSON.parse(rawInput);
        } catch {
            return { ok: false, error: 'El archivo no contiene un JSON válido.' };
        }
    } else {
        parsed = rawInput;
    }

    if (!isPlainObject(parsed)) {
        return { ok: false, error: 'Formato de respaldo inválido.' };
    }

    const rawBundle = isPlainObject(parsed.bundle) ? parsed.bundle : null;
    if (!rawBundle) {
        return { ok: false, error: 'El respaldo no contiene el bloque académico esperado.' };
    }

    const hasRecognizedSection =
        isPlainObject(rawBundle.progreso) ||
        isPlainObject(rawBundle.progresoDetalles) ||
        isPlainObject(rawBundle.cursada) ||
        isPlainObject(rawBundle.simulaciones);

    if (!hasRecognizedSection) {
        return { ok: false, error: 'El bloque académico del respaldo está vacío o corrupto.' };
    }

    return {
        ok: true,
        bundle: canonicalizeAcademicBundle(rawBundle),
        planActivo: typeof parsed.planActivo === 'string' ? parsed.planActivo : null,
        exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
    };
}

// ─── Máquina de Estados Pura (Patrón State) ───────────────────────────────────

/**
 * Construye el estado inicial de sincronización combinando conectividad actual,
 * metadatos persistidos y el contenido real del dispositivo (preservando cambios pendientes tras recarga).
 *
 * @param {{
 *   isOnline?: boolean,
 *   currentUid?: string | null,
 *   localBundle?: Partial<AcademicSyncBundle> | null,
 *   meta?: SyncMeta | null,
 * }} [options]
 * @returns {SyncState}
 */
export function createInitialSyncState({
    isOnline = true,
    currentUid = null,
    localBundle = null,
    meta = null,
} = {}) {
    const baseState = /** @type {SyncState} */ ({
        status: SYNC_STATUS.LOCAL,
        isOnline: Boolean(isOnline),
        syncRevision: meta?.syncRevision ?? null,
        lastSyncedHash: meta?.lastSyncedHash ?? null,
        lastSyncedUid: meta?.lastSyncedUid ?? null,
        lastSyncedAt: meta?.lastSyncedAt ?? null,
        pendingUploadHash: null,
        errorCode: null,
        errorMessage: null,
        conflict: null,
    });

    if (!currentUid) {
        return baseState;
    }

    return transitionSyncState(baseState, {
        type: 'REHYDRATED_FROM_STORAGE',
        currentUid,
        localBundle: canonicalizeAcademicBundle(localBundle),
        meta,
    });
}

/**
 * Función de transición pura de la máquina de estados de sincronización.
 *
 * Reglas clave:
 *  1. `isOnline` es una condición ortogonal: perder conexión nunca borra el estado `pending`.
 *  2. `account_mismatch` se mantiene estrictamente separado de `conflict`.
 *  3. `UPLOAD_SUCCEEDED` solo pasa a `synced` si `currentLocalHash === uploadedHash`;
 *     si hubo ediciones locales mientras la subida estaba en curso, el estado queda `pending`.
 *  4. `UPLOAD_FAILED` conserva el contenido local y nunca reporta `synced`.
 *  5. `REHYDRATED_FROM_STORAGE` mantiene consistencia tras recargas y entre múltiples pestañas.
 *
 * @param {SyncState} state
 * @param {SyncAction} action
 * @returns {SyncState}
 */
export function transitionSyncState(state, action) {
    switch (action.type) {
        case 'CONNECTIVITY_CHANGED': {
            return {
                ...state,
                isOnline: Boolean(action.isOnline),
            };
        }

        case 'LOCAL_MUTATED': {
            if (!action.isAuthenticated) {
                return {
                    ...state,
                    status: SYNC_STATUS.LOCAL,
                    errorCode: null,
                    errorMessage: null,
                };
            }

            // Si hay un bloqueo de identidad o conflicto activo, no lo ocultamos con una edición local.
            if (
                state.status === SYNC_STATUS.ACCOUNT_MISMATCH ||
                state.status === SYNC_STATUS.CONFLICT
            ) {
                return state;
            }

            // Si hay una subida en curso, mantenemos `syncing`; UPLOAD_SUCCEEDED decidirá
            // si el snapshot confirmado sigue coincidiendo o si debe quedar `pending`.
            if (state.status === SYNC_STATUS.SYNCING) {
                return state;
            }

            const matchesLastSynced =
                Boolean(state.lastSyncedHash) && action.localHash === state.lastSyncedHash;

            return {
                ...state,
                status: matchesLastSynced ? SYNC_STATUS.SYNCED : SYNC_STATUS.PENDING,
                errorCode: null,
                errorMessage: null,
            };
        }

        case 'CONCILIATION_EVALUATED': {
            const { conciliation, syncedAt = null } = action;
            const {
                outcome,
                localHash,
                remoteHash,
                localSummary,
                remoteSummary,
                remoteRevision,
                remoteBundle,
                previousUid,
                currentUid,
            } = conciliation;

            if (outcome === 'account_mismatch') {
                return {
                    ...state,
                    status: SYNC_STATUS.ACCOUNT_MISMATCH,
                    pendingUploadHash: null,
                    errorCode: null,
                    errorMessage: null,
                    conflict: {
                        reason: 'account_mismatch',
                        localHash,
                        remoteHash,
                        localSummary,
                        remoteSummary,
                        remoteRevision,
                        remoteBundle,
                        previousUid,
                        currentUid,
                    },
                };
            }

            if (outcome === 'conflict') {
                return {
                    ...state,
                    status: SYNC_STATUS.CONFLICT,
                    pendingUploadHash: null,
                    errorCode: null,
                    errorMessage: null,
                    conflict: {
                        reason: 'divergent_login',
                        localHash,
                        remoteHash,
                        localSummary,
                        remoteSummary,
                        remoteRevision,
                        remoteBundle,
                        previousUid,
                        currentUid,
                    },
                };
            }

            if (outcome === 'in_sync') {
                return {
                    ...state,
                    status: SYNC_STATUS.SYNCED,
                    syncRevision: remoteRevision,
                    lastSyncedHash: localHash,
                    lastSyncedUid: currentUid || state.lastSyncedUid,
                    lastSyncedAt: syncedAt ?? state.lastSyncedAt,
                    pendingUploadHash: null,
                    errorCode: null,
                    errorMessage: null,
                    conflict: null,
                };
            }

            if (outcome === 'adopt_remote') {
                return {
                    ...state,
                    status: SYNC_STATUS.SYNCED,
                    syncRevision: remoteRevision,
                    lastSyncedHash: remoteHash,
                    lastSyncedUid: currentUid || state.lastSyncedUid,
                    lastSyncedAt: syncedAt ?? state.lastSyncedAt,
                    pendingUploadHash: null,
                    errorCode: null,
                    errorMessage: null,
                    conflict: null,
                };
            }

            // outcome === 'keep_local_pending' (hay datos locales y la nube está vacía)
            return {
                ...state,
                status: SYNC_STATUS.PENDING,
                syncRevision: remoteRevision,
                pendingUploadHash: null,
                errorCode: null,
                errorMessage: null,
                conflict: null,
            };
        }

        case 'UPLOAD_STARTED': {
            return {
                ...state,
                status: SYNC_STATUS.SYNCING,
                pendingUploadHash: action.uploadingHash,
                errorCode: null,
                errorMessage: null,
            };
        }

        case 'UPLOAD_SUCCEEDED': {
            const hasConcurrentLocalEdits = action.currentLocalHash !== action.uploadedHash;
            return {
                ...state,
                status: hasConcurrentLocalEdits ? SYNC_STATUS.PENDING : SYNC_STATUS.SYNCED,
                syncRevision: action.newRevision,
                lastSyncedHash: action.uploadedHash,
                lastSyncedUid: action.uid,
                lastSyncedAt: action.syncedAt,
                pendingUploadHash: null,
                errorCode: null,
                errorMessage: null,
                conflict: null,
            };
        }

        case 'UPLOAD_CONFLICT': {
            return {
                ...state,
                status: SYNC_STATUS.CONFLICT,
                pendingUploadHash: null,
                errorCode: null,
                errorMessage: null,
                conflict: action.conflict,
            };
        }

        case 'UPLOAD_FAILED': {
            return {
                ...state,
                status: SYNC_STATUS.ERROR,
                pendingUploadHash: null,
                errorCode: action.errorCode,
                errorMessage: action.errorMessage,
            };
        }

        case 'CONFLICT_RESOLVED_REMOTE': {
            return {
                ...state,
                status: SYNC_STATUS.SYNCED,
                syncRevision: action.remoteRevision,
                lastSyncedHash: action.remoteHash,
                lastSyncedUid: action.uid,
                lastSyncedAt: action.syncedAt,
                pendingUploadHash: null,
                errorCode: null,
                errorMessage: null,
                conflict: null,
            };
        }

        case 'CONFLICT_RESOLVED_LOCAL': {
            return {
                ...state,
                status: SYNC_STATUS.PENDING,
                syncRevision:
                    action.baseRevision !== undefined ? action.baseRevision : state.syncRevision,
                pendingUploadHash: null,
                errorCode: null,
                errorMessage: null,
                conflict: null,
            };
        }

        case 'SIGNED_OUT': {
            // Al cerrar sesión conservamos `lastSyncedUid`, `lastSyncedHash` y `syncRevision`
            // para detectar cambios de cuenta en el mismo dispositivo sin borrar datos locales.
            return {
                ...state,
                status: SYNC_STATUS.LOCAL,
                pendingUploadHash: null,
                errorCode: null,
                errorMessage: null,
                conflict: null,
            };
        }

        case 'REHYDRATED_FROM_STORAGE': {
            const { currentUid, localBundle, meta } = action;
            const localHash = computeBundleHash(localBundle);
            const localEmpty = isAcademicBundleEmpty(localBundle);

            const nextRevision = meta?.syncRevision ?? state.syncRevision;
            const nextLastHash = meta?.lastSyncedHash ?? state.lastSyncedHash;
            const nextLastUid = meta?.lastSyncedUid ?? state.lastSyncedUid;
            const nextLastAt = meta?.lastSyncedAt ?? state.lastSyncedAt;

            if (!currentUid) {
                return {
                    ...state,
                    status: SYNC_STATUS.LOCAL,
                    syncRevision: nextRevision,
                    lastSyncedHash: nextLastHash,
                    lastSyncedUid: nextLastUid,
                    lastSyncedAt: nextLastAt,
                    pendingUploadHash: null,
                    conflict: null,
                };
            }

            // Protección multi-pestaña y post-recarga por cambio de cuenta
            if (nextLastUid && nextLastUid !== currentUid && !localEmpty) {
                return {
                    ...state,
                    status: SYNC_STATUS.ACCOUNT_MISMATCH,
                    syncRevision: nextRevision,
                    lastSyncedHash: nextLastHash,
                    lastSyncedUid: nextLastUid,
                    lastSyncedAt: nextLastAt,
                    pendingUploadHash: null,
                    conflict: state.conflict ?? {
                        reason: 'account_mismatch',
                        localHash,
                        remoteHash: null,
                        localSummary: summarizeAcademicBundle(localBundle),
                        remoteSummary: null,
                        remoteRevision: null,
                        remoteBundle: null,
                        previousUid: nextLastUid,
                        currentUid,
                    },
                };
            }

            // Si otra pestaña ya resolvió un conflicto/mismatch y sincronizó con la cuenta actual,
            // esta pestaña adopta el estado sincronizado con la nueva revisión.
            const syncedByCurrentUser =
                Boolean(nextLastHash) &&
                localHash === nextLastHash &&
                (!nextLastUid || nextLastUid === currentUid);

            if (syncedByCurrentUser) {
                return {
                    ...state,
                    status: SYNC_STATUS.SYNCED,
                    syncRevision: nextRevision,
                    lastSyncedHash: nextLastHash,
                    lastSyncedUid: nextLastUid || currentUid,
                    lastSyncedAt: nextLastAt,
                    pendingUploadHash: null,
                    errorCode: null,
                    errorMessage: null,
                    conflict: null,
                };
            }

            // Si había conflicto local sin resolver en esta pestaña y no fue resuelto por otra, lo conservamos.
            if (state.status === SYNC_STATUS.CONFLICT && state.conflict) {
                return {
                    ...state,
                    syncRevision: nextRevision,
                    lastSyncedHash: nextLastHash,
                    lastSyncedUid: nextLastUid,
                    lastSyncedAt: nextLastAt,
                };
            }

            // Si hay cambios locales no reflejados en `lastSyncedHash` (o datos sin haber subido nunca),
            // el estado permanece `pending` tras recargar o editar desde otra pestaña.
            if (!localEmpty || (nextLastHash && localHash !== nextLastHash)) {
                return {
                    ...state,
                    status: SYNC_STATUS.PENDING,
                    syncRevision: nextRevision,
                    lastSyncedHash: nextLastHash,
                    lastSyncedUid: nextLastUid,
                    lastSyncedAt: nextLastAt,
                    pendingUploadHash: null,
                };
            }

            return {
                ...state,
                status: SYNC_STATUS.SYNCED,
                syncRevision: nextRevision,
                lastSyncedHash: nextLastHash ?? localHash,
                lastSyncedUid: nextLastUid ?? currentUid,
                lastSyncedAt: nextLastAt,
                pendingUploadHash: null,
            };
        }

        default:
            return state;
    }
}
