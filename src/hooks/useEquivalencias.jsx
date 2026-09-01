import { useState, useEffect, useMemo, useCallback } from 'react';
import planService from '../services/planService';
import equivalenciasData from '../data/equivalencias.json';
import materiasUtils from '../utils/Progreso/materiasUtils';
import { addToast } from '@heroui/react';

export const useEquivalencias = () => {
    const planViejo = useMemo(() => planService.getPlanByNumber("17.13"), []);
    const planNuevo = useMemo(() => planService.getPlanByNumber("17.14"), []);

    const [progreso, setProgreso] = useState(() => {
        const storageKey = "progreso+17.13";
        const storageData = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
        if (storageData) {
            try {
                return JSON.parse(storageData);
            } catch {
                // fallback
            }
        }
        const initial = {};
        planViejo?.materias.forEach(m => {
            initial[m.codigo] = m.tesis ? materiasUtils.bloquear : materiasUtils.estadosPosibles[0];
        });
        return initial;
    });

    const [filtro, setFiltro] = useState('todas');
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        const storageKey = "progreso+17.13";
        const storageData = localStorage.getItem(storageKey);
        if (storageData) {
            try {
                setProgreso(JSON.parse(storageData));
            } catch {
                // fallback
            }
        }
    }, [planViejo]);

    // NUEVO MOTOR DE MAPEO: Grupos de Equivalencia (Many-to-One y One-to-One)
    const gruposEquivalencia = useMemo(() => {
        if (!planViejo || !planNuevo) return [];

        // 1. Mapear todas las materias del Plan Nuevo a sus orígenes
        const grupos = planNuevo.materias.map(mNueva => {
            const codigosOrigen = equivalenciasData[mNueva.codigo] || [];
            const materiasOrigen = planViejo.materias.filter(mVieja => 
                codigosOrigen.includes(mVieja.codigo) || mVieja.codigo === mNueva.codigo
            );

            return {
                id: `grupo-${mNueva.codigo}`,
                materiaNueva: mNueva,
                materiasViejas: materiasOrigen.length > 0 ? materiasOrigen : [],
                esEquivalente: materiasOrigen.length > 0,
                // AHORA: El orden lo dicta el Plan Nuevo
                anio: mNueva.anio,
                cuatrimestre: mNueva.cuatrimestre
            };
        });

        // 2. Identificar materias del Plan Viejo que se quedaron huérfanas (sin equivalencia)
        const codigosViejosMapeados = new Set();
        grupos.forEach(g => g.materiasViejas.forEach(m => codigosViejosMapeados.add(m.codigo)));
        
        const huerfanas = planViejo.materias
            .filter(m => !codigosViejosMapeados.has(m.codigo))
            .map(mVieja => ({
                id: `huerfana-${mVieja.codigo}`,
                materiaNueva: { nombre: "Sin equivalente directo", codigo: "N/A", horas_totales: "0", horas_semanales: "0" },
                materiasViejas: [mVieja],
                esEquivalente: false,
                anio: mVieja.anio,
                cuatrimestre: mVieja.cuatrimestre
            }));

        return [...grupos, ...huerfanas].sort((a, b) => {
            if (a.anio !== b.anio) return parseInt(a.anio) - parseInt(b.anio);
            return parseInt(a.cuatrimestre) - parseInt(b.cuatrimestre);
        });
    }, [planViejo, planNuevo]);

    const materiasFiltradas = useMemo(() => {
        const normalize = (text) => 
            text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        
        const searchNormalized = normalize(busqueda);

        return gruposEquivalencia.filter(grupo => {
            // Busqueda en cualquier materia vieja del grupo o en la nueva
            const matchesBusqueda = 
                normalize(grupo.materiaNueva.nombre).includes(searchNormalized) || 
                grupo.materiasViejas.some(m => normalize(m.nombre).includes(searchNormalized) || m.codigo.includes(busqueda));
            
            // Para el filtro de estado, consideramos el estado del grupo (Equivalencia aceptada si TODAS están aprobadas)
            const todasAprobadas = grupo.materiasViejas.length > 0 && 
                grupo.materiasViejas.every(m => progreso[m.codigo] === materiasUtils.estadosPosibles[2]);
            
            if (filtro === 'aprobadas') return matchesBusqueda && todasAprobadas;
            if (filtro === 'pendientes') return matchesBusqueda && !todasAprobadas;
            
            return matchesBusqueda;
        });
    }, [gruposEquivalencia, progreso, filtro, busqueda]);

    // MOTOR DE CÁLCULO DE HORAS
    const comparativaHoras = useMemo(() => {
        if (!planViejo || !planNuevo) return null;

        // 1. Calcular Horas Plan Viejo
        let viejoTotales = 0;
        let viejoRestantes = 0;
        planViejo.materias.forEach(m => {
            const h = parseInt(m.horas_totales) || 0;
            viejoTotales += h;
            if (progreso[m.codigo] !== materiasUtils.estadosPosibles[2]) {
                viejoRestantes += h;
            }
        });

        // 2. Calcular Horas Plan Nuevo (Considerando herencia de equivalencias compleja)
        let nuevoTotales = 0;
        let nuevoRestantes = 0;

        planNuevo.materias.forEach(m => {
            const h = parseInt(m.horas_totales) || 0;
            nuevoTotales += h;

            const equivs = equivalenciasData[m.codigo];
            let estaAprobada = false;

            if (equivs) {
                // Si tiene equivalencias en el JSON, deben estar TODAS aprobadas en el plan viejo
                estaAprobada = equivs.every(c => progreso[c] === materiasUtils.estadosPosibles[2]);
            } else {
                // Si no tiene equivalencia en JSON, buscamos por código directo
                estaAprobada = progreso[m.codigo] === materiasUtils.estadosPosibles[2];
            }

            if (!estaAprobada) {
                nuevoRestantes += h;
            }
        });

        return {
            viejo: { totales: viejoTotales, restantes: viejoRestantes },
            nuevo: { totales: nuevoTotales, restantes: nuevoRestantes }
        };
    }, [progreso, planViejo, planNuevo]);

    return {
        planViejo,
        planNuevo,
        progreso,
        materiasFiltradas,
        filtro,
        setFiltro,
        busqueda,
        setBusqueda,
        comparativaHoras,
        stats: {
            porcentajeViejo: comparativaHoras?.viejo.totales ? Math.round(((comparativaHoras.viejo.totales - comparativaHoras.viejo.restantes) * 100) / comparativaHoras.viejo.totales) : 0,
            porcentajeNuevo: comparativaHoras?.nuevo.totales ? Math.round(((comparativaHoras.nuevo.totales - comparativaHoras.nuevo.restantes) * 100) / comparativaHoras.nuevo.totales) : 0,
            totalNuevas: planNuevo?.materias.length || 0,
            aprobadasNuevas: planNuevo?.materias.filter(m => {
                const equivs = equivalenciasData[m.codigo];
                return equivs ? equivs.every(c => progreso[c] === materiasUtils.estadosPosibles[2]) : progreso[m.codigo] === materiasUtils.estadosPosibles[2];
            }).length
        }
    };
};
