import { describe, it, expect } from 'vitest';
import {
    DEFAULT_ADVISORY_MESSAGE,
    EQUIVALENCIA_ACCREDITATION_MODE,
    EQUIVALENCIA_APPLICATION_MODE,
    EQUIVALENCIA_USAGE_POLICY,
    EQUIVALENCIA_VALIDATION_STATUS,
    evaluateEquivalenciaRule,
    getRuleSourceCodes,
    isAcademicStateSatisfied,
    normalizeEquivalenciaRule,
    normalizeEquivalenciasCatalog,
    resolveEquivalenciaAccreditation,
    resolveEquivalenciasForTrajectory,
} from './equivalenciasUtils';

describe('equivalenciasUtils', () => {
    describe('isAcademicStateSatisfied', () => {
        it('accepts approved states and rejects Regular when requiredAcademicState is approved', () => {
            expect(isAcademicStateSatisfied('Aprobado', 'approved')).toBe(true);
            expect(isAcademicStateSatisfied('Aprobada', 'approved')).toBe(true);
            expect(isAcademicStateSatisfied('Regular', 'approved')).toBe(false);
            expect(isAcademicStateSatisfied('Cursando', 'approved')).toBe(false);
            expect(isAcademicStateSatisfied('Pendiente', 'approved')).toBe(false);
            expect(isAcademicStateSatisfied(null, 'approved')).toBe(false);
            expect(isAcademicStateSatisfied(undefined, 'approved')).toBe(false);
        });

        it('rejects simulator Cursado for consolidated approved check unless treatSimuladorCursadoAsApproved is enabled', () => {
            expect(isAcademicStateSatisfied('Cursado', 'approved')).toBe(false);
            expect(
                isAcademicStateSatisfied('Cursado', 'approved', {
                    treatSimuladorCursadoAsApproved: true,
                })
            ).toBe(true);
            expect(
                isAcademicStateSatisfied('Regular', 'approved', {
                    treatSimuladorCursadoAsApproved: true,
                })
            ).toBe(false);
        });

        it('accepts Regular and Cursado when requiredAcademicState is regular', () => {
            expect(isAcademicStateSatisfied('Regular', 'regular')).toBe(true);
            expect(isAcademicStateSatisfied('Cursado', 'regular')).toBe(true);
            expect(isAcademicStateSatisfied('Aprobado', 'regular')).toBe(true);
            expect(isAcademicStateSatisfied('Pendiente', 'regular')).toBe(false);
        });
    });

    describe('normalizeEquivalenciaRule & catalog normalization', () => {
        it('keeps backward compatibility with legacy string[] entries', () => {
            const rule = normalizeEquivalenciaRule('11419', ['11412', '11417']);

            expect(rule.targetCode).toBe('11419');
            expect(rule.sourcePlan).toBe('17.13');
            expect(rule.targetPlan).toBe('17.14');
            expect(rule.requiredAcademicState).toBe('approved');
            expect(rule.condition).toEqual({
                anyOf: [{ allOf: ['11412', '11417'] }],
            });
            expect(rule.validationStatus).toBe(EQUIVALENCIA_VALIDATION_STATUS.CONFIRMED);
            expect(rule.applicationMode).toBe(EQUIVALENCIA_APPLICATION_MODE.AUTOMATIC);
            expect(rule.usagePolicy).toBe(EQUIVALENCIA_USAGE_POLICY.EXCLUSIVE);
            expect(rule.isLegacyArray).toBe(true);
        });

        it('normalizes canonical rule with sourcePlan, targetPlan, condition.anyOf, and advisory defaults for pending_confirmation', () => {
            const rule = normalizeEquivalenciaRule('11289', {
                sourcePlan: '17.13',
                targetPlan: '17.14',
                condition: {
                    anyOf: [
                        { allOf: ['11089'] },
                        { allOf: ['10043'], sourcePlan: '17.13', historical: true },
                    ],
                },
                validationStatus: 'pending_confirmation',
                source: { resolution: 'Res. HCS 260/24', annex: 'Anexo VI' },
            });

            expect(rule.targetCode).toBe('11289');
            expect(rule.sourcePlan).toBe('17.13');
            expect(rule.targetPlan).toBe('17.14');
            expect(rule.validationStatus).toBe('pending_confirmation');
            expect(rule.applicationMode).toBe('advisory');
            expect(rule.condition.anyOf).toHaveLength(2);
            expect(rule.source).toEqual({ resolution: 'Res. HCS 260/24', annex: 'Anexo VI' });
            expect(rule.isLegacyArray).toBe(false);
        });

        it('normalizes full catalog records cleanly', () => {
            const catalog = normalizeEquivalenciasCatalog({
                '14031': ['11412', '11417'],
                '21420': {
                    sourcePlan: '17.13',
                    targetPlan: '17.14',
                    condition: { anyOf: [{ allOf: ['21240'] }] },
                    validationStatus: 'pending_confirmation',
                },
            });

            expect(Object.keys(catalog)).toEqual(['14031', '21420']);
            expect(catalog['14031'].validationStatus).toBe('confirmed');
            expect(catalog['21420'].applicationMode).toBe('advisory');
        });
    });

    describe('getRuleSourceCodes', () => {
        it('returns deduplicated source codes respecting sourcePlan and historical filters', () => {
            const rule = normalizeEquivalenciaRule('11289', {
                sourcePlan: '17.13',
                targetPlan: '17.14',
                condition: {
                    anyOf: [
                        { allOf: ['11089'] },
                        { allOf: ['10043'], historical: true },
                        { allOf: ['11089', '11090'] },
                    ],
                },
            });

            expect(getRuleSourceCodes(rule)).toEqual(['11089', '11090']);
            expect(getRuleSourceCodes(rule, { includeHistorical: true })).toEqual([
                '11089',
                '10043',
                '11090',
            ]);
            expect(getRuleSourceCodes(rule, { sourcePlan: '17.14' })).toEqual([]);
        });
    });

    describe('evaluateEquivalenciaRule (AND / OR / Plans / Academic State)', () => {
        const ruleAnd = normalizeEquivalenciaRule('14031', {
            sourcePlan: '17.13',
            targetPlan: '17.14',
            condition: { anyOf: [{ allOf: ['11412', '11417'] }] },
            validationStatus: 'confirmed',
            applicationMode: 'automatic',
            source: { resolution: 'Res. HCS 260/24', annex: 'Anexo VI' },
        });

        const ruleOr = normalizeEquivalenciaRule('11289', {
            sourcePlan: '17.13',
            targetPlan: '17.14',
            condition: {
                anyOf: [{ allOf: ['11089'] }, { allOf: ['10043'] }],
            },
            validationStatus: 'pending_confirmation',
            applicationMode: 'advisory',
            source: { resolution: 'Res. HCS 260/24', annex: 'Anexo VI' },
        });

        it('requires all courses inside an allOf group (AND)', () => {
            const partial = evaluateEquivalenciaRule(ruleAnd, {
                sourcePlan: '17.13',
                targetPlan: '17.14',
                progreso: {
                    11412: { estado: 'Aprobado' },
                    11417: { estado: 'Regular' },
                },
            });
            expect(partial.satisfied).toBe(false);
            expect(partial.reason).toBe('missing_requirements');
            expect(partial.missingByGroup[0].missingCodes).toEqual(['11417']);

            const complete = evaluateEquivalenciaRule(ruleAnd, {
                sourcePlan: '17.13',
                targetPlan: '17.14',
                progreso: {
                    11412: { estado: 'Aprobado' },
                    11417: { estado: 'Aprobado' },
                },
            });
            expect(complete.satisfied).toBe(true);
            expect(complete.reason).toBe('satisfied');
            expect(complete.matchedSourceCodes).toEqual(['11412', '11417']);
            expect(complete.source).toEqual({ resolution: 'Res. HCS 260/24', annex: 'Anexo VI' });
        });

        it('satisfies OR rule when any allOf branch is complete', () => {
            const firstBranch = evaluateEquivalenciaRule(ruleOr, {
                sourcePlan: '17.13',
                targetPlan: '17.14',
                progreso: { 11089: { estado: 'Aprobado' } },
            });
            expect(firstBranch.satisfied).toBe(true);
            expect(firstBranch.matchedSourceCodes).toEqual(['11089']);

            const secondBranch = evaluateEquivalenciaRule(ruleOr, {
                sourcePlan: '17.13',
                targetPlan: '17.14',
                progreso: { 10043: { estado: 'Aprobado' } },
            });
            expect(secondBranch.satisfied).toBe(true);
            expect(secondBranch.matchedSourceCodes).toEqual(['10043']);
        });

        it('rejects reverse or mismatched sourcePlan / targetPlan contexts', () => {
            const reverseTrajectory = evaluateEquivalenciaRule(ruleAnd, {
                sourcePlan: '17.14',
                targetPlan: '17.13',
                progreso: {
                    11412: { estado: 'Aprobado' },
                    11417: { estado: 'Aprobado' },
                },
            });
            expect(reverseTrajectory.satisfied).toBe(false);
            expect(reverseTrajectory.reason).toBe('source_plan_mismatch');

            const wrongTargetPlan = evaluateEquivalenciaRule(ruleAnd, {
                sourcePlan: '17.13',
                targetPlan: '17.15',
                progreso: {
                    11412: { estado: 'Aprobado' },
                    11417: { estado: 'Aprobado' },
                },
            });
            expect(wrongTargetPlan.satisfied).toBe(false);
            expect(wrongTargetPlan.reason).toBe('target_plan_mismatch');
        });

        it('distinguishes source_code_consumed from missing_requirements when source code is blocked', () => {
            const blocked = evaluateEquivalenciaRule(
                ruleAnd,
                {
                    sourcePlan: '17.13',
                    targetPlan: '17.14',
                    progreso: {
                        11412: { estado: 'Aprobado' },
                        11417: { estado: 'Aprobado' },
                    },
                },
                { excludedSourceCodes: ['11412'] }
            );
            expect(blocked.satisfied).toBe(false);
            expect(blocked.reason).toBe('source_code_consumed');
            expect(blocked.blockedByConsumedCodes).toEqual(['11412']);
        });
    });

    describe('resolveEquivalenciaAccreditation (Evaluation vs Accreditation & UX Option A)', () => {
        const pendingRule = normalizeEquivalenciaRule('21420', {
            sourcePlan: '17.13',
            targetPlan: '17.14',
            condition: { anyOf: [{ allOf: ['21240'] }] },
            validationStatus: 'pending_confirmation',
            applicationMode: 'advisory',
            source: { resolution: 'Res. HCS 260/24', annex: 'Anexo VI' },
        });

        const confirmedRule = normalizeEquivalenciaRule('14031', {
            sourcePlan: '17.13',
            targetPlan: '17.14',
            condition: { anyOf: [{ allOf: ['11412', '11417'] }] },
            validationStatus: 'confirmed',
            applicationMode: 'automatic',
        });

        it('evaluates pending_confirmation as satisfied, yet refuses automatic consolidated accreditation (UX Option A)', () => {
            const evaluation = evaluateEquivalenciaRule(pendingRule, {
                sourcePlan: '17.13',
                targetPlan: '17.14',
                progreso: { 21240: { estado: 'Aprobado' } },
            });
            expect(evaluation.satisfied).toBe(true);

            const consolidated = resolveEquivalenciaAccreditation(evaluation, {
                mode: EQUIVALENCIA_ACCREDITATION_MODE.CONSOLIDATED,
            });
            expect(consolidated.satisfied).toBe(true);
            expect(consolidated.accredited).toBe(false);
            expect(consolidated.isAdvisory).toBe(true);
            expect(consolidated.isProjected).toBe(false);
            expect(consolidated.status).toBe('advisory_pending_confirmation');
            expect(consolidated.statusMessage).toBe(DEFAULT_ADVISORY_MESSAGE);
            expect(consolidated.consumedSourceCodes).toEqual([]);
        });

        it('supports separate projection_with_advisory mode without mutating consolidated accreditation', () => {
            const evaluation = evaluateEquivalenciaRule(pendingRule, {
                sourcePlan: '17.13',
                targetPlan: '17.14',
                progreso: { 21240: { estado: 'Aprobado' } },
            });

            const projected = resolveEquivalenciaAccreditation(evaluation, {
                mode: EQUIVALENCIA_ACCREDITATION_MODE.PROJECTION_WITH_ADVISORY,
            });
            expect(projected.satisfied).toBe(true);
            expect(projected.accredited).toBe(false);
            expect(projected.isProjected).toBe(true);
            expect(projected.isAdvisory).toBe(true);
            expect(projected.status).toBe('advisory_projected');
            expect(projected.statusMessage).toBe(DEFAULT_ADVISORY_MESSAGE);
            expect(projected.consumedSourceCodes).toEqual(['21240']);
        });

        it('never auto-accredits pending_confirmation in consolidated mode even if applicationMode says automatic', () => {
            const misconfiguredPending = normalizeEquivalenciaRule('11289', {
                sourcePlan: '17.13',
                targetPlan: '17.14',
                condition: { anyOf: [{ allOf: ['11089'] }] },
                validationStatus: 'pending_confirmation',
                applicationMode: 'automatic',
            });

            const evaluation = evaluateEquivalenciaRule(misconfiguredPending, {
                sourcePlan: '17.13',
                targetPlan: '17.14',
                progreso: { 11089: { estado: 'Aprobado' } },
            });
            const consolidated = resolveEquivalenciaAccreditation(evaluation, {
                mode: EQUIVALENCIA_ACCREDITATION_MODE.CONSOLIDATED,
            });

            expect(consolidated.accredited).toBe(false);
            expect(consolidated.status).toBe('advisory_pending_confirmation');
        });

        it('accredits confirmed + automatic rules in consolidated mode', () => {
            const evaluation = evaluateEquivalenciaRule(confirmedRule, {
                sourcePlan: '17.13',
                targetPlan: '17.14',
                progreso: {
                    11412: { estado: 'Aprobado' },
                    11417: { estado: 'Aprobado' },
                },
            });
            const consolidated = resolveEquivalenciaAccreditation(evaluation);

            expect(consolidated.accredited).toBe(true);
            expect(consolidated.isAdvisory).toBe(false);
            expect(consolidated.status).toBe('accredited');
            expect(consolidated.consumedSourceCodes).toEqual(['11412', '11417']);
        });
    });

    describe('resolveEquivalenciasForTrajectory (Central Allocation Policy & Double-Count Prevention)', () => {
        it('prevents double-counting exclusive source courses against optatives and secondary exclusive rules', () => {
            const catalog = {
                OPTATIVA_COMPETING: {
                    sourcePlan: '17.13',
                    targetPlan: '17.14',
                    condition: { anyOf: [{ allOf: ['21420'] }] },
                    validationStatus: 'confirmed',
                    applicationMode: 'automatic',
                    usagePolicy: 'exclusive',
                    priority: 50,
                },
                21279: {
                    sourcePlan: '17.13',
                    targetPlan: '17.14',
                    condition: { anyOf: [{ allOf: ['21420'] }] },
                    validationStatus: 'confirmed',
                    applicationMode: 'automatic',
                    usagePolicy: 'exclusive',
                    priority: 10,
                },
            };

            const result = resolveEquivalenciasForTrajectory({
                catalog,
                sourcePlan: '17.13',
                targetPlan: '17.14',
                progreso: { 21420: { estado: 'Aprobado' } },
                optativeCodes: ['21420', '11805'],
            });

            expect(result.accreditedTargets).toEqual(['21279']);
            expect(result.exclusivelyConsumedSourceCodes).toEqual(['21420']);
            expect(result.availableOptativeCodes).toEqual(['11805']);
            expect(result.accreditationsByTarget['OPTATIVA_COMPETING'].status).toBe(
                'conflict_source_consumed'
            );
            expect(result.advisoryConflicts).toEqual([
                {
                    targetCode: 'OPTATIVA_COMPETING',
                    blockedByTargetCode: '21279',
                    conflictingSourceCodes: ['21420'],
                    message:
                        'La materia de origen (21420) ya fue utilizada exclusivamente para acreditar 21279.',
                },
            ]);
        });

        it('produces identical allocations regardless of catalog key insertion order', () => {
            const forwardCatalog = {
                A_HIGH: {
                    sourcePlan: '17.13',
                    targetPlan: '17.14',
                    condition: { anyOf: [{ allOf: ['21420'] }] },
                    validationStatus: 'confirmed',
                    applicationMode: 'automatic',
                    usagePolicy: 'exclusive',
                    priority: 10,
                },
                Z_LOW: {
                    sourcePlan: '17.13',
                    targetPlan: '17.14',
                    condition: { anyOf: [{ allOf: ['21420'] }] },
                    validationStatus: 'confirmed',
                    applicationMode: 'automatic',
                    usagePolicy: 'exclusive',
                    priority: 20,
                },
            };
            const reversedCatalog = {
                Z_LOW: forwardCatalog.Z_LOW,
                A_HIGH: forwardCatalog.A_HIGH,
            };

            const res1 = resolveEquivalenciasForTrajectory({
                catalog: forwardCatalog,
                progreso: { 21420: { estado: 'Aprobado' } },
            });
            const res2 = resolveEquivalenciasForTrajectory({
                catalog: reversedCatalog,
                progreso: { 21420: { estado: 'Aprobado' } },
            });

            expect(res1.accreditedTargets).toEqual(res2.accreditedTargets);
            expect(res1.exclusivelyConsumedSourceCodes).toEqual(res2.exclusivelyConsumedSourceCodes);
            expect(res1.advisoryConflicts).toEqual(res2.advisoryConflicts);
        });

        it('allows shared usagePolicy rules to reuse the same source course when both are shared', () => {
            const catalog = {
                TARGET_1: {
                    sourcePlan: '17.13',
                    targetPlan: '17.14',
                    condition: { anyOf: [{ allOf: ['11412'] }] },
                    validationStatus: 'confirmed',
                    applicationMode: 'automatic',
                    usagePolicy: 'shared',
                    priority: 10,
                },
                TARGET_2: {
                    sourcePlan: '17.13',
                    targetPlan: '17.14',
                    condition: { anyOf: [{ allOf: ['11412'] }] },
                    validationStatus: 'confirmed',
                    applicationMode: 'automatic',
                    usagePolicy: 'shared',
                    priority: 20,
                },
            };

            const result = resolveEquivalenciasForTrajectory({
                catalog,
                progreso: { 11412: { estado: 'Aprobado' } },
                optativeCodes: ['11412'],
            });

            expect(result.accreditedTargets).toEqual(['TARGET_1', 'TARGET_2']);
            expect(result.exclusivelyConsumedSourceCodes).toEqual([]);
            expect(result.availableOptativeCodes).toEqual(['11412']);
            expect(result.advisoryConflicts).toEqual([]);
        });

        it('prioritizes confirmed rules over pending_confirmation rules and reserves advisory codes only in projection_with_advisory', () => {
            const catalog = {
                21420: {
                    sourcePlan: '17.13',
                    targetPlan: '17.14',
                    condition: { anyOf: [{ allOf: ['21240'] }] },
                    validationStatus: 'pending_confirmation',
                    applicationMode: 'advisory',
                    usagePolicy: 'exclusive',
                    priority: 1,
                },
                21279: {
                    sourcePlan: '17.13',
                    targetPlan: '17.14',
                    condition: { anyOf: [{ allOf: ['21240'] }] },
                    validationStatus: 'confirmed',
                    applicationMode: 'automatic',
                    usagePolicy: 'exclusive',
                    priority: 50,
                },
            };

            const consolidated = resolveEquivalenciasForTrajectory({
                catalog,
                progreso: { 21240: { estado: 'Aprobado' } },
                mode: 'consolidated',
                optativeCodes: ['21240'],
            });

            expect(consolidated.accreditedTargets).toEqual(['21279']);
            expect(consolidated.advisoryTargets).toEqual(['21420']);
            expect(consolidated.accreditationsByTarget['21420'].status).toBe(
                'conflict_source_consumed'
            );

            const advisoryOnlyCatalog = {
                21420: catalog['21420'],
            };
            const advisoryConsolidated = resolveEquivalenciasForTrajectory({
                catalog: advisoryOnlyCatalog,
                progreso: { 21240: { estado: 'Aprobado' } },
                mode: 'consolidated',
                optativeCodes: ['21240'],
            });
            expect(advisoryConsolidated.accreditedTargets).toEqual([]);
            expect(advisoryConsolidated.advisoryTargets).toEqual(['21420']);
            expect(advisoryConsolidated.availableOptativeCodes).toEqual(['21240']);

            const advisoryProjection = resolveEquivalenciasForTrajectory({
                catalog: advisoryOnlyCatalog,
                progreso: { 21240: { estado: 'Aprobado' } },
                mode: 'projection_with_advisory',
                optativeCodes: ['21240'],
            });
            expect(advisoryProjection.projectedTargets).toEqual(['21420']);
            expect(advisoryProjection.availableOptativeCodes).toEqual([]);
        });
    });
});
