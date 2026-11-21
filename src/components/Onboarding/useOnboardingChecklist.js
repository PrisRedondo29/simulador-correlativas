import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ESTADOS_MATERIA,
    aplicarCambioEstado,
    aplicarCambioMasivo,
    calcularEstadoBaseMateria,
    obtenerCodigosCorrelativasMateria,
} from '../../utils/Progreso/materiaStateMachine';

const MAX_HISTORY_STEPS = 50;

/**
 * Construye el mapa inicial de estados (`Disponible` sin correlativas previas,
 * `Bloqueado` con correlativas o Tesina).
 * @param {Array<import('../../types/domain').Materia>} [materias]
 */
export function buildInitialProgreso(materias = []) {
    const initial = {};
    materias.forEach((m) => {
        if (!m?.codigo) return;
        if (m.tesis) {
            initial[m.codigo] = ESTADOS_MATERIA.BLOQUEADO;
            return;
        }
        const deps = obtenerCodigosCorrelativasMateria(m);
        initial[m.codigo] =
            deps.length > 0 ? ESTADOS_MATERIA.BLOQUEADO : ESTADOS_MATERIA.DISPONIBLE;
    });
    return initial;
}

/**
 * Hook de checklist rápida para el onboarding con:
 *  - Toggle 1-toque entre Pendiente / Cursando / Regular / Aprobada
 *  - Auto-completado inteligente de correlativas previas vía `materiaStateMachine`
 *  - Aprobación atómica por año completo
 *  - Historial completo Deshacer / Rehacer (Ctrl+Z / Ctrl+Y)
 */
export default function useOnboardingChecklist(materias = []) {
    const [state, setState] = useState(() => ({
        past: [],
        present: buildInitialProgreso(materias),
        future: [],
        lastFeedback: null,
    }));

    const clearFeedback = useCallback(() => {
        setState((prev) => (prev.lastFeedback ? { ...prev, lastFeedback: null } : prev));
    }, []);

    const toggleSubjectState = useCallback(
        (codigo, targetState) => {
            setState((prev) => {
                const materia = materias.find((m) => m.codigo === codigo);
                if (!materia) return prev;

                const currentEstado = prev.present[codigo];
                if (materia.tesis && currentEstado === ESTADOS_MATERIA.BLOQUEADO) {
                    return prev;
                }

                const isUnmarking =
                    currentEstado === targetState ||
                    (targetState === ESTADOS_MATERIA.APROBADO &&
                        currentEstado === ESTADOS_MATERIA.PROMOCIONADO);

                let res;
                let feedback = null;

                if (isUnmarking) {
                    const tempProgreso = {
                        ...prev.present,
                        [codigo]: ESTADOS_MATERIA.DISPONIBLE,
                    };
                    const baseState = calcularEstadoBaseMateria(tempProgreso, materia, materias);
                    res = aplicarCambioEstado(prev.present, materias, codigo, baseState);
                    feedback = {
                        type: 'unmark',
                        text: `${materia.nombre} volvió a ${baseState.toLowerCase()}.`,
                    };
                } else {
                    res = aplicarCambioEstado(prev.present, materias, codigo, targetState);
                    const autoCompletedCount = res.materiasModificadas.filter((cod) => {
                        if (cod === codigo) return false;
                        const before = prev.present[cod];
                        const after = res.nuevoProgreso[cod];
                        return (
                            after &&
                            after !== before &&
                            ['Cursando', 'Regular', 'Aprobado', 'Promocionado'].includes(after)
                        );
                    }).length;

                    if (autoCompletedCount > 0) {
                        feedback = {
                            type: 'cascade',
                            text: `Se completaron automáticamente ${autoCompletedCount} ${
                                autoCompletedCount === 1
                                    ? 'correlativa previa'
                                    : 'correlativas previas'
                            }.`,
                        };
                    }
                }

                const nextPast = [...prev.past, prev.present].slice(-MAX_HISTORY_STEPS);
                return {
                    past: nextPast,
                    present: res.nuevoProgreso,
                    future: [],
                    lastFeedback: feedback,
                };
            });
        },
        [materias],
    );

    const aprobarAnioCompleto = useCallback(
        (codigosAnio = [], labelAnio = 'el bloque') => {
            setState((prev) => {
                const res = aplicarCambioMasivo(
                    prev.present,
                    materias,
                    codigosAnio,
                    ESTADOS_MATERIA.APROBADO,
                );
                if (res.materiasModificadas.length === 0) return prev;

                const nextPast = [...prev.past, prev.present].slice(-MAX_HISTORY_STEPS);
                return {
                    past: nextPast,
                    present: res.nuevoProgreso,
                    future: [],
                    lastFeedback: {
                        type: 'bulk',
                        text: `Se marcaron ${res.materiasModificadas.length} materias aprobadas (${labelAnio}).`,
                    },
                };
            });
        },
        [materias],
    );

    const undo = useCallback(() => {
        setState((prev) => {
            if (prev.past.length === 0) return prev;
            const previous = prev.past[prev.past.length - 1];
            return {
                past: prev.past.slice(0, -1),
                present: previous,
                future: [prev.present, ...prev.future].slice(0, MAX_HISTORY_STEPS),
                lastFeedback: { type: 'undo', text: 'Se deshizo el último cambio.' },
            };
        });
    }, []);

    const redo = useCallback(() => {
        setState((prev) => {
            if (prev.future.length === 0) return prev;
            const next = prev.future[0];
            return {
                past: [...prev.past, prev.present].slice(-MAX_HISTORY_STEPS),
                present: next,
                future: prev.future.slice(1),
                lastFeedback: { type: 'redo', text: 'Se rehizo el cambio.' },
            };
        });
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const target = /** @type {HTMLElement | null} */ (e.target);
            if (
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT' ||
                    target.isContentEditable)
            ) {
                return;
            }
            if (!(e.ctrlKey || e.metaKey) || e.altKey) return;

            const key = e.key.toLowerCase();
            if (key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    const counts = useMemo(() => {
        let aprobadas = 0;
        let regulares = 0;
        let cursando = 0;

        Object.values(state.present).forEach((est) => {
            if (est === ESTADOS_MATERIA.APROBADO || est === ESTADOS_MATERIA.PROMOCIONADO) {
                aprobadas++;
            } else if (est === ESTADOS_MATERIA.REGULAR) {
                regulares++;
            } else if (est === ESTADOS_MATERIA.CURSANDO) {
                cursando++;
            }
        });

        return {
            aprobadas,
            regulares,
            cursando,
            totalMarcadas: aprobadas + regulares + cursando,
        };
    }, [state.present]);

    return {
        progreso: state.present,
        counts,
        canUndo: state.past.length > 0,
        canRedo: state.future.length > 0,
        lastFeedback: state.lastFeedback,
        clearFeedback,
        toggleSubjectState,
        aprobarAnioCompleto,
        undo,
        redo,
    };
}
