import { useState, useEffect, useMemo, useCallback } from 'react';
import usePlanData from '../usePlanData';
import storageRepository, { subscribeStorageChanges } from '../../services/storageRepository';
import { DEFAULT_PLAN } from '../../config/planPolicies';
import {
    normalizarCursadaData,
    generarIdCursada,
    agruparMateriasSelector,
    obtenerEventosProximos,
    detectarSuperposicionesHorarios,
    ordenarHorarios,
    ordenarEventos,
} from '../../utils/Cursada/cursadaUtils';

/**
 * Hook de estado y operaciones CRUD para "Mi Cursada" (horarios, agenda y bitácora).
 * Persiste reactivamente en storageRepository bajo `cursada+${plan}` y se sincroniza
 * con la nube a través del flujo unificado de syncService.
 */
export default function useCursada(planProp) {
    const activePlan = planProp || storageRepository.getPlanActivo() || DEFAULT_PLAN;
    const { materias, progreso, cargandoPlan } = usePlanData(activePlan);

    const [cursadaState, setCursadaState] = useState(() => ({
        plan: activePlan,
        data: normalizarCursadaData(storageRepository.getCursada(activePlan, null)),
    }));

    const cursada = useMemo(() => {
        if (cursadaState.plan === activePlan) return cursadaState.data;
        return normalizarCursadaData(storageRepository.getCursada(activePlan, null));
    }, [cursadaState, activePlan]);

    useEffect(() => {
        const reloadFromStorage = () => {
            setCursadaState({
                plan: activePlan,
                data: normalizarCursadaData(storageRepository.getCursada(activePlan, null)),
            });
        };

        return subscribeStorageChanges(reloadFromStorage);
    }, [activePlan]);

    const persistCursada = useCallback(
        (updater) => {
            setCursadaState((prev) => {
                const base =
                    prev.plan === activePlan
                        ? prev.data
                        : normalizarCursadaData(storageRepository.getCursada(activePlan, null));
                const nextData = normalizarCursadaData(updater(base));
                storageRepository.setCursada(activePlan, nextData);
                return { plan: activePlan, data: nextData };
            });
        },
        [activePlan],
    );

    // ─── CRUD Eventos ─────────────────────────────────────────────────────────
    const addEvento = useCallback(
        (eventoInput) => {
            const nuevoEvento = {
                id: generarIdCursada('ev'),
                titulo: eventoInput.titulo.trim(),
                tipo: eventoInput.tipo,
                fecha: eventoInput.fecha,
                hora: eventoInput.hora?.trim() || '',
                codigoMateria: eventoInput.codigoMateria || null,
                nota: eventoInput.nota?.trim() || '',
            };
            persistCursada((prev) => ({
                ...prev,
                eventos: ordenarEventos([...prev.eventos, nuevoEvento]),
            }));
            return nuevoEvento;
        },
        [persistCursada],
    );

    const deleteEvento = useCallback(
        (eventoId) => {
            persistCursada((prev) => ({
                ...prev,
                eventos: prev.eventos.filter((e) => e.id !== eventoId),
            }));
        },
        [persistCursada],
    );

    const updateEvento = useCallback(
        (eventoId, cambios) => {
            persistCursada((prev) => ({
                ...prev,
                eventos: ordenarEventos(
                    prev.eventos.map((e) =>
                        e.id === eventoId
                            ? {
                                  ...e,
                                  titulo: (cambios.titulo ?? e.titulo).trim(),
                                  tipo: cambios.tipo ?? e.tipo,
                                  fecha: cambios.fecha ?? e.fecha,
                                  hora: (cambios.hora ?? e.hora ?? '').trim(),
                                  codigoMateria:
                                      cambios.codigoMateria !== undefined
                                          ? cambios.codigoMateria || null
                                          : e.codigoMateria,
                                  nota: (cambios.nota ?? e.nota ?? '').trim(),
                              }
                            : e,
                    ),
                ),
            }));
        },
        [persistCursada],
    );

    // ─── CRUD Horarios ────────────────────────────────────────────────────────
    const addHorario = useCallback(
        (horarioInput) => {
            const nuevoHorario = {
                id: generarIdCursada('hor'),
                codigoMateria: horarioInput.codigoMateria,
                dia: Number(horarioInput.dia),
                horaInicio: horarioInput.horaInicio,
                horaFin: horarioInput.horaFin,
                aula: horarioInput.aula?.trim() || '',
                modalidad: horarioInput.modalidad || 'Presencial',
            };
            persistCursada((prev) => ({
                ...prev,
                horarios: ordenarHorarios([...prev.horarios, nuevoHorario]),
            }));
            return nuevoHorario;
        },
        [persistCursada],
    );

    const deleteHorario = useCallback(
        (horarioId) => {
            persistCursada((prev) => ({
                ...prev,
                horarios: prev.horarios.filter((h) => h.id !== horarioId),
            }));
        },
        [persistCursada],
    );

    // ─── CRUD Bitácora liviana ────────────────────────────────────────────────
    const addBitacora = useCallback(
        (entradaInput) => {
            const nuevaEntrada = {
                id: generarIdCursada('bit'),
                fecha: entradaInput.fecha,
                codigoMateria: entradaInput.codigoMateria,
                tema: entradaInput.tema.trim(),
                notas: entradaInput.notas?.trim() || '',
            };
            persistCursada((prev) => ({
                ...prev,
                bitacora: [nuevaEntrada, ...prev.bitacora],
            }));
            return nuevaEntrada;
        },
        [persistCursada],
    );

    const updateBitacora = useCallback(
        (entradaId, cambios) => {
            persistCursada((prev) => ({
                ...prev,
                bitacora: prev.bitacora.map((entry) =>
                    entry.id === entradaId
                        ? {
                              ...entry,
                              fecha: cambios.fecha ?? entry.fecha,
                              codigoMateria: cambios.codigoMateria ?? entry.codigoMateria,
                              tema: (cambios.tema ?? entry.tema).trim(),
                              notas: (cambios.notas ?? entry.notas ?? '').trim(),
                          }
                        : entry,
                ),
            }));
        },
        [persistCursada],
    );

    const deleteBitacora = useCallback(
        (entradaId) => {
            persistCursada((prev) => ({
                ...prev,
                bitacora: prev.bitacora.filter((entry) => entry.id !== entradaId),
            }));
        },
        [persistCursada],
    );

    // ─── Datos derivados ──────────────────────────────────────────────────────
    const materiasAgrupadas = useMemo(
        () => agruparMateriasSelector(materias, progreso),
        [materias, progreso],
    );

    const materiasPorCodigo = useMemo(
        () => new Map(materias.map((m) => [m.codigo, m])),
        [materias],
    );

    const horariosOrdenados = useMemo(
        () => ordenarHorarios(cursada.horarios),
        [cursada.horarios],
    );

    const superposiciones = useMemo(
        () => detectarSuperposicionesHorarios(horariosOrdenados),
        [horariosOrdenados],
    );

    const eventosOrdenados = useMemo(
        () => ordenarEventos(cursada.eventos),
        [cursada.eventos],
    );

    const eventosProximos7Dias = useMemo(
        () => obtenerEventosProximos(eventosOrdenados, { dias: 7 }),
        [eventosOrdenados],
    );

    return {
        activePlan,
        cargandoPlan,
        materias,
        materiasAgrupadas,
        materiasPorCodigo,
        horarios: horariosOrdenados,
        superposiciones,
        eventos: eventosOrdenados,
        eventosProximos7Dias,
        bitacora: cursada.bitacora,
        addEvento,
        updateEvento,
        deleteEvento,
        addHorario,
        deleteHorario,
        addBitacora,
        updateBitacora,
        deleteBitacora,
    };
}
