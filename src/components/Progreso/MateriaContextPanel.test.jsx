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
    Button: ({ children, onPress, ...rest }) => (
        <button type="button" onClick={onPress} {...rest}>
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
});
