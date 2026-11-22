// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { jsPDF } from 'jspdf';
import sistemasPlanes from '../../data/sistemas.json';
import useSimuladorPDF, {
    PDF_UNOFFICIAL_FOOTER_DISCLAIMER,
    buildCompleteSimulationSemesters,
    buildPlanillaPlanPDFDocument,
    buildSimuladorPDFDocument,
} from './useSimuladorPDF';

const mockAddToast = vi.fn();
vi.mock('@heroui/react', () => ({
    addToast: (...args) => mockAddToast(...args),
}));

const mockTrackDescargaPDF = vi.fn();
vi.mock('../../services/analyticsService', () => ({
    trackDescargaPDF: (...args) => mockTrackDescargaPDF(...args),
}));

vi.mock('../../services/logService', () => ({
    logError: vi.fn(),
}));

const MOCK_MATERIAS = [
    {
        codigo: '11071',
        nombre: 'Introducción a la Programación',
        anio: 1,
        cuatrimestre: 1,
        horas_semanales: 6,
        horas_totales: 96,
        correlativas: [],
    },
    {
        codigo: '11072',
        nombre: 'Álgebra y Lógica Computacional',
        anio: 1,
        cuatrimestre: 1,
        horas_semanales: 6,
        horas_totales: 96,
        correlativas: [],
    },
    {
        codigo: 'TES-1714',
        mostrarCodigo: false,
        nombre: 'Tesina de Grado',
        anio: 5,
        cuatrimestre: 10,
        horas_semanales: 0,
        horas_totales: 200,
        correlativas: [],
    },
];

function createSpyJsPDFClass(saveMock = vi.fn()) {
    const textCalls = [];
    const rectCalls = [];
    const addPageMock = vi.fn();
    const setPageMock = vi.fn();
    let pageCount = 1;

    class MockJsPDF {
        constructor() {
            this.save = saveMock;
            this.addPage = () => {
                pageCount += 1;
                addPageMock();
            };
            this.getNumberOfPages = () => pageCount;
            this.setPage = setPageMock;
            this.setFillColor = vi.fn();
            this.setDrawColor = vi.fn();
            this.setTextColor = vi.fn();
            this.setLineWidth = vi.fn();
            this.setFont = vi.fn();
            this.setFontSize = vi.fn();
            this.roundedRect = vi.fn();
            this.line = vi.fn();
            this.rect = (...args) => {
                rectCalls.push(args);
            };
            this.getTextWidth = (t) => String(t).length * 2;
            this.splitTextToSize = (t) => [String(t)];
            this.text = (txt, ...rest) => {
                textCalls.push(Array.isArray(txt) ? txt.join(' ') : String(txt));
                return rest;
            };
        }
    }

    return { MockJsPDF, textCalls, rectCalls, addPageMock, setPageMock, saveMock };
}

function HookHarness({ historialSemestres, plan, materias, setDescargandoPDF, loadJsPDF }) {
    const { handleDownloadPDF } = useSimuladorPDF({
        historialSemestres,
        plan,
        materias,
        setDescargandoPDF,
        loadJsPDF,
    });
    return (
        <button type="button" onClick={handleDownloadPDF}>
            Exportar PDF
        </button>
    );
}

describe('useSimuladorPDF - Planilla vectorial imprimible con jsPDF', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('genera tabla vectorial compacta por cuatrimestre con casillas Regular / Aprobada / Promoc. a la izquierda', () => {
        const plan1713 = sistemasPlanes.find((p) => p.plan_numero === '17.13')?.materias || [];
        const intermedioMat = plan1713[0];
        const spy = createSpyJsPDFClass();

        const historial = [
            {
                cuatri: 1,
                anioActual: 2026,
                esImportado: true,
                materiasDelSemestre: [intermedioMat, MOCK_MATERIAS[2]],
                progresoSnapshot: {
                    [intermedioMat.codigo]: 'Cursado',
                    'TES-1714': 'No Cursado',
                },
                progresoBaseSnapshot: {},
            },
        ];

        buildSimuladorPDFDocument({
            jsPDF: /** @type {any} */ (spy.MockJsPDF),
            historialSemestres: historial,
            plan: '17.13',
            materias: [intermedioMat, MOCK_MATERIAS[2]],
        });

        expect(spy.textCalls.some((t) => t.includes('Planificación y Seguimiento Académico'))).toBe(
            true,
        );
        expect(spy.textCalls.some((t) => t.includes('Plan 17.13'))).toBe(true);
        expect(spy.textCalls.some((t) => t.includes('1° Cuatrimestre 2026'))).toBe(true);
        expect(spy.textCalls.some((t) => t.includes('Avance importado'))).toBe(true);
        expect(spy.textCalls.some((t) => t.includes(`${intermedioMat.nombre} [Intermedio]`))).toBe(
            true,
        );
        expect(spy.textCalls.some((t) => t.includes('Disponibles sin cursar (1)'))).toBe(true);

        // Casillas de seguimiento (leyenda + fila importada: al menos 6 rects totales y 1 marcada por defecto)
        expect(spy.textCalls.filter((t) => t === 'Regular').length).toBeGreaterThanOrEqual(2);
        expect(spy.textCalls.filter((t) => t === 'Aprobada').length).toBeGreaterThanOrEqual(2);
        expect(spy.textCalls.filter((t) => t === 'Promoc.').length).toBeGreaterThanOrEqual(1);

        const totalCheckboxes = spy.rectCalls.filter(([, , w, h]) => w === 2.9 && h === 2.9);
        const checkedBoxes = totalCheckboxes.filter(([, , , , style]) => style === 'FD');
        expect(totalCheckboxes.length).toBeGreaterThanOrEqual(6);
        expect(checkedBoxes.length).toBeGreaterThanOrEqual(1);
    });

    it('pagina automáticamente cuando hay muchos cuatrimestres y numera todas las páginas con jsPDF real', () => {
        const plan1714 = sistemasPlanes.find((p) => p.plan_numero === '17.14')?.materias || [];
        const historialLargo = Array.from({ length: 10 }, (_, idx) => {
            const slice = plan1714.slice(idx * 4, idx * 4 + 4);
            const snap = Object.fromEntries(slice.map((m) => [m.codigo, 'Cursado']));
            return {
                cuatri: (idx % 2) + 1,
                anioActual: 2026 + Math.floor(idx / 2),
                materiasDelSemestre: slice,
                progresoSnapshot: snap,
                progresoBaseSnapshot: {},
            };
        });

        const pdfDoc = buildSimuladorPDFDocument({
            jsPDF,
            historialSemestres: historialLargo,
            plan: '17.14',
            materias: plan1714,
        });

        const totalPages = pdfDoc.getNumberOfPages();
        expect(totalPages).toBeGreaterThanOrEqual(2);

        const buffer = pdfDoc.output('arraybuffer');
        expect(buffer.byteLength).toBeGreaterThan(2000);
        // Al ser vectorial puro sin imágenes PNG, pesa solo decenas de KB (< 150 KB)
        expect(buffer.byteLength).toBeLessThan(150 * 1024);
    });

    it('descarga Simulacion_<plan>.pdf sin depender de #historial-container en el DOM', async () => {
        const saveMock = vi.fn();
        const spy = createSpyJsPDFClass(saveMock);
        const setDescargandoPDF = vi.fn();
        const loadJsPDF = vi.fn(async () => ({ jsPDF: /** @type {any} */ (spy.MockJsPDF) }));

        const { getByRole } = render(
            <HookHarness
                historialSemestres={[
                    {
                        cuatri: 1,
                        anioActual: 2026,
                        materiasDelSemestre: [MOCK_MATERIAS[0]],
                        progresoSnapshot: { '11071': 'Cursado' },
                        progresoBaseSnapshot: {},
                    },
                ]}
                plan="17.14"
                materias={MOCK_MATERIAS}
                setDescargandoPDF={setDescargandoPDF}
                loadJsPDF={loadJsPDF}
            />,
        );

        expect(document.getElementById('historial-container')).toBeNull();
        fireEvent.click(getByRole('button', { name: 'Exportar PDF' }));

        await waitFor(() => {
            expect(saveMock).toHaveBeenCalledWith('Simulacion_17.14.pdf');
        });

        expect(loadJsPDF).toHaveBeenCalledTimes(1);
        expect(setDescargandoPDF).toHaveBeenCalledWith(true);
        expect(setDescargandoPDF).toHaveBeenLastCalledWith(false);
        expect(mockTrackDescargaPDF).toHaveBeenCalledWith({ plan: '17.14' });
    });

    it('genera la planilla del plan en blanco y pre-rellenada con progreso, notas y optativas', () => {
        const spyBlank = createSpyJsPDFClass();
        const plan1713 = sistemasPlanes.find((p) => p.plan_numero === '17.13')?.materias || [];
        const subset = [
            plan1713[0], // 11071
            plan1713[1], // 11072
            plan1713.find((m) => m.codigo === 'OP1'),
        ].filter(Boolean);

        buildPlanillaPlanPDFDocument({
            jsPDF: /** @type {any} */ (spyBlank.MockJsPDF),
            materias: subset,
            plan: '17.13',
            includeProgress: false,
        });

        expect(spyBlank.textCalls.some((t) => t.includes('Planilla del Plan de Estudios'))).toBe(true);
        // En blanco no marca ninguna tilde (todas en rect mode 'S')
        const filledBoxesBlank = spyBlank.rectCalls.filter(
            ([, , w, h, style]) => w === 2.9 && h === 2.9 && style === 'FD',
        );
        expect(filledBoxesBlank).toHaveLength(0);

        const spyProgress = createSpyJsPDFClass();
        buildPlanillaPlanPDFDocument({
            jsPDF: /** @type {any} */ (spyProgress.MockJsPDF),
            materias: subset,
            plan: '17.13',
            progreso: {
                [subset[0].codigo]: 'Promocionado',
                [subset[1].codigo]: 'Regular',
                OP1: 'Promocionado',
            },
            progresoDetalles: {
                [subset[0].codigo]: { notaFinal: 8, notaRegularizacion: 8 },
                [subset[1].codigo]: { notaRegularizacion: 6, fechaRegularidad: { anio: 2025, cuatrimestre: 1 } },
                OP1: { notaFinal: 9, notaRegularizacion: 9, nombreOptativa: 'COMPILADORES', codigoOptativa: '11809' },
            },
            includeProgress: true,
        });

        expect(spyProgress.textCalls.some((t) => t.includes('Planilla de Avance Académico'))).toBe(
            true,
        );
        expect(
            spyProgress.textCalls.some((t) => t.includes('Optativa I: COMPILADORES (Acta 11809)')),
        ).toBe(true);
        expect(spyProgress.textCalls).toContain('8');
        expect(spyProgress.textCalls).toContain('9');
        const filledBoxesProgress = spyProgress.rectCalls.filter(
            ([, , w, h, style]) => w === 2.9 && h === 2.9 && style === 'FD',
        );
        // Al menos Promocionado (2) + Regular (1) = 3 casillas marcadas
        expect(filledBoxesProgress.length).toBeGreaterThanOrEqual(3);
    });

    it('imprime el hito de transición 17.13 -> 17.14 dentro del PDF de simulación', () => {
        const spy = createSpyJsPDFClass();
        buildSimuladorPDFDocument({
            jsPDF: /** @type {any} */ (spy.MockJsPDF),
            historialSemestres: [
                {
                    cuatri: '2',
                    anioActual: 2026,
                    planSemestre: '17.13',
                    materiasDelSemestre: [MOCK_MATERIAS[0]],
                    progresoSnapshot: { '11071': 'Cursado' },
                    progresoBaseSnapshot: {},
                    transicionAplicada: {
                        fromPlan: '17.13',
                        toPlan: '17.14',
                        anio: 2027,
                        cuatri: '1',
                        equivalenciasCount: 12,
                    },
                },
            ],
            plan: '17.14',
            materias: MOCK_MATERIAS,
        });

        expect(
            spy.textCalls.some((t) =>
                t.includes('Cambio de plan aplicado (1°C 2027): Plan 17.13 -> Plan 17.14 · 12 materias homologadas'),
            ),
        ).toBe(true);
    });

    it('completa automáticamente el PDF hasta finalizar la carrera por el camino más corto cuando aún faltan materias', () => {
        const materiasCadena = [
            { codigo: 'M1', nombre: 'Intro', anio: 1, cuatrimestre: 1, horas_semanales: 6, horas_totales: 96, correlativas: [] },
            { codigo: 'M2', nombre: 'Prog I', anio: 1, cuatrimestre: 2, horas_semanales: 6, horas_totales: 96, correlativas: ['M1'] },
            { codigo: 'M3', nombre: 'Algo I', anio: 2, cuatrimestre: 3, horas_semanales: 6, horas_totales: 96, correlativas: ['M2'] },
            { codigo: 'TES', nombre: 'Tesina de Grado', anio: 5, cuatrimestre: 11, horas_totales: 120, correlativas: [], tesis: true },
        ];

        const completos = buildCompleteSimulationSemesters({
            historialSemestres: [
                {
                    cuatri: '1',
                    anioActual: 2026,
                    materiasDelSemestre: [materiasCadena[0]],
                    progresoSnapshot: { M1: 'Cursado', M2: 'No Cursado', M3: 'No Cursado', TES: 'No Cursado' },
                    progresoBaseSnapshot: {},
                    planSemestre: '17.14',
                },
            ],
            materias: materiasCadena,
            progresoSimulado: { M1: 'Cursado', M2: 'No Cursado', M3: 'No Cursado', TES: 'No Cursado' },
            progresoBase: { M1: 'Cursado', M2: 'No Cursado', M3: 'No Cursado', TES: 'No Cursado' },
            anioActual: 2026,
            cuatri: '2',
            plan: '17.14',
        });

        expect(completos.map((s) => `${s.cuatri}°C-${s.anioActual}`)).toEqual([
            '1°C-2026',
            '2°C-2026',
            '1°C-2027',
            '2°C-2027',
        ]);
        expect(completos[1].esProyectado).toBe(true);
        expect(completos[1].materiasDelSemestre.map((m) => m.codigo)).toEqual(['M2']);
        expect(completos[2].materiasDelSemestre.map((m) => m.codigo)).toEqual(['M3']);
        expect(completos[3].materiasDelSemestre.map((m) => m.codigo)).toEqual(['TES']);

        const spy = createSpyJsPDFClass();
        buildSimuladorPDFDocument({
            jsPDF: /** @type {any} */ (spy.MockJsPDF),
            historialSemestres: completos.slice(0, 1),
            materias: materiasCadena,
            progresoSimulado: { M1: 'Cursado', M2: 'No Cursado', M3: 'No Cursado', TES: 'No Cursado' },
            progresoBase: { M1: 'Cursado', M2: 'No Cursado', M3: 'No Cursado', TES: 'No Cursado' },
            anioActual: 2026,
            cuatri: '2',
            plan: '17.14',
        });

        expect(spy.textCalls.some((t) => t.includes('(Proyectado - camino más corto)'))).toBe(true);
        expect(spy.textCalls.some((t) => t.includes('Tesina de Grado'))).toBe(true);
    });

    it('proyecta cuatrimestres faltantes hasta Tesina en transición 17.13 -> 17.14 sin saturar completedCodes con códigos de 17.13', () => {
        const materias1714 = [
            { codigo: '11271', nombre: 'Intro Prog', anio: 1, cuatrimestre: 1, correlativas: [] },
            { codigo: '11278', nombre: 'BDD Distribuidas', anio: 3, cuatrimestre: 6, correlativas: ['11271'] },
            { codigo: 'TES', nombre: 'Tesina de Grado', anio: 5, cuatrimestre: 11, correlativas: ['11278'], tesis: true },
        ];

        // Historial previo en 17.13 con 4 códigos viejos (> materias1714.length = 3)
        const historialHibrido = [
            {
                cuatri: '1',
                anioActual: 2025,
                esImportado: true,
                planSemestre: '17.13',
                materiasDelSemestre: [
                    { codigo: '11071', nombre: 'Intro Prog 1713' },
                    { codigo: '11072', nombre: 'Álgebra 1713' },
                    { codigo: '11073', nombre: 'Discreta 1713' },
                    { codigo: '11074', nombre: 'Prog I 1713' },
                ],
                progresoSnapshot: {
                    '11071': 'Cursado',
                    '11072': 'Cursado',
                    '11073': 'Cursado',
                    '11074': 'Cursado',
                },
                progresoBaseSnapshot: {},
            },
        ];

        const completos = buildCompleteSimulationSemesters({
            historialSemestres: historialHibrido,
            materias: materias1714,
            progresoBase: { '11271': 'Cursado', '11278': 'No Cursado', TES: 'No Cursado' },
            progresoSimulado: { '11271': 'Cursado', '11278': 'No Cursado', TES: 'No Cursado' },
            anioActual: 2026,
            cuatri: '2',
            plan: '17.14',
        });

        expect(completos).toHaveLength(3);
        expect(completos[1].materiasDelSemestre.map((m) => m.codigo)).toEqual(['11278']);
        expect(completos[1].esProyectado).toBe(true);
        expect(completos[2].materiasDelSemestre.map((m) => m.codigo)).toEqual(['TES']);
    });

    it('marca casillas y notas en cuatrimestres importados usando progresoReal y deja vacíos los simulados', () => {
        const plan1713 = sistemasPlanes.find((p) => p.plan_numero === '17.13')?.materias || [];
        const promoMat = plan1713[0];
        const aprobRegMat = plan1713[1];
        const optMat = plan1713.find((m) => m.codigo === 'OP1') || plan1713[2];
        const futMat = plan1713[3];
        const spy = createSpyJsPDFClass();

        buildSimuladorPDFDocument({
            jsPDF: /** @type {any} */ (spy.MockJsPDF),
            historialSemestres: [
                {
                    cuatri: '1',
                    anioActual: 2024,
                    esImportado: true,
                    planSemestre: '17.13',
                    materiasDelSemestre: [promoMat, aprobRegMat, optMat],
                    progresoSnapshot: {
                        [promoMat.codigo]: 'Cursado',
                        [aprobRegMat.codigo]: 'Cursado',
                        [optMat.codigo]: 'Cursado',
                    },
                    progresoBaseSnapshot: {},
                },
                {
                    cuatri: '2',
                    anioActual: 2026,
                    esImportado: false,
                    planSemestre: '17.13',
                    materiasDelSemestre: [futMat],
                    progresoSnapshot: {
                        [promoMat.codigo]: 'Cursado',
                        [aprobRegMat.codigo]: 'Cursado',
                        [optMat.codigo]: 'Cursado',
                        [futMat.codigo]: 'Cursado',
                    },
                    progresoBaseSnapshot: {
                        [promoMat.codigo]: 'Cursado',
                        [aprobRegMat.codigo]: 'Cursado',
                        [optMat.codigo]: 'Cursado',
                    },
                },
            ],
            plan: '17.13',
            materias: [promoMat, aprobRegMat, optMat, futMat],
            progresoSimulado: {
                [promoMat.codigo]: 'Cursado',
                [aprobRegMat.codigo]: 'Cursado',
                [optMat.codigo]: 'Cursado',
                [futMat.codigo]: 'Cursado',
            },
            progresoBase: {
                [promoMat.codigo]: 'Cursado',
                [aprobRegMat.codigo]: 'Cursado',
                [optMat.codigo]: 'Cursado',
                [futMat.codigo]: 'Cursado',
            },
            progresoReal: {
                [promoMat.codigo]: 'Promocionado',
                [aprobRegMat.codigo]: 'Aprobado',
                [optMat.codigo]: 'Promocionado',
            },
            progresoDetallesReal: {
                [promoMat.codigo]: { notaFinal: 8, notaRegularizacion: 8 },
                [aprobRegMat.codigo]: { notaFinal: 6, rendidaLibre: false, esEquivalencia: false },
                [optMat.codigo]: { notaFinal: 9, nombreOptativa: 'COMPILADORES', codigoOptativa: '11809' },
            },
        });

        expect(spy.textCalls).toContain('8');
        expect(spy.textCalls).toContain('6');
        expect(spy.textCalls).toContain('9');
        expect(spy.textCalls.some((t) => t.includes('COMPILADORES (Acta 11809)'))).toBe(true);

        // 4 filas * 3 casillas + 3 casillas de cabecera = 15 casillas 2.9x2.9 totales
        const boxes = spy.rectCalls.filter(([, , w, h]) => w === 2.9 && h === 2.9);
        const filled = boxes.filter(([, , , , style]) => style === 'FD');
        // promoMat (Promoc = 1) + aprobRegMat (Regular + Aprobada = 2) + optMat (Promoc = 1) = 4 marcadas; futMat = 0 marcadas
        expect(boxes).toHaveLength(15);
        expect(filled).toHaveLength(4);
    });

    it('incluye el pie "Documento orientativo no oficial UNLu" en simulación y en planillas del plan (blanco y progreso)', () => {
        const spySim = createSpyJsPDFClass();
        buildSimuladorPDFDocument({
            jsPDF: /** @type {any} */ (spySim.MockJsPDF),
            historialSemestres: [
                {
                    cuatri: 1,
                    anioActual: 2026,
                    materiasDelSemestre: [MOCK_MATERIAS[0]],
                    progresoSnapshot: { 11071: 'Cursado' },
                    progresoBaseSnapshot: {},
                },
            ],
            plan: '17.14',
            materias: MOCK_MATERIAS,
        });
        expect(
            spySim.textCalls.some((t) => t.includes(PDF_UNOFFICIAL_FOOTER_DISCLAIMER)),
        ).toBe(true);

        for (const includeProgress of [false, true]) {
            const spyPlanilla = createSpyJsPDFClass();
            buildPlanillaPlanPDFDocument({
                jsPDF: /** @type {any} */ (spyPlanilla.MockJsPDF),
                materias: [MOCK_MATERIAS[0]],
                plan: '17.14',
                includeProgress,
            });
            expect(
                spyPlanilla.textCalls.some((t) => t.includes(PDF_UNOFFICIAL_FOOTER_DISCLAIMER)),
            ).toBe(true);
        }
    });
});
