import { useState, useEffect, useMemo } from 'react';
import planService from '../services/planService';
import storageRepository, { subscribeStorageChanges } from '../services/storageRepository';
import { DEFAULT_PLAN, getPlanEquivalenciasMeta } from '../config/planPolicies';
import { usePlanCapabilities } from '../context/PlanContext';
import materiasUtils from '../utils/Progreso/materiasUtils';
import optativasData from '../data/optativasData.json';
import {
    augmentProgresoWithOptativas,
    DEFAULT_ADVISORY_MESSAGE,
    EQUIVALENCIA_ACCREDITATION_MODE,
    getRuleSourceCodes,
    isAcademicStateSatisfied,
    normalizeEquivalenciasCatalog,
    resolveEquivalenciasForTrajectory,
} from '../utils/Plan/equivalenciasUtils';

const optativasByCode = new Map(
    (Array.isArray(optativasData) ? optativasData : []).map((opt) => [String(opt.codigo), opt]),
);

export const useEquivalencias = () => {
    const { plan, equivalenciasInfo } = usePlanCapabilities();
    const activePlan = plan || DEFAULT_PLAN;
    const eqMeta = equivalenciasInfo || getPlanEquivalenciasMeta(activePlan);
    const sourcePlan = eqMeta?.sourcePlan || null;
    const targetPlan = eqMeta?.targetPlan || null;

    const [planViejo, setPlanViejo] = useState(null);
    const [planNuevo, setPlanNuevo] = useState(null);
    const [equivalenciasData, setEquivalenciasData] = useState({});
    const [progreso, setProgreso] = useState(() =>
        sourcePlan ? storageRepository.getProgreso(sourcePlan, {}) : {},
    );
    const [progresoDetalles, setProgresoDetalles] = useState(() =>
        sourcePlan ? storageRepository.getProgresoDetalles(sourcePlan, {}) : {},
    );

    const [filtro, setFiltro] = useState('todas');
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        if (!sourcePlan) return undefined;

        const syncProgreso = () => {
            const saved = storageRepository.getProgreso(sourcePlan, null);
            if (saved) setProgreso(saved);
            const savedDetalles = storageRepository.getProgresoDetalles(sourcePlan, null);
            if (savedDetalles) setProgresoDetalles(savedDetalles);
        };

        return subscribeStorageChanges(syncProgreso);
    }, [sourcePlan]);

    useEffect(() => {
        if (!sourcePlan || !targetPlan) return undefined;

        let active = true;
        Promise.all([
            planService.getPlanByNumber(sourcePlan),
            planService.getPlanByNumber(targetPlan),
            planService.getEquivalenciasByPlan(activePlan),
        ]).then(([viejo, nuevo, eqMap]) => {
            if (!active) return;
            setPlanViejo(viejo);
            setPlanNuevo(nuevo);
            setEquivalenciasData(eqMap || {});

            const savedDetalles = storageRepository.getProgresoDetalles(sourcePlan, {});
            setProgresoDetalles(savedDetalles || {});

            const saved = storageRepository.getProgreso(sourcePlan, null);
            if (saved) {
                setProgreso(saved);
                return;
            }
            if (viejo?.materias) {
                const initial = {};
                viejo.materias.forEach((m) => {
                    initial[m.codigo] = m.tesis ? materiasUtils.bloquear : materiasUtils.estadosPosibles[0];
                });
                setProgreso(initial);
            }
        });

        return () => {
            active = false;
        };
    }, [activePlan, sourcePlan, targetPlan]);

    const effectiveSourcePlan = sourcePlan || '17.13';
    const effectiveTargetPlan = targetPlan || '17.14';

    const { progresoEfectivo, trajectory, normalizedCatalog } = useMemo(() => {
        const { progreso: enriched, optativeCodes } = augmentProgresoWithOptativas(
            progreso,
            progresoDetalles,
        );
        const normalized = normalizeEquivalenciasCatalog(equivalenciasData || {}, {
            sourcePlan: effectiveSourcePlan,
            targetPlan: effectiveTargetPlan,
        });
        const traj = resolveEquivalenciasForTrajectory({
            catalog: normalized,
            sourcePlan: effectiveSourcePlan,
            targetPlan: effectiveTargetPlan,
            progreso: enriched,
            mode: EQUIVALENCIA_ACCREDITATION_MODE.CONSOLIDATED,
            optativeCodes,
        });
        return {
            progresoEfectivo: enriched,
            trajectory: traj,
            normalizedCatalog: normalized,
        };
    }, [progreso, progresoDetalles, equivalenciasData, effectiveSourcePlan, effectiveTargetPlan]);

    // Motor de mapeo: Grupos de Equivalencia delegados al motor compartido equivalenciasUtils
    const gruposEquivalencia = useMemo(() => {
        if (!planViejo || !planNuevo) return [];

        const planViejoByCode = new Map(
            planViejo.materias.map((mVieja) => [mVieja.codigo, mVieja]),
        );

        const grupos = planNuevo.materias.map((mNueva) => {
            const rule = normalizedCatalog[mNueva.codigo];

            if (rule) {
                const codigosOrigen = getRuleSourceCodes(rule, {
                    sourcePlan: effectiveSourcePlan,
                    includeHistorical: false,
                });

                const materiasOrigen = [];
                codigosOrigen.forEach((codigo) => {
                    const matVieja = planViejoByCode.get(codigo);
                    if (matVieja) {
                        materiasOrigen.push(matVieja);
                        return;
                    }
                    const optInfo = optativasByCode.get(codigo);
                    if (optInfo) {
                        materiasOrigen.push({
                            codigo,
                            nombre: `${optInfo.nombre} (Optativa)`,
                            horas_totales: '—',
                            anio: mNueva.anio,
                            cuatrimestre: mNueva.cuatrimestre,
                        });
                    }
                });

                const accreditation = trajectory.accreditationsByTarget[mNueva.codigo];
                const estaAprobada = Boolean(accreditation?.accredited);
                const esPendienteConfirmacion =
                    accreditation?.status === 'advisory_pending_confirmation';
                const esReglaAdvisory = Boolean(accreditation?.isAdvisory);
                const advisoryMessage = esPendienteConfirmacion
                    ? accreditation?.statusMessage || DEFAULT_ADVISORY_MESSAGE
                    : esReglaAdvisory
                      ? accreditation?.evaluation?.advisoryMessage || DEFAULT_ADVISORY_MESSAGE
                      : null;

                return {
                    id: `grupo-${mNueva.codigo}`,
                    materiaNueva: mNueva,
                    materiasViejas: materiasOrigen,
                    esEquivalente: materiasOrigen.length > 0 || codigosOrigen.length > 0,
                    estaAprobada,
                    esPendienteConfirmacion,
                    esReglaAdvisory,
                    accreditationStatus: accreditation?.status || 'not_satisfied',
                    advisoryMessage,
                    sourceMeta: accreditation?.source || null,
                    anio: mNueva.anio,
                    cuatrimestre: mNueva.cuatrimestre,
                };
            }

            const directa = planViejoByCode.get(mNueva.codigo);
            const estaAprobada = Boolean(
                directa && isAcademicStateSatisfied(progresoEfectivo[mNueva.codigo], 'approved'),
            );

            return {
                id: `grupo-${mNueva.codigo}`,
                materiaNueva: mNueva,
                materiasViejas: directa ? [directa] : [],
                esEquivalente: Boolean(directa),
                estaAprobada,
                esPendienteConfirmacion: false,
                esReglaAdvisory: false,
                accreditationStatus: estaAprobada ? 'accredited' : 'not_satisfied',
                advisoryMessage: null,
                sourceMeta: null,
                anio: mNueva.anio,
                cuatrimestre: mNueva.cuatrimestre,
            };
        });

        const codigosViejosMapeados = new Set();
        grupos.forEach((g) => g.materiasViejas.forEach((m) => codigosViejosMapeados.add(m.codigo)));

        const huerfanas = planViejo.materias
            .filter((m) => !codigosViejosMapeados.has(m.codigo))
            .map((mVieja) => ({
                id: `huerfana-${mVieja.codigo}`,
                materiaNueva: {
                    nombre: 'Sin equivalente directo',
                    codigo: 'N/A',
                    horas_totales: '0',
                    horas_semanales: '0',
                },
                materiasViejas: [mVieja],
                esEquivalente: false,
                estaAprobada: false,
                esPendienteConfirmacion: false,
                esReglaAdvisory: false,
                accreditationStatus: 'not_satisfied',
                advisoryMessage: null,
                sourceMeta: null,
                anio: mVieja.anio,
                cuatrimestre: mVieja.cuatrimestre,
            }));

        return [...grupos, ...huerfanas].sort((a, b) => {
            if (a.anio !== b.anio) return parseInt(a.anio, 10) - parseInt(b.anio, 10);
            return parseInt(a.cuatrimestre, 10) - parseInt(b.cuatrimestre, 10);
        });
    }, [planViejo, planNuevo, normalizedCatalog, trajectory, effectiveSourcePlan, progresoEfectivo]);

    const materiasFiltradas = useMemo(() => {
        const normalize = (text) =>
            String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        const searchNormalized = normalize(busqueda);

        return gruposEquivalencia.filter((grupo) => {
            const matchesBusqueda =
                normalize(grupo.materiaNueva.nombre).includes(searchNormalized) ||
                grupo.materiasViejas.some(
                    (m) => normalize(m.nombre).includes(searchNormalized) || m.codigo.includes(busqueda),
                );

            if (filtro === 'aprobadas') return matchesBusqueda && grupo.estaAprobada;
            if (filtro === 'pendientes') return matchesBusqueda && !grupo.estaAprobada;

            return matchesBusqueda;
        });
    }, [gruposEquivalencia, filtro, busqueda]);

    const { comparativaHoras, stats } = useMemo(() => {
        if (!planViejo || !planNuevo) {
            return {
                comparativaHoras: null,
                stats: {
                    porcentajeViejo: 0,
                    porcentajeNuevo: 0,
                    totalNuevas: 0,
                    aprobadasNuevas: 0,
                    posiblesEquivalencias: 0,
                },
            };
        }

        let viejoTotales = 0;
        let viejoRestantes = 0;
        planViejo.materias.forEach((m) => {
            const h = parseInt(m.horas_totales, 10) || 0;
            viejoTotales += h;
            if (!isAcademicStateSatisfied(progresoEfectivo[m.codigo], 'approved')) {
                viejoRestantes += h;
            }
        });

        const gruposPlanNuevo = gruposEquivalencia.filter((g) => !g.id.startsWith('huerfana-'));
        let nuevoTotales = 0;
        let nuevoRestantes = 0;
        let aprobadasNuevas = 0;
        let posiblesEquivalencias = 0;

        gruposPlanNuevo.forEach((grupo) => {
            const h = parseInt(grupo.materiaNueva.horas_totales, 10) || 0;
            nuevoTotales += h;
            if (grupo.estaAprobada) {
                aprobadasNuevas += 1;
            } else {
                nuevoRestantes += h;
            }
            if (grupo.esPendienteConfirmacion) {
                posiblesEquivalencias += 1;
            }
        });

        return {
            comparativaHoras: {
                viejo: { totales: viejoTotales, restantes: viejoRestantes },
                nuevo: { totales: nuevoTotales, restantes: nuevoRestantes },
            },
            stats: {
                porcentajeViejo: viejoTotales
                    ? Math.round(((viejoTotales - viejoRestantes) * 100) / viejoTotales)
                    : 0,
                porcentajeNuevo: nuevoTotales
                    ? Math.round(((nuevoTotales - nuevoRestantes) * 100) / nuevoTotales)
                    : 0,
                totalNuevas: planNuevo.materias.length,
                aprobadasNuevas,
                posiblesEquivalencias,
            },
        };
    }, [progresoEfectivo, planViejo, planNuevo, gruposEquivalencia]);

    return {
        planViejo,
        planNuevo,
        sourcePlan,
        targetPlan,
        equivalenciasMeta: eqMeta,
        progreso: progresoEfectivo,
        advisoryConflicts: trajectory.advisoryConflicts,
        materiasFiltradas,
        filtro,
        setFiltro,
        busqueda,
        setBusqueda,
        comparativaHoras,
        stats,
    };
};
