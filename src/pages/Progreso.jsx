import { useEffect, useRef, useState } from 'react';
import MateriasList from '../components/Progreso/MateriasList';
import ProgresoTotal from '../components/Progreso/ProgresoTotal';
import { Button, Spinner } from '@heroui/react';
import { Network } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LeyendaEstados from '../components/Progreso/LeyendaEstados';
import PlanSelectionModal from '../components/Progreso/modals/PlanSelectionModal';
import ConsejoAvanzadosModal from '../components/Progreso/modals/ConsejoAvanzadosModal';
import usePlanData from '../hooks/usePlanData';
import ProgresoSearchFilters from '../components/Progreso/ProgresoSearchFilters';
import InfoStatusBanner from '../components/Progreso/InfoStatusBanner';

function Progreso({ plan, setPlan }) {
    const navigate = useNavigate();
    // Usamos el hook centralizado para la carga de datos y progreso
    const { 
        materias, 
        progreso, 
        setProgreso, 
        progresoDetalles, 
        setProgresoDetalles, 
        cargandoPlan: cargando 
    } = usePlanData(plan);

    const carrera = "Licenciatura en Sistemas de Información";
    const headerRef = useRef(null);
    const [isSticky, setIsSticky] = useState(false);
    const [isAvanzadosModalOpen, setIsAvanzadosModalOpen] = useState(false);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    // Mostrar modal de consejos para avanzados si hay plan y no se ocultó antes
    useEffect(() => {
        if (plan && !cargando) {
            const ocultar = localStorage.getItem('ocultar_consejo_avanzados');
            if (ocultar !== 'true') {
                // Pequeño delay para que no aparezca justo encima del cargando
                const timer = setTimeout(() => setIsAvanzadosModalOpen(true), 800);
                return () => clearTimeout(timer);
            }
        }
    }, [plan, cargando]);

    // Calcular el progreso total (materias aprobadas)
    const totalProgreso = () => {
        if (!materias.length) return 0;
        let total = 0;
        materias.forEach((m) => {
            const estado = progreso[m.codigo];
            if (estado === 'Aprobado' || estado === 'Promocionado') {
                total += 1;
            }
        });
        return total;
    };
    
    const progress = materias.length > 0 
        ? Math.round((totalProgreso() * 100) / materias.length) 
        : 0;

    const [busqueda, setBusqueda] = useState("");
    const [filtros, setFiltros] = useState([]);

    // Manejo de años abiertos/cerrados subido al nivel superior para compartir el botón con el buscador
    const [isAnioOpen, setIsAnioOpen] = useState(() => {
        const guardado = localStorage.getItem('materias_isAnioOpen:v1');
        if (guardado) {
            try { return JSON.parse(guardado); } catch (e) { return []; }
        }
        return [];
    });

    useEffect(() => {
        localStorage.setItem('materias_isAnioOpen:v1', JSON.stringify(isAnioOpen));
    }, [isAnioOpen]);

    const handleMostrarTodo = () => {
        if (isAnioOpen.length > 0) {
            setIsAnioOpen([]);
        } else {
            const anios = [...new Set(materias.map((m) => Number(m.anio)))].toSorted((a, b) => a - b);
            setIsAnioOpen(anios);
        }
    };

    return (
        <div className="overflow-visible bg-default-100 min-h-screen">
            <PlanSelectionModal 
                isOpen={!plan} 
                onSelect={(selectedPlan) => setPlan(selectedPlan)} 
            />

            {cargando && (
                <div className='flex justify-center items-center h-screen'>
                    <Spinner size="lg" label="Cargando materias..." />
                </div>
            )}

            {!cargando && plan && (
                <div>
                    <ProgresoTotal
                        carrera={carrera}
                        plan={plan}
                        progress={progress}
                        progreso={progreso}
                        progresoDetalles={progresoDetalles}
                        materias={materias}
                        isSticky={isSticky}
                        headerRef={headerRef}
                        setIsSticky={setIsSticky}
                    />
                    <div className='mx-5 md:mx-10 lg:mx-15 mt-6'>
                        <ConsejoAvanzadosModal />
                        <InfoStatusBanner 
                            materias={materias}
                            progreso={progreso}
                            progresoDetalles={progresoDetalles}
                            filtros={filtros}
                            setFiltros={setFiltros}
                        />
                        <ProgresoSearchFilters 
                            busqueda={busqueda}
                            setBusqueda={setBusqueda}
                            filtros={filtros}
                            setFiltros={setFiltros}
                        />
                        <MateriasList
                            plan={plan}
                            progreso={progreso}
                            setProgreso={setProgreso}
                            progresoDetalles={progresoDetalles}
                            setProgresoDetalles={setProgresoDetalles}
                            materias={materias}
                            cargando={cargando}
                            isProgressSticky={isSticky}
                            busqueda={busqueda}
                            filtros={filtros}
                            isAnioOpen={isAnioOpen}
                            setIsAnioOpen={setIsAnioOpen}
                            handleMostrarTodo={handleMostrarTodo}
                        />
                    </div>

                    <div className="pb-12 mx-5 md:mx-10 lg:mx-15 pt-8 border-t border-default-200 mt-10">
                        <LeyendaEstados materias={materias} />
                    </div>
                </div>
            )}
        </div>
    );
}

export default Progreso;