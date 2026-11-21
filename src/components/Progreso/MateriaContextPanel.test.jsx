// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        updateAuthProgreso: vi.fn(),
    }),
}));

vi.mock('./modals/ConsejoMateria', () => ({
    default: () => <div data-testid="consejo-materia" />,
}));

vi.mock('@heroui/react', () => ({
    Button: ({ children, onPress, 'aria-label': ariaLabel }) => (
        <button type="button" onClick={onPress} aria-label={ariaLabel}>
            {children}
        </button>
    ),
    Chip: ({ children }) => <span>{children}</span>,
    Drawer: ({ children }) => <div>{children}</div>,
    DrawerBody: ({ children }) => <div>{children}</div>,
    DrawerContent: ({ children }) => <div>{children}</div>,
    DrawerHeader: ({ children }) => <div>{children}</div>,
    Input: ({ label, value, onValueChange, type = 'text' }) => (
        <label>
            {label}
            <input
                aria-label={label}
                type={type}
                value={value ?? ''}
                onChange={(e) => onValueChange?.(e.target.value)}
            />
        </label>
    ),
    Progress: ({ 'aria-label': ariaLabel }) => <div role="progressbar" aria-label={ariaLabel} />,
    Select: ({ label, selectedKeys, onChange, children }) => (
        <label>
            {label}
            <select
                aria-label={label}
                value={selectedKeys?.[0] ?? ''}
                onChange={onChange}
            >
                {children}
            </select>
        </label>
    ),
    SelectItem: ({ children, ...props }) => <option {...props}>{children}</option>,
    Switch: ({ isSelected, onValueChange }) => (
        <input
            type="checkbox"
            checked={Boolean(isSelected)}
            onChange={(e) => onValueChange?.(e.target.checked)}
        />
    ),
}));

import { MateriaContextContent } from './MateriaContextPanel';

const MATERIAS_V2 = [
    { codigo: 'C1', nombre: 'Álgebra', anio: 1, cuatrimestre: 1, horas_totales: 100, correlativas: [] },
    { codigo: 'C2', nombre: 'Análisis I', anio: 1, cuatrimestre: 1, horas_totales: 100, correlativas: [] },
    {
        codigo: 'C3',
        nombre: 'Física II',
        anio: 2,
        cuatrimestre: 1,
        horas_totales: 96,
        correlativas: ['C1', 'C2'],
        correlativasCursada: [
            { codigo: 'C1', condicion: 'aprobada' },
            { codigo: 'C2', condicion: 'regular' },
        ],
        correlativasFinal: ['C1', 'C2'],
        requisitosEspeciales: {
            minimoHorasAprobadas: 250,
        },
    },
];

describe('MateriaContextContent - Reglas v2 en UI e intercepción de cascada al aprobar examen final', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('muestra chips de condición v2 ("Cursar: Aprobada", "Cursar: Regular") y requisitos especiales pendientes', () => {
        const progreso = {
            C1: 'Aprobado', // 100 hs aprobadas (faltan 150 hs para las 250 hs de requisitosEspeciales)
            C2: 'Regular',
            C3: 'Bloqueado',
        };

        render(
            <MateriaContextContent
                materia={MATERIAS_V2[2]}
                materias={MATERIAS_V2}
                progreso={progreso}
                progresoDetalles={{}}
                setProgresoDetalles={vi.fn()}
                plan="17.14"
                cambioDeEstado={vi.fn()}
                onChangeEstado={vi.fn()}
                onSelectMateria={vi.fn()}
            />,
        );

        expect(screen.getByText('Cursar: Aprobada')).toBeTruthy();
        expect(screen.getByText('Cursar: Regular')).toBeTruthy();
        expect(screen.getByText(/Requisitos adicionales pendientes/i)).toBeTruthy();
        expect(screen.getByText(/Mínimo 250 hs aprobadas/i)).toBeTruthy();
    });

    it('muestra aviso de final pendiente cuando puedeCursar=true pero puedeRendirFinal=false, e intercepta llamado aprobado con solicitarConfirmacionCascada', () => {
        const materiaSinUmbralHoras = {
            ...MATERIAS_V2[2],
            requisitosEspeciales: null,
        };
        const progreso = {
            C1: 'Aprobado',
            C2: 'Regular', // Permite cursar C3, pero falta aprobar el final de C2 para rendir final de C3
            C3: 'Regular',
        };

        const solicitarConfirmacionCascada = vi.fn(({ onConfirmAction }) => {
            // Simulamos que el modal intercepta y espera confirmación del usuario
            return Boolean(onConfirmAction);
        });
        const setProgresoDetalles = vi.fn();

        render(
            <MateriaContextContent
                materia={materiaSinUmbralHoras}
                materias={[MATERIAS_V2[0], MATERIAS_V2[1], materiaSinUmbralHoras]}
                progreso={progreso}
                progresoDetalles={{ C3: { intentosFinal: [] } }}
                setProgresoDetalles={setProgresoDetalles}
                plan="17.14"
                cambioDeEstado={vi.fn()}
                onChangeEstado={vi.fn()}
                solicitarConfirmacionCascada={solicitarConfirmacionCascada}
                onSelectMateria={vi.fn()}
            />,
        );

        // Muestra el aviso calmo indicando que Análisis I debe tener final aprobado
        expect(screen.getByText(/Habilitada para cursar\./i)).toBeTruthy();
        expect(
            screen.getByText(/Para rendir final o promocionar necesitás aprobar el final de:/i),
        ).toBeTruthy();

        // Abrimos el formulario para agregar un llamado de examen final
        fireEvent.click(screen.getByRole('button', { name: /Agregar/i }));

        // Ingresamos una nota aprobada (8) y pulsamos "Guardar intento"
        const inputNota = screen.getByLabelText(/Nota \(0-10\)/i);
        fireEvent.change(inputNota, { target: { value: '8' } });
        fireEvent.click(screen.getByRole('button', { name: /Guardar intento/i }));

        // Debe haber invocado a solicitarConfirmacionCascada antes de mutar progresoDetalles
        expect(solicitarConfirmacionCascada).toHaveBeenCalledTimes(1);
        expect(solicitarConfirmacionCascada).toHaveBeenCalledWith(
            expect.objectContaining({
                codigo: 'C3',
                targetState: 'Aprobado',
                onConfirmAction: expect.any(Function),
            }),
        );
    });

    it('muestra aviso inline "Falta info" en materias incompletas y permite cargar Nota cursada en Promocionado', () => {
        const { rerender } = render(
            <MateriaContextContent
                materia={MATERIAS_V2[0]}
                materias={MATERIAS_V2}
                progreso={{ C1: 'Regular' }}
                progresoDetalles={{}}
                setProgresoDetalles={vi.fn()}
                plan="17.14"
                cambioDeEstado={vi.fn()}
                onChangeEstado={vi.fn()}
                onSelectMateria={vi.fn()}
            />,
        );

        expect(
            screen.getByText(/Falta info: completá abajo el año y la nota de cursada/i),
        ).toBeTruthy();

        const setProgresoDetalles = vi.fn();
        rerender(
            <MateriaContextContent
                materia={MATERIAS_V2[0]}
                materias={MATERIAS_V2}
                progreso={{ C1: 'Promocionado' }}
                progresoDetalles={{}}
                setProgresoDetalles={setProgresoDetalles}
                plan="17.14"
                cambioDeEstado={vi.fn()}
                onChangeEstado={vi.fn()}
                onSelectMateria={vi.fn()}
            />,
        );

        expect(
            screen.getByText(/Falta info: completá la nota de cursada/i),
        ).toBeTruthy();
        expect(screen.queryByLabelText(/Nota final \(promoción\)/i)).toBeNull();
        const inputCursada = screen.getByLabelText(/Nota cursada/i);
        fireEvent.change(inputCursada, { target: { value: '9' } });
        expect(setProgresoDetalles).toHaveBeenCalled();
        const updaterFn = setProgresoDetalles.mock.calls[0][0];
        const nextDetalles = updaterFn({});
        expect(nextDetalles.C1).toMatchObject({
            notaRegularizacion: 9,
            notaFinal: 9,
        });

        // Al completar la nota desaparece el aviso inline
        rerender(
            <MateriaContextContent
                materia={MATERIAS_V2[0]}
                materias={MATERIAS_V2}
                progreso={{ C1: 'Promocionado' }}
                progresoDetalles={{ C1: { notaRegularizacion: 9, notaFinal: 9 } }}
                setProgresoDetalles={setProgresoDetalles}
                plan="17.14"
                cambioDeEstado={vi.fn()}
                onChangeEstado={vi.fn()}
                onSelectMateria={vi.fn()}
            />,
        );

        expect(screen.queryByText(/Falta info:/i)).toBeNull();

        // Materia Aprobado (Regular, no libre) sin fechaRegularidad explícita muestra el año inferido
        rerender(
            <MateriaContextContent
                materia={MATERIAS_V2[0]}
                materias={MATERIAS_V2}
                progreso={{ C1: 'Aprobado' }}
                progresoDetalles={{
                    C1: {
                        notaFinal: 6,
                        rendidaLibre: false,
                        esEquivalencia: false,
                        fechaAprobacion: '2023-12-16',
                        fechaRegularidad: null,
                        intentosFinal: [
                            { nota: 2, estado: 'reprobado', fecha: '2023-09-30' },
                            { nota: 6, estado: 'aprobado', fecha: '2023-12-16' },
                        ],
                    },
                }}
                setProgresoDetalles={setProgresoDetalles}
                plan="17.14"
                cambioDeEstado={vi.fn()}
                onChangeEstado={vi.fn()}
                onSelectMateria={vi.fn()}
            />,
        );

        const selectAnio = /** @type {HTMLSelectElement} */ (
            screen.getByLabelText(/Año regularidad/i)
        );
        expect(selectAnio.value).toBe('2023');
    });

    it('permite desplegar las materias habilitadas al clickear "Habilita a X materias" y maneja Libre / >4 desaprobaciones', () => {
        const onSelectMateria = vi.fn();
        const setProgresoDetalles = vi.fn();

        const intentos7 = Array.from({ length: 7 }, (_, i) => ({
            nota: 2,
            estado: /** @type {const} */ ('reprobado'),
            fecha: `2023-0${i + 1}-10`,
            condicion: i >= 4 ? /** @type {const} */ ('Libre') : /** @type {const} */ ('Regular'),
        }));

        render(
            <MateriaContextContent
                materia={MATERIAS_V2[0]}
                materias={MATERIAS_V2}
                progreso={{ C1: 'Aprobado', C2: 'Regular', C3: 'Disponible' }}
                progresoDetalles={{
                    C1: {
                        notaFinal: 5,
                        rendidaLibre: true,
                        esEquivalencia: false,
                        intentosFinal: [
                            ...intentos7,
                            { nota: 5, estado: 'aprobado', fecha: '2025-12-01', condicion: 'Libre' },
                        ],
                    },
                }}
                setProgresoDetalles={setProgresoDetalles}
                plan="17.14"
                cambioDeEstado={vi.fn()}
                onChangeEstado={vi.fn()}
                onSelectMateria={onSelectMateria}
            />,
        );

        // 1. Botón "Habilita a 1 materia" despliega C3 (Física II) y permite seleccionarla
        const btnHabilita = screen.getByRole('button', { name: /Habilita a 1 materia/i });
        expect(screen.queryByText('Física II')).toBeNull();
        fireEvent.click(btnHabilita);
        expect(screen.getByText('Física II')).toBeTruthy();
        fireEvent.click(screen.getByText('Física II'));
        expect(onSelectMateria).toHaveBeenCalledWith('C3');

        // 2. Muestra chip Rendida libre y opción rápida "Cargar cursada"
        expect(screen.getByText('Rendida libre')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Cargar cursada/i }));
        expect(setProgresoDetalles).toHaveBeenCalled();

        // 3. No muestra el contador desbordado "7 de 4 desaprobaciones"
        expect(screen.queryByText(/7 de 4 desaprobaciones/i)).toBeNull();
        expect(screen.getByText(/7 desaprobaciones acumuladas/i)).toBeTruthy();
        expect(screen.getAllByText('Libre').length).toBeGreaterThanOrEqual(4);
    });

    it('muestra el nombre y código de acta de la optativa cursada cuando está cargado en detalles', () => {
        const materiaOptativa = {
            codigo: 'OP1',
            nombre: 'Optativa I',
            anio: 4,
            cuatrimestre: 8,
            horas_totales: 64,
            correlativas: [],
            es_optativa: true,
        };

        render(
            <MateriaContextContent
                materia={materiaOptativa}
                materias={[materiaOptativa]}
                progreso={{ OP1: 'Promocionado' }}
                progresoDetalles={{
                    OP1: {
                        notaFinal: 9,
                        notaRegularizacion: 9,
                        nombreOptativa: 'COMPILADORES',
                        codigoOptativa: '11809',
                    },
                }}
                setProgresoDetalles={vi.fn()}
                plan="17.13"
                cambioDeEstado={vi.fn()}
                onChangeEstado={vi.fn()}
                onSelectMateria={vi.fn()}
            />,
        );

        expect(screen.getByText(/OP1 · Acta 11809/i)).toBeTruthy();
        expect(screen.getByText(/Optativa cursada: COMPILADORES/i)).toBeTruthy();
    });
});
