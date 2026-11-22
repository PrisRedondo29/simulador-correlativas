import { describe, it, expect } from 'vitest';
import diplomaturasUtils, {
    calcularProgresoDiplomatura,
    calcularProgresoDiplomaturas,
    getDiplomaturasByPlan,
    getDiplomaturasPorMateria,
} from './diplomaturasUtils';

describe('diplomaturasUtils - Diplomaturas Intracurriculares (Plan 17.14 · Res. HCS 726/24)', () => {
    it('expone las 6 diplomaturas oficiales en Plan 17.14 y lista vacía en Plan 17.13', () => {
        const dipls14 = getDiplomaturasByPlan('17.14');
        const dipls13 = getDiplomaturasByPlan('17.13');

        expect(dipls14).toHaveLength(6);
        expect(dipls14.map((d) => d.shortCode)).toEqual(['INF', 'ADS', 'DSW', 'HRD', 'CDD', 'TDC']);
        expect(dipls13).toEqual([]);
        expect(diplomaturasUtils.getDiplomaturasByPlan('99.01')).toEqual([]);
    });

    it('mapea múltiples diplomaturas por materia (solapamiento N:M) y marca el slot AO-1714 como optativa orientativa', () => {
        const map = getDiplomaturasPorMateria('17.14');

        expect(map['11271'].map((t) => `${t.diplomatura.shortCode}:${t.esOptativa}`)).toEqual([
            'INF:false',
            'DSW:false',
        ]);
        expect(map['11277'].map((t) => `${t.diplomatura.shortCode}:${t.esOptativa}`)).toEqual([
            'DSW:false',
            'CDD:false',
        ]);
        expect(map['21256'].map((t) => `${t.diplomatura.shortCode}:${t.esOptativa}`)).toEqual([
            'INF:false',
            'ADS:false',
        ]);
        expect(map['AO-1714'].map((t) => `${t.diplomatura.shortCode}:${t.esOptativa}`)).toEqual([
            'TDC:true',
        ]);
        expect(map['11091']).toBeUndefined();
    });

    it('calcula progreso contando solo Aprobado y Promocionado (ignora Regular y Cursando)', () => {
        const dipls = getDiplomaturasByPlan('17.14');
        const informatica = dipls.find((d) => d.id === 'informatica');
        expect(informatica).toBeDefined();
        if (!informatica) return;

        const parcial = calcularProgresoDiplomatura(informatica, {
            '19054': 'Aprobado',
            '11271': 'Promocionado',
            '41407': 'Regular',
            '21256': 'Cursando',
        });
        expect(parcial.completadas).toBe(2);
        expect(parcial.totales).toBe(6);
        expect(parcial.faltantesCount).toBe(4);
        expect(parcial.porcentaje).toBe(33);
        expect(parcial.obtenida).toBe(false);

        const completa = calcularProgresoDiplomatura(informatica, {
            '19054': 'Aprobado',
            '11271': 'Promocionado',
            '41407': 'Aprobado',
            '21256': 'Promocionado',
            '41426': 'Aprobado',
            '11274': 'Promocionado',
        });
        expect(completa.completadas).toBe(6);
        expect(completa.faltantesCount).toBe(0);
        expect(completa.porcentaje).toBe(100);
        expect(completa.obtenida).toBe(true);
    });

    it('detecta Compiladores (11809) por codigoOptativa en TDC y no marca TDC como obtenida mientras falte código de Computabilidad', () => {
        const resumen = calcularProgresoDiplomaturas(
            '17.14',
            {
                '14031': 'Aprobado',
                'AO-1714': 'Promocionado',
            },
            {
                'AO-1714': {
                    notaFinal: 9,
                    nombreOptativa: 'Compiladores',
                    codigoOptativa: '11809',
                },
            },
        );

        const tdc = resumen.find((r) => r.shortCode === 'TDC');
        expect(tdc).toBeDefined();
        expect(tdc?.completadas).toBe(2);
        expect(tdc?.totales).toBe(3);
        expect(tdc?.faltantesCount).toBe(1);
        expect(tdc?.tieneOptativaSinCodigo).toBe(true);
        expect(tdc?.obtenida).toBe(false);
    });
});
