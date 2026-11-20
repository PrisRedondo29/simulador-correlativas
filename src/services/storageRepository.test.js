import { describe, it, expect } from 'vitest';
import {
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
        repo.setTheme('dark');
        repo.setRaw(STORAGE_KEYS.SIDEBAR_COLLAPSED, 'true');

        repo.clearAcademicCache();

        expect(repo.getProgreso('17.14')).toBeNull();
        expect(repo.getProgresoDetalles('17.14')).toBeNull();
        expect(repo.getSimulacion('17.14')).toBeNull();
        expect(repo.getTheme()).toBe('dark');
        expect(repo.getRaw(STORAGE_KEYS.SIDEBAR_COLLAPSED)).toBe('true');
    });

    it('registra la versión de esquema actual con ensureSchemaVersion', () => {
        const mem = createMemoryStorage();
        const repo = createStorageRepository(mem);

        expect(repo.ensureSchemaVersion()).toBe(STORAGE_SCHEMA_VERSION);
        expect(Number(mem.getItem(STORAGE_KEYS.SCHEMA_VERSION))).toBe(STORAGE_SCHEMA_VERSION);
    });
});
