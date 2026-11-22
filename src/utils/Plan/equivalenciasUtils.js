/**
 * @typedef {import('../../types/domain').EquivalenciaValidationStatus} EquivalenciaValidationStatus
 * @typedef {import('../../types/domain').EquivalenciaApplicationMode} EquivalenciaApplicationMode
 * @typedef {import('../../types/domain').EquivalenciaRequiredState} EquivalenciaRequiredState
 * @typedef {import('../../types/domain').EquivalenciaUsagePolicy} EquivalenciaUsagePolicy
 * @typedef {import('../../types/domain').EquivalenciaAccreditationMode} EquivalenciaAccreditationMode
 * @typedef {import('../../types/domain').EquivalenciaAccreditationStatus} EquivalenciaAccreditationStatus
 * @typedef {import('../../types/domain').EquivalenciaEvaluationReason} EquivalenciaEvaluationReason
 * @typedef {import('../../types/domain').EquivalenciaSourceMeta} EquivalenciaSourceMeta
 * @typedef {import('../../types/domain').EquivalenciaConditionGroup} EquivalenciaConditionGroup
 * @typedef {import('../../types/domain').EquivalenciaRule} EquivalenciaRule
 * @typedef {import('../../types/domain').EquivalenciaRuleEntry} EquivalenciaRuleEntry
 * @typedef {import('../../types/domain').EquivalenciasCatalogMap} EquivalenciasCatalogMap
 * @typedef {import('../../types/domain').EquivalenciaProgresoEntry} EquivalenciaProgresoEntry
 * @typedef {import('../../types/domain').EquivalenciaEvaluationResult} EquivalenciaEvaluationResult
 * @typedef {import('../../types/domain').EquivalenciaAccreditationResult} EquivalenciaAccreditationResult
 * @typedef {import('../../types/domain').EquivalenciaSourceAllocation} EquivalenciaSourceAllocation
 * @typedef {import('../../types/domain').EquivalenciaAdvisoryConflict} EquivalenciaAdvisoryConflict
 * @typedef {import('../../types/domain').EquivalenciasTrajectoryResult} EquivalenciasTrajectoryResult
 */

export const EQUIVALENCIA_VALIDATION_STATUS = Object.freeze({
    CONFIRMED: /** @type {EquivalenciaValidationStatus} */ ('confirmed'),
    PENDING_CONFIRMATION: /** @type {EquivalenciaValidationStatus} */ ('pending_confirmation'),
});

export const EQUIVALENCIA_APPLICATION_MODE = Object.freeze({
    AUTOMATIC: /** @type {EquivalenciaApplicationMode} */ ('automatic'),
    ADVISORY: /** @type {EquivalenciaApplicationMode} */ ('advisory'),
});

export const EQUIVALENCIA_USAGE_POLICY = Object.freeze({
    EXCLUSIVE: /** @type {EquivalenciaUsagePolicy} */ ('exclusive'),
    SHARED: /** @type {EquivalenciaUsagePolicy} */ ('shared'),
});

export const EQUIVALENCIA_ACCREDITATION_MODE = Object.freeze({
    CONSOLIDATED: /** @type {EquivalenciaAccreditationMode} */ ('consolidated'),
    PROJECTION_WITH_ADVISORY: /** @type {EquivalenciaAccreditationMode} */ ('projection_with_advisory'),
});

export const DEFAULT_ADVISORY_MESSAGE = 'Posible equivalencia · confirmar con UNLu';

const APPROVED_STATES = new Set(['aprobado', 'aprobada', 'promocionado', 'promocionada']);
const SIMULADOR_CURSADO_STATES = new Set(['cursado', 'cursada']);
const REGULAR_OR_HIGHER_STATES = new Set([
    'aprobado',
    'aprobada',
    'promocionado',
    'promocionada',
    'regular',
    'cursado',
    'cursada',
]);

/**
 * Extracts a raw state string from either a flat `EstadoMateria` / `EstadoSimulador`
 * string entry or a structured `{ estado }` record.
 *
 * @param {EquivalenciaProgresoEntry} entry
 * @returns {string | null}
 */
function extractAcademicState(entry) {
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry === 'object' && typeof entry.estado === 'string') {
        return entry.estado;
    }
    return null;
}

/**
 * Clones a progress map without mutating the input and projects any real optative codes
 * recorded in `progresoDetalles[slot].codigoOptativa` (e.g. `OP1` -> `21420`) along with
 * deduplicated `optativeCodes` so shared equivalence evaluation prevents double-counting.
 *
 * @param {Record<string, EquivalenciaProgresoEntry>} [progreso={}]
 * @param {Record<string, { codigoOptativa?: string | null } | null | undefined>} [progresoDetalles={}]
 * @returns {{ progreso: Record<string, EquivalenciaProgresoEntry>, optativeCodes: string[] }}
 */
export function augmentProgresoWithOptativas(progreso = {}, progresoDetalles = {}) {
    /** @type {Record<string, EquivalenciaProgresoEntry>} */
    const enriched = { ...(progreso || {}) };
    /** @type {string[]} */
    const optativeCodes = [];
    /** @type {Set<string>} */
    const seen = new Set();

    if (progresoDetalles && typeof progresoDetalles === 'object') {
        for (const [slotCode, detalle] of Object.entries(progresoDetalles)) {
            const codigoOptativa =
                typeof detalle?.codigoOptativa === 'string' ? detalle.codigoOptativa.trim() : '';
            if (!codigoOptativa) continue;

            const slotEntry = enriched[slotCode];
            if (slotEntry !== undefined && slotEntry !== null) {
                if (enriched[codigoOptativa] === undefined) {
                    enriched[codigoOptativa] = slotEntry;
                }
                if (!seen.has(codigoOptativa)) {
                    seen.add(codigoOptativa);
                    optativeCodes.push(codigoOptativa);
                }
            }
        }
    }

    return { progreso: enriched, optativeCodes };
}

/**
 * Checks whether a course's academic state satisfies a rule's requirement.
 * Simulator `Cursado` only counts as approved when `treatSimuladorCursadoAsApproved` is enabled;
 * real-transcript `Regular` never counts as approved.
 *
 * @param {EquivalenciaProgresoEntry} estado
 * @param {EquivalenciaRequiredState} [requiredState='approved']
 * @param {{ treatSimuladorCursadoAsApproved?: boolean }} [options]
 * @returns {boolean}
 */
export function isAcademicStateSatisfied(estado, requiredState = 'approved', options = {}) {
    const rawEstado = extractAcademicState(estado);
    const normalized = String(rawEstado ?? '').trim().toLowerCase();
    if (!normalized) return false;

    if (requiredState === 'regular') {
        return REGULAR_OR_HIGHER_STATES.has(normalized);
    }

    if (APPROVED_STATES.has(normalized)) {
        return true;
    }

    return Boolean(options?.treatSimuladorCursadoAsApproved && SIMULADOR_CURSADO_STATES.has(normalized));
}

/**
 * @param {unknown} rawGroup
 * @returns {EquivalenciaConditionGroup | null}
 */
function normalizeConditionGroup(rawGroup) {
    if (!rawGroup || typeof rawGroup !== 'object') return null;
    const candidate = /** @type {Partial<EquivalenciaConditionGroup>} */ (rawGroup);
    const rawCodes = Array.isArray(candidate.allOf) ? candidate.allOf : [];
    /** @type {string[]} */
    const allOf = [];
    /** @type {Set<string>} */
    const seen = new Set();

    for (const item of rawCodes) {
        const code = String(item ?? '').trim();
        if (code && !seen.has(code)) {
            seen.add(code);
            allOf.push(code);
        }
    }

    if (allOf.length === 0) return null;

    /** @type {EquivalenciaConditionGroup} */
    const group = { allOf };
    if (typeof candidate.sourcePlan === 'string' && candidate.sourcePlan.trim()) {
        group.sourcePlan = candidate.sourcePlan.trim();
    }
    if (typeof candidate.historical === 'boolean') {
        group.historical = candidate.historical;
    }
    if (typeof candidate.label === 'string' && candidate.label.trim()) {
        group.label = candidate.label.trim();
    }
    if (typeof candidate.note === 'string' && candidate.note.trim()) {
        group.note = candidate.note.trim();
    }
    return group;
}

/**
 * @param {unknown} rawSource
 * @returns {EquivalenciaSourceMeta | undefined}
 */
function normalizeSourceMeta(rawSource) {
    if (!rawSource || typeof rawSource !== 'object') return undefined;
    const src = /** @type {EquivalenciaSourceMeta} */ (rawSource);
    /** @type {EquivalenciaSourceMeta} */
    const out = {};
    if (typeof src.resolution === 'string' && src.resolution.trim()) out.resolution = src.resolution.trim();
    if (typeof src.annex === 'string' && src.annex.trim()) out.annex = src.annex.trim();
    if (typeof src.section === 'string' && src.section.trim()) out.section = src.section.trim();
    if (typeof src.note === 'string' && src.note.trim()) out.note = src.note.trim();
    return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Normalizes a legacy `string[]` or enriched equivalence rule into the canonical `EquivalenciaRule` shape.
 *
 * @param {string} targetCode
 * @param {EquivalenciaRuleEntry | EquivalenciaRule} rawEntry
 * @param {{ sourcePlan?: string, targetPlan?: string }} [defaults]
 * @returns {EquivalenciaRule}
 */
export function normalizeEquivalenciaRule(targetCode, rawEntry, defaults = {}) {
    const defaultSourcePlan = String(defaults.sourcePlan || '17.13');
    const defaultTargetPlan = String(defaults.targetPlan || '17.14');
    const normalizedTargetCode = String(targetCode ?? '').trim();

    if (Array.isArray(rawEntry)) {
        const group = normalizeConditionGroup({ allOf: rawEntry });
        return {
            targetCode: normalizedTargetCode,
            sourcePlan: defaultSourcePlan,
            targetPlan: defaultTargetPlan,
            requiredAcademicState: 'approved',
            condition: { anyOf: group ? [group] : [] },
            validationStatus: EQUIVALENCIA_VALIDATION_STATUS.CONFIRMED,
            applicationMode: EQUIVALENCIA_APPLICATION_MODE.AUTOMATIC,
            usagePolicy: EQUIVALENCIA_USAGE_POLICY.EXCLUSIVE,
            priority: 100,
            isLegacyArray: true,
        };
    }

    const entry = /** @type {Partial<EquivalenciaRule>} */ (
        rawEntry && typeof rawEntry === 'object' ? rawEntry : {}
    );
    const resolvedTarget = String(entry.targetCode ?? normalizedTargetCode).trim();
    const resolvedSourcePlan =
        typeof entry.sourcePlan === 'string' && entry.sourcePlan.trim()
            ? entry.sourcePlan.trim()
            : defaultSourcePlan;
    const resolvedTargetPlan =
        typeof entry.targetPlan === 'string' && entry.targetPlan.trim()
            ? entry.targetPlan.trim()
            : defaultTargetPlan;

    const rawAnyOf = Array.isArray(entry.condition?.anyOf)
        ? entry.condition.anyOf
        : Array.isArray(entry.anyOf)
          ? entry.anyOf
          : [];

    /** @type {EquivalenciaConditionGroup[]} */
    const groups = [];
    for (const rawGroup of rawAnyOf) {
        const normalizedGroup = normalizeConditionGroup(rawGroup);
        if (normalizedGroup) {
            groups.push(normalizedGroup);
        }
    }

    /** @type {EquivalenciaValidationStatus} */
    const validationStatus =
        entry.validationStatus === EQUIVALENCIA_VALIDATION_STATUS.PENDING_CONFIRMATION
            ? EQUIVALENCIA_VALIDATION_STATUS.PENDING_CONFIRMATION
            : EQUIVALENCIA_VALIDATION_STATUS.CONFIRMED;

    /** @type {EquivalenciaApplicationMode} */
    const applicationMode =
        entry.applicationMode === EQUIVALENCIA_APPLICATION_MODE.ADVISORY
            ? EQUIVALENCIA_APPLICATION_MODE.ADVISORY
            : entry.applicationMode === EQUIVALENCIA_APPLICATION_MODE.AUTOMATIC
              ? EQUIVALENCIA_APPLICATION_MODE.AUTOMATIC
              : validationStatus === EQUIVALENCIA_VALIDATION_STATUS.PENDING_CONFIRMATION
                ? EQUIVALENCIA_APPLICATION_MODE.ADVISORY
                : EQUIVALENCIA_APPLICATION_MODE.AUTOMATIC;

    /** @type {EquivalenciaUsagePolicy} */
    const usagePolicy =
        entry.usagePolicy === EQUIVALENCIA_USAGE_POLICY.SHARED
            ? EQUIVALENCIA_USAGE_POLICY.SHARED
            : EQUIVALENCIA_USAGE_POLICY.EXCLUSIVE;

    const priority =
        typeof entry.priority === 'number' && Number.isFinite(entry.priority) ? entry.priority : 100;

    /** @type {EquivalenciaRule} */
    const normalized = {
        targetCode: resolvedTarget,
        sourcePlan: resolvedSourcePlan,
        targetPlan: resolvedTargetPlan,
        requiredAcademicState: entry.requiredAcademicState === 'regular' ? 'regular' : 'approved',
        condition: { anyOf: groups },
        validationStatus,
        applicationMode,
        usagePolicy,
        priority,
        isLegacyArray: Boolean(entry.isLegacyArray),
    };

    if (typeof entry.advisoryMessage === 'string' && entry.advisoryMessage.trim()) {
        normalized.advisoryMessage = entry.advisoryMessage.trim();
    }
    if (typeof entry.notas === 'string' && entry.notas.trim()) {
        normalized.notas = entry.notas.trim();
    }
    const sourceMeta = normalizeSourceMeta(entry.source);
    if (sourceMeta) {
        normalized.source = sourceMeta;
    }

    return normalized;
}

/**
 * Normalizes an entire equivalencias catalog map keyed by target code.
 *
 * @param {EquivalenciasCatalogMap | Record<string, EquivalenciaRule>} [rawCatalog={}]
 * @param {{ sourcePlan?: string, targetPlan?: string }} [defaults={}]
 * @returns {Record<string, EquivalenciaRule>}
 */
export function normalizeEquivalenciasCatalog(rawCatalog = {}, defaults = {}) {
    /** @type {Record<string, EquivalenciaRule>} */
    const catalog = {};
    if (!rawCatalog || typeof rawCatalog !== 'object') return catalog;

    for (const [key, entry] of Object.entries(rawCatalog)) {
        const rule = normalizeEquivalenciaRule(key, entry, defaults);
        if (rule.targetCode) {
            catalog[rule.targetCode] = rule;
        }
    }

    return catalog;
}

/**
 * Extracts unique source course codes referenced by a rule's eligible branches.
 *
 * @param {EquivalenciaRuleEntry | EquivalenciaRule} rawRuleOrEntry
 * @param {{ sourcePlan?: string | null, includeHistorical?: boolean, defaults?: { sourcePlan?: string, targetPlan?: string } }} [options={}]
 * @returns {string[]}
 */
export function getRuleSourceCodes(rawRuleOrEntry, options = {}) {
    const rule =
        rawRuleOrEntry &&
        typeof rawRuleOrEntry === 'object' &&
        !Array.isArray(rawRuleOrEntry) &&
        rawRuleOrEntry.condition &&
        typeof rawRuleOrEntry.targetCode === 'string' &&
        typeof rawRuleOrEntry.sourcePlan === 'string'
            ? /** @type {EquivalenciaRule} */ (rawRuleOrEntry)
            : normalizeEquivalenciaRule('', rawRuleOrEntry, options.defaults);

    const filterPlan = typeof options.sourcePlan === 'string' && options.sourcePlan.trim()
        ? options.sourcePlan.trim()
        : null;
    const includeHistorical = Boolean(options.includeHistorical);

    /** @type {string[]} */
    const codes = [];
    /** @type {Set<string>} */
    const seen = new Set();

    for (const group of rule.condition.anyOf) {
        const effectivePlan = group.sourcePlan || rule.sourcePlan;
        if (filterPlan && effectivePlan !== filterPlan) continue;
        if (group.historical && !includeHistorical) continue;

        for (const code of group.allOf) {
            if (!seen.has(code)) {
                seen.add(code);
                codes.push(code);
            }
        }
    }

    return codes;
}

/**
 * Evaluates whether a trajectory satisfies an equivalence rule structurally and academically,
 * without deciding whether the result should be accredited automatically.
 *
 * @param {EquivalenciaRuleEntry | EquivalenciaRule} rawRuleOrEntry
 * @param {{ sourcePlan?: string, targetPlan?: string, progreso?: Record<string, EquivalenciaProgresoEntry> }} [trajectory={}]
 * @param {{
 *   targetCode?: string,
 *   defaultSourcePlan?: string,
 *   defaultTargetPlan?: string,
 *   treatSimuladorCursadoAsApproved?: boolean,
 *   includeHistoricalBranches?: boolean,
 *   excludedSourceCodes?: Iterable<string> | null
 * }} [options={}]
 * @returns {EquivalenciaEvaluationResult}
 */
export function evaluateEquivalenciaRule(rawRuleOrEntry, trajectory = {}, options = {}) {
    const defaultSourcePlan = options.defaultSourcePlan || '17.13';
    const defaultTargetPlan = options.defaultTargetPlan || '17.14';
    const rule = normalizeEquivalenciaRule(options.targetCode || '', rawRuleOrEntry, {
        sourcePlan: defaultSourcePlan,
        targetPlan: defaultTargetPlan,
    });

    const trajectorySourcePlan = trajectory.sourcePlan || defaultSourcePlan;
    const trajectoryTargetPlan = trajectory.targetPlan || defaultTargetPlan;
    const progreso = trajectory.progreso || {};
    const includeHistoricalBranches = Boolean(options.includeHistoricalBranches);
    const treatSimuladorCursadoAsApproved = Boolean(options.treatSimuladorCursadoAsApproved);
    const excludedSet = new Set(options.excludedSourceCodes ? options.excludedSourceCodes : []);

    const isAdvisory =
        rule.validationStatus === EQUIVALENCIA_VALIDATION_STATUS.PENDING_CONFIRMATION ||
        rule.applicationMode === EQUIVALENCIA_APPLICATION_MODE.ADVISORY;
    const advisoryMessage = isAdvisory ? rule.advisoryMessage || DEFAULT_ADVISORY_MESSAGE : null;

    /**
     * @param {boolean} satisfied
     * @param {EquivalenciaEvaluationReason} reason
     * @param {{
     *   matchedGroup?: EquivalenciaConditionGroup | null,
     *   matchedSourceCodes?: string[],
     *   evaluatedSourceCodes?: string[],
     *   blockedByConsumedCodes?: string[],
     *   missingByGroup?: Array<{ group: EquivalenciaConditionGroup, missingCodes: string[], consumedCodes: string[] }>
     * }} [details]
     * @returns {EquivalenciaEvaluationResult}
     */
    const buildResult = (satisfied, reason, details = {}) => ({
        targetCode: rule.targetCode,
        sourcePlan: rule.sourcePlan,
        targetPlan: rule.targetPlan,
        requiredAcademicState: rule.requiredAcademicState,
        satisfied,
        reason,
        matchedGroup: details.matchedGroup ?? null,
        matchedSourceCodes: details.matchedSourceCodes ?? [],
        evaluatedSourceCodes: details.evaluatedSourceCodes ?? [],
        blockedByConsumedCodes: details.blockedByConsumedCodes ?? [],
        missingByGroup: details.missingByGroup ?? [],
        validationStatus: rule.validationStatus,
        applicationMode: rule.applicationMode,
        usagePolicy: rule.usagePolicy || EQUIVALENCIA_USAGE_POLICY.EXCLUSIVE,
        priority: rule.priority ?? 100,
        isAdvisory,
        advisoryMessage,
        notas: rule.notas ?? null,
        source: rule.source ?? null,
        rule,
    });

    if (rule.sourcePlan !== trajectorySourcePlan) {
        return buildResult(false, 'source_plan_mismatch');
    }
    if (rule.targetPlan !== trajectoryTargetPlan) {
        return buildResult(false, 'target_plan_mismatch');
    }

    const eligibleGroups = rule.condition.anyOf.filter((group) => {
        const effectivePlan = group.sourcePlan || rule.sourcePlan;
        if (effectivePlan !== trajectorySourcePlan) return false;
        if (group.historical && !includeHistoricalBranches) return false;
        return group.allOf.length > 0;
    });

    if (eligibleGroups.length === 0) {
        return buildResult(false, 'no_branches_for_plan');
    }

    /** @type {string[]} */
    const evaluatedSourceCodes = [];
    /** @type {Set<string>} */
    const seenEvaluated = new Set();
    /** @type {Array<{ group: EquivalenciaConditionGroup, missingCodes: string[], consumedCodes: string[] }>} */
    const missingByGroup = [];
    /** @type {Set<string>} */
    const blockedByConsumedSet = new Set();
    let hasAcademicallyCompleteButConsumedGroup = false;

    for (const group of eligibleGroups) {
        /** @type {string[]} */
        const missingCodes = [];
        /** @type {string[]} */
        const consumedCodes = [];

        for (const code of group.allOf) {
            if (!seenEvaluated.has(code)) {
                seenEvaluated.add(code);
                evaluatedSourceCodes.push(code);
            }
            if (excludedSet.has(code)) {
                consumedCodes.push(code);
                blockedByConsumedSet.add(code);
            }
            const estado = extractAcademicState(progreso[code]);
            if (
                !isAcademicStateSatisfied(estado, rule.requiredAcademicState, {
                    treatSimuladorCursadoAsApproved,
                })
            ) {
                missingCodes.push(code);
            }
        }

        if (missingCodes.length === 0 && consumedCodes.length === 0) {
            for (const restGroup of eligibleGroups) {
                for (const code of restGroup.allOf) {
                    if (!seenEvaluated.has(code)) {
                        seenEvaluated.add(code);
                        evaluatedSourceCodes.push(code);
                    }
                }
            }
            return buildResult(true, 'satisfied', {
                matchedGroup: group,
                matchedSourceCodes: [...group.allOf],
                evaluatedSourceCodes,
            });
        }

        if (missingCodes.length === 0 && consumedCodes.length > 0) {
            hasAcademicallyCompleteButConsumedGroup = true;
        }

        missingByGroup.push({
            group,
            missingCodes,
            consumedCodes,
        });
    }

    const reason = hasAcademicallyCompleteButConsumedGroup
        ? 'source_code_consumed'
        : 'missing_requirements';

    return buildResult(false, reason, {
        evaluatedSourceCodes,
        blockedByConsumedCodes: hasAcademicallyCompleteButConsumedGroup
            ? [...blockedByConsumedSet]
            : [],
        missingByGroup,
    });
}

/**
 * Decides whether a rule evaluation grants consolidated accreditation, advisory status,
 * or advisory projection under the selected accreditation mode.
 *
 * @param {EquivalenciaEvaluationResult} evaluation
 * @param {{ mode?: EquivalenciaAccreditationMode }} [options={}]
 * @returns {EquivalenciaAccreditationResult}
 */
export function resolveEquivalenciaAccreditation(evaluation, options = {}) {
    const mode =
        options.mode === EQUIVALENCIA_ACCREDITATION_MODE.PROJECTION_WITH_ADVISORY
            ? EQUIVALENCIA_ACCREDITATION_MODE.PROJECTION_WITH_ADVISORY
            : EQUIVALENCIA_ACCREDITATION_MODE.CONSOLIDATED;

    const base = {
        targetCode: evaluation.targetCode,
        sourcePlan: evaluation.sourcePlan,
        targetPlan: evaluation.targetPlan,
        mode,
        satisfied: evaluation.satisfied,
        matchedGroup: evaluation.matchedGroup,
        matchedSourceCodes: evaluation.matchedSourceCodes,
        validationStatus: evaluation.validationStatus,
        applicationMode: evaluation.applicationMode,
        usagePolicy: evaluation.usagePolicy,
        source: evaluation.source,
        evaluation,
    };

    if (!evaluation.satisfied) {
        if (evaluation.reason === 'source_code_consumed') {
            return {
                ...base,
                accredited: false,
                isAdvisory: true,
                isProjected: false,
                status: 'conflict_source_consumed',
                statusMessage: 'La materia de origen ya fue utilizada para otra equivalencia u optativa.',
                consumedSourceCodes: [],
            };
        }

        return {
            ...base,
            accredited: false,
            isAdvisory: evaluation.isAdvisory,
            isProjected: false,
            status: 'not_satisfied',
            statusMessage: null,
            consumedSourceCodes: [],
        };
    }

    const canConsolidate =
        evaluation.validationStatus === EQUIVALENCIA_VALIDATION_STATUS.CONFIRMED &&
        evaluation.applicationMode === EQUIVALENCIA_APPLICATION_MODE.AUTOMATIC;

    if (canConsolidate) {
        return {
            ...base,
            accredited: true,
            isAdvisory: false,
            isProjected: false,
            status: 'accredited',
            statusMessage: null,
            consumedSourceCodes:
                evaluation.usagePolicy === EQUIVALENCIA_USAGE_POLICY.EXCLUSIVE
                    ? [...evaluation.matchedSourceCodes]
                    : [],
        };
    }

    if (mode === EQUIVALENCIA_ACCREDITATION_MODE.PROJECTION_WITH_ADVISORY) {
        return {
            ...base,
            accredited: false,
            isAdvisory: true,
            isProjected: true,
            status: 'advisory_projected',
            statusMessage: evaluation.advisoryMessage || DEFAULT_ADVISORY_MESSAGE,
            consumedSourceCodes:
                evaluation.usagePolicy === EQUIVALENCIA_USAGE_POLICY.EXCLUSIVE
                    ? [...evaluation.matchedSourceCodes]
                    : [],
        };
    }

    return {
        ...base,
        accredited: false,
        isAdvisory: true,
        isProjected: false,
        status: 'advisory_pending_confirmation',
        statusMessage: evaluation.advisoryMessage || DEFAULT_ADVISORY_MESSAGE,
        consumedSourceCodes: [],
    };
}

/**
 * Deterministic comparator ensuring allocation never depends on JSON key ordering:
 * confirmed rules before pending_confirmation, automatic before advisory,
 * lower numeric priority first, and targetCode alphabetically last.
 *
 * @param {EquivalenciaRule} a
 * @param {EquivalenciaRule} b
 * @returns {number}
 */
function compareRulesForAllocation(a, b) {
    const valRankA = a.validationStatus === EQUIVALENCIA_VALIDATION_STATUS.CONFIRMED ? 0 : 1;
    const valRankB = b.validationStatus === EQUIVALENCIA_VALIDATION_STATUS.CONFIRMED ? 0 : 1;
    if (valRankA !== valRankB) return valRankA - valRankB;

    const appRankA = a.applicationMode === EQUIVALENCIA_APPLICATION_MODE.AUTOMATIC ? 0 : 1;
    const appRankB = b.applicationMode === EQUIVALENCIA_APPLICATION_MODE.AUTOMATIC ? 0 : 1;
    if (appRankA !== appRankB) return appRankA - appRankB;

    const prioA = a.priority ?? 100;
    const prioB = b.priority ?? 100;
    if (prioA !== prioB) return prioA - prioB;

    return a.targetCode.localeCompare(b.targetCode);
}

/**
 * Resolves all equivalence rules for a student trajectory deterministically,
 * enforcing exclusive source-course allocation and preventing optative double-counting.
 *
 * @param {{
 *   catalog?: EquivalenciasCatalogMap | Record<string, EquivalenciaRule>,
 *   sourcePlan?: string,
 *   targetPlan?: string,
 *   progreso?: Record<string, EquivalenciaProgresoEntry>,
 *   mode?: EquivalenciaAccreditationMode,
 *   optativeCodes?: string[],
 *   treatSimuladorCursadoAsApproved?: boolean,
 *   includeHistoricalBranches?: boolean
 * }} [params={}]
 * @returns {EquivalenciasTrajectoryResult}
 */
export function resolveEquivalenciasForTrajectory(params = {}) {
    const sourcePlan = params.sourcePlan || '17.13';
    const targetPlan = params.targetPlan || '17.14';
    const mode =
        params.mode === EQUIVALENCIA_ACCREDITATION_MODE.PROJECTION_WITH_ADVISORY
            ? EQUIVALENCIA_ACCREDITATION_MODE.PROJECTION_WITH_ADVISORY
            : EQUIVALENCIA_ACCREDITATION_MODE.CONSOLIDATED;
    const progreso = params.progreso || {};
    const optativeCodes = Array.isArray(params.optativeCodes) ? params.optativeCodes : [];

    const normalizedMap = normalizeEquivalenciasCatalog(params.catalog || {}, {
        sourcePlan,
        targetPlan,
    });
    const sortedRules = Object.values(normalizedMap).sort(compareRulesForAllocation);

    /** @type {Set<string>} */
    const exclusivelyConsumedSet = new Set();
    /** @type {Map<string, string>} */
    const consumedByTargetMap = new Map();
    /** @type {Record<string, EquivalenciaEvaluationResult>} */
    const evaluationsByTarget = {};
    /** @type {Record<string, EquivalenciaAccreditationResult>} */
    const accreditationsByTarget = {};
    /** @type {string[]} */
    const accreditedTargets = [];
    /** @type {string[]} */
    const advisoryTargets = [];
    /** @type {string[]} */
    const projectedTargets = [];
    /** @type {Record<string, EquivalenciaSourceAllocation[]>} */
    const sourceAllocations = {};
    /** @type {EquivalenciaAdvisoryConflict[]} */
    const advisoryConflicts = [];

    for (const rule of sortedRules) {
        const evaluation = evaluateEquivalenciaRule(
            rule,
            { sourcePlan, targetPlan, progreso },
            {
                defaultSourcePlan: sourcePlan,
                defaultTargetPlan: targetPlan,
                treatSimuladorCursadoAsApproved: Boolean(params.treatSimuladorCursadoAsApproved),
                includeHistoricalBranches: Boolean(params.includeHistoricalBranches),
                excludedSourceCodes: exclusivelyConsumedSet,
            }
        );

        const accreditation = resolveEquivalenciaAccreditation(evaluation, { mode });
        evaluationsByTarget[rule.targetCode] = evaluation;
        accreditationsByTarget[rule.targetCode] = accreditation;

        if (accreditation.accredited) {
            accreditedTargets.push(rule.targetCode);
        }
        if (accreditation.isProjected) {
            projectedTargets.push(rule.targetCode);
        }
        if (accreditation.isAdvisory) {
            advisoryTargets.push(rule.targetCode);
        }

        if (
            accreditation.status === 'accredited' ||
            accreditation.status === 'advisory_projected'
        ) {
            for (const sourceCode of accreditation.matchedSourceCodes) {
                if (!sourceAllocations[sourceCode]) {
                    sourceAllocations[sourceCode] = [];
                }
                sourceAllocations[sourceCode].push({
                    sourceCode,
                    targetCode: rule.targetCode,
                    usagePolicy: accreditation.usagePolicy,
                    accreditationStatus: accreditation.status,
                });
            }

            if (accreditation.usagePolicy === EQUIVALENCIA_USAGE_POLICY.EXCLUSIVE) {
                for (const code of accreditation.consumedSourceCodes) {
                    exclusivelyConsumedSet.add(code);
                    if (!consumedByTargetMap.has(code)) {
                        consumedByTargetMap.set(code, rule.targetCode);
                    }
                }
            }
        } else if (accreditation.status === 'conflict_source_consumed') {
            const conflictingSourceCodes = evaluation.blockedByConsumedCodes;
            const firstBlockingCode = conflictingSourceCodes[0];
            const blockedByTargetCode = firstBlockingCode
                ? consumedByTargetMap.get(firstBlockingCode) || ''
                : '';
            const message = blockedByTargetCode
                ? `La materia de origen (${conflictingSourceCodes.join(', ')}) ya fue utilizada exclusivamente para acreditar ${blockedByTargetCode}.`
                : 'La materia de origen ya fue utilizada exclusivamente en otra equivalencia u optativa.';

            advisoryConflicts.push({
                targetCode: rule.targetCode,
                blockedByTargetCode,
                conflictingSourceCodes,
                message,
            });
        }
    }

    const availableOptativeCodes = optativeCodes.filter((code) => !exclusivelyConsumedSet.has(code));

    return {
        sourcePlan,
        targetPlan,
        mode,
        evaluationsByTarget,
        accreditationsByTarget,
        accreditedTargets,
        advisoryTargets,
        projectedTargets,
        exclusivelyConsumedSourceCodes: [...exclusivelyConsumedSet],
        sourceAllocations,
        availableOptativeCodes,
        advisoryConflicts,
    };
}
