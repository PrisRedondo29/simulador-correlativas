import { useCallback } from 'react';
import { addToast } from '@heroui/react';
import { getPlanPolicy } from '../../config/planPolicies';
import tituloIntermedioUtils from '../../utils/Progreso/tituloIntermedioUtils';
import { trackDescargaPDF } from '../../services/analyticsService';
import { logError } from '../../services/logService';

const PAGE_WIDTH = 210;
const MARGIN_X = 14;
const MARGIN_TOP = 14;
const BOTTOM_LIMIT = 276;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2; // 182mm

const COL_ESTADO_X = MARGIN_X; // 14..63 (49mm)
const COL_COD_X = 63; // 63..78 (15mm)
const COL_MAT_X = 78; // 78..162 (84mm)
const COL_CARGA_X = 162; // 162..183 (21mm)
const COL_NOTA_X = 183; // 183..196 (13mm)

const UNLU_GREEN = /** @type {const} */ ([0, 90, 54]);
const INK_DARK = /** @type {const} */ ([30, 41, 59]);
const INK_MUTED = /** @type {const} */ ([71, 85, 105]);
const INK_LIGHT = /** @type {const} */ ([100, 116, 139]);
const BORDER = /** @type {const} */ ([203, 213, 225]);
const ROW_BORDER = /** @type {const} */ ([226, 232, 240]);
const BG_SOFT = /** @type {const} */ ([248, 250, 252]);
const BG_HEADER = /** @type {const} */ ([241, 245, 249]);
const BG_GREEN_SOFT = /** @type {const} */ ([236, 253, 245]);

function formatFechaEmision(date = new Date()) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

function drawCheckbox(pdf, x, y, label) {
    pdf.setDrawColor(...INK_LIGHT);
    pdf.setLineWidth(0.25);
    pdf.rect(x, y, 2.9, 2.9, 'S');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.3);
    pdf.setTextColor(...INK_DARK);
    pdf.text(label, x + 3.6, y + 2.3);
}

function drawTableHeader(pdf, y) {
    const headerH = 6.2;
    pdf.setFillColor(...BG_HEADER);
    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(0.25);
    pdf.rect(MARGIN_X, y, CONTENT_WIDTH, headerH, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.2);
    pdf.setTextColor(...INK_MUTED);
    const textY = y + 4.2;
    pdf.text('Seguimiento', COL_ESTADO_X + 1.8, textY);
    pdf.text('Cód.', COL_COD_X + 1.8, textY);
    pdf.text('Materia', COL_MAT_X + 1.8, textY);
    pdf.text('Carga', COL_CARGA_X + 1.8, textY);
    pdf.text('Nota', COL_NOTA_X + 6.5, textY, { align: 'center' });

    // Divisores verticales del encabezado
    [COL_COD_X, COL_MAT_X, COL_CARGA_X, COL_NOTA_X].forEach((cx) => {
        pdf.line(cx, y, cx, y + headerH);
    });

    return y + headerH;
}

/**
 * Construye un documento PDF vectorial A4 imprimible con la planificación por cuatrimestre
 * y casillas vacías a la izquierda (`Regular`, `Aprobada`, `Promoc.`) para seguimiento manual.
 *
 * @param {{
 *   jsPDF: typeof import('jspdf').jsPDF,
 *   historialSemestres: Array<import('../../types/domain').HistorialSemestre>,
 *   plan: string | null | undefined,
 *   materias?: Array<import('../../types/domain').Materia>,
 *   fechaEmision?: Date,
 * }} params
 */
export function buildSimuladorPDFDocument({
    jsPDF,
    historialSemestres = [],
    plan,
    materias = [],
    fechaEmision = new Date(),
}) {
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const planPolicy = getPlanPolicy(plan);
    const tituloIntermedioNombre = tituloIntermedioUtils.getTituloIntermedioNombre(plan);
    const materiasIntermedio = tituloIntermedioUtils.getMateriasIntermedio(plan, materias);
    const codigosIntermedio = new Set(materiasIntermedio.map((m) => String(m.codigo)));

    // Identificar el índice del cuatrimestre en el que se completa el título intermedio
    let indiceIntermedio = -1;
    if (materiasIntermedio.length > 0) {
        for (let i = 0; i < historialSemestres.length; i++) {
            const snap = historialSemestres[i].progresoSnapshot || {};
            /** @type {import('../../types/domain').ProgresoMap} */
            const mappedProgreso = {};
            Object.keys(snap).forEach((key) => {
                if (snap[key] === 'Cursado') mappedProgreso[key] = 'Aprobado';
            });
            const { completadas, totales } = tituloIntermedioUtils.calcularProgresoIntermedio(
                materiasIntermedio,
                mappedProgreso,
            );
            if (totales > 0 && completadas === totales) {
                indiceIntermedio = i;
                break;
            }
        }
    }

    const totalMateriasCursadas = historialSemestres.reduce((acc, item) => {
        const list = (item.materiasDelSemestre || []).filter(
            (m) =>
                item.progresoSnapshot?.[m.codigo] === 'Cursado' &&
                item.progresoBaseSnapshot?.[m.codigo] !== 'Cursado',
        );
        return acc + list.length;
    }, 0);

    // ─── Encabezado institucional compacto ───────────────────────────────────
    let y = MARGIN_TOP;
    pdf.setFillColor(...UNLU_GREEN);
    pdf.rect(MARGIN_X, y - 2, CONTENT_WIDTH, 1.3, 'F');

    y += 4.2;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13.5);
    pdf.setTextColor(...INK_DARK);
    pdf.text('Planificación y Seguimiento Académico - UNLu', MARGIN_X, y);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...INK_LIGHT);
    pdf.text(`Emitido: ${formatFechaEmision(fechaEmision)}`, PAGE_WIDTH - MARGIN_X, y, {
        align: 'right',
    });

    y += 4.8;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(...UNLU_GREEN);
    const carreraLabel = planPolicy.carrera || 'Universidad Nacional de Luján';
    pdf.text(`${carreraLabel} · Plan ${plan || '-'}`, MARGIN_X, y);

    // Caja resumen + leyenda de casillas para seguimiento en papel
    y += 3.2;
    pdf.setFillColor(...BG_SOFT);
    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(0.25);
    pdf.roundedRect(MARGIN_X, y, CONTENT_WIDTH, 12.5, 1.5, 1.5, 'FD');

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.2);
    pdf.setTextColor(...INK_DARK);
    const cuatriLabel = `${historialSemestres.length} ${
        historialSemestres.length === 1 ? 'cuatrimestre' : 'cuatrimestres'
    }`;
    const matLabel = `${totalMateriasCursadas} ${
        totalMateriasCursadas === 1 ? 'materia planificada' : 'materias planificadas'
    }`;
    const metaLabel = tituloIntermedioNombre
        ? ` · Título intermedio: ${tituloIntermedioNombre}`
        : '';
    pdf.text(`${cuatriLabel} · ${matLabel}${metaLabel}`, MARGIN_X + 3, y + 4.7);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.3);
    pdf.setTextColor(...INK_MUTED);
    pdf.text('Control de cursada:', MARGIN_X + 3, y + 9.8);
    drawCheckbox(pdf, MARGIN_X + 31, y + 7.4, 'Regular');
    drawCheckbox(pdf, MARGIN_X + 49, y + 7.4, 'Aprobada');
    drawCheckbox(pdf, MARGIN_X + 69, y + 7.4, 'Promocionada');

    y += 16.5;

    if (historialSemestres.length === 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(...INK_LIGHT);
        pdf.text('No hay cuatrimestres registrados en la simulación.', MARGIN_X, y + 4);
    }

    // ─── Bloques por cuatrimestre ────────────────────────────────────────────
    historialSemestres.forEach((item, idx) => {
        const cursadas = (item.materiasDelSemestre || []).filter(
            (m) => item.progresoSnapshot?.[m.codigo] === 'Cursado',
        );
        const noCursadas = (item.materiasDelSemestre || []).filter(
            (m) => item.progresoSnapshot?.[m.codigo] !== 'Cursado',
        );
        const cursadasReales = cursadas.filter(
            (m) => item.progresoBaseSnapshot?.[m.codigo] !== 'Cursado',
        );

        let horasSemanales = 0;
        let horasTotales = 0;
        (cursadasReales.length > 0 ? cursadasReales : cursadas).forEach((m) => {
            horasSemanales += Number(m.horas_semanales) || 0;
            horasTotales += Number(m.horas_totales) || 0;
        });

        const isMilestone = idx === indiceIntermedio;

        // Salto de página si no entra la cabecera + header de tabla + al menos 1 fila (~21mm)
        if (y + 21 > BOTTOM_LIMIT) {
            pdf.addPage();
            y = MARGIN_TOP;
        }

        // Banner del cuatrimestre
        const bannerH = 7.4;
        pdf.setFillColor(...(isMilestone ? BG_GREEN_SOFT : BG_SOFT));
        pdf.setDrawColor(...BORDER);
        pdf.setLineWidth(0.25);
        pdf.rect(MARGIN_X, y, CONTENT_WIDTH, bannerH, 'FD');

        pdf.setFillColor(...UNLU_GREEN);
        pdf.rect(MARGIN_X, y, 1.4, bannerH, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.8);
        pdf.setTextColor(...INK_DARK);
        const tituloCuatri = `#${idx + 1} · ${item.cuatri}° Cuatrimestre ${item.anioActual}`;
        const tagImportado = item.esImportado ? ' (Avance importado)' : '';
        pdf.text(`${tituloCuatri}${tagImportado}`, MARGIN_X + 3.2, y + 4.9);

        if (isMilestone && tituloIntermedioNombre) {
            const titleW = pdf.getTextWidth(`${tituloCuatri}${tagImportado}`);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7.5);
            pdf.setTextColor(...UNLU_GREEN);
            pdf.text(
                `  [Meta alcanzada: ${tituloIntermedioNombre}]`,
                MARGIN_X + 3.5 + titleW,
                y + 4.9,
            );
        }

        const statsParts = [
            `${cursadasReales.length} ${cursadasReales.length === 1 ? 'materia' : 'materias'}`,
            horasSemanales > 0 ? `${horasSemanales}h/sem` : null,
            horasTotales > 0 ? `${horasTotales}h` : null,
        ].filter(Boolean);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(...INK_MUTED);
        pdf.text(statsParts.join(' · '), PAGE_WIDTH - MARGIN_X - 2.2, y + 4.9, {
            align: 'right',
        });

        y += bannerH;
        y = drawTableHeader(pdf, y);

        if (cursadas.length === 0) {
            const emptyH = 6.8;
            if (y + emptyH > BOTTOM_LIMIT) {
                pdf.addPage();
                y = MARGIN_TOP;
                y = drawTableHeader(pdf, y);
            }
            pdf.setDrawColor(...ROW_BORDER);
            pdf.setFillColor(255, 255, 255);
            pdf.rect(MARGIN_X, y, CONTENT_WIDTH, emptyH, 'FD');
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(7.5);
            pdf.setTextColor(...INK_LIGHT);
            pdf.text(
                'No se seleccionaron materias para cursar en este cuatrimestre.',
                MARGIN_X + 3,
                y + 4.5,
            );
            y += emptyH;
        } else {
            cursadas.forEach((materia, rowIdx) => {
                const isIntermedioMat = codigosIntermedio.has(String(materia.codigo));
                const displayName = isIntermedioMat
                    ? `${materia.nombre} [Intermedio]`
                    : String(materia.nombre || '');
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(7.9);
                const nameLines = pdf.splitTextToSize(displayName, 80);
                const rowH = Math.max(7.2, nameLines.length * 3.6 + 3.2);

                if (y + rowH > BOTTOM_LIMIT) {
                    pdf.addPage();
                    y = MARGIN_TOP;
                    y = drawTableHeader(pdf, y);
                }

                pdf.setFillColor(...(rowIdx % 2 === 1 ? [252, 253, 254] : [255, 255, 255]));
                pdf.setDrawColor(...ROW_BORDER);
                pdf.setLineWidth(0.2);
                pdf.rect(MARGIN_X, y, CONTENT_WIDTH, rowH, 'FD');

                // Divisores verticales de fila
                [COL_COD_X, COL_MAT_X, COL_CARGA_X, COL_NOTA_X].forEach((cx) => {
                    pdf.line(cx, y, cx, y + rowH);
                });

                // Casillas vacías de seguimiento a la izquierda
                const boxY = y + (rowH - 2.9) / 2;
                drawCheckbox(pdf, 15.2, boxY, 'Regular');
                drawCheckbox(pdf, 29.8, boxY, 'Aprobada');
                drawCheckbox(pdf, 46.2, boxY, 'Promoc.');

                const singleTextY = y + rowH / 2 + 1.1;

                // Código
                const codigoStr =
                    materia.mostrarCodigo === false ? '---' : String(materia.codigo || '');
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(7.4);
                pdf.setTextColor(...INK_MUTED);
                pdf.text(codigoStr, COL_COD_X + 1.8, singleTextY);

                // Nombre (multilínea si excede el ancho)
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(7.9);
                pdf.setTextColor(...INK_DARK);
                const firstLineY = nameLines.length === 1 ? singleTextY : y + 4.3;
                pdf.text(nameLines, COL_MAT_X + 1.8, firstLineY);

                // Carga horaria
                const hsSem = Number(materia.horas_semanales) || 0;
                const hsTot = Number(materia.horas_totales) || 0;
                const cargaStr =
                    [hsSem > 0 ? `${hsSem}h/s` : null, hsTot > 0 ? `${hsTot}h` : null]
                        .filter(Boolean)
                        .join(' · ') || '-';
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(7.1);
                pdf.setTextColor(...INK_MUTED);
                pdf.text(cargaStr, COL_CARGA_X + 1.8, singleTextY);

                // Línea vacía para completar la nota en papel
                pdf.setDrawColor(...BORDER);
                pdf.setLineWidth(0.2);
                pdf.line(COL_NOTA_X + 2.2, y + rowH - 2.0, COL_NOTA_X + 10.8, y + rowH - 2.0);

                y += rowH;
            });
        }

        if (noCursadas.length > 0) {
            const noCursadasStr = `Disponibles sin cursar (${noCursadas.length}): ${noCursadas
                .map((m) =>
                    m.mostrarCodigo === false ? m.nombre : `${m.nombre} (${m.codigo})`,
                )
                .join(', ')}`;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(6.8);
            const noteLines = pdf.splitTextToSize(noCursadasStr, CONTENT_WIDTH - 4);
            const noteH = noteLines.length * 3.1 + 3.0;

            if (y + noteH > BOTTOM_LIMIT) {
                pdf.addPage();
                y = MARGIN_TOP;
            }

            pdf.setFillColor(...BG_SOFT);
            pdf.setDrawColor(...ROW_BORDER);
            pdf.setLineWidth(0.2);
            pdf.rect(MARGIN_X, y, CONTENT_WIDTH, noteH, 'FD');
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(6.8);
            pdf.setTextColor(...INK_LIGHT);
            pdf.text(noteLines, MARGIN_X + 2, y + 3.4);
            y += noteH;
        }

        y += 4.5;
    });

    // ─── Pie de página numerado ──────────────────────────────────────────────
    const totalPages = pdf.getNumberOfPages();
    for (let page = 1; page <= totalPages; page++) {
        pdf.setPage(page);
        pdf.setDrawColor(...ROW_BORDER);
        pdf.setLineWidth(0.25);
        pdf.line(MARGIN_X, 284, PAGE_WIDTH - MARGIN_X, 284);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(...INK_LIGHT);
        pdf.text(`Simulador de Correlativas UNLu · Plan ${plan || '-'}`, MARGIN_X, 288.5);
        pdf.text(`Página ${page} de ${totalPages}`, PAGE_WIDTH - MARGIN_X, 288.5, {
            align: 'right',
        });
    }

    return pdf;
}

const defaultLoadJsPDF = () => import('jspdf');

/**
 * Encapsula la descarga del PDF vectorial en formato tabla imprimible.
 *
 * @param {{
 *   historialSemestres: Array<import('../../types/domain').HistorialSemestre>,
 *   plan: string | null | undefined,
 *   materias?: Array<import('../../types/domain').Materia>,
 *   setDescargandoPDF?: (loading: boolean) => void,
 *   loadJsPDF?: () => Promise<{ jsPDF: typeof import('jspdf').jsPDF }>,
 * }} params
 */
const useSimuladorPDF = ({
    historialSemestres,
    plan,
    materias = [],
    setDescargandoPDF,
    loadJsPDF = defaultLoadJsPDF,
}) => {
    const handleDownloadPDF = useCallback(async () => {
        try {
            setDescargandoPDF?.(true);

            const { jsPDF } = await loadJsPDF();
            const pdf = buildSimuladorPDFDocument({
                jsPDF,
                historialSemestres,
                plan,
                materias,
            });
            pdf.save(`Simulacion_${plan}.pdf`);

            try {
                addToast({
                    title: '¡PDF Descargado!',
                    description: 'Has guardado tu planilla imprimible de cursada',
                    color: 'success',
                });
            } catch {
                /* Toast opcional */
            }
            trackDescargaPDF({ plan });
        } catch (err) {
            logError(err, { route: '/simulador', context: { plan } });
            try {
                addToast({
                    title: 'Error',
                    description: 'Ocurrió un problema generando el documento.',
                    color: 'danger',
                });
            } catch {
                /* Toast opcional */
            }
        } finally {
            setDescargandoPDF?.(false);
        }
    }, [historialSemestres, plan, materias, setDescargandoPDF, loadJsPDF]);

    return { handleDownloadPDF };
};

export default useSimuladorPDF;
