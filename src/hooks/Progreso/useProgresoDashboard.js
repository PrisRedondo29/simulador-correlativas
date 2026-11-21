import { useState, useEffect, useMemo, useCallback } from 'react';
import { addToast, useDisclosure } from '@heroui/react';
import { useAuth } from '../../context/AuthContext';
import useProgresoMaterias from './useProgresoMaterias';
import regularidadUtils from '../../utils/Progreso/regularidadUtils';
import tituloIntermedioUtils from '../../utils/Progreso/tituloIntermedioUtils';
import materiasUtils, { esMateriaIncompleta } from '../../utils/Progreso/materiasUtils';
import {
    calcularEstadoBaseMateria,
    previsualizarCascadaCambioEstado,
} from '../../utils/Progreso/materiaStateMachine';
import { trackSearch, trackCambioVista, trackImportarSaweb } from '../../services/analyticsService';
import storageRepository, { STORAGE_KEYS } from '../../services/storageRepository';

/**
 * Centraliza el estado de tablero, filtros, KPIs, acordeones por año,
 * panel contextual y transiciones con cascada para Mis Materias.
 */
export default function useProgresoDashboard({
    plan,
    materias,
    progreso,
    setProgreso,
    progresoDetalles,
    setProgresoDetalles,
}) {
    const { updateAuthProgreso } = useAuth();
    const { cambioDeEstado, cambioDeEstadoMultiple } = useProgresoMaterias(
        progreso,
        setProgreso,
        materias,
        plan,
        updateAuthProgreso
    );

    const [busqueda, setBusqueda] = useState('');
    const [estadoFiltro, setEstadoFiltro] = useState('todas');
    const [soloIncompletas, setSoloIncompletas] = useState(false);
    const [vista, setVista] = useState(() => storageRepository.getRaw(STORAGE_KEYS.PROGRESO_VISTA, 'grid'));
    const [selection, setSelection] = useState({ plan, codigo: null });
    const selectedCodigo = selection.plan === plan ? selection.codigo : null;
    const setSelectedCodigo = useCallback((codigo) => {
        setSelection({ plan, codigo });
    }, [plan]);

    // Modales de flujo de estado
    const { isOpen: isResetOpen, onOpen: onResetOpen, onOpenChange: onResetOpenChange, onClose: onResetClose } = useDisclosure();
    const { isOpen: isConfirmationOpen, onOpen: onConfirmationOpen, onOpenChange: onConfirmationOpenChange, onClose: onConfirmationClose } = useDisclosure();
    const { isOpen: isAprobarAnioOpen, onOpen: onAprobarAnioOpen, onOpenChange: onAprobarAnioOpenChange, onClose: onAprobarAnioClose } = useDisclosure();
    const { isOpen: isSawebImportOpen, onOpen: onSawebImportOpen, onOpenChange: onSawebImportOpenChange } = useDisclosure();

    const [mostrarConfirmacionCascada, setMostrarConfirmacionCascadaState] = useState(() =>
        storageRepository.getMostrarConfirmacionCascada()
    );
    const setMostrarConfirmacionCascada = useCallback((mostrar) => {
        const nextVal = Boolean(mostrar);
        setMostrarConfirmacionCascadaState(nextVal);
        storageRepository.setMostrarConfirmacionCascada(nextVal);
    }, []);
    const [pendingBlockedTransition, setPendingBlockedTransition] = useState(null);
    const [grupoAAprobar, setGrupoAAprobar] = useState(null);

    // Verificar vencimientos pasivos de regularidad al cargar
    useEffect(() => {
        if (!progreso || !progresoDetalles || !Object.keys(progreso).length) return;

        let huboCambios = false;
        const nuevoProgreso = { ...progreso };

        Object.entries(progreso).forEach(([codigo, estado]) => {
            if (estado === 'Regular') {
                const detalles = progresoDetalles[codigo];
                if (detalles?.fechaRegularidad) {
                    const estadoActualizado = regularidadUtils.calcularEstadoConsolidado(
                        'Regular',
                        detalles.fechaRegularidad,
                        detalles.intentosFinal
                    );
                    if (estadoActualizado === 'Libre') {
                        nuevoProgreso[codigo] = 'Libre';
                        huboCambios = true;
                    }
                }
            }
        });

        if (huboCambios) {
            setProgreso(nuevoProgreso);
            updateAuthProgreso(plan, nuevoProgreso, progresoDetalles);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plan, materias.length]);

    useEffect(() => {
        storageRepository.setRaw(STORAGE_KEYS.PROGRESO_VISTA, vista, { silent: true });
        trackCambioVista({ tipo: 'tipo_progreso', valor: vista });
    }, [vista]);

    // Agrupación ordenada por años y talleres (claves siempre String)
    const yearGroups = useMemo(() => {
        if (!materias.length) return [];

        const aniosTotales = [...new Set(materias.filter(m => !m.taller).map(m => Number(m.anio)))]
            .filter(n => !Number.isNaN(n))
            .sort((a, b) => a - b);

        const groups = aniosTotales.map((anio) => {
            const list = materias.filter(m => !m.taller && Number(m.anio) === anio);
            const completedCount = list.filter(m => ['Aprobado', 'Promocionado'].includes(progreso[m.codigo])).length;
            return {
                key: String(anio),
                anioNum: anio,
                isTaller: false,
                label: `${anio}° Año`,
                materias: list,
                completedCount,
                totalCount: list.length,
            };
        }).filter(g => g.materias.length > 0);

        const talleres = materias.filter(m => m.taller === true);
        if (talleres.length > 0) {
            const completedTalleres = talleres.filter(m => ['Aprobado', 'Promocionado'].includes(progreso[m.codigo])).length;
            groups.push({
                key: 'talleres',
                anioNum: null,
                isTaller: true,
                label: 'Talleres',
                materias: talleres,
                completedCount: completedTalleres,
                totalCount: talleres.length,
            });
        }

        return groups;
    }, [materias, progreso]);

    const allYearKeys = useMemo(() => yearGroups.map(g => g.key), [yearGroups]);

    // Estado de acordeones expandidos (siempre strings normalizados)
    const [expandedYears, setExpandedYears] = useState(() => {
        const parsed = storageRepository.getJSON(STORAGE_KEYS.PROGRESO_EXPANDED_YEARS, null);
        if (Array.isArray(parsed)) return parsed.map(String);
        return ['1'];
    });

    useEffect(() => {
        storageRepository.setJSON(STORAGE_KEYS.PROGRESO_EXPANDED_YEARS, expandedYears, { silent: true });
    }, [expandedYears]);

    // Garantizar que si el plan no tiene clave '1' pero sí otras, se expanda al menos una vez al iniciar si estaba vacío por cambio de plan
    const validExpandedYears = useMemo(
        () => expandedYears.filter(k => allYearKeys.includes(k)),
        [expandedYears, allYearKeys]
    );

    const areAllExpanded = allYearKeys.length > 0 && validExpandedYears.length === allYearKeys.length;

    const toggleExpandAll = useCallback(() => {
        if (areAllExpanded) {
            setExpandedYears([]);
        } else {
            setExpandedYears(allYearKeys);
        }
    }, [areAllExpanded, allYearKeys]);

    // Filtrado y búsqueda
    const isFiltering = busqueda.trim().length > 0 || estadoFiltro !== 'todas' || soloIncompletas;

    const filteredMaterias = useMemo(() => {
        const normalize = (text) =>
            String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        const searchNorm = normalize(busqueda.trim());

        return materias.filter((m) => {
            const matchSearch = !searchNorm ||
                normalize(m.nombre).includes(searchNorm) ||
                normalize(m.codigo).includes(searchNorm);

            if (!matchSearch) return false;

            const estado = progreso[m.codigo];
            const detalles = progresoDetalles?.[m.codigo];

            if (soloIncompletas && !esMateriaIncompleta(m, estado, detalles)) {
                return false;
            }

            if (estadoFiltro !== 'todas' && estado !== estadoFiltro) {
                return false;
            }

            return true;
        });
    }, [materias, busqueda, estadoFiltro, soloIncompletas, progreso, progresoDetalles]);

    useEffect(() => {
        if (!busqueda) return;
        const timer = setTimeout(() => {
            trackSearch({
                term: busqueda,
                resultsCount: filteredMaterias.length,
                search_origen: 'progreso',
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [busqueda, filteredMaterias.length]);

    const clearFilters = useCallback(() => {
        setBusqueda('');
        setEstadoFiltro('todas');
        setSoloIncompletas(false);
    }, []);

    // KPIs sin duplicación de información
    const kpis = useMemo(() => {
        const totalMaterias = materias.length;
        const aprobadasCount = materias.filter(m => ['Aprobado', 'Promocionado'].includes(progreso[m.codigo])).length;
        const regularesCount = materias.filter(m => progreso[m.codigo] === 'Regular').length;
        const disponiblesCount = materias.filter(m => progreso[m.codigo] === 'Disponible').length;
        const cursandoCount = materias.filter(m => progreso[m.codigo] === 'Cursando').length;
        const restantesCount = Math.max(0, totalMaterias - aprobadasCount);
        const porcentajeGeneral = totalMaterias > 0 ? Math.round((aprobadasCount * 100) / totalMaterias) : 0;

        const incompletasCount = materias.filter(m =>
            esMateriaIncompleta(m, progreso[m.codigo], progresoDetalles?.[m.codigo])
        ).length;

        const promedios = regularidadUtils.calcularPromedioGeneral(progresoDetalles, progreso);

        const totalHorasCarrera = materias.reduce((acc, m) => acc + (Number(m.horas_totales) || 0), 0);
        const totalHorasProgreso = materias.reduce((acc, m) => {
            const est = progreso[m.codigo];
            if (['Aprobado', 'Promocionado', 'Regular'].includes(est)) {
                return acc + (Number(m.horas_totales) || 0);
            }
            return acc;
        }, 0);

        const tituloIntermedioNombre = tituloIntermedioUtils.getTituloIntermedioNombre(plan);
        const materiasIntermedio = tituloIntermedioUtils.getMateriasIntermedio(plan, materias);
        const progresoIntermedio = tituloIntermedioUtils.calcularProgresoIntermedio(materiasIntermedio, progreso);
        const isIntermedioCompletado = progresoIntermedio.totales > 0 && progresoIntermedio.completadas === progresoIntermedio.totales;

        return {
            totalMaterias,
            aprobadasCount,
            regularesCount,
            disponiblesCount,
            cursandoCount,
            restantesCount,
            porcentajeGeneral,
            incompletasCount,
            promedios,
            totalHorasCarrera,
            totalHorasProgreso,
            tituloIntermedioNombre,
            materiasIntermedio,
            progresoIntermedio,
            isIntermedioCompletado,
        };
    }, [materias, progreso, progresoDetalles, plan]);

    // Transiciones de estado (unificadas para tarjetas y panel contextual sin modal intermedio)
    const procesarTransicion = useCallback((codigo, mappedState) => {
        const materia = materias.find(m => m.codigo === codigo);
        const estadoActual = progreso[codigo];

        if (mappedState === 'Reiniciar') {
            const baseState = calcularEstadoBaseMateria(progreso, materia, materias);
            cambioDeEstado(codigo, baseState);
            return;
        }

        if (mappedState === 'Cursando') {
            const viniendoDeEstadoAvanzado = ['Regular', 'Libre', 'Aprobado', 'Promocionado'].includes(estadoActual);
            const cuatrimestreAuto = materia?.cuatrimestre
                ? (Number(materia.cuatrimestre) % 2 === 0 ? 2 : 1)
                : 1;
            const fechaInicioCursada = {
                anio: new Date().getFullYear(),
                cuatrimestre: cuatrimestreAuto,
            };

            const detallesActuales = progresoDetalles?.[codigo] || {};
            let nuevosDetallesBase = { ...detallesActuales };

            if (viniendoDeEstadoAvanzado) {
                const { historial, ...datosAArchivar } = detallesActuales;
                if ((datosAArchivar.intentosFinal && datosAArchivar.intentosFinal.length > 0) || datosAArchivar.fechaRegularidad) {
                    nuevosDetallesBase = {
                        historial: [
                            ...(historial || []),
                            {
                                ...datosAArchivar,
                                estadoFinal: estadoActual,
                                fechaFin: new Date().toISOString(),
                            },
                        ],
                        intentosFinal: [],
                        fechaRegularidad: null,
                        notaRegularizacion: null,
                        notaFinal: null,
                    };
                }
            }

            const updatedDetalles = {
                ...progresoDetalles,
                [codigo]: {
                    ...nuevosDetallesBase,
                    fechaInicioCursada,
                },
            };
            if (setProgresoDetalles) setProgresoDetalles(updatedDetalles);
            updateAuthProgreso(plan, progreso, updatedDetalles);
            cambioDeEstado(codigo, 'Cursando');
            return;
        }

        if (estadoActual === 'Cursando' && mappedState === 'Regular') {
            const detallesActuales = progresoDetalles?.[codigo];
            if (detallesActuales?.fechaInicioCursada && !detallesActuales.fechaRegularidad) {
                const updatedDetalles = {
                    ...progresoDetalles,
                    [codigo]: {
                        ...detallesActuales,
                        fechaRegularidad: detallesActuales.fechaInicioCursada,
                    },
                };
                if (setProgresoDetalles) setProgresoDetalles(updatedDetalles);
                updateAuthProgreso(plan, progreso, updatedDetalles);
            }
        }

        cambioDeEstado(codigo, mappedState);
    }, [materias, progreso, progresoDetalles, setProgresoDetalles, updateAuthProgreso, plan, cambioDeEstado]);

    const handleCambioDeEstado = useCallback((codigo, targetState) => {
        const estadoActual = progreso[codigo];
        const esEstadoDeAvance = ['Cursando', 'Regular', 'Aprobado', 'Promocionado'].includes(targetState);

        if (esEstadoDeAvance && mostrarConfirmacionCascada) {
            const afectadas = previsualizarCascadaCambioEstado(
                progreso,
                materias,
                codigo,
                /** @type {any} */ (targetState),
            );
            if (afectadas.length > 0 || estadoActual === 'Bloqueado') {
                const materiaObj = materias.find((m) => m.codigo === codigo) || null;
                setPendingBlockedTransition({
                    codigo,
                    nombreMateria: materiaObj?.nombre || codigo,
                    targetState,
                    materiasAfectadas: afectadas,
                });
                onConfirmationOpen();
                return;
            }
        }

        procesarTransicion(codigo, targetState);
    }, [progreso, materias, mostrarConfirmacionCascada, onConfirmationOpen, procesarTransicion]);

    const confirmarCascada = useCallback(() => {
        if (pendingBlockedTransition) {
            if (typeof pendingBlockedTransition.onAfterConfirm === 'function') {
                pendingBlockedTransition.onAfterConfirm();
            } else {
                procesarTransicion(pendingBlockedTransition.codigo, pendingBlockedTransition.targetState);
            }
            setPendingBlockedTransition(null);
        }
    }, [pendingBlockedTransition, procesarTransicion]);

    const solicitarConfirmacionCascada = useCallback(({ codigo, targetState, onConfirmAction }) => {
        const afectadas = previsualizarCascadaCambioEstado(
            progreso,
            materias,
            codigo,
            /** @type {any} */ (targetState),
        );
        if (afectadas.length > 0 && mostrarConfirmacionCascada) {
            const materiaObj = materias.find((m) => m.codigo === codigo) || null;
            setPendingBlockedTransition({
                codigo,
                nombreMateria: materiaObj?.nombre || codigo,
                targetState,
                materiasAfectadas: afectadas,
                onAfterConfirm: onConfirmAction,
            });
            onConfirmationOpen();
            return true;
        }
        onConfirmAction();
        return false;
    }, [progreso, materias, mostrarConfirmacionCascada, onConfirmationOpen]);

    const reestablecerProgreso = useCallback(() => {
        const progresoInicial = {};
        materias.forEach(m => {
            if (m.tesis) {
                progresoInicial[m.codigo] = materiasUtils.bloquear;
            } else {
                progresoInicial[m.codigo] = m.correlativas.length > 0 ? materiasUtils.bloquear : materiasUtils.estadosPosibles[0];
            }
        });

        updateAuthProgreso(plan, progresoInicial, {});
        setProgreso(progresoInicial);
        if (setProgresoDetalles) setProgresoDetalles({});
        setSelectedCodigo(null);
        onResetClose();
    }, [materias, updateAuthProgreso, plan, setProgreso, setProgresoDetalles, setSelectedCodigo, onResetClose]);

    const selectedMateria = useMemo(
        () => materias.find(m => m.codigo === selectedCodigo) || null,
        [materias, selectedCodigo]
    );

    const requestApproveGroup = useCallback((label, materiasGrupo) => {
        setGrupoAAprobar({ label, materias: materiasGrupo });
        onAprobarAnioOpen();
    }, [onAprobarAnioOpen]);

    const confirmApproveGroup = useCallback(() => {
        if (grupoAAprobar) {
            const codigos = grupoAAprobar.materias.map(m => m.codigo);
            cambioDeEstadoMultiple(codigos, materiasUtils.estadosPosibles[2]);
        }
        onAprobarAnioClose();
    }, [grupoAAprobar, cambioDeEstadoMultiple, onAprobarAnioClose]);

    const importarDesdeSaweb = useCallback((parsedResult) => {
        if (!parsedResult || !plan) return;

        if (storageRepository.hasExistingAcademicData()) {
            storageRepository.saveRecoveryBackup(storageRepository.readAcademicBundle(), {
                reason: 'pre_saweb_import',
            });
        }

        const nextProgreso = parsedResult.progreso || {};
        const nextDetalles = parsedResult.progresoDetalles || {};

        setProgreso(nextProgreso);
        setProgresoDetalles(nextDetalles);
        updateAuthProgreso(plan, nextProgreso, nextDetalles);

        trackImportarSaweb({
            plan,
            detectedPlan: parsedResult.detectedPlan,
            totalImported: parsedResult.totalMatched,
            usedAnalitico: Boolean(parsedResult.sourcesDetected?.analitico),
            usedCursadas: Boolean(parsedResult.sourcesDetected?.cursadas),
        });

        addToast({
            title: 'Progreso importado desde SAWeb',
            description: `Se actualizaron ${parsedResult.totalMatched} materias en el Plan ${plan}.`,
            color: 'success',
        });
    }, [plan, setProgreso, setProgresoDetalles, updateAuthProgreso]);

    return {
        // Filtros y búsqueda
        busqueda,
        setBusqueda,
        estadoFiltro,
        setEstadoFiltro,
        soloIncompletas,
        setSoloIncompletas,
        vista,
        setVista,
        isFiltering,
        filteredMaterias,
        clearFilters,

        // Acordeones por año
        yearGroups,
        expandedYears: validExpandedYears,
        setExpandedYears,
        areAllExpanded,
        toggleExpandAll,

        // KPIs
        kpis,

        // Selección y panel contextual
        selectedCodigo,
        setSelectedCodigo,
        selectedMateria,

        // Acciones de estado y modales
        cambioDeEstado,
        handleCambioDeEstado,

        // Cascada
        isConfirmationOpen,
        onConfirmationOpenChange,
        onConfirmationClose,
        pendingBlockedTransition,
        confirmarCascada,
        mostrarConfirmacionCascada,
        setMostrarConfirmacionCascada,
        solicitarConfirmacionCascada,

        // Reset, Aprobar hasta e Importación SAWeb
        isResetOpen,
        onResetOpen,
        onResetOpenChange,
        onResetClose,
        reestablecerProgreso,
        grupoAAprobar,
        isAprobarAnioOpen,
        onAprobarAnioOpenChange,
        onAprobarAnioClose,
        requestApproveGroup,
        confirmApproveGroup,
        isSawebImportOpen,
        onSawebImportOpen,
        onSawebImportOpenChange,
        importarDesdeSaweb,
    };
}
