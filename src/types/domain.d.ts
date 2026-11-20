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

// ─── Materias, Planes y Progreso (Esquema Canónico v2 Híbrido) ───────────────

export type CondicionCorrelativa = 'regular' | 'aprobada';

export interface RequisitoCorrelativa {
    codigo: string;
    condicion?: CondicionCorrelativa;
}

export type EntradaCorrelativa = string | RequisitoCorrelativa;

export interface RequisitosEspecialesMateria {
    todasLasMateriasAprobadas?: boolean;
    minimoMateriasAprobadas?: number;
    minimoHorasAprobadas?: number;
    minimoCreditos?: number;
    aniosCompletosAprobados?: Array<number | string>;
    descripcion?: string;
}

export interface RequisitoFaltanteCorrelativa {
    tipo: 'correlativa';
    codigo: string;
    nombre: string;
    condicionRequerida: CondicionCorrelativa;
    estadoActual: EstadoMateria;
}

export interface RequisitoFaltanteEspecial {
    tipo:
        | 'todas_aprobadas'
        | 'minimo_materias_aprobadas'
        | 'minimo_horas_aprobadas'
        | 'minimo_creditos'
        | 'anio_completo_aprobado';
    mensaje: string;
    actual: number;
    requerido: number;
    anio?: number;
}

export interface ElegibilidadMateriaResult {
    puedeCursar: boolean;
    puedeRendirFinal: boolean;
    requisitosCursada: Required<RequisitoCorrelativa>[];
    requisitosFinal: Required<RequisitoCorrelativa>[];
    faltantesParaCursar: RequisitoFaltanteCorrelativa[];
    faltantesParaFinal: RequisitoFaltanteCorrelativa[];
    requisitosEspecialesFaltantes: RequisitoFaltanteEspecial[];
    tieneReglasDiferenciadas: boolean;
}

export interface Materia {
    codigo: string;
    nombre: string;
    anio: string | number | null;
    cuatrimestre?: string | number | null;
    horas_semanales?: string | number;
    horas_totales?: string | number;
    creditos?: number | string;
    correlativas: string[];
    correlativasCursada?: EntradaCorrelativa[];
    correlativasFinal?: EntradaCorrelativa[];
    requisitosEspeciales?: RequisitosEspecialesMateria | null;
    notas?: string[];
    tesis?: boolean;
    taller?: boolean;
    mostrarCodigo?: boolean;
}

export interface PlanData {
    plan_numero: string;
    carrera?: string;
    version?: number;
    materias: Materia[];
}

export type PlanValidationIssueCode =
    | 'INVALID_PLAN_METADATA'
    | 'EMPTY_SUBJECTS'
    | 'INVALID_SUBJECT_FIELD'
    | 'DUPLICATE_CODE'
    | 'SELF_DEPENDENCY'
    | 'DANGLING_PREREQUISITE'
    | 'CYCLE_DETECTED';

export interface PlanValidationIssue {
    code: PlanValidationIssueCode;
    severity: 'error' | 'warning';
    codigoMateria?: string;
    mensaje: string;
    detalles?: Record<string, unknown>;
}

export interface PlanValidationResult {
    ok: boolean;
    errores: PlanValidationIssue[];
    advertencias: PlanValidationIssue[];
    ciclos: string[][];
    planNormalizado: PlanData | null;
}

export interface PlanDiffCambioCorrelativa {
    codigo: string;
    nombre: string;
    correlativasAntes: string[];
    correlativasDespues: string[];
    cursadaAntes: Required<RequisitoCorrelativa>[];
    cursadaDespues: Required<RequisitoCorrelativa>[];
    finalAntes: Required<RequisitoCorrelativa>[];
    finalDespues: Required<RequisitoCorrelativa>[];
}

export interface PlanVersionDiff {
    materiasAgregadas: Array<{ codigo: string; nombre: string }>;
    materiasEliminadas: Array<{ codigo: string; nombre: string }>;
    materiasRenombradas: Array<{ codigo: string; nombreAntes: string; nombreDespues: string }>;
    cambiosCorrelativas: PlanDiffCambioCorrelativa[];
    requiereMapeoCodigos: boolean;
    tieneImpactoCascada: boolean;
    totalCambios: number;
}

export interface PublishedPlanSnapshot {
    plan_numero: string;
    carrera?: string;
    version: number;
    materias: Materia[];
    changelogMessage?: string | null;
    codeMappings?: Record<string, string> | null;
    updatedAt?: string | null;
    appliedVersion?: number;
}

export interface CatalogMetaEntry {
    version: number;
    updatedAt?: string | null;
    changelogMessage?: string | null;
}

export interface CatalogMetaCache {
    checkedAt: number;
    plans: Record<string, CatalogMetaEntry>;
}

export interface PlanUpdateNotice {
    planNumero: string;
    version: number;
    previousVersion: number;
    changelogMessage: string | null;
    codigosMigrados: Array<{ desde: string; hacia: string }>;
    materiasRecalculadas: string[];
    appliedAt: string;
}

export interface PlanMigrationResult {
    applied: boolean;
    progreso: ProgresoMap;
    progresoDetalles: ProgresoDetallesMap;
    cursada: CursadaPlanData | null;
    codigosMigrados: Array<{ desde: string; hacia: string }>;
    materiasRecalculadas: string[];
    notice: PlanUpdateNotice | null;
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

export interface MateriaCascadaPreview {
    codigo: string;
    nombre: string;
    estadoAnterior: EstadoMateria;
    estadoNuevo: EstadoMateria;
}

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
    cursada?: CursadaPlanData | null;
    planUpdateNotice?: PlanUpdateNotice | null;
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

// ─── Mi Cursada (Calendario, Horarios y Bitácora) ─────────────────────────────

export type TipoEventoCursada = 'parcial' | 'recuperatorio' | 'final' | 'tp' | 'otro';

export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6;

export type ModalidadClase = 'Presencial' | 'Virtual' | 'Híbrida';

export interface EventoCursada {
    id: string;
    titulo: string;
    tipo: TipoEventoCursada;
    /** Fecha calendario ISO sin zona horaria: YYYY-MM-DD */
    fecha: string;
    /** Hora local de reloj opcional: HH:mm */
    hora?: string;
    codigoMateria?: string | null;
    nota?: string;
}

export interface EventoCursadaProximo extends EventoCursada {
    diasRestantes: number;
}

export interface HorarioClase {
    id: string;
    codigoMateria: string;
    dia: DiaSemana;
    /** Hora de inicio: HH:mm */
    horaInicio: string;
    /** Hora de fin: HH:mm */
    horaFin: string;
    aula?: string;
    modalidad?: ModalidadClase;
}

export interface EntradaBitacora {
    id: string;
    /** Fecha calendario ISO sin zona horaria: YYYY-MM-DD */
    fecha: string;
    codigoMateria: string;
    tema: string;
    notas?: string;
}

export interface CursadaPlanData {
    horarios: HorarioClase[];
    eventos: EventoCursada[];
    bitacora: EntradaBitacora[];
}

export interface CalendarCell {
    iso: string;
    day: number;
    inCurrentMonth: boolean;
}

// ─── Sincronización Segura y Control de Concurrencia (Etapa 6A) ───────────────

export type SyncUnitId = 'academic';

export interface AcademicSyncBundle {
    progreso: Record<string, ProgresoMap>;
    progresoDetalles: Record<string, ProgresoDetallesMap>;
    cursada: Record<string, CursadaPlanData>;
    simulaciones: Record<string, unknown>;
}

export type SyncStatus =
    | 'local'
    | 'synced'
    | 'pending'
    | 'syncing'
    | 'conflict'
    | 'account_mismatch'
    | 'error';

export interface SyncBundleSummary {
    planes: string[];
    materiasAprobadas: number;
    materiasActivas: number;
    materiasLibres: number;
    eventosCursada: number;
    horariosCursada: number;
    entradasBitacora: number;
    simulaciones: number;
    totalItems: number;
    isEmpty: boolean;
}

export type SyncConflictReason =
    | 'divergent_login'
    | 'revision_conflict'
    | 'account_mismatch';

export interface SyncConflictContext {
    reason: SyncConflictReason;
    localHash: string;
    remoteHash: string | null;
    localSummary: SyncBundleSummary;
    remoteSummary: SyncBundleSummary | null;
    remoteRevision: number | null;
    remoteBundle: AcademicSyncBundle | null;
    previousUid?: string | null;
    currentUid?: string | null;
}

export interface SyncMeta {
    syncRevision: number | null;
    lastSyncedHash: string | null;
    lastSyncedUid: string | null;
    lastSyncedAt: string | null;
    unit?: SyncUnitId;
}

export interface SyncState {
    status: SyncStatus;
    isOnline: boolean;
    syncRevision: number | null;
    lastSyncedHash: string | null;
    lastSyncedUid: string | null;
    lastSyncedAt: string | null;
    pendingUploadHash: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    conflict: SyncConflictContext | null;
}

export type SyncConciliationOutcome =
    | 'in_sync'
    | 'adopt_remote'
    | 'keep_local_pending'
    | 'conflict'
    | 'account_mismatch';

export interface SyncConciliationResult {
    outcome: SyncConciliationOutcome;
    localHash: string;
    remoteHash: string;
    localSummary: SyncBundleSummary;
    remoteSummary: SyncBundleSummary;
    remoteRevision: number;
    remoteBundle: AcademicSyncBundle;
    previousUid: string | null;
    currentUid: string | null;
}

export interface RecoveryBackup {
    version: number;
    savedAt: string;
    reason: string;
    sourceUid: string | null;
    hash: string;
    summary: SyncBundleSummary;
    bundle: AcademicSyncBundle;
}

export interface RecoveryBackupResult {
    ok: boolean;
    skippedEmpty?: boolean;
    preservedExisting?: boolean;
    backup?: RecoveryBackup | null;
    error?: string;
    message?: string;
}

export interface ApplyRemoteBundleResult {
    ok: boolean;
    backedUp: boolean;
    hash?: string;
    error?: string;
    message?: string;
}

export interface RestoreRecoveryBackupResult {
    ok: boolean;
    bundle?: AcademicSyncBundle;
    backup?: RecoveryBackup;
    error?: string;
    message?: string;
}

export interface ExportBackupPayload {
    app: 'simulador-correlativas-unlu';
    version: number;
    exportedAt: string;
    planActivo: string | null;
    sourceUid: string | null;
    hash: string;
    summary: SyncBundleSummary;
    bundle: AcademicSyncBundle;
}

export interface ParseImportBackupResult {
    ok: boolean;
    bundle?: AcademicSyncBundle;
    planActivo?: string | null;
    exportedAt?: string | null;
    error?: string;
}

export interface FetchCloudBundleResult {
    exists: boolean;
    syncRevision: number;
    bundle: AcademicSyncBundle;
    hash: string;
    isEmpty: boolean;
    config: UserCloudConfig | null;
    rawDoc: Record<string, any> | null;
}

export interface CommitSyncTransactionResult {
    status: 'synced' | 'conflict' | 'error';
    syncRevision?: number;
    uploadedHash?: string;
    syncedAt?: string;
    payloadBytes?: number;
    reason?: 'revision_conflict';
    remoteRevision?: number;
    remoteBundle?: AcademicSyncBundle;
    remoteHash?: string;
    code?: string;
    message?: string;
    originalError?: unknown;
}

export interface UploadAcademicSnapshotResult extends CommitSyncTransactionResult {
    snapshotHash: string;
    currentLocalHash: string;
    hasConcurrentLocalEdits: boolean;
    nextStatus: SyncStatus;
}

export type SyncAction =
    | {
          type: 'LOCAL_MUTATED';
          localHash: string;
          isAuthenticated: boolean;
      }
    | {
          type: 'CONNECTIVITY_CHANGED';
          isOnline: boolean;
      }
    | {
          type: 'CONCILIATION_EVALUATED';
          conciliation: SyncConciliationResult;
          syncedAt?: string | null;
      }
    | {
          type: 'UPLOAD_STARTED';
          uploadingHash: string;
      }
    | {
          type: 'UPLOAD_SUCCEEDED';
          uploadedHash: string;
          currentLocalHash: string;
          newRevision: number;
          syncedAt: string;
          uid: string;
      }
    | {
          type: 'UPLOAD_CONFLICT';
          conflict: SyncConflictContext;
      }
    | {
          type: 'UPLOAD_FAILED';
          errorCode: string;
          errorMessage: string;
      }
    | {
          type: 'CONFLICT_RESOLVED_REMOTE';
          remoteHash: string;
          remoteRevision: number;
          uid: string;
          syncedAt: string;
      }
    | {
          type: 'CONFLICT_RESOLVED_LOCAL';
          localHash: string;
          baseRevision?: number | null;
          currentUid?: string | null;
      }
    | {
          type: 'SIGNED_OUT';
      }
    | {
          type: 'REHYDRATED_FROM_STORAGE';
          currentUid: string | null;
          localBundle: AcademicSyncBundle;
          meta: SyncMeta | null;
      };

