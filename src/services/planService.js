/**
 * Servicio para gestionar los planes de estudio, materias y equivalencias
 * con carga dinámica real (code-splitting por carrera), caché local versionado
 * (Stale-While-Revalidate contra `catalog_meta/index` y `catalog_plans/{planId}`)
 * y reconciliación no destructiva del progreso estudiantil ante nuevas versiones.
 */

import { doc, getDoc } from 'firebase/firestore';
import {
    CAREERS_REGISTRY,
    getCareerByPlan,
    getCareerPrefix,
    getPlanEntry,
    mergeDynamicCatalogCareers,
    normalizePlanNumber,
} from '../config/careersRegistry';
import { reconciliarProgresoConNuevaVersionPlan } from '../utils/Plan/planMigration';
import { normalizarPlanCanonico, validarPlanEstudios } from '../utils/Plan/planValidator';
import { db } from './firebase';
import storageRepository from './storageRepository';

/** @typedef {import('../types/domain').CareerConfig} CareerConfig */
/** @typedef {import('../types/domain').PlanData} PlanData */
/** @typedef {import('../types/domain').Materia} Materia */
/** @typedef {import('../types/domain').EquivalenciasMap} EquivalenciasMap */
/** @typedef {import('../types/domain').PublishedPlanSnapshot} PublishedPlanSnapshot */
/** @typedef {import('../types/domain').CatalogMetaEntry} CatalogMetaEntry */

export const DEFAULT_CATALOG_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

/**
 * @param {CareerConfig[]} [registry]
 * @param {{
 *   storageRepo?: typeof storageRepository,
 *   ttlMs?: number,
 *   enableRemoteCheck?: boolean,
 *   fetchRemoteCatalogMeta?: () => Promise<Record<string, CatalogMetaEntry> | null>,
 *   fetchRemotePublishedPlan?: (planNumero: string) => Promise<PublishedPlanSnapshot | null>,
 * }} [options]
 */
export function createPlanService(registry = CAREERS_REGISTRY, options = {}) {
    const {
        storageRepo = storageRepository,
        ttlMs = DEFAULT_CATALOG_TTL_MS,
        enableRemoteCheck = true,
        fetchRemoteCatalogMeta,
        fetchRemotePublishedPlan,
    } = options;

    /** @type {Map<string, PlanData[]>} */
    const careerCache = new Map();
    /** @type {Map<string, EquivalenciasMap>} */
    const equivalenciasCache = new Map();
    /** @type {Promise<Record<string, CatalogMetaEntry> | null> | null} */
    let inFlightMetaCheck = null;

    /**
     * Lee `catalog_meta/index` desde Firestore (o mediante el fetcher inyectado en tests).
     * @returns {Promise<Record<string, CatalogMetaEntry> | null>}
     */
    async function defaultFetchRemoteMeta() {
        if (typeof fetchRemoteCatalogMeta === 'function') {
            return fetchRemoteCatalogMeta();
        }
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            return null;
        }
        if (!db) return null;
        try {
            const snap = await getDoc(doc(db, 'catalog_meta', 'index'));
            if (!snap.exists()) return null;
            const data = snap.data();
            if (!data || typeof data.plans !== 'object') return null;
            return /** @type {Record<string, CatalogMetaEntry>} */ (data.plans);
        } catch {
            return null;
        }
    }

    /**
     * Lee `catalog_plans/{planNumero}` desde Firestore (o mediante el fetcher inyectado).
     * @param {string} planNumero
     * @returns {Promise<PublishedPlanSnapshot | null>}
     */
    async function defaultFetchRemotePlan(planNumero) {
        if (typeof fetchRemotePublishedPlan === 'function') {
            return fetchRemotePublishedPlan(planNumero);
        }
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            return null;
        }
        if (!db) return null;
        try {
            const snap = await getDoc(doc(db, 'catalog_plans', planNumero));
            if (!snap.exists()) return null;
            const data = snap.data();
            if (!data || typeof data.version !== 'number' || !Array.isArray(data.materias)) {
                return null;
            }
            return /** @type {PublishedPlanSnapshot} */ ({
                plan_numero: String(data.plan_numero || planNumero),
                carrera: typeof data.carrera === 'string' ? data.carrera : undefined,
                version: data.version,
                materias: data.materias,
                changelogMessage:
                    typeof data.changelogMessage === 'string' ? data.changelogMessage : null,
                codeMappings:
                    data.codeMappings && typeof data.codeMappings === 'object'
                        ? data.codeMappings
                        : null,
            });
        } catch {
            return null;
        }
    }

    /**
     * Aplica un snapshot publicado válido en el caché local y reconcilia de forma
     * no destructiva el progreso/detalles/cursada del estudiante, registrando la
     * notificación con el motivo del cambio (`changelogMessage`).
     *
     * @param {PublishedPlanSnapshot} snapshot
     * @returns {PlanData | null}
     */
    function applyPublishedPlanSnapshot(snapshot) {
        const normalizedPlanNum = normalizePlanNumber(snapshot?.plan_numero);
        if (!normalizedPlanNum) return null;

        const validacion = validarPlanEstudios({
            plan_numero: normalizedPlanNum,
            carrera: snapshot.carrera,
            version: snapshot.version,
            materias: snapshot.materias,
        });

        if (!validacion.ok || !validacion.planNormalizado) {
            return null;
        }

        const cachedPrev = storageRepo.getCachedPublishedPlan(normalizedPlanNum);
        const versionAnterior = cachedPrev?.appliedVersion ?? cachedPrev?.version ?? 1;

        if (snapshot.version > versionAnterior) {
            const currentProgreso = storageRepo.getProgreso(normalizedPlanNum, null);
            const currentDetalles = storageRepo.getProgresoDetalles(normalizedPlanNum, null);
            const currentCursada = storageRepo.getCursada(normalizedPlanNum, null);

            const migracion = reconciliarProgresoConNuevaVersionPlan({
                planNumero: normalizedPlanNum,
                nuevoPlan: validacion.planNormalizado,
                versionNueva: snapshot.version,
                versionAnterior,
                codeMappings: snapshot.codeMappings || null,
                changelogMessage: snapshot.changelogMessage || null,
                progreso: currentProgreso,
                progresoDetalles: currentDetalles,
                cursada: currentCursada,
            });

            if (migracion.applied) {
                if (currentProgreso) {
                    storageRepo.setProgreso(normalizedPlanNum, migracion.progreso, {
                        silent: true,
                    });
                }
                if (currentDetalles) {
                    storageRepo.setProgresoDetalles(
                        normalizedPlanNum,
                        migracion.progresoDetalles,
                        { silent: true },
                    );
                }
                if (currentCursada && migracion.cursada) {
                    storageRepo.setCursada(normalizedPlanNum, migracion.cursada, {
                        silent: true,
                    });
                }
                if (migracion.notice) {
                    storageRepo.setPlanUpdateNotice(normalizedPlanNum, migracion.notice);
                }
            }
        }

        const snapshotToStore = {
            ...snapshot,
            plan_numero: normalizedPlanNum,
            materias: validacion.planNormalizado.materias,
            appliedVersion: snapshot.version,
        };
        storageRepo.setCachedPublishedPlan(normalizedPlanNum, snapshotToStore, {
            silent: true,
        });

        return {
            plan_numero: normalizedPlanNum,
            carrera: snapshot.carrera,
            version: snapshot.version,
            materias: validacion.planNormalizado.materias,
        };
    }

    /**
     * Revalida en segundo plano (con TTL) si existe una versión nueva del plan en Firestore.
     * Solo descarga `catalog_plans/{plan}` si `remoteVersion > localVersion`.
     *
     * @param {string} normalizedPlanNum
     * @param {{ force?: boolean, hasStaticFallback?: boolean }} [opts]
     * @returns {Promise<PlanData | null>}
     */
    async function revalidatePlanIfStale(
        normalizedPlanNum,
        { force = false, hasStaticFallback = true } = {},
    ) {
        if (!enableRemoteCheck) return null;

        const now = Date.now();
        const metaCache = storageRepo.getCatalogMetaCache();
        const isFresh =
            !force &&
            metaCache &&
            typeof metaCache.checkedAt === 'number' &&
            now - metaCache.checkedAt < ttlMs;

        /** @type {Record<string, CatalogMetaEntry> | null} */
        let plansMeta = isFresh ? metaCache.plans : null;

        if (!plansMeta) {
            if (!inFlightMetaCheck) {
                inFlightMetaCheck = defaultFetchRemoteMeta().finally(() => {
                    inFlightMetaCheck = null;
                });
            }
            plansMeta = await inFlightMetaCheck;
            if (plansMeta) {
                storageRepo.setCatalogMetaCache(
                    {
                        checkedAt: now,
                        plans: plansMeta,
                    },
                    { silent: true },
                );
            }
        }

        const remoteEntry = plansMeta?.[normalizedPlanNum];
        if (!remoteEntry || typeof remoteEntry.version !== 'number') {
            return null;
        }

        const cachedLocal = storageRepo.getCachedPublishedPlan(normalizedPlanNum);
        const localVersion = cachedLocal?.version ?? (hasStaticFallback ? 1 : 0);

        if (remoteEntry.version <= localVersion) {
            return null;
        }

        const remoteSnapshot = await defaultFetchRemotePlan(normalizedPlanNum);
        if (!remoteSnapshot || remoteSnapshot.version <= localVersion) {
            return null;
        }

        const applied = applyPublishedPlanSnapshot(remoteSnapshot);
        if (applied && typeof window !== 'undefined') {
            try {
                window.dispatchEvent(new Event('progress-hydrated'));
            } catch {
                // entorno sin window.dispatchEvent
            }
        }
        return applied;
    }

    /**
     * @param {CareerConfig | null} career
     * @returns {Promise<PlanData[]>}
     */
    async function loadCareerPlans(career) {
        if (!career || typeof career.loadPlans !== 'function') return [];

        const cacheKey = career.id || career.planPrefix;
        const cached = careerCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const mod = await career.loadPlans();
        /** @type {PlanData[]} */
        const rawPlans = Array.isArray(mod) ? mod : (mod?.default || []);
        const plans = rawPlans.map((p) => {
            const normalized = normalizarPlanCanonico(p);
            return career.name && !normalized.carrera
                ? { ...normalized, carrera: career.name }
                : normalized;
        });
        careerCache.set(cacheKey, plans);
        return plans;
    }

    return {
        /**
         * Obtiene un plan completo (con materias) de forma asíncrona:
         * 1. Si hay una versión publicada válida en `storageRepository`, la devuelve al instante.
         * 2. Si no, devuelve el JSON base empaquetado con code-splitting por carrera.
         * 3. Dispara en segundo plano `revalidatePlanIfStale` respetando el TTL (Stale-While-Revalidate).
         * @param {string | null | undefined} planNumber - Número del plan (ej: "17.14")
         * @returns {Promise<PlanData | null>}
         */
        async getPlanByNumber(planNumber) {
            const normalized = normalizePlanNumber(planNumber);
            if (!normalized) return null;

            const effectiveRegistry = mergeDynamicCatalogCareers(
                storageRepo.getCatalogMetaCache()?.plans,
                registry,
            );
            const career = getCareerByPlan(normalized, effectiveRegistry);

            const cachedPublished = storageRepo.getCachedPublishedPlan(normalized);
            if (cachedPublished) {
                void revalidatePlanIfStale(normalized, { hasStaticFallback: true });
                return {
                    plan_numero: cachedPublished.plan_numero,
                    carrera: cachedPublished.carrera || career?.name,
                    version: cachedPublished.version,
                    materias: cachedPublished.materias,
                };
            }

            const plans = await loadCareerPlans(career);
            const staticPlan = plans.find((p) => p.plan_numero === normalized) ?? null;

            if (staticPlan) {
                void revalidatePlanIfStale(normalized, { hasStaticFallback: true });
                return staticPlan;
            }

            return await revalidatePlanIfStale(normalized, { hasStaticFallback: false });
        },

        applyPublishedPlanSnapshot,
        revalidatePlanIfStale,

        /**
         * Obtiene el listado de materias de un plan específico de forma asíncrona.
         * @param {string} planNumber - Número del plan
         * @returns {Promise<Materia[]>}
         */
        async getMateriasByPlan(planNumber) {
            const planData = await this.getPlanByNumber(planNumber);
            if (!planData) {
                throw new Error(`El plan "${planNumber}" no existe o no pudo ser cargado.`);
            }
            return planData.materias;
        },

        /**
         * Carga dinámicamente el mapa de equivalencias configurado para un plan (si existe).
         * @param {string | null | undefined} planNumber
         * @returns {Promise<EquivalenciasMap>}
         */
        async getEquivalenciasByPlan(planNumber) {
            const normalized = normalizePlanNumber(planNumber);
            if (!normalized) return {};

            const planEntry = getPlanEntry(normalized, registry);
            const loader =
                planEntry?.equivalencias?.loadData ||
                planEntry?.transition?.loadEquivalencias ||
                null;

            if (typeof loader !== 'function') return {};

            const sourcePlan = planEntry?.equivalencias?.sourcePlan || planEntry?.transition?.sourcePlan || normalized;
            const targetPlan = planEntry?.equivalencias?.targetPlan || planEntry?.transition?.targetPlan || normalized;
            const cacheKey = `${planEntry?.careerId || getCareerPrefix(normalized) || 'plan'}:${sourcePlan}->${targetPlan}`;

            const cached = equivalenciasCache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const mod = await loader();
            /** @type {EquivalenciasMap} */
            const data =
                mod && typeof mod === 'object' && 'default' in mod && mod.default
                    ? /** @type {EquivalenciasMap} */ (mod.default)
                    : /** @type {EquivalenciasMap} */ (mod || {});
            equivalenciasCache.set(cacheKey, data);
            return data;
        },

        /**
         * Devuelve todos los planes registrados cargando dinámicamente cada carrera.
         * @returns {Promise<PlanData[]>}
         */
        async getAllPlans() {
            const results = await Promise.all(
                registry
                    .filter((career) => typeof career.loadPlans === 'function')
                    .map((career) => loadCareerPlans(career)),
            );
            return results.flat();
        },

        /**
         * Limpia los cachés en memoria (útil en tests).
         * @returns {void}
         */
        clearCache() {
            careerCache.clear();
            equivalenciasCache.clear();
        },
    };
}

const planService = createPlanService(CAREERS_REGISTRY);

export default planService;
