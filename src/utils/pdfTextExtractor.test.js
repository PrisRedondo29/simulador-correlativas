import { describe, expect, it } from 'vitest';
import { groupPdfTextItemsToLines } from './pdfTextExtractor';

describe('pdfTextExtractor - groupPdfTextItemsToLines', () => {
    it('reconstruye filas del Analítico agrupando celdas por coordenada Y y ordenando por X', () => {
        const items = [
            { str: '01-07-2019', transform: [1, 0, 0, 1, 480, 620] },
            { str: '11071 P-INTRODUCCION A LA PROGRAMACION', transform: [1, 0, 0, 1, 70, 620.5] },
            { str: '0475-047', transform: [1, 0, 0, 1, 390, 620] },
            { str: '7(SIETE)', transform: [1, 0, 0, 1, 310, 619.8] },
            { str: '13021-ALGEBRA LINEAL Y GEOMETRIA', transform: [1, 0, 0, 1, 70, 590] },
            { str: 'E', transform: [1, 0, 0, 1, 350, 590] },
            { str: '21-08-2026', transform: [1, 0, 0, 1, 480, 590] },
        ];

        const lines = groupPdfTextItemsToLines(items);

        expect(lines).toEqual([
            '11071 P-INTRODUCCION A LA PROGRAMACION 7(SIETE) 0475-047 01-07-2019',
            '13021-ALGEBRA LINEAL Y GEOMETRIA E 21-08-2026',
        ]);
    });
});
