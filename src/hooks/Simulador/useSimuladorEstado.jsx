import { useState, useEffect, useCallback } from 'react';
import { addToast } from '@heroui/react';
import planService from '../../services/planService';
import {
    trackAvanceSemestre,
    trackProyeccionEgreso,
    trackIntencionCursada,
    trackAlertaDesercion,
} from '../../services/analyticsService';

/**
 * Compara dos períodos académicos `(anio, cuatri)` para determinar si A >= B.
 * @param {number | string} anioA
 * @param {number | string} cuatriA
 * @param {number | string} anioB
 * @param {number | string} cuatriB
 * @returns {boolean}
 */
export function esPeriodoIgualOPosterior(anioA, cuatriA, anioB, cuatriB) {
    const keyA = Number(anioA) * 10 + Number(cuatriA);
    const keyB = Number(anioB) * 10 + Number(cuatriB);
    return keyA >= keyB;
}

/**
 * Homologa el progreso simulado del Plan 17.13 al Plan 17.14 usando `equivalencias.json`.
 * Toda materia aprobada/cursada en `17.13` que satisfaga las equivalencias o coincida por código
 * inicia marcada como `'Cursado'` en el Plan 17.14.
 *
 * @param {Record<string, string>} progreso1713
 * @param {Array<import('../../types/domain').Materia>} materias1714
 * @param {import('../../types/domain').EquivalenciasMap} equivalenciasMap
 * @returns {{ progreso1714: Record<string, string>, equivalenciasCount: number }}
 */
export function homologarProgresoSimulado1713A1714(
    progreso1713 = {},
    materias1714 = [],
    equivalenciasMap = {},
) {
    /** @type {Record<string, string>} */
    const progreso1714 = {};
    let equivalenciasCount = 0;

    for (const mat14 of materias1714) {
        const fuentes = equivalenciasMap?.[mat14.codigo];
        let aprobada = false;

        if (Array.isArray(fuentes) && fuentes.length > 0) {
            aprobada = fuentes.every((cod13) => progreso1713?.[cod13] === 'Cursado');
        } else {
            aprobada = progreso1713?.[mat14.codigo] === 'Cursado';
        }

        if (aprobada) {
            progreso1714[mat14.codigo] = 'Cursado';
            equivalenciasCount += 1;
        } else {
            progreso1714[mat14.codigo] = 'No Cursado';
        }
    }

    return { progreso1714, equivalenciasCount };
}

/**
 * Hook principal de estado del Simulador de Avance.
 * Soporta simulación en plan único o transición híbrida programada (`17.13 -> 17.14`)
 * en un cuatrimestre elegido por el usuario.
 */
const useSimuladorEstado = ({ plan, anioInicio, cuatriInicio, planTransition = null }) => {
    const [materias, setMaterias] = useState([]);
    const [sourceMaterias, setSourceMaterias] = useState([]);
    const [activePlan, setActivePlan] = useState(plan);
    const [targetPlanData, setTargetPlanData] = useState({
        targetPlan: null,
        materiasTarget: [],
        equivalencias: {},
    });
    const [transitionAppliedInfo, setTransitionAppliedInfo] = useState(null);
    const [preImportedTransitionSnapshot, setPreImportedTransitionSnapshot] = useState(null);

    const [cargando, setCargando] = useState(false);
    const [progresoSimulado, setProgresoSimulado] = useState(null);
    const [progresoBase, setProgresoBase] = useState(null);
    const [cuatri, setCuatri] = useState('1');
    const [anioActual, setAnioActual] = useState(() => new Date().getFullYear());
    const [historialSemestres, setHistorialSemestres] = useState([]);
    const [simulacionTerminada, setSimulacionTerminada] = useState(false);

    const semestreActualPlan = historialSemestres.length + 1;
    const estadoAnterior = historialSemestres.length > 0;
    const estadoSiguiente = !simulacionTerminada;

    // ─── Carga de materias e inicialización (y datos de transición 17.13 -> 17.14) ──
    useEffect(() => {
        if (!plan) return;
        let active = true;

        const cargarPlan = async () => {
            setCargando(true);
            try {
                const isSourceTransition = plan === '17.13';
                const hasEqLoader = typeof planService.getEquivalenciasByPlan === 'function';

                const [planData, destPlanData, eqMap] = await Promise.all([
                    planService.getPlanByNumber(plan),
                    isSourceTransition ? planService.getPlanByNumber('17.14') : Promise.resolve(null),
                    isSourceTransition && hasEqLoader
                        ? planService.getEquivalenciasByPlan(plan)
                        : Promise.resolve({}),
                ]);

                if (!active) return;

                if (!planData) {
                    addToast({
                        title: 'Plan no encontrado',
                        description: `No existe el plan "${plan}". Intentá recargar la página.`,
                        color: 'danger',
                    });
                    return;
                }

                const data = planData.materias;
                setMaterias(data);
                setSourceMaterias(data);
                setActivePlan(plan);
                setTransitionAppliedInfo(null);
                setPreImportedTransitionSnapshot(null);

                if (isSourceTransition && destPlanData?.materias) {
                    setTargetPlanData({
                        targetPlan: '17.14',
                        materiasTarget: destPlanData.materias,
                        equivalencias: eqMap || {},
                    });
                } else {
                    setTargetPlanData({
                        targetPlan: null,
                        materiasTarget: [],
                        equivalencias: {},
                    });
                }

                const nuevoProgreso = {};
                data.forEach((m) => {
                    nuevoProgreso[m.codigo] = 'No Cursado';
                });

                const initAnio = Number(anioInicio) || new Date().getFullYear();
                const initCuatri = cuatriInicio || '1';

                const startInTargetPlan =
                    isSourceTransition &&
                    Boolean(destPlanData?.materias?.length) &&
                    Boolean(planTransition?.enabled) &&
                    esPeriodoIgualOPosterior(
                        initAnio,
                        initCuatri,
                        planTransition.anio,
                        planTransition.cuatri,
                    );

                if (startInTargetPlan) {
                    const { progreso1714, equivalenciasCount } = homologarProgresoSimulado1713A1714(
                        nuevoProgreso,
                        destPlanData.materias,
                        eqMap || {},
                    );
                    setPreImportedTransitionSnapshot({
                        activePlan: '17.13',
                        materias: data,
                        progresoSimulado: { ...nuevoProgreso },
                        progresoBase: { ...nuevoProgreso },
                    });
                    setActivePlan('17.14');
                    setMaterias(destPlanData.materias);
                    setProgresoSimulado(progreso1714);
                    setProgresoBase(progreso1714);
                    setTransitionAppliedInfo({
                        fromPlan: '17.13',
                        toPlan: '17.14',
                        anio: initAnio,
                        cuatri: String(initCuatri),
                        equivalenciasCount,
                    });
                } else {
                    setProgresoSimulado(nuevoProgreso);
                    setProgresoBase(nuevoProgreso);
                }

                setAnioActual(initAnio);
                setCuatri(initCuatri);
                setHistorialSemestres([]);
                setSimulacionTerminada(false);
            } catch (error) {
                if (import.meta.env.DEV) console.error(error);
            } finally {
                if (active) setCargando(false);
            }
        };

        cargarPlan();
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plan]);

    const aplicarPaseHaciaTargetPlan = useCallback(
        (progreso1713Actual, targetAnio, targetCuatri, { notify = true, forceFrom1713 = false } = {}) => {
            if (
                (!forceFrom1713 && activePlan !== '17.13') ||
                !targetPlanData.materiasTarget.length
            ) {
                return null;
            }

            const { progreso1714, equivalenciasCount } = homologarProgresoSimulado1713A1714(
                progreso1713Actual,
                targetPlanData.materiasTarget,
                targetPlanData.equivalencias,
            );

            const info = {
                fromPlan: '17.13',
                toPlan: targetPlanData.targetPlan || '17.14',
                anio: Number(targetAnio),
                cuatri: String(targetCuatri),
                equivalenciasCount,
            };

            setActivePlan(info.toPlan);
            setMaterias(targetPlanData.materiasTarget);
            setProgresoSimulado(progreso1714);
            setProgresoBase(progreso1714);
            setTransitionAppliedInfo(info);

            const completadasDestino = targetPlanData.materiasTarget.filter(
                (m) => progreso1714[m.codigo] === 'Cursado',
            ).length;
            if (
                targetPlanData.materiasTarget.length > 0 &&
                completadasDestino === targetPlanData.materiasTarget.length
            ) {
                setSimulacionTerminada(true);
            }

            if (notify) {
                try {
                    addToast({
                        title: `Pase aplicado al Plan ${info.toPlan}`,
                        description: `Se homologaron ${equivalenciasCount} materias desde Plan ${info.fromPlan} para cursar en ${info.cuatri}°C ${info.anio}.`,
                        color: 'success',
                    });
                } catch {
                    /* Toast opcional */
                }
            }

            return { info, progreso1714 };
        },
        [activePlan, targetPlanData],
    );

    /**
     * Sincroniza en caliente el plan activo si el estudiante cambia el hito de transición
     * cuando el cuatrimestre actual ya alcanzó (o dejó de alcanzar) la fecha de pase.
     */
    const syncPlanTransition = useCallback(
        (nextTransition) => {
            if (plan !== '17.13' || !targetPlanData.materiasTarget.length || !progresoSimulado) {
                return;
            }

            const shouldBeInTarget =
                Boolean(nextTransition?.enabled) &&
                esPeriodoIgualOPosterior(
                    anioActual,
                    cuatri,
                    nextTransition.anio,
                    nextTransition.cuatri,
                );

            if (shouldBeInTarget && activePlan === '17.13') {
                setPreImportedTransitionSnapshot({
                    activePlan: '17.13',
                    materias: sourceMaterias,
                    progresoSimulado: { ...progresoSimulado },
                    progresoBase: { ...progresoBase },
                });
                aplicarPaseHaciaTargetPlan(progresoSimulado, anioActual, cuatri, {
                    notify: true,
                    forceFrom1713: true,
                });
            } else if (
                !shouldBeInTarget &&
                activePlan === '17.14' &&
                preImportedTransitionSnapshot &&
                !historialSemestres.some((h) => h.planSemestre === '17.14')
            ) {
                setActivePlan(preImportedTransitionSnapshot.activePlan);
                setMaterias(preImportedTransitionSnapshot.materias);
                setProgresoSimulado(preImportedTransitionSnapshot.progresoSimulado);
                setProgresoBase(preImportedTransitionSnapshot.progresoBase);
                setTransitionAppliedInfo(null);
                setPreImportedTransitionSnapshot(null);
                setSimulacionTerminada(false);
            }
        },
        [
            plan,
            targetPlanData.materiasTarget.length,
            progresoSimulado,
            progresoBase,
            anioActual,
            cuatri,
            activePlan,
            sourceMaterias,
            aplicarPaseHaciaTargetPlan,
            preImportedTransitionSnapshot,
            historialSemestres,
        ],
    );

    // ─── Handlers de navegación ─────────────────────────────────────────────
    const handleAnterior = () => {
        if (historialSemestres.length === 0) return;
        const last = historialSemestres[historialSemestres.length - 1];

        setAnioActual(last.anioActual);
        setCuatri(last.cuatri);

        if (last.preTransitionSnapshot) {
            setActivePlan(last.preTransitionSnapshot.activePlan);
            setMaterias(last.preTransitionSnapshot.materias);
            setProgresoSimulado(last.preTransitionSnapshot.progresoSimulado);
            setProgresoBase(last.preTransitionSnapshot.progresoBase);
            setTransitionAppliedInfo(null);
        } else {
            setProgresoSimulado(last.progresoSnapshot);
            setProgresoBase(last.progresoBaseSnapshot);
        }

        setSimulacionTerminada(false);
        setHistorialSemestres((prev) => prev.slice(0, -1));
    };

    const handleSiguiente = (materiasCursables) => {
        if (!progresoSimulado || !materias.length) return;

        const algunCambio = materiasCursables.some(
            (m) => progresoSimulado[m.codigo] === 'Cursado' && progresoBase[m.codigo] !== 'Cursado',
        );
        if (materiasCursables.length > 0 && !algunCambio) {
            try {
                addToast({
                    title: 'Atención',
                    description: 'Avanzaste sin haber modificado el estado de ninguna materia mostrada.',
                    color: 'warning',
                });
            } catch {
                /* no-op */
            }
        }

        const nextCuatri = cuatri === '1' ? '2' : '1';
        const nextAnio = cuatri === '2' ? Number(anioActual) + 1 : Number(anioActual);

        const cantidadCursados = materias.filter(
            (m) => progresoSimulado[m.codigo] === 'Cursado',
        ).length;
        const completaPlanActual = cantidadCursados === materias.length;

        const mustApplyTransition =
            !completaPlanActual &&
            plan === '17.13' &&
            activePlan === '17.13' &&
            Boolean(planTransition?.enabled) &&
            targetPlanData.materiasTarget.length > 0 &&
            esPeriodoIgualOPosterior(
                nextAnio,
                nextCuatri,
                planTransition.anio,
                planTransition.cuatri,
            );

        let transicionAplicada = null;
        let preTransitionSnapshot = null;

        if (mustApplyTransition) {
            preTransitionSnapshot = {
                activePlan: '17.13',
                materias: [...materias],
                progresoSimulado: { ...progresoSimulado },
                progresoBase: { ...progresoBase },
            };
        }

        const progresoSnapshotActual = { ...progresoSimulado };
        const baseSnapshotActual = { ...progresoBase };

        // Si aplicamos el pase al pasar al próximo cuatrimestre, homologamos sobre 17.14
        if (mustApplyTransition) {
            const pase = aplicarPaseHaciaTargetPlan(progresoSimulado, nextAnio, nextCuatri, {
                notify: true,
            });
            if (pase) {
                transicionAplicada = pase.info;
            }
        } else {
            setProgresoBase({ ...progresoSimulado });
        }

        const semestreCompletado = {
            anioActual,
            cuatri,
            materiasDelSemestre: materiasCursables,
            progresoSnapshot: progresoSnapshotActual,
            progresoBaseSnapshot: baseSnapshotActual,
            planSemestre: activePlan,
            ...(transicionAplicada ? { transicionAplicada } : {}),
            ...(preTransitionSnapshot ? { preTransitionSnapshot } : {}),
        };
        setHistorialSemestres((prev) => [...prev, semestreCompletado]);

        // Trackeamos el avance
        trackAvanceSemestre({ plan: activePlan, anio: anioActual, cuatri });

        const materiasNuevasCursadas = materiasCursables.reduce((acc, m) => {
            if (progresoSimulado[m.codigo] === 'Cursado') acc.push(m.codigo);
            return acc;
        }, []);

        if (materiasNuevasCursadas.length > 0) {
            trackIntencionCursada({
                plan: activePlan,
                materias: materiasNuevasCursadas,
                periodo: `${anioActual}-C${cuatri}`,
            });
        }

        if (completaPlanActual) {
            setSimulacionTerminada(true);
            const anioEgreso = Number(anioActual) + Math.ceil(semestreActualPlan / 2);
            trackProyeccionEgreso({
                plan: activePlan,
                semestres_totales: semestreActualPlan,
                anio_proyeccion: anioEgreso,
            });

            const DURACION_TEORICA = 10;
            if (semestreActualPlan > DURACION_TEORICA * 1.5) {
                trackAlertaDesercion({
                    plan: activePlan,
                    semestres_proyectados: semestreActualPlan,
                    exceso_porcentaje: Math.round(
                        ((semestreActualPlan - DURACION_TEORICA) / DURACION_TEORICA) * 100,
                    ),
                });
            }
        } else {
            setCuatri(nextCuatri);
            setAnioActual(nextAnio);
        }
    };

    const importarHistorialReconstruido = (datos) => {
        if (!datos) return;
        const historialConPlan = (datos.historial || []).map((item) => ({
            ...item,
            planSemestre: item.planSemestre || plan,
        }));
        setHistorialSemestres(historialConPlan);
        setAnioActual(datos.anioFinal);
        setCuatri(datos.cuatriFinal);
        setSimulacionTerminada(false);

        const shouldTransitionImmediately =
            plan === '17.13' &&
            Boolean(planTransition?.enabled) &&
            targetPlanData.materiasTarget.length > 0 &&
            esPeriodoIgualOPosterior(
                datos.anioFinal,
                datos.cuatriFinal,
                planTransition.anio,
                planTransition.cuatri,
            );

        if (shouldTransitionImmediately) {
            setPreImportedTransitionSnapshot({
                activePlan: '17.13',
                materias: sourceMaterias,
                progresoSimulado: { ...datos.progresoFinal },
                progresoBase: { ...datos.progresoFinal },
            });
            aplicarPaseHaciaTargetPlan(
                datos.progresoFinal,
                datos.anioFinal,
                datos.cuatriFinal,
                { notify: true, forceFrom1713: true },
            );
        } else {
            if (sourceMaterias.length > 0 && activePlan !== plan) {
                setMaterias(sourceMaterias);
            }
            setActivePlan(plan);
            setTransitionAppliedInfo(null);
            setPreImportedTransitionSnapshot(null);
            setProgresoSimulado(datos.progresoFinal);
            setProgresoBase(datos.progresoFinal);
        }
    };

    const cargarSimulacionGuardada = useCallback(
        (savedData) => {
            if (!savedData || !Array.isArray(savedData.historialSemestres)) return;

            const savedActivePlan = savedData.activePlan || plan;
            if (
                savedActivePlan === '17.14' &&
                plan === '17.13' &&
                targetPlanData.materiasTarget.length > 0
            ) {
                setActivePlan('17.14');
                setMaterias(targetPlanData.materiasTarget);
                setTransitionAppliedInfo(savedData.transitionAppliedInfo || null);
            } else {
                if (sourceMaterias.length > 0) {
                    setMaterias(sourceMaterias);
                }
                setActivePlan(plan);
                setTransitionAppliedInfo(null);
            }

            setPreImportedTransitionSnapshot(null);
            setHistorialSemestres(savedData.historialSemestres);
            setProgresoSimulado(savedData.progresoSimulado || {});
            setProgresoBase(savedData.progresoBase || savedData.progresoSimulado || {});
            setAnioActual(Number(savedData.anioActual) || new Date().getFullYear());
            setCuatri(String(savedData.cuatri || '1'));
            setSimulacionTerminada(Boolean(savedData.simulacionTerminada));
        },
        [plan, sourceMaterias, targetPlanData.materiasTarget],
    );

    return {
        materias,
        sourceMaterias,
        activePlan,
        targetPlanData,
        transitionAppliedInfo,
        cargando,
        progresoSimulado,
        setProgresoSimulado,
        progresoBase,
        setProgresoBase,
        cuatri,
        setCuatri,
        anioActual,
        historialSemestres,
        setHistorialSemestres,
        semestreActualPlan,
        estadoAnterior,
        estadoSiguiente,
        simulacionTerminada,
        setSimulacionTerminada,
        handleAnterior,
        handleSiguiente,
        importarHistorialReconstruido,
        syncPlanTransition,
        cargarSimulacionGuardada,
    };
};

export default useSimuladorEstado;
