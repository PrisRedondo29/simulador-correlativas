import { useState, useEffect, useMemo } from 'react';
import planService from '../services/planService';
import storageRepository, { subscribeStorageChanges } from '../services/storageRepository';
import { DEFAULT_PLAN, getPlanEquivalenciasMeta } from '../config/planPolicies';
import { usePlanCapabilities } from '../context/PlanContext';
import materiasUtils from '../utils/Progreso/materiasUtils';

const esAprobadaConFinal = (estado) => estado === 'Aprobado' || estado === 'Promocionado';

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

    const [filtro, setFiltro] = useState('todas');
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        if (!sourcePlan) return undefined;

        const syncProgreso = () => {
            const saved = storageRepository.getProgreso(sourcePlan, null);
            if (saved) setProgreso(saved);
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

    // Motor de mapeo: Grupos de Equivalencia (Many-to-One y One-to-One)
    const gruposEquivalencia = useMemo(() => {
        if (!planViejo || !planNuevo) return [];

        const grupos = planNuevo.materias.map((mNueva) => {
            const codigosOrigen = equivalenciasData[mNueva.codigo] || [];
            const materiasOrigen = planViejo.materias.filter(
                (mVieja) => codigosOrigen.includes(mVieja.codigo) || mVieja.codigo === mNueva.codigo,
            );

            return {
                id: `grupo-${mNueva.codigo}`,
                materiaNueva: mNueva,
                materiasViejas: materiasOrigen.length > 0 ? materiasOrigen : [],
                esEquivalente: materiasOrigen.length > 0,
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
                materiaNueva: { nombre: 'Sin equivalente directo', codigo: 'N/A', horas_totales: '0', horas_semanales: '0' },
                materiasViejas: [mVieja],
                esEquivalente: false,
                anio: mVieja.anio,
                cuatrimestre: mVieja.cuatrimestre,
            }));

        return [...grupos, ...huerfanas].sort((a, b) => {
            if (a.anio !== b.anio) return parseInt(a.anio, 10) - parseInt(b.anio, 10);
            return parseInt(a.cuatrimestre, 10) - parseInt(b.cuatrimestre, 10);
        });
    }, [planViejo, planNuevo, equivalenciasData]);

    const materiasFiltradas = useMemo(() => {
        const normalize = (text) =>
            text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        const searchNormalized = normalize(busqueda);

        return gruposEquivalencia.filter((grupo) => {
            const matchesBusqueda =
                normalize(grupo.materiaNueva.nombre).includes(searchNormalized) ||
                grupo.materiasViejas.some(
                    (m) => normalize(m.nombre).includes(searchNormalized) || m.codigo.includes(busqueda),
                );

            const todasAprobadas =
                grupo.materiasViejas.length > 0 &&
                grupo.materiasViejas.every((m) => esAprobadaConFinal(progreso[m.codigo]));

            if (filtro === 'aprobadas') return matchesBusqueda && todasAprobadas;
            if (filtro === 'pendientes') return matchesBusqueda && !todasAprobadas;

            return matchesBusqueda;
        });
    }, [gruposEquivalencia, progreso, filtro, busqueda]);

    // Motor de cálculo de horas
    const comparativaHoras = useMemo(() => {
        if (!planViejo || !planNuevo) return null;

        let viejoTotales = 0;
        let viejoRestantes = 0;
        planViejo.materias.forEach((m) => {
            const h = parseInt(m.horas_totales, 10) || 0;
            viejoTotales += h;
            if (!esAprobadaConFinal(progreso[m.codigo])) {
                viejoRestantes += h;
            }
        });

        let nuevoTotales = 0;
        let nuevoRestantes = 0;

        planNuevo.materias.forEach((m) => {
            const h = parseInt(m.horas_totales, 10) || 0;
            nuevoTotales += h;

            const equivs = equivalenciasData[m.codigo];
            const estaAprobada = equivs
                ? equivs.every((c) => esAprobadaConFinal(progreso[c]))
                : esAprobadaConFinal(progreso[m.codigo]);

            if (!estaAprobada) {
                nuevoRestantes += h;
            }
        });

        return {
            viejo: { totales: viejoTotales, restantes: viejoRestantes },
            nuevo: { totales: nuevoTotales, restantes: nuevoRestantes },
        };
    }, [progreso, planViejo, planNuevo, equivalenciasData]);

    return {
        planViejo,
        planNuevo,
        sourcePlan,
        targetPlan,
        equivalenciasMeta: eqMeta,
        progreso,
        materiasFiltradas,
        filtro,
        setFiltro,
        busqueda,
        setBusqueda,
        comparativaHoras,
        stats: {
            porcentajeViejo: comparativaHoras?.viejo.totales
                ? Math.round(((comparativaHoras.viejo.totales - comparativaHoras.viejo.restantes) * 100) / comparativaHoras.viejo.totales)
                : 0,
            porcentajeNuevo: comparativaHoras?.nuevo.totales
                ? Math.round(((comparativaHoras.nuevo.totales - comparativaHoras.nuevo.restantes) * 100) / comparativaHoras.nuevo.totales)
                : 0,
            totalNuevas: planNuevo?.materias.length || 0,
            aprobadasNuevas:
                planNuevo?.materias.filter((m) => {
                    const equivs = equivalenciasData[m.codigo];
                    return equivs
                        ? equivs.every((c) => esAprobadaConFinal(progreso[c]))
                        : esAprobadaConFinal(progreso[m.codigo]);
                }).length || 0,
        },
    };
};
