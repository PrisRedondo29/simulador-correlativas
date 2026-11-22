import { useCallback } from 'react';
import { addToast } from '@heroui/react';
import { getPlanPolicy } from '../../config/planPolicies';
import tituloIntermedioUtils from '../../utils/Progreso/tituloIntermedioUtils';
import diplomaturasUtils from '../../utils/Progreso/diplomaturasUtils';
import { calcularPromedioGeneral } from '../../utils/Progreso/regularidadUtils';
import {
    ESTADOS_MATERIA,
    evaluarElegibilidadMateria,
} from '../../utils/Progreso/materiaStateMachine';
import { trackDescargaPDF } from '../../services/analyticsService';
import { logError } from '../../services/logService';

const PAGE_WIDTH = 210;
const MARGIN_X = 14;
const MARGIN_TOP = 14;
const BOTTOM_LIMIT = 276;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2; // 182mm

const STANDARD_COLS = {
    estadoX: MARGIN_X, // 14..63 (49mm)
    checkboxXs: [15.4, 29.8, 46.2],
    codX: 63, // 63..78 (15mm)
    matX: 78, // 78..162 (84mm)
    matWrapWidth: 80,
    diplX: null,
    cargaX: 162, // 162..183 (21mm)
    notaX: 183, // 183..196 (13mm)
    notaCenterOffset: 6.5,
};

const DIPLOMADO_COLS = {
    estadoX: MARGIN_X, // 14..62 (48mm)
    checkboxXs: [15.4, 29.6, 45.8],
    codX: 62, // 62..76 (14mm)
    matX: 76, // 76..140 (64mm)
    matWrapWidth: 60.5,
    diplX: 140, // 140..165 (25mm)
    cargaX: 165, // 165..184 (19mm)
    notaX: 184, // 184..196 (12mm)
    notaCenterOffset: 6.0,
};

const UNLU_GREEN = /** @type {const} */ ([0, 90, 54]);
const INK_DARK = /** @type {const} */ ([30, 41, 59]);
const INK_MUTED = /** @type {const} */ ([71, 85, 105]);
const INK_LIGHT = /** @type {const} */ ([100, 116, 139]);
const BORDER = /** @type {const} */ ([203, 213, 225]);
const ROW_BORDER = /** @type {const} */ ([226, 232, 240]);
const BG_SOFT = /** @type {const} */ ([248, 250, 252]);
const BG_HEADER = /** @type {const} */ ([241, 245, 249]);
const BG_GREEN_SOFT = /** @type {const} */ ([236, 253, 245]);
const BG_INTERMEDIO_ROW_EVEN = /** @type {const} */ ([246, 253, 249]);
const BG_INTERMEDIO_ROW_ODD = /** @type {const} */ ([251, 254, 252]);

const defaultLoadJsPDF = () => import('jspdf');

function formatFechaEmision(date = new Date()) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

function drawCheckbox(pdf, x, y, label, checked = false) {
    if (checked) {
        pdf.setFillColor(...BG_GREEN_SOFT);
        pdf.setDrawColor(...UNLU_GREEN);
        pdf.setLineWidth(0.32);
        pdf.rect(x, y, 2.9, 2.9, 'FD');
        // Tilde vectorial nítido dentro de la casilla
        pdf.setLineWidth(0.42);
        pdf.line(x + 0.55, y + 1.5, x + 1.2, y + 2.25);
        pdf.line(x + 1.2, y + 2.25, x + 2.4, y + 0.7);
    } else {
        pdf.setDrawColor(...INK_LIGHT);
        pdf.setLineWidth(0.25);
        pdf.rect(x, y, 2.9, 2.9, 'S');
    }

    pdf.setFont('helvetica', checked ? 'bold' : 'normal');
    pdf.setFontSize(6.3);
    pdf.setTextColor(...(checked ? UNLU_GREEN : INK_DARK));
    pdf.text(label, x + 3.6, y + 2.3);
}

function drawTableHeader(pdf, y, { showDiplomados = false } = {}) {
    const cols = showDiplomados ? DIPLOMADO_COLS : STANDARD_COLS;
    const headerH = 6.2;
    pdf.setFillColor(...BG_HEADER);
    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(0.25);
    pdf.rect(MARGIN_X, y, CONTENT_WIDTH, headerH, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.2);
    pdf.setTextColor(...INK_MUTED);
    const textY = y + 4.2;
    pdf.text('Seguimiento', cols.estadoX + 1.8, textY);
    pdf.text('Cód.', cols.codX + 1.6, textY);
    pdf.text('Materia', cols.matX + 1.8, textY);
    if (showDiplomados && cols.diplX != null) {
        pdf.text('Diplomado', cols.diplX + 1.6, textY);
    }
    pdf.text('Carga', cols.cargaX + 1.6, textY);
    pdf.text('Nota', cols.notaX + cols.notaCenterOffset, textY, { align: 'center' });

    const dividers = showDiplomados && cols.diplX != null
        ? [cols.codX, cols.matX, cols.diplX, cols.cargaX, cols.notaX]
        : [cols.codX, cols.matX, cols.cargaX, cols.notaX];

    dividers.forEach((cx) => {
        pdf.line(cx, y, cx, y + headerH);
    });

    return y + headerH;
}

export const PDF_UNOFFICIAL_FOOTER_DISCLAIMER = 'Documento orientativo no oficial UNLu';

function stampPageFooters(pdf, labelText) {
    const totalPages = pdf.getNumberOfPages();
    for (let page = 1; page <= totalPages; page++) {
        pdf.setPage(page);
        pdf.setDrawColor(...ROW_BORDER);
        pdf.setLineWidth(0.25);
        pdf.line(MARGIN_X, 284, PAGE_WIDTH - MARGIN_X, 284);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.2);
        pdf.setTextColor(...INK_LIGHT);
        pdf.text(labelText, MARGIN_X, 288.5);
        pdf.text(`Página ${page} de ${totalPages}`, PAGE_WIDTH - MARGIN_X, 288.5, {
            align: 'right',
        });
    }
}

/**
 * Dibuja los pills de colores de diplomaturas en la columna Diplomado usando roundedRect
 * (sin interferir con rectángulos 2.9x2.9 de las casillas de seguimiento).
 * @param {any} pdf
 * @param {number} cellX
 * @param {number} rowY
 * @param {number} rowH
 * @param {Array<import('../../types/domain').DiplomaturaMateriaTag>} tags
 */
function drawDiplomaturaPills(pdf, cellX, rowY, rowH, tags) {
    if (!tags || tags.length === 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.8);
        pdf.setTextColor(...INK_LIGHT);
        pdf.text('-', cellX + 12.5, rowY + rowH / 2 + 1.0, { align: 'center' });
        return;
    }

    const pillW = 10.6;
    const pillH = 3.6;
    const gapX = 1.1;
    const gapY = 1.0;
    const numRows = Math.ceil(tags.length / 2);
    const blockH = numRows * pillH + Math.max(0, numRows - 1) * gapY;
    const startY = rowY + Math.max(1.2, (rowH - blockH) / 2);
    const baseStartX = cellX + (25 - (pillW * 2 + gapX)) / 2;

    tags.forEach((tag, idx) => {
        const colIdx = idx % 2;
        const rowIdx = Math.floor(idx / 2);
        const px = baseStartX + colIdx * (pillW + gapX);
        const py = startY + rowIdx * (pillH + gapY);

        pdf.setFillColor(...tag.diplomatura.color.bg);
        pdf.setDrawColor(...tag.diplomatura.color.border);
        pdf.setLineWidth(0.25);
        pdf.roundedRect(px, py, pillW, pillH, 0.8, 0.8, 'FD');

        const label = tag.esOptativa
            ? `${tag.diplomatura.shortCode}*`
            : tag.diplomatura.shortCode;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(5.7);
        pdf.setTextColor(...tag.diplomatura.color.text);
        pdf.text(label, px + pillW / 2, py + 2.55, { align: 'center' });
    });
}

function renderChecklistRow(
    pdf,
    y,
    rowIdx,
    {
        codigoStr,
        displayName,
        cargaStr,
        checkedReg = false,
        checkedAprob = false,
        checkedPromoc = false,
        notaText = '',
        showDiplomados = false,
        diplomaturaTags = [],
        isIntermedioRow = false,
    },
) {
    const cols = showDiplomados ? DIPLOMADO_COLS : STANDARD_COLS;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.9);
    const nameLines = pdf.splitTextToSize(displayName, cols.matWrapWidth);
    const pillRows = showDiplomados && diplomaturaTags.length > 0
        ? Math.ceil(diplomaturaTags.length / 2)
        : 0;
    const rowH = Math.max(7.2, nameLines.length * 3.6 + 3.2, pillRows * 4.6 + 2.4);

    let nextY = y;
    if (nextY + rowH > BOTTOM_LIMIT) {
        pdf.addPage();
        nextY = drawTableHeader(pdf, MARGIN_TOP, { showDiplomados });
    }

    const fillColor = isIntermedioRow
        ? rowIdx % 2 === 1
            ? BG_INTERMEDIO_ROW_ODD
            : BG_INTERMEDIO_ROW_EVEN
        : rowIdx % 2 === 1
          ? [252, 253, 254]
          : [255, 255, 255];

    pdf.setFillColor(...fillColor);
    pdf.setDrawColor(...ROW_BORDER);
    pdf.setLineWidth(0.2);
    pdf.rect(MARGIN_X, nextY, CONTENT_WIDTH, rowH, 'FD');

    if (isIntermedioRow) {
        pdf.setFillColor(...UNLU_GREEN);
        pdf.rect(MARGIN_X, nextY, 1.0, rowH, 'F');
    }

    const dividers = showDiplomados && cols.diplX != null
        ? [cols.codX, cols.matX, cols.diplX, cols.cargaX, cols.notaX]
        : [cols.codX, cols.matX, cols.cargaX, cols.notaX];

    pdf.setDrawColor(...ROW_BORDER);
    dividers.forEach((cx) => {
        pdf.line(cx, nextY, cx, nextY + rowH);
    });

    const boxY = nextY + (rowH - 2.9) / 2;
    drawCheckbox(pdf, cols.checkboxXs[0], boxY, 'Regular', checkedReg);
    drawCheckbox(pdf, cols.checkboxXs[1], boxY, 'Aprobada', checkedAprob);
    drawCheckbox(pdf, cols.checkboxXs[2], boxY, 'Promoc.', checkedPromoc);

    const singleTextY = nextY + rowH / 2 + 1.1;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.3);
    pdf.setTextColor(...INK_MUTED);
    pdf.text(codigoStr, cols.codX + 1.6, singleTextY);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.9);
    pdf.setTextColor(...INK_DARK);
    const firstLineY = nameLines.length === 1 ? singleTextY : nextY + 4.3;
    pdf.text(nameLines, cols.matX + 1.8, firstLineY);

    if (showDiplomados && cols.diplX != null) {
        drawDiplomaturaPills(pdf, cols.diplX, nextY, rowH, diplomaturaTags);
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(showDiplomados ? 6.9 : 7.1);
    pdf.setTextColor(...INK_MUTED);
    pdf.text(cargaStr, cols.cargaX + 1.6, singleTextY);

    if (notaText) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.6);
        pdf.setTextColor(...UNLU_GREEN);
        pdf.text(notaText, cols.notaX + cols.notaCenterOffset, singleTextY, { align: 'center' });
    } else {
        pdf.setDrawColor(...BORDER);
        pdf.setLineWidth(0.2);
        pdf.line(
            cols.notaX + 2.0,
            nextY + rowH - 2.0,
            cols.notaX + cols.notaCenterOffset * 2 - 2.0,
            nextY + rowH - 2.0,
        );
    }

    return nextY + rowH;
}

/**
 * Completa automáticamente los cuatrimestres faltantes desde el estado actual de la simulación
 * eligiendo el camino más corto (todas las materias cursables habilitadas en cada cuatrimestre)
 * hasta aprobar la totalidad de la carrera (incluida Tesina).
 *
 * @param {{
 *   historialSemestres?: Array<import('../../types/domain').HistorialSemestre>,
 *   materias?: Array<import('../../types/domain').Materia>,
 *   progresoSimulado?: import('../../types/domain').ProgresoSimuladorMap | null,
 *   progresoBase?: import('../../types/domain').ProgresoSimuladorMap | null,
 *   anioActual?: number | string,
 *   cuatri?: string | number,
 *   plan?: string | null,
 * }} params
 * @returns {Array<import('../../types/domain').HistorialSemestre>}
 */
export function buildCompleteSimulationSemesters({
    historialSemestres = [],
    materias = [],
    progresoSimulado = null,
    progresoBase = null,
    anioActual = new Date().getFullYear(),
    cuatri = '1',
    plan = null,
}) {
    const result = [...(historialSemestres || [])];
    if (!materias || materias.length === 0) return result;

    const materiasSet = new Set(materias.map((m) => m.codigo));
    /** @type {Set<string>} */
    const completedCodes = new Set();

    materias.forEach((m) => {
        if (progresoBase?.[m.codigo] === 'Cursado') {
            completedCodes.add(m.codigo);
        }
    });

    result.forEach((sem) => {
        (sem.materiasDelSemestre || []).forEach((m) => {
            if (materiasSet.has(m.codigo) && sem.progresoSnapshot?.[m.codigo] === 'Cursado') {
                completedCodes.add(m.codigo);
            }
        });
    });

    if (completedCodes.size >= materias.length) {
        return result;
    }

    let curAnio = Number(anioActual) || new Date().getFullYear();
    let curCuatri = String(cuatri || '1') === '2' ? '2' : '1';
    let emptyTurnsInRow = 0;

    for (let iter = 0; iter < 40 && completedCodes.size < materias.length; iter++) {
        /** @type {import('../../types/domain').ProgresoMap} */
        const progresoEval = {};
        materias.forEach((m) => {
            progresoEval[m.codigo] = completedCodes.has(m.codigo)
                ? ESTADOS_MATERIA.APROBADO
                : ESTADOS_MATERIA.BLOQUEADO;
        });

        let chosen = [];
        if (iter === 0 && progresoSimulado) {
            const manualCurrent = materias.filter(
                (m) => !completedCodes.has(m.codigo) && progresoSimulado[m.codigo] === 'Cursado',
            );
            if (manualCurrent.length > 0) {
                chosen = manualCurrent;
            }
        }

        if (chosen.length === 0) {
            chosen = materias.filter((m) => {
                if (completedCodes.has(m.codigo)) return false;
                const { puedeCursar } = evaluarElegibilidadMateria(m, progresoEval, materias);
                if (!puedeCursar) return false;
                const numCuatri = Number(m.cuatrimestre);
                const esFlexible = Boolean(m.tesis || numCuatri > 10);
                const coincideParidad =
                    esFlexible ||
                    (curCuatri === '1' && numCuatri % 2 !== 0) ||
                    (curCuatri === '2' && numCuatri % 2 === 0);
                return coincideParidad;
            });
        }

        if (chosen.length > 0) {
            /** @type {import('../../types/domain').ProgresoSimuladorMap} */
            const baseSnap = {};
            /** @type {import('../../types/domain').ProgresoSimuladorMap} */
            const nextSnap = {};

            materias.forEach((m) => {
                const already = completedCodes.has(m.codigo);
                baseSnap[m.codigo] = already ? 'Cursado' : 'No Cursado';
                nextSnap[m.codigo] = already ? 'Cursado' : 'No Cursado';
            });
            chosen.forEach((m) => {
                nextSnap[m.codigo] = 'Cursado';
                completedCodes.add(m.codigo);
            });

            result.push({
                anioActual: curAnio,
                cuatri: curCuatri,
                materiasDelSemestre: chosen,
                progresoSnapshot: nextSnap,
                progresoBaseSnapshot: baseSnap,
                ...(plan ? { planSemestre: plan } : {}),
                esProyectado: true,
            });
            emptyTurnsInRow = 0;
        } else {
            emptyTurnsInRow += 1;
            if (emptyTurnsInRow >= 2) break;
        }

        if (curCuatri === '1') {
            curCuatri = '2';
        } else {
            curCuatri = '1';
            curAnio += 1;
        }
    }

    return result;
}

/**
 * Construye un documento PDF vectorial A4 imprimible con la planificación por cuatrimestre
 * y casillas vacías a la izquierda (`Regular`, `Aprobada`, `Promoc.`) para seguimiento manual.
 * Si la simulación aún no llegó al egreso, proyecta automáticamente los cuatrimestres restantes
 * siguiendo el camino más corto hasta completar todas las materias del plan.
 *
 * @param {{
 *   jsPDF: typeof import('jspdf').jsPDF,
 *   historialSemestres: Array<import('../../types/domain').HistorialSemestre>,
 *   plan: string | null | undefined,
 *   materias?: Array<import('../../types/domain').Materia>,
 *   progresoSimulado?: import('../../types/domain').ProgresoSimuladorMap | null,
 *   progresoBase?: import('../../types/domain').ProgresoSimuladorMap | null,
 *   progresoReal?: import('../../types/domain').ProgresoMap | null,
 *   progresoDetallesReal?: import('../../types/domain').ProgresoDetallesMap | null,
 *   anioActual?: number | string,
 *   cuatri?: string | number,
 *   fechaEmision?: Date,
 * }} params
 */
export function buildSimuladorPDFDocument({
    jsPDF,
    historialSemestres = [],
    plan,
    materias = [],
    progresoSimulado = null,
    progresoBase = null,
    progresoReal = null,
    progresoDetallesReal = null,
    anioActual = new Date().getFullYear(),
    cuatri = '1',
    fechaEmision = new Date(),
}) {
    const semestresCompletos = buildCompleteSimulationSemesters({
        historialSemestres,
        materias,
        progresoSimulado,
        progresoBase,
        anioActual,
        cuatri,
        plan,
    });

    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const planPolicy = getPlanPolicy(plan);
    const tituloIntermedioNombre = tituloIntermedioUtils.getTituloIntermedioNombre(plan);
    const materiasIntermedio = tituloIntermedioUtils.getMateriasIntermedio(plan, materias);
    const codigosIntermedio = new Set(materiasIntermedio.map((m) => String(m.codigo)));

    let indiceIntermedio = -1;
    if (materiasIntermedio.length > 0) {
        for (let i = 0; i < semestresCompletos.length; i++) {
            const sem = semestresCompletos[i];
            if (sem.planSemestre && plan && sem.planSemestre !== plan) continue;
            const snap = sem.progresoSnapshot || {};
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

    const totalMateriasCursadas = semestresCompletos.reduce((acc, item) => {
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

    y += 3.2;
    pdf.setFillColor(...BG_SOFT);
    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(0.25);
    pdf.roundedRect(MARGIN_X, y, CONTENT_WIDTH, 12.5, 1.5, 1.5, 'FD');

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.2);
    pdf.setTextColor(...INK_DARK);
    const cuatriLabel = `${semestresCompletos.length} ${
        semestresCompletos.length === 1 ? 'cuatrimestre' : 'cuatrimestres'
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

    if (semestresCompletos.length === 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(...INK_LIGHT);
        pdf.text('No hay cuatrimestres registrados en la simulación.', MARGIN_X, y + 4);
    }

    // ─── Bloques por cuatrimestre ────────────────────────────────────────────
    semestresCompletos.forEach((item, idx) => {
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

        if (y + 21 > BOTTOM_LIMIT) {
            pdf.addPage();
            y = MARGIN_TOP;
        }

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
        const planTag = item.planSemestre ? ` · Plan ${item.planSemestre}` : '';
        const tituloCuatri = `#${idx + 1} · ${item.cuatri}° Cuatrimestre ${item.anioActual}${planTag}`;
        const tagOrigen = item.esImportado
            ? ' (Avance importado)'
            : item.esProyectado
              ? ' (Proyectado - camino más corto)'
              : '';
        pdf.text(`${tituloCuatri}${tagOrigen}`, MARGIN_X + 3.2, y + 4.9);

        if (isMilestone && tituloIntermedioNombre) {
            const titleW = pdf.getTextWidth(`${tituloCuatri}${tagOrigen}`);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7.5);
            pdf.setTextColor(...UNLU_GREEN);
            pdf.text(
                `  [Meta: ${tituloIntermedioNombre}]`,
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
                y = drawTableHeader(pdf, MARGIN_TOP);
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
                const semPlan = item.planSemestre || plan;
                const isIntermedioMat =
                    semPlan === plan
                        ? codigosIntermedio.has(String(materia.codigo))
                        : tituloIntermedioUtils.getMateriasIntermedio(semPlan, [materia]).length >
                          0;

                const detReal = item.esImportado ? progresoDetallesReal?.[materia.codigo] : null;
                const estadoReal = item.esImportado ? progresoReal?.[materia.codigo] : null;

                let checkedReg = false;
                let checkedAprob = false;
                let checkedPromoc = false;
                let notaText = '';

                if (item.esImportado) {
                    if (estadoReal) {
                        checkedPromoc = estadoReal === 'Promocionado';
                        checkedAprob = estadoReal === 'Aprobado';
                        checkedReg =
                            estadoReal === 'Regular' ||
                            (estadoReal === 'Aprobado' &&
                                !detReal?.rendidaLibre &&
                                !detReal?.esEquivalencia);

                        if (estadoReal === 'Promocionado') {
                            const n = detReal?.notaFinal ?? detReal?.notaRegularizacion;
                            notaText = n != null ? String(n) : 'Prom.';
                        } else if (estadoReal === 'Aprobado') {
                            if (detReal?.notaFinal != null) {
                                notaText = String(detReal.notaFinal);
                            } else if (detReal?.esEquivalencia) {
                                notaText = 'Equiv.';
                            }
                        }
                    } else {
                        checkedAprob = true;
                    }
                }

                const baseName =
                    item.esImportado && detReal?.nombreOptativa
                        ? `${materia.nombre}: ${detReal.nombreOptativa}${
                              detReal.codigoOptativa ? ` (Acta ${detReal.codigoOptativa})` : ''
                          }`
                        : String(materia.nombre || '');

                const displayName = isIntermedioMat ? `${baseName} [Intermedio]` : baseName;
                const codigoStr =
                    materia.mostrarCodigo === false ? '---' : String(materia.codigo || '');
                const hsSem = Number(materia.horas_semanales) || 0;
                const hsTot = Number(materia.horas_totales) || 0;
                const cargaStr =
                    [hsSem > 0 ? `${hsSem}h/s` : null, hsTot > 0 ? `${hsTot}h` : null]
                        .filter(Boolean)
                        .join(' · ') || '-';

                y = renderChecklistRow(pdf, y, rowIdx, {
                    codigoStr,
                    displayName,
                    cargaStr,
                    checkedReg,
                    checkedAprob,
                    checkedPromoc,
                    notaText,
                });
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

        // Si en este cuatrimestre cerró el pase hacia otro plan, mostrar hito divisorio claro
        if (item.transicionAplicada) {
            const transH = 6.8;
            if (y + transH > BOTTOM_LIMIT) {
                pdf.addPage();
                y = MARGIN_TOP;
            }
            pdf.setFillColor(...BG_GREEN_SOFT);
            pdf.setDrawColor(...UNLU_GREEN);
            pdf.setLineWidth(0.25);
            pdf.rect(MARGIN_X, y + 1, CONTENT_WIDTH, transH, 'FD');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7.6);
            pdf.setTextColor(...UNLU_GREEN);
            const t = item.transicionAplicada;
            pdf.text(
                `Cambio de plan aplicado (${t.cuatri}°C ${t.anio}): Plan ${t.fromPlan} -> Plan ${t.toPlan} · ${t.equivalenciasCount} materias homologadas`,
                MARGIN_X + 3,
                y + 5.4,
            );
            y += transH + 1;
        }

        y += 4.5;
    });

    stampPageFooters(
        pdf,
        `${PDF_UNOFFICIAL_FOOTER_DISCLAIMER} · Plan ${plan || '-'} · Simulador de Correlativas`,
    );
    return pdf;
}

/**
 * Agrupa las materias de un plan por año y cuatrimestre (integrando talleres con año válido en su
 * cuatrimestre correspondiente) y detecta el punto exacto donde cierra el Título Intermedio.
 * @param {Array<import('../../types/domain').Materia>} materias
 * @param {Set<string>} [codigosIntermedio]
 */
function groupMateriasForPlanSheet(materias = [], codigosIntermedio = new Set()) {
    /** @type {Array<{ title: string, items: Array<import('../../types/domain').Materia> }>} */
    const rawSections = [];

    const hasValidYear = (m) => {
        if (m.anio == null || String(m.anio).trim() === '') return false;
        const n = Number(m.anio);
        return !Number.isNaN(n) && n > 0;
    };

    const materiasCronologicas = (materias || []).filter((m) => !m.taller || hasValidYear(m));
    const anios = [...new Set(materiasCronologicas.map((m) => Number(m.anio)))].sort((a, b) => a - b);

    anios.forEach((anio) => {
        const matsAnio = materiasCronologicas.filter((m) => Number(m.anio) === anio);
        const cuatris = [...new Set(matsAnio.map((m) => Number(m.cuatrimestre) || 1))].sort(
            (a, b) => a - b,
        );

        cuatris.forEach((cNum) => {
            const items = matsAnio.filter((m) => (Number(m.cuatrimestre) || 1) === cNum);
            if (items.length === 0) return;
            const cLabel =
                anio >= 6 || cNum > 10 ? 'Tramo de cierre' : `${cNum}° Cuatrimestre`;
            rawSections.push({
                title: `${anio}° Año · ${cLabel}`,
                items,
            });
        });
    });

    const talleresSinAnio = (materias || []).filter((m) => m.taller === true && !hasValidYear(m));
    if (talleresSinAnio.length > 0) {
        rawSections.push({
            title: 'Talleres y actividades complementarias',
            items: talleresSinAnio,
        });
    }

    if (!codigosIntermedio || codigosIntermedio.size === 0) {
        return rawSections.map((section) => ({
            ...section,
            tramo: /** @type {'general'} */ ('general'),
            showIntermediateMilestoneAfter: false,
        }));
    }

    let lastIntermedioSectionIdx = -1;
    rawSections.forEach((section, idx) => {
        if (section.items.some((m) => codigosIntermedio.has(String(m.codigo)))) {
            lastIntermedioSectionIdx = idx;
        }
    });

    /** @type {Array<{ title: string, items: Array<import('../../types/domain').Materia>, tramo: 'intermedio' | 'licenciatura' | 'general', showIntermediateMilestoneAfter: boolean }>} */
    const sections = [];

    rawSections.forEach((section, idx) => {
        if (idx < lastIntermedioSectionIdx) {
            sections.push({
                ...section,
                tramo: 'intermedio',
                showIntermediateMilestoneAfter: false,
            });
            return;
        }

        if (idx === lastIntermedioSectionIdx) {
            const itemsIntermedio = section.items.filter((m) =>
                codigosIntermedio.has(String(m.codigo)),
            );
            const itemsResto = section.items.filter(
                (m) => !codigosIntermedio.has(String(m.codigo)),
            );

            if (itemsResto.length > 0 && itemsIntermedio.length > 0) {
                sections.push({
                    title: section.title,
                    items: itemsIntermedio,
                    tramo: 'intermedio',
                    showIntermediateMilestoneAfter: true,
                });
                sections.push({
                    title: `${section.title} · Ciclo de Licenciatura`,
                    items: itemsResto,
                    tramo: 'licenciatura',
                    showIntermediateMilestoneAfter: false,
                });
            } else {
                sections.push({
                    ...section,
                    tramo: 'intermedio',
                    showIntermediateMilestoneAfter: true,
                });
            }
            return;
        }

        sections.push({
            ...section,
            tramo: 'licenciatura',
            showIntermediateMilestoneAfter: false,
        });
    });

    return sections;
}

/**
 * Dibuja la leyenda visual de diplomaturas intracurriculares en la cabecera de la planilla.
 * @param {any} pdf
 * @param {number} y
 * @param {Array<import('../../types/domain').DiplomaturaProgresoResumen>} diplomaturasResumen
 * @param {boolean} includeProgress
 */
function drawDiplomaturasLegend(pdf, y, diplomaturasResumen, includeProgress) {
    if (!diplomaturasResumen || diplomaturasResumen.length === 0) return y;

    const cols = 2;
    const numRows = Math.ceil(diplomaturasResumen.length / cols);
    const headerH = 6.0;
    const rowH = 5.4;
    const footerH = 5.0;
    const legendH = headerH + numRows * rowH + footerH + 1.8;

    if (y + legendH > BOTTOM_LIMIT) {
        pdf.addPage();
        y = MARGIN_TOP;
    }

    pdf.setFillColor(...BG_SOFT);
    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(0.25);
    pdf.roundedRect(MARGIN_X, y, CONTENT_WIDTH, legendH, 1.5, 1.5, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...INK_DARK);
    pdf.text(
        'Diplomaturas Intracurriculares (Res. HCS 726/24 · certificaciones parciales)',
        MARGIN_X + 3,
        y + 4.3,
    );

    const colW = (CONTENT_WIDTH - 6) / 2;
    diplomaturasResumen.forEach((dipl, idx) => {
        const colIdx = idx % 2;
        const rowIdx = Math.floor(idx / 2);
        const cx = MARGIN_X + 3 + colIdx * colW;
        const cy = y + headerH + rowIdx * rowH;

        const pillW = 10.6;
        const pillH = 3.6;
        pdf.setFillColor(...dipl.color.bg);
        pdf.setDrawColor(...dipl.color.border);
        pdf.setLineWidth(0.25);
        pdf.roundedRect(cx, cy + 0.5, pillW, pillH, 0.8, 0.8, 'FD');

        const badgeCode = dipl.tieneOptativasRequeridas ? `${dipl.shortCode}*` : dipl.shortCode;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(5.7);
        pdf.setTextColor(...dipl.color.text);
        pdf.text(badgeCode, cx + pillW / 2, cy + 3.0, { align: 'center' });

        const statusLabel = includeProgress
            ? dipl.obtenida
                ? `${dipl.shortName} · ${dipl.completadas}/${dipl.totales} (Obtenida)`
                : `${dipl.shortName} · ${dipl.completadas}/${dipl.totales}`
            : `${dipl.shortName} (${dipl.totales} act. · ${dipl.horasTotales}h)`;

        pdf.setFont('helvetica', includeProgress && dipl.obtenida ? 'bold' : 'normal');
        pdf.setFontSize(6.9);
        pdf.setTextColor(...(includeProgress && dipl.obtenida ? UNLU_GREEN : INK_DARK));
        pdf.text(statusLabel, cx + pillW + 2.0, cy + 3.2);
    });

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(6.3);
    pdf.setTextColor(...INK_LIGHT);
    pdf.text(
        '* Certificación parcial intracurricular (no título independiente). TDC* requiere 14031 + Compiladores (11809) y Computabilidad y Complejidad.',
        MARGIN_X + 3,
        y + headerH + numRows * rowH + 3.4,
    );

    return y + legendH + 3.6;
}

/**
 * Dibuja el banner destacado de hito donde se obtiene el Título Intermedio.
 * @param {any} pdf
 * @param {number} y
 * @param {{
 *   tituloIntermedioNombre: string,
 *   totales: number,
 *   horasIntermedio: number,
 *   includeProgress: boolean,
 *   intermedioProgress: import('../../types/domain').ProgresoIntermedioResumen | null,
 * }} params
 */
function drawIntermediateTitleMilestoneBanner(
    pdf,
    y,
    {
        tituloIntermedioNombre,
        totales,
        horasIntermedio,
        includeProgress,
        intermedioProgress,
    },
) {
    if (!tituloIntermedioNombre || totales <= 0) return y;

    const bannerH = 12.2;
    if (y + bannerH + 2 > BOTTOM_LIMIT) {
        pdf.addPage();
        y = MARGIN_TOP;
    }

    const completadas = intermedioProgress?.completadas ?? 0;
    const totalReq = intermedioProgress?.totales ?? totales;
    const faltantes = Math.max(0, totalReq - completadas);
    const porcentaje = intermedioProgress?.porcentaje ?? 0;
    const obtenida = includeProgress && completadas >= totalReq;

    pdf.setFillColor(...BG_GREEN_SOFT);
    pdf.setDrawColor(...UNLU_GREEN);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(MARGIN_X, y, CONTENT_WIDTH, bannerH, 1.5, 1.5, 'FD');

    pdf.setFillColor(...UNLU_GREEN);
    pdf.rect(MARGIN_X, y, 2.0, bannerH, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...UNLU_GREEN);
    pdf.text(`HITO · ${tituloIntermedioNombre}`, MARGIN_X + 4.0, y + 4.8);

    const statusBadge = includeProgress
        ? obtenida
            ? `OBTENIDO (${completadas}/${totalReq} · 100%)`
            : `Faltan ${faltantes} de ${totalReq} (${completadas}/${totalReq} · ${porcentaje}%)`
        : `${totalReq} ${totalReq === 1 ? 'actividad' : 'actividades'} · ${horasIntermedio} hs`;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.9);
    pdf.setTextColor(...(obtenida || !includeProgress ? UNLU_GREEN : INK_DARK));
    pdf.text(statusBadge, PAGE_WIDTH - MARGIN_X - 3.0, y + 4.8, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.0);
    pdf.setTextColor(...INK_DARK);
    const detailText = includeProgress
        ? obtenida
            ? 'Completaste todas las actividades del tramo anterior requeridas para este título intermedio.'
            : `Se obtiene al aprobar todas las actividades del tramo anterior (${horasIntermedio} hs reloj). A continuación inicia el Ciclo de Licenciatura.`
        : `Se obtiene al completar y aprobar las ${totalReq} actividades del tramo anterior (${horasIntermedio} hs reloj). A continuación inicia el Ciclo de Licenciatura.`;

    pdf.text(detailText, MARGIN_X + 4.0, y + 9.4);

    return y + bannerH + 3.8;
}

/**
 * Construye la planilla vectorial A4 del plan de estudios completo:
 * - `includeProgress: false`: planilla en blanco ordenada por año y cuatrimestre para imprimir.
 * - `includeProgress: true`: pre-rellena las casillas (`Regular`, `Aprobada`, `Promoc.`) y notas
 *   desde Mis Materias / Analítico SAWeb junto con promedio, hito de título intermedio y diplomaturas.
 *
 * @param {{
 *   jsPDF: typeof import('jspdf').jsPDF,
 *   materias: Array<import('../../types/domain').Materia>,
 *   plan: string | null | undefined,
 *   progreso?: import('../../types/domain').ProgresoMap,
 *   progresoDetalles?: import('../../types/domain').ProgresoDetallesMap,
 *   kpis?: { aprobadasCount?: number, totalMaterias?: number, totalCount?: number, porcentajeGeneral?: number, porcentaje?: number } | null,
 *   includeProgress?: boolean,
 *   fechaEmision?: Date,
 * }} params
 */
export function buildPlanillaPlanPDFDocument({
    jsPDF,
    materias = [],
    plan,
    progreso = {},
    progresoDetalles = {},
    kpis = null,
    includeProgress = false,
    fechaEmision = new Date(),
}) {
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const planPolicy = getPlanPolicy(plan);
    const tituloIntermedioNombre = tituloIntermedioUtils.getTituloIntermedioNombre(plan);
    const materiasIntermedio = tituloIntermedioUtils.getMateriasIntermedio(plan, materias);
    const codigosIntermedio = new Set(materiasIntermedio.map((m) => String(m.codigo)));
    const horasIntermedio = materiasIntermedio.reduce(
        (acc, m) => acc + (Number(m.horas_totales) || 0),
        0,
    );

    const diplomaturasResumen = diplomaturasUtils.calcularProgresoDiplomaturas(
        plan,
        includeProgress ? progreso : {},
        includeProgress ? progresoDetalles : {},
    );
    const showDiplomados = diplomaturasResumen.length > 0;
    const diplomaturasPorMateria = showDiplomados
        ? diplomaturasUtils.getDiplomaturasPorMateria(plan)
        : {};

    const totalCount =
        kpis?.totalMaterias ??
        kpis?.totalCount ??
        materias.length;
    const aprobadasCount =
        kpis?.aprobadasCount ??
        materias.filter(
            (m) =>
                progreso?.[m.codigo] === 'Aprobado' ||
                progreso?.[m.codigo] === 'Promocionado',
        ).length;
    const porcentaje =
        kpis?.porcentajeGeneral ??
        kpis?.porcentaje ??
        (totalCount > 0 ? Math.round((aprobadasCount / totalCount) * 100) : 0);

    const resumenPromedio = includeProgress
        ? calcularPromedioGeneral(progresoDetalles, progreso)
        : null;
    const intermedioProgress =
        includeProgress && materiasIntermedio.length > 0
            ? tituloIntermedioUtils.calcularProgresoIntermedio(materiasIntermedio, progreso)
            : null;

    const totalHorasPlan = materias.reduce(
        (acc, m) => acc + (Number(m.horas_totales) || 0),
        0,
    );

    // ─── Encabezado institucional compacto ───────────────────────────────────
    let y = MARGIN_TOP;
    pdf.setFillColor(...UNLU_GREEN);
    pdf.rect(MARGIN_X, y - 2, CONTENT_WIDTH, 1.3, 'F');

    y += 4.2;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13.5);
    pdf.setTextColor(...INK_DARK);
    pdf.text(
        includeProgress
            ? 'Planilla de Avance Académico - UNLu'
            : 'Planilla del Plan de Estudios - UNLu',
        MARGIN_X,
        y,
    );

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

    y += 3.2;
    const showTramoRefLine = !showDiplomados && Boolean(tituloIntermedioNombre);
    const boxH = includeProgress
        ? showTramoRefLine
            ? 21.0
            : 17.0
        : showTramoRefLine
          ? 16.5
          : 12.5;
    pdf.setFillColor(...BG_SOFT);
    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(0.25);
    pdf.roundedRect(MARGIN_X, y, CONTENT_WIDTH, boxH, 1.5, 1.5, 'FD');

    if (includeProgress) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.2);
        pdf.setTextColor(...INK_DARK);
        const promSin =
            resumenPromedio?.promedioSinAplazos != null
                ? Number(resumenPromedio.promedioSinAplazos).toFixed(2)
                : '-';
        const promCon =
            resumenPromedio?.promedioConAplazos != null
                ? Number(resumenPromedio.promedioConAplazos).toFixed(2)
                : '-';
        pdf.text(
            `Avance: ${aprobadasCount}/${totalCount} (${porcentaje}%) · Promedio s/aplazos: ${promSin} · c/aplazos: ${promCon}`,
            MARGIN_X + 3,
            y + 4.8,
        );

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.6);
        pdf.setTextColor(...INK_MUTED);
        const interText =
            intermedioProgress && intermedioProgress.totales > 0
                ? `${tituloIntermedioNombre}: ${intermedioProgress.completadas}/${intermedioProgress.totales} (${intermedioProgress.porcentaje}%)`
                : `${materias.length} materias totales · ${totalHorasPlan} hs totales`;
        pdf.text(interText, MARGIN_X + 3, y + 9.2);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.3);
        pdf.setTextColor(...INK_MUTED);
        pdf.text('Casillas:', MARGIN_X + 3, y + 14.3);
        drawCheckbox(pdf, MARGIN_X + 18, y + 12.0, 'Regular', false);
        drawCheckbox(pdf, MARGIN_X + 35, y + 12.0, 'Aprobada', false);
        drawCheckbox(pdf, MARGIN_X + 54, y + 12.0, 'Promocionada', false);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7);
        pdf.setTextColor(...INK_LIGHT);
        pdf.text('(Las casillas marcadas reflejan tu progreso cargado)', MARGIN_X + 82, y + 14.3);

        if (showTramoRefLine) {
            pdf.setFillColor(...UNLU_GREEN);
            pdf.rect(MARGIN_X + 3, y + 16.5, 2.0, 2.8, 'F');
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(6.9);
            pdf.setTextColor(...INK_MUTED);
            pdf.text(`Tramo ${tituloIntermedioNombre}`, MARGIN_X + 6.5, y + 18.8);

            pdf.setFillColor(...INK_MUTED);
            pdf.rect(MARGIN_X + 68, y + 16.5, 2.0, 2.8, 'F');
            pdf.text(
                'Ciclo de Licenciatura (el hito verde indica dónde se obtiene el título)',
                MARGIN_X + 71.5,
                y + 18.8,
            );
        }
    } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.2);
        pdf.setTextColor(...INK_DARK);
        const interNote = tituloIntermedioNombre
            ? ` · Incluye hito de ${tituloIntermedioNombre}`
            : '';
        pdf.text(
            `${materias.length} materias · ${totalHorasPlan} hs totales del plan${interNote}`,
            MARGIN_X + 3,
            y + 4.7,
        );

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.3);
        pdf.setTextColor(...INK_MUTED);
        pdf.text('Control de cursada:', MARGIN_X + 3, y + 9.8);
        drawCheckbox(pdf, MARGIN_X + 31, y + 7.4, 'Regular');
        drawCheckbox(pdf, MARGIN_X + 49, y + 7.4, 'Aprobada');
        drawCheckbox(pdf, MARGIN_X + 69, y + 7.4, 'Promocionada');

        if (showTramoRefLine) {
            pdf.setFillColor(...UNLU_GREEN);
            pdf.rect(MARGIN_X + 3, y + 12.1, 2.0, 2.8, 'F');
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(6.9);
            pdf.setTextColor(...INK_MUTED);
            pdf.text(`Tramo ${tituloIntermedioNombre}`, MARGIN_X + 6.5, y + 14.4);

            pdf.setFillColor(...INK_MUTED);
            pdf.rect(MARGIN_X + 68, y + 12.1, 2.0, 2.8, 'F');
            pdf.text(
                'Ciclo de Licenciatura (el hito verde indica dónde se obtiene el título)',
                MARGIN_X + 71.5,
                y + 14.4,
            );
        }
    }

    y += boxH + 3.6;

    if (showDiplomados) {
        y = drawDiplomaturasLegend(pdf, y, diplomaturasResumen, includeProgress);
    }

    const sections = groupMateriasForPlanSheet(materias, codigosIntermedio);
    sections.forEach((section) => {
        if (y + 21 > BOTTOM_LIMIT) {
            pdf.addPage();
            y = MARGIN_TOP;
        }

        const bannerH = 7.0;
        pdf.setFillColor(...BG_SOFT);
        pdf.setDrawColor(...BORDER);
        pdf.setLineWidth(0.25);
        pdf.rect(MARGIN_X, y, CONTENT_WIDTH, bannerH, 'FD');

        pdf.setFillColor(...(section.tramo === 'licenciatura' ? INK_MUTED : UNLU_GREEN));
        pdf.rect(MARGIN_X, y, 1.4, bannerH, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.6);
        pdf.setTextColor(...INK_DARK);
        pdf.text(section.title, MARGIN_X + 3.2, y + 4.7);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.4);
        pdf.setTextColor(...INK_MUTED);
        pdf.text(
            `${section.items.length} ${section.items.length === 1 ? 'materia' : 'materias'}`,
            PAGE_WIDTH - MARGIN_X - 2.2,
            y + 4.7,
            { align: 'right' },
        );

        y += bannerH;
        y = drawTableHeader(pdf, y, { showDiplomados });

        section.items.forEach((materia, rowIdx) => {
            const det = includeProgress ? progresoDetalles?.[materia.codigo] : null;
            const estado = includeProgress ? progreso?.[materia.codigo] : null;

            const checkedPromoc = includeProgress && estado === 'Promocionado';
            const checkedAprob = includeProgress && estado === 'Aprobado';
            const checkedReg =
                includeProgress &&
                (estado === 'Regular' ||
                    (estado === 'Aprobado' && !det?.rendidaLibre && !det?.esEquivalencia));

            let notaText = '';
            if (includeProgress) {
                if (estado === 'Promocionado') {
                    const n = det?.notaFinal ?? det?.notaRegularizacion;
                    notaText = n != null ? String(n) : 'Prom.';
                } else if (estado === 'Aprobado') {
                    if (det?.notaFinal != null) {
                        notaText = String(det.notaFinal);
                    } else if (det?.esEquivalencia) {
                        notaText = 'Equiv.';
                    }
                }
            }

            const baseName =
                includeProgress && det?.nombreOptativa
                    ? `${materia.nombre}: ${det.nombreOptativa}${
                          det.codigoOptativa ? ` (Acta ${det.codigoOptativa})` : ''
                      }`
                    : String(materia.nombre || '');

            const suffixParts = [];
            if (materia.taller === true) {
                suffixParts.push('[Taller]');
            }
            if (codigosIntermedio.has(String(materia.codigo))) {
                suffixParts.push('[Intermedio]');
            }
            if (includeProgress && (estado === 'Cursando' || estado === 'Libre')) {
                suffixParts.push(`(${estado})`);
            }
            const displayName =
                suffixParts.length > 0 ? `${baseName} ${suffixParts.join(' ')}` : baseName;

            const codigoStr =
                materia.mostrarCodigo === false ? '---' : String(materia.codigo || '');
            const hsSem = Number(materia.horas_semanales) || 0;
            const hsTot = Number(materia.horas_totales) || 0;
            const cargaStr =
                hsSem === 0 && hsTot === 0 && materia.taller
                    ? 'Acred.'
                    : [hsSem > 0 ? `${hsSem}h/s` : null, hsTot > 0 ? `${hsTot}h` : null]
                          .filter(Boolean)
                          .join(' · ') || '-';

            y = renderChecklistRow(pdf, y, rowIdx, {
                codigoStr,
                displayName,
                cargaStr,
                checkedReg,
                checkedAprob,
                checkedPromoc,
                notaText,
                showDiplomados,
                diplomaturaTags: showDiplomados
                    ? diplomaturasPorMateria[String(materia.codigo)] || []
                    : [],
                isIntermedioRow: codigosIntermedio.has(String(materia.codigo)),
            });
        });

        y += section.showIntermediateMilestoneAfter ? 2.6 : 4.2;

        if (section.showIntermediateMilestoneAfter && tituloIntermedioNombre) {
            y = drawIntermediateTitleMilestoneBanner(pdf, y, {
                tituloIntermedioNombre,
                totales: materiasIntermedio.length,
                horasIntermedio,
                includeProgress,
                intermedioProgress,
            });
        }
    });

    stampPageFooters(
        pdf,
        `${PDF_UNOFFICIAL_FOOTER_DISCLAIMER} · Plan ${plan || '-'} · Simulador de Correlativas`,
    );
    return pdf;
}

/**
 * Descarga directamente la planilla del plan (en blanco o con el progreso real cargado).
 *
 * @param {{
 *   materias: Array<import('../../types/domain').Materia>,
 *   plan: string | null | undefined,
 *   progreso?: import('../../types/domain').ProgresoMap,
 *   progresoDetalles?: import('../../types/domain').ProgresoDetallesMap,
 *   kpis?: { aprobadasCount?: number, totalMaterias?: number, totalCount?: number, porcentajeGeneral?: number, porcentaje?: number } | null,
 *   includeProgress?: boolean,
 *   loadJsPDF?: () => Promise<{ jsPDF: typeof import('jspdf').jsPDF }>,
 * }} params
 */
export async function downloadPlanillaPlanPDF({
    materias,
    plan,
    progreso = {},
    progresoDetalles = {},
    kpis = null,
    includeProgress = false,
    loadJsPDF = defaultLoadJsPDF,
}) {
    try {
        const { jsPDF } = await loadJsPDF();
        const pdf = buildPlanillaPlanPDFDocument({
            jsPDF,
            materias,
            plan,
            progreso,
            progresoDetalles,
            kpis,
            includeProgress,
        });
        const filename = includeProgress
            ? `Mi_Progreso_Plan_${plan || 'UNLu'}.pdf`
            : `Planilla_Plan_${plan || 'UNLu'}.pdf`;
        pdf.save(filename);

        try {
            addToast({
                title: '¡PDF Descargado!',
                description: includeProgress
                    ? 'Se descargó la planilla con tu progreso y notas cargadas'
                    : 'Se descargó la planilla en blanco del plan de estudios',
                color: 'success',
            });
        } catch {
            /* Toast opcional */
        }
        trackDescargaPDF({ plan });
        return true;
    } catch (err) {
        logError(err, { route: '/mis-materias', context: { plan, includeProgress } });
        try {
            addToast({
                title: 'Error',
                description: 'Ocurrió un problema generando la planilla PDF.',
                color: 'danger',
            });
        } catch {
            /* Toast opcional */
        }
        return false;
    }
}

/**
 * Encapsula la descarga del PDF vectorial en formato tabla imprimible desde el Simulador.
 *
 * @param {{
 *   historialSemestres: Array<import('../../types/domain').HistorialSemestre>,
 *   plan: string | null | undefined,
 *   materias?: Array<import('../../types/domain').Materia>,
 *   progresoSimulado?: import('../../types/domain').ProgresoSimuladorMap | null,
 *   progresoBase?: import('../../types/domain').ProgresoSimuladorMap | null,
 *   progresoReal?: import('../../types/domain').ProgresoMap | null,
 *   progresoDetallesReal?: import('../../types/domain').ProgresoDetallesMap | null,
 *   anioActual?: number | string,
 *   cuatri?: string | number,
 *   setDescargandoPDF?: (loading: boolean) => void,
 *   loadJsPDF?: () => Promise<{ jsPDF: typeof import('jspdf').jsPDF }>,
 * }} params
 */
const useSimuladorPDF = ({
    historialSemestres,
    plan,
    materias = [],
    progresoSimulado = null,
    progresoBase = null,
    progresoReal = null,
    progresoDetallesReal = null,
    anioActual = new Date().getFullYear(),
    cuatri = '1',
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
                progresoSimulado,
                progresoBase,
                progresoReal,
                progresoDetallesReal,
                anioActual,
                cuatri,
            });
            pdf.save(`Simulacion_${plan}.pdf`);

            try {
                addToast({
                    title: '¡PDF Descargado!',
                    description: 'Has guardado tu planilla imprimible hasta finalizar la carrera',
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
    }, [
        historialSemestres,
        plan,
        materias,
        progresoSimulado,
        progresoBase,
        progresoReal,
        progresoDetallesReal,
        anioActual,
        cuatri,
        setDescargandoPDF,
        loadJsPDF,
    ]);

    return { handleDownloadPDF };
};

export default useSimuladorPDF;
