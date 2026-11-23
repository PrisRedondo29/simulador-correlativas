import { describe, it, expect, vi } from 'vitest';
import { createActiveTimeTracker, getFeatureNameForRoute } from './analyticsActiveTime';

describe('analyticsActiveTime - medición estimada de tiempo activo sin duplicados', () => {
    it('mapea rutas conocidas y 404 a nombres de funcionalidad consistentes', () => {
        expect(getFeatureNameForRoute('/')).toBe('inicio');
        expect(getFeatureNameForRoute('/mis-materias/')).toBe('mis_materias');
        expect(getFeatureNameForRoute('/ruta-inexistente')).toBe('not_found');
    });

    it('descuenta inactividad (>30 s) y pausa al ocultar la pestaña sin duplicar flush', () => {
        let nowMs = 1_000_000;
        const flushed = [];
        const tracker = createActiveTimeTracker({
            onFlush: (payload) => flushed.push(payload),
            idleTimeoutMs: 30_000,
            minSeconds: 2,
            now: () => nowMs,
            initialVisible: true,
        });

        tracker.startRoute('/simulador');
        // 10s activos
        nowMs += 10_000;
        tracker.recordInteraction();
        // 50s sin interacción -> solo cuentan los 30s hasta el timeout de inactividad
        nowMs += 50_000;
        tracker.recordInteraction();
        // 5s activos más
        nowMs += 5_000;

        // Ocultar pestaña hace flush (10 + 30 + 5 = 45s)
        tracker.setVisible(false);
        // Un pagehide posterior no debe duplicar el intervalo ya emitido
        tracker.flush();

        expect(flushed).toEqual([
            { route: '/simulador', feature: 'simulador', activeSeconds: 45 },
        ]);
    });

    it('ignora intervalos demasiado breves (<2 s) y realiza flush limpio al cambiar de ruta', () => {
        let nowMs = 5_000;
        const onFlush = vi.fn();
        const tracker = createActiveTimeTracker({
            onFlush,
            now: () => nowMs,
        });

        tracker.startRoute('/inicio');
        nowMs += 1_000; // < 2s -> descartado
        tracker.startRoute('/mis-materias');
        expect(onFlush).not.toHaveBeenCalled();

        nowMs += 12_000;
        tracker.startRoute('/estadisticas');
        expect(onFlush).toHaveBeenCalledTimes(1);
        expect(onFlush).toHaveBeenCalledWith({
            route: '/mis-materias',
            feature: 'mis_materias',
            activeSeconds: 12,
        });
    });
});
