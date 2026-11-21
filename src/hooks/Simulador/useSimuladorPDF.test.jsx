// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { jsPDF } from 'jspdf';
import sistemasPlanes from '../../data/sistemas.json';
import useSimuladorPDF, { buildSimuladorPDFDocument } from './useSimuladorPDF';

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

        // Casillas vacías de seguimiento (leyenda + fila = >= 2 veces cada etiqueta)
        expect(spy.textCalls.filter((t) => t === 'Regular').length).toBeGreaterThanOrEqual(2);
        expect(spy.textCalls.filter((t) => t === 'Aprobada').length).toBeGreaterThanOrEqual(2);
        expect(spy.textCalls.filter((t) => t === 'Promoc.').length).toBeGreaterThanOrEqual(1);

        // Casillas vectoriales cuadradas de 2.9x2.9mm dibujadas en modo 'S'
        const checkboxes = spy.rectCalls.filter(
            ([, , w, h, style]) => w === 2.9 && h === 2.9 && style === 'S',
        );
        expect(checkboxes.length).toBeGreaterThanOrEqual(6);
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
});
