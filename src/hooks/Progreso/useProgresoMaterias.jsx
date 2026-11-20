import { useEffect } from 'react';
import { trackCambioMateria, trackRecursada } from '../../services/analyticsService';
import {
    aplicarCambioEstado,
    aplicarCambioMasivo,
    sincronizarTesina,
} from '../../utils/Progreso/materiaStateMachine';

/**
 * Adaptador React de la máquina de estados académica (`materiaStateMachine`).
 * Conecta el motor puro con el estado local, persistencia en nube y analytics.
 */
const useProgresoMaterias = (progreso, setProgreso, materias, plan, updateAuthProgreso) => {
    // Vigilante pasivo de la Tesina al cargar datos previos desde almacenamiento/nube
    useEffect(() => {
        const { progreso: synced, huboCambios } = sincronizarTesina(progreso, materias);
        if (huboCambios) {
            setProgreso(synced);
        }
    }, [progreso, materias, setProgreso]);

    const cambioDeEstado = (codigoMateria, targetState = null) => {
        const {
            nuevoProgreso,
            materiaActual,
            estadoInicial,
            estadoNuevo,
            esRecursada,
        } = aplicarCambioEstado(progreso, materias, codigoMateria, targetState);

        if (!materiaActual || !estadoNuevo) return;

        setProgreso(nuevoProgreso);
        updateAuthProgreso(plan, nuevoProgreso);

        trackCambioMateria({ plan, codigoMateria, estadoNuevo });

        if (esRecursada) {
            trackRecursada({
                plan,
                materia_codigo: codigoMateria,
                materia_nombre: materiaActual.nombre,
                estado_anterior: estadoInicial,
            });
        }
    };

    const cambioDeEstadoMultiple = (codigosMaterias, targetState) => {
        const { nuevoProgreso, materiasModificadas } = aplicarCambioMasivo(
            progreso,
            materias,
            codigosMaterias,
            targetState,
        );

        if (materiasModificadas.length > 0) {
            materiasModificadas.forEach((codigoMateria) => {
                trackCambioMateria({ plan, codigoMateria, estadoNuevo: targetState });
            });
            setProgreso(nuevoProgreso);
            updateAuthProgreso(plan, nuevoProgreso);
        }
    };

    return { cambioDeEstado, cambioDeEstadoMultiple };
};

export default useProgresoMaterias;
