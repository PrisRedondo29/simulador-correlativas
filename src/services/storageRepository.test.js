import { describe, it, expect } from 'vitest';
import {
    CURRENT_ONBOARDING_VERSION,
    STORAGE_KEYS,
    STORAGE_SCHEMA_VERSION,
    createStorageRepository,
} from './storageRepository';

function createMemoryStorage() {
    const map = new Map();
    return {
        get length() {
            return map.size;
        },
        key: (index) => Array.from(map.keys())[index] ?? null,
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, val) => {
            map.set(key, String(val));
        },
        removeItem: (key) => {
            map.delete(key);
        },
    };
}

describe('storageRepository - Persistencia centralizada y versionada', () => {
    it('lee y escribe progreso y detalles usando las claves oficiales unificadas', () => {
        const mem = createMemoryStorage();
        const repo = createStorageRepository(mem);

        repo.setPlanActivo('17.14');
        repo.setProgreso('17.14', { '11071': 'Aprobado' });
        repo.setProgresoDetalles('17.14', { '11071': { notaFinal: 9 } });

        expect(repo.getPlanActivo()).toBe('17.14');
        expect(mem.getItem('progreso+17.14')).toBe('{"11071":"Aprobado"}');
        expect(mem.getItem('detalles_progreso+17.14')).toBe('{"11071":{"notaFinal":9}}');
        expect(repo.getProgreso('17.14')).toEqual({ '11071': 'Aprobado' });
        expect(repo.getProgresoDetalles('17.14')).toEqual({ '11071': { notaFinal: 9 } });
    });

    it('tolera JSON corrupto devolviendo el fallback sin lanzar excepción', () => {
        const mem = createMemoryStorage();
        mem.setItem('progreso+17.13', '{json_roto');
        const repo = createStorageRepository(mem);

        expect(repo.getProgreso('17.13', {})).toEqual({});
        expect(repo.getProgresoDetalles('17.13', {})).toEqual({});
    });

    it('clearAcademicCache elimina solo datos académicos y conserva preferencias de UI', () => {
        const mem = createMemoryStorage();
        const repo = createStorageRepository(mem);

        repo.setProgreso('17.14', { M1: 'Aprobado' });
        repo.setProgresoDetalles('17.14', { M1: { notaFinal: 8 } });
        repo.setSimulacion('17.14', { anio: 2026 });
        repo.setCursada('17.14', { horarios: [], eventos: [{ id: 'ev-1' }], bitacora: [] });
        repo.setTheme('dark');
        repo.setRaw(STORAGE_KEYS.SIDEBAR_COLLAPSED, 'true');

        expect(repo.getCursada('17.14')?.eventos).toHaveLength(1);

        repo.clearAcademicCache();

        expect(repo.getProgreso('17.14')).toBeNull();
        expect(repo.getProgresoDetalles('17.14')).toBeNull();
        expect(repo.getSimulacion('17.14')).toBeNull();
        expect(repo.getCursada('17.14')).toBeNull();
        expect(repo.getTheme()).toBe('dark');
        expect(repo.getRaw(STORAGE_KEYS.SIDEBAR_COLLAPSED)).toBe('true');
    });

    it('registra la versión de esquema actual con ensureSchemaVersion', () => {
        const mem = createMemoryStorage();
        const repo = createStorageRepository(mem);

        expect(repo.ensureSchemaVersion()).toBe(STORAGE_SCHEMA_VERSION);
        expect(Number(mem.getItem(STORAGE_KEYS.SCHEMA_VERSION))).toBe(STORAGE_SCHEMA_VERSION);
    });

    it('lee y escribe el bloque académico completo (readAcademicBundle / writeAcademicBundle)', () => {
        const mem = createMemoryStorage();
        const repo = createStorageRepository(mem);

        const ok = repo.writeAcademicBundle({
            progreso: { '17.14': { '11071': 'Aprobado' }, '20.08': { '20001': 'Cursando' } },
            progresoDetalles: { '17.14': { '11071': { notaFinal: 10 } } },
            cursada: {
                '17.14': {
                    horarios: [],
                    eventos: [{ id: 'e1', titulo: 'Final', tipo: 'final', fecha: '2026-12-01' }],
                    bitacora: [],
                },
            },
            simulaciones: { '17.14': { anio: 2026 } },
        });

        expect(ok).toBe(true);
        const bundle = repo.readAcademicBundle();
        expect(bundle.progreso['17.14']).toEqual({ '11071': 'Aprobado' });
        expect(bundle.progreso['20.08']).toEqual({ '20001': 'Cursando' });
        expect(bundle.progresoDetalles['17.14']?.['11071']).toEqual({ notaFinal: 10 });
        expect(bundle.cursada['17.14']?.eventos).toHaveLength(1);
        expect(bundle.simulaciones['17.14']).toEqual({ anio: 2026 });
    });

    it('saveRecoveryBackup nunca sobrescribe un respaldo válido con una instantánea vacía', () => {
        const mem = createMemoryStorage();
        const repo = createStorageRepository(mem);

        const validBundle = {
            progreso: { '17.14': { '11071': 'Aprobado' } },
            progresoDetalles: {},
            cursada: {},
            simulaciones: {},
        };

        const first = repo.saveRecoveryBackup(validBundle, {
            reason: 'before_remote_load',
            sourceUid: 'uid-1',
        });
        expect(first.ok).toBe(true);
        expect(first.skippedEmpty).toBe(false);

        // Intentar guardar un bundle vacío o solo con estados por defecto NO debe destruir el respaldo previo
        const second = repo.saveRecoveryBackup(
            {
                progreso: { '17.14': { '11071': 'Disponible', '11072': 'Bloqueado' } },
                progresoDetalles: {},
                cursada: {},
                simulaciones: {},
            },
            { reason: 'empty_attempt' },
        );

        expect(second.ok).toBe(true);
        expect(second.skippedEmpty).toBe(true);
        expect(second.preservedExisting).toBe(true);
        expect(repo.getRecoveryBackup()?.bundle.progreso['17.14']).toEqual({ '11071': 'Aprobado' });
    });

    it('applyRemoteBundleSafely respalda estado local y permite restaurarlo con restoreRecoveryBackup', () => {
        const mem = createMemoryStorage();
        const repo = createStorageRepository(mem);

        repo.setProgreso('17.14', { '11071': 'Aprobado' });

        const applyRes = repo.applyRemoteBundleSafely(
            {
                progreso: { '17.14': { '11071': 'Aprobado', '11072': 'Promocionado' } },
                progresoDetalles: {},
                cursada: {},
                simulaciones: {},
            },
            { reason: 'conflict_choose_remote', sourceUid: 'uid-1', silent: true },
        );

        expect(applyRes.ok).toBe(true);
        expect(applyRes.backedUp).toBe(true);
        expect(repo.getProgreso('17.14')).toEqual({
            '11071': 'Aprobado',
            '11072': 'Promocionado',
        });

        // Restaurar respaldo vuelve exactamente al estado previo
        const restoreRes = repo.restoreRecoveryBackup({ silent: true });
        expect(restoreRes.ok).toBe(true);
        expect(repo.getProgreso('17.14')).toEqual({ '11071': 'Aprobado' });
    });

    it('bloquea la sobrescritura destructiva si falla la creación del backup (ej: QuotaExceededError)', () => {
        const map = new Map();
        const quotaFailingStorage = {
            get length() {
                return map.size;
            },
            key: (index) => Array.from(map.keys())[index] ?? null,
            getItem: (key) => (map.has(key) ? map.get(key) : null),
            setItem: (key, val) => {
                if (key === STORAGE_KEYS.SYNC_RECOVERY_BACKUP) {
                    throw new Error('QuotaExceededError');
                }
                map.set(key, String(val));
            },
            removeItem: (key) => {
                map.delete(key);
            },
        };

        const repo = createStorageRepository(quotaFailingStorage);
        repo.setProgreso('17.14', { '11071': 'Aprobado' });

        const applyRes = repo.applyRemoteBundleSafely(
            {
                progreso: { '17.14': { '11072': 'Regular' } },
                progresoDetalles: {},
                cursada: {},
                simulaciones: {},
            },
            { reason: 'conflict_choose_remote', sourceUid: 'uid-1', silent: true },
        );

        expect(applyRes.ok).toBe(false);
        expect(applyRes.error).toBe('backup_failed');
        // El progreso local previo permanece 100% intacto (no se ejecutó clearAcademicCache)
        expect(repo.getProgreso('17.14')).toEqual({ '11071': 'Aprobado' });
    });

    it('persiste la preferencia de mostrar/ocultar la advertencia de actualización en cascada', () => {
        const mem = createMemoryStorage();
        const repo = createStorageRepository(mem);

        expect(repo.getMostrarConfirmacionCascada()).toBe(true);
        repo.setMostrarConfirmacionCascada(false);
        expect(repo.getMostrarConfirmacionCascada()).toBe(false);
        repo.setMostrarConfirmacionCascada(true);
        expect(repo.getMostrarConfirmacionCascada()).toBe(true);
    });

    it('gestiona versión de onboarding y detecta datos académicos previos reales', () => {
        const mem = createMemoryStorage();
        const repo = createStorageRepository(mem);

        expect(repo.getOnboardingVersionCompleted()).toBe(0);
        expect(repo.hasExistingAcademicData()).toBe(false);

        // Un progreso inicializado vacío (solo Disponible/Bloqueado) no cuenta como uso previo real
        repo.setProgreso('17.14', { M1: 'Disponible', M2: 'Bloqueado' });
        expect(repo.hasExistingAcademicData()).toBe(false);

        // Al registrar una materia en curso/regular/aprobada sí se detecta progreso previo
        repo.setProgreso('17.14', { M1: 'Aprobado', M2: 'Disponible' });
        expect(repo.hasExistingAcademicData()).toBe(true);

        repo.setOnboardingVersionCompleted(CURRENT_ONBOARDING_VERSION);
        expect(repo.getOnboardingVersionCompleted()).toBe(CURRENT_ONBOARDING_VERSION);

        repo.resetOnboardingVersion();
        expect(repo.getOnboardingVersionCompleted()).toBe(0);
    });
});
