/**
 * Reconstruye líneas de texto ordenadas (arriba->abajo, izquierda->derecha)
 * a partir de los items devueltos por pdfjs `page.getTextContent()`.
 *
 * @param {Array<{ str?: string, transform?: number[] }>} items
 * @param {number} [yTolerance]
 * @returns {string[]}
 */
export function groupPdfTextItemsToLines(items, yTolerance = 2.5) {
    /** @type {Array<{ y: number, cells: Array<{ x: number, text: string }> }>} */
    const rows = [];

    for (const item of items || []) {
        const text = typeof item?.str === 'string' ? item.str.trim() : '';
        if (!text) continue;

        const transform = Array.isArray(item.transform) ? item.transform : [1, 0, 0, 1, 0, 0];
        const x = Number(transform[4]) || 0;
        const y = Number(transform[5]) || 0;

        let targetRow = rows.find((r) => Math.abs(r.y - y) <= yTolerance);
        if (!targetRow) {
            targetRow = { y, cells: [] };
            rows.push(targetRow);
        }
        targetRow.cells.push({ x, text });
    }

    rows.sort((a, b) => b.y - a.y);

    return rows.map((row) =>
        row.cells
            .sort((a, b) => a.x - b.x)
            .map((c) => c.text)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim(),
    );
}

/**
 * Extrae el texto completo de un archivo PDF 100% local en el navegador
 * cargando pdfjs-dist de forma lazy para no aumentar el bundle inicial.
 *
 * @param {File} file
 * @returns {Promise<{ text: string, numPages: number }>}
 */
export async function extractTextFromPdfFile(file) {
    const [pdfjsLib, workerModule] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);

    if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const pagesText = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const lines = groupPdfTextItemsToLines(
            /** @type {Array<{ str?: string, transform?: number[] }>} */ (content.items),
        );
        pagesText.push(lines.join('\n'));
    }

    return {
        text: pagesText.join('\n'),
        numPages: pdf.numPages,
    };
}
