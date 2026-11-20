import { describe, it, expect } from 'vitest';
import {
    DEFAULT_UNLU_ACADEMIC_RULES,
    UNLU_TENANT_CONFIG,
    createTenantConfig,
    getActiveTenantConfig,
} from './tenantConfig';
import {
    calcularEstadoConsolidado,
    obtenerPlanificacionInstancias,
    verificarVencimientoIntentos,
} from '../utils/Progreso/regularidadUtils';

describe('tenantConfig - Configuración institucional declarativa y reglas académicas B2B', () => {
    it('expone la configuración institucional por defecto de la UNLu', () => {
        const tenant = getActiveTenantConfig();
        expect(tenant).toBe(UNLU_TENANT_CONFIG);
        expect(tenant.id).toBe('unlu');
        expect(tenant.shortName).toBe('UNLu');
        expect(tenant.academicRules).toEqual(DEFAULT_UNLU_ACADEMIC_RULES);
        expect(tenant.academicRules.cuatrimestresRegularidad).toBe(5);
        expect(tenant.academicRules.intentosFinal).toBe(4);
        expect(tenant.academicRules.ausenteDescuentaIntento).toBe(false);
    });

    it('createTenantConfig permite parametrizar otra universidad (ej: 3 finales donde ausente sí descuenta intento)', () => {
        const otraUni = createTenantConfig({
            id: 'utn-demo',
            name: 'Universidad Tecnológica Demo',
            shortName: 'UTN Demo',
            academicRules: {
                cuatrimestresRegularidad: 6,
                intentosFinal: 3,
                ausenteDescuentaIntento: true,
            },
            operationModes: {
                identityMode: 'none',
                storageMode: 'local_only',
            },
        });

        expect(otraUni.shortName).toBe('UTN Demo');
        expect(otraUni.operationModes.storageMode).toBe('local_only');

        // 2 reprobados + 1 ausente = 3 intentos consumidos
        const intentosMixtos = [
            { estado: 'reprobado', nota: 2 },
            { estado: 'ausente', nota: null },
            { estado: 'reprobado', nota: 3 },
        ];

        // Con reglas UNLu (4 finales y ausente NO descuenta): sigue Regular con 2 intentos restantes
        expect(verificarVencimientoIntentos(intentosMixtos)).toBe(false);
        expect(obtenerPlanificacionInstancias(null, intentosMixtos).intentosRestantes).toBe(2);

        // Con reglas de la otra universidad (3 finales y ausente SÍ descuenta): pasa a Libre (0 restantes)
        expect(verificarVencimientoIntentos(intentosMixtos, otraUni.academicRules)).toBe(true);
        expect(
            calcularEstadoConsolidado('Regular', null, intentosMixtos, otraUni.academicRules),
        ).toBe('Libre');
        expect(
            obtenerPlanificacionInstancias(null, intentosMixtos, otraUni.academicRules)
                .intentosRestantes,
        ).toBe(0);
    });
});
