/**
 * Contratos canónicos del dominio académico del Simulador de Correlativas UNLu.
 * Sirven como fuente única de tipos para:
 *  - src/config/ (registro multi-carrera y políticas)
 *  - src/services/ (carga dinámica, persistencia local, sincronización y Firebase)
 *  - src/utils/ (máquina de estados, regularidad, notificaciones, transición y simulador)
 *  - Futuras etapas (Calendario/Bitácora y Panel Admin remoto)
 */

// ─── Estados Académicos ───────────────────────────────────────────────────────

export type EstadoMateria =
    | 'Bloqueado'
    | 'Disponible'
    | 'Cursando'
    | 'Regular'
    | 'Aprobado'
    | 'Promocionado'
    | 'Libre';

export type EstadoSimulador = 'Cursado' | 'No Cursado';

export type EstadoProyeccion =
    | 'Aprobada'
    | 'Presente'
    | 'Proyectada'
    | 'Bloqueado'
    | 'NoCursada';

export type EstadoIntentoFinal = 'aprobado' | 'reprobado' | 'ausente';

// ─── Materias, Planes y Progreso ──────────────────────────────────────────────

export interface Materia {
    codigo: string;
    nombre: string;
    anio: string | number;
    cuatrimestre: string | number;
    horas_semanales: string | number;
    horas_totales: string | number;
    correlativas: string[];
    notas?: string[];
    tesis?: boolean;
    mostrarCodigo?: boolean;
}

export interface PlanData {
    plan_numero: string;
    carrera?: string;
    materias: Materia[];
}

export type ProgresoMap = Record<string, EstadoMateria>;

export type ProgresoSimuladorMap = Record<string, EstadoSimulador | EstadoMateria>;

export interface FechaRegularidadObj {
    anio: number;
    cuatrimestre: number;
}

export type FechaRegularidad = FechaRegularidadObj | string;

export interface IntentoFinal {
    fecha?: string;
    nota?: number | string | null;
    estado: EstadoIntentoFinal;
    libro?: string;
    folio?: string;
}

export interface CursadaHistorial {
    fechaRegularidad?: FechaRegularidad | null;
    notaRegularizacion?: number | string | null;
    intentosFinal?: IntentoFinal[];
}

export interface MateriaDetalle {
    fechaRegularidad?: FechaRegularidad | null;
    fechaRegularizacion?: string | null;
    fechaAprobacion?: string | null;
    notaRegularizacion?: number | string | null;
    notaFinal?: number | string | null;
    intentosFinal?: IntentoFinal[];
    historial?: CursadaHistorial[];
}

export type ProgresoDetallesMap = Record<string, MateriaDetalle | null | undefined>;

export interface PlanificacionRegularidad {
    cuatrimestresRestantes: number;
    intentosRestantes: number;
}

export interface ResumenPromedio {
    promedio: number | null;
    promedioSinAplazos: number | null;
    promedioConAplazos: number | null;
    materiasContadas: number;
    totalNotas: number;
}

export interface ProgresoIntermedioResumen {
    porcentaje: number;
    completadas: number;
    totales: number;
}

// ─── Máquina de Estados ───────────────────────────────────────────────────────

export interface CambioEstadoResult {
    nuevoProgreso: ProgresoMap;
    materiaActual: Materia | null;
    estadoInicial: EstadoMateria | null | undefined;
    estadoNuevo: EstadoMateria | null;
    materiasModificadas: string[];
    esRecursada: boolean;
}

export interface CambioMasivoResult {
    nuevoProgreso: ProgresoMap;
    materiasModificadas: string[];
}

export interface SincronizarTesinaResult {
    progreso: ProgresoMap;
    huboCambios: boolean;
}

// ─── Catálogo Multi-Carrera y Políticas ───────────────────────────────────────

export interface PlanFeatureFlags {
    planTransition?: boolean;
    equivalencias?: boolean;
    intermediateTitle?: boolean;
}

export interface IntermediateTitleConfig {
    name: string;
    maxCuatrimestre?: number;
    codigos?: string[];
}

export type EquivalenciasMap = Record<string, string[]>;

export interface EquivalenciasConfig {
    sourcePlan: string;
    targetPlan: string;
    resolution?: string;
    loadData?: () => Promise<{ default?: EquivalenciasMap } | EquivalenciasMap>;
}

export interface TransitionConfig {
    sourcePlan: string;
    targetPlan: string;
    resolution: string;
    shortBadge: string;
    route: string;
    savedHours?: number;
    closingYear?: number;
    loadEquivalencias?: () => Promise<{ default?: EquivalenciasMap } | EquivalenciasMap>;
}

export interface PlanConfig {
    planNumero: string;
    label: string;
    shortTitle?: string;
    statusLabel?: string;
    description?: string;
    estimatedSubjects?: number;
    isDefault?: boolean;
    intermediateTitle?: IntermediateTitleConfig | null;
    features?: PlanFeatureFlags;
    equivalencias?: EquivalenciasConfig | null;
    transition?: TransitionConfig | null;
}

export interface EnrichedPlanConfig extends Omit<PlanConfig, 'planNumero'> {
    planNumero: string | null;
    careerId: string | null;
    carrera: string;
    careerShortName: string;
    planPrefix: string | null;
}

export interface CareerConfig {
    id: string;
    planPrefix: string;
    name: string;
    shortName: string;
    defaultPlan?: string | null;
    available: boolean;
    loadPlans?: () => Promise<{ default?: PlanData[] } | PlanData[]>;
    plans: PlanConfig[];
}

export interface UniversidadConfig {
    id: string;
    name: string;
    shortName: string;
    careers: CareerConfig[];
}

export interface AcademicNavItem {
    name: string;
    icon: string;
    path: string;
    badge?: string;
}

// ─── Notificaciones (Patrón Strategy) ─────────────────────────────────────────

export type NotificationTone = 'danger' | 'warning' | 'info' | 'brand' | 'neutral';

export interface NotificationItem {
    id: string;
    icon: string;
    tone: NotificationTone;
    title: string;
    description: string;
    path: string;
    time: string;
}

export interface NotificationContext {
    activePlan: string;
    careerShortName?: string;
    materias?: Materia[];
    progreso?: ProgresoMap;
    progresoDetalles?: ProgresoDetallesMap;
    isAuthenticated?: boolean;
    canSimulateTransition?: boolean;
    transitionInfo?: TransitionConfig | null;
}

export type NotificationStrategy = (context: NotificationContext) => NotificationItem | null;

// ─── Persistencia (Patrón Repository) ─────────────────────────────────────────

export interface StorageLike {
    readonly length: number;
    key(index: number): string | null;
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export interface StorageWriteOptions {
    silent?: boolean;
}

export interface UserCloudConfig {
    alias?: string;
    planActivo?: string | null;
    tema?: string;
}

// ─── Transición entre Planes ──────────────────────────────────────────────────

export interface OfertaPlanAnual {
    cuatrimestres: number[];
    codigosEspeciales?: string[];
    descripcion: string;
}

export interface OfertaAnualTransicion {
    anio: number;
    plan1713: OfertaPlanAnual;
    plan1714: OfertaPlanAnual;
}

export type OfertaTransicionPorAnio = Record<number, OfertaAnualTransicion>;

export interface ResumenPaso1Transicion {
    totalMaterias: number;
    aprobadasConFinal: Materia[];
    enCursoORegulares: Materia[];
    pendientes: Materia[];
    cantidadAprobadas: number;
    cantidadFuera: number;
}

export interface ResultadoTransicion {
    anioAnalisis: number;
    ofertaAnio: OfertaAnualTransicion;
    escenarioReal: 'A' | 'B';
    avance1713: {
        porcentaje: number;
        aprobadas: number;
        totales: number;
        horasRestantes: number;
        horasTotales: number;
        materiasCursables: Materia[];
        materiasExtinguidas: Materia[];
    };
    avance1714: {
        porcentaje: number;
        aprobadas: number;
        totales: number;
        horasRestantes: number;
        horasTotales: number;
        materiasCursables: Materia[];
        materiasEnBache: Materia[];
        listaAprobadas: Materia[];
    };
    diferenciaHoras: number;
    motivosBache: string[];
    equivalenciasReconocidasCount: number;
}

export interface ElegibilidadTransicion {
    anioEvaluado: number;
    puedeCambiarseHoy: boolean;
    anioHabilitado: number;
    cuatrimestreHabilitado: number;
    periodoHabilitado: string;
    resultadoHoy: ResultadoTransicion | undefined;
    mensajePrincipal: string;
    recomendacionCorta: string;
}

// ─── Simulador de Avance ──────────────────────────────────────────────────────

export interface MateriaImportada extends Materia {
    anioReal: number | null;
    cuatriReal: string | null;
    anioPlan: number;
    cuatriPlan: string;
    esAproximado: boolean;
}

export interface HistorialSemestre {
    anioActual: number;
    cuatri: string;
    materiasDelSemestre: Materia[];
    progresoSnapshot: ProgresoSimuladorMap;
    progresoBaseSnapshot: ProgresoSimuladorMap;
    esImportado?: boolean;
    esVacio?: boolean;
}

export interface ResultadoReconstruccionHistorial {
    historial: HistorialSemestre[];
    progresoFinal: ProgresoSimuladorMap;
    anioFinal: number;
    cuatriFinal: string;
}

export interface ProyeccionItem {
    columna: number;
    estado: EstadoProyeccion;
}

export interface ProyeccionSkippedItem {
    codigo: string;
    materia: Materia;
    columna: number;
    estado: 'NoCursada';
}

export interface ProyeccionCarrera {
    items: Record<string, ProyeccionItem>;
    skippedItems: ProyeccionSkippedItem[];
    labels: Record<number, string>;
    maxCol: number;
}
