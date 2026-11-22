// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockSetPlan = vi.fn();
const mockUpdateAuthProgreso = vi.fn();
const mockUsePlanData = vi.fn();

vi.mock('../context/PlanContext', () => ({
    useActivePlan: () => ({
        plan: '17.13',
        setPlan: mockSetPlan,
    }),
    usePlanCapabilities: () => ({
        policy: { carrera: 'Licenciatura en Sistemas de Información' },
    }),
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        updateAuthProgreso: mockUpdateAuthProgreso,
    }),
}));

vi.mock('../hooks/usePlanData', () => ({
    default: (...args) => mockUsePlanData(...args),
}));

vi.mock('../components/Progreso/modals/ImportarSawebModal', () => ({
    default: () => null,
}));

vi.mock('../components/Progreso/modals/PlanSelectionModal', () => ({
    default: () => null,
}));

vi.mock('@heroui/react', () => ({
    addToast: vi.fn(),
    Spinner: ({ label }) => <div role="status">{label || 'Cargando'}</div>,
    Card: ({ children, className }) => <div className={className}>{children}</div>,
    CardBody: ({ children, className }) => <div className={className}>{children}</div>,
    Chip: ({ children, className }) => <span className={className}>{children}</span>,
    Button: ({ children, onPress, disabled, isDisabled, startContent, className, 'aria-label': ariaLabel, as: Component, to }) => {
        if (Component) {
            return (
                <a href={to || '#'} className={className} aria-label={ariaLabel}>
                    {startContent}
                    {children}
                </a>
            );
        }
        return (
            <button
                type="button"
                onClick={onPress}
                disabled={Boolean(disabled || isDisabled)}
                aria-label={ariaLabel}
                className={className}
            >
                {startContent}
                {children}
            </button>
        );
    },
    Tabs: ({ children, selectedKey, onSelectionChange, 'aria-label': ariaLabel }) => (
        <div aria-label={ariaLabel} data-selected={selectedKey}>
            <div role="tablist">
                {React.Children.map(children, (child) =>
                    child ? (
                        <button
                            key={child.key}
                            type="button"
                            role="tab"
                            aria-selected={selectedKey === child.key}
                            onClick={() => onSelectionChange?.(child.key)}
                        >
                            {child.props.title}
                        </button>
                    ) : null,
                )}
            </div>
            <div>
                {React.Children.map(children, (child) =>
                    child && child.key === selectedKey ? child.props.children : null,
                )}
            </div>
        </div>
    ),
    Tab: ({ children }) => <div>{children}</div>,
    useDisclosure: () => ({
        isOpen: false,
        onOpen: vi.fn(),
        onClose: vi.fn(),
        onOpenChange: vi.fn(),
    }),
}));

import Estadisticas from './Estadisticas';

const MOCK_MATERIAS = [
    { codigo: '11071', nombre: 'Intro a la Programación', anio: 1, cuatrimestre: 1, horas_totales: 96 },
    { codigo: '11072', nombre: 'Álgebra y Lógica', anio: 1, cuatrimestre: 1, horas_totales: 96 },
    { codigo: '11074', nombre: 'Programación I', anio: 1, cuatrimestre: 2, horas_totales: 96 },
    { codigo: '11075', nombre: 'Programación II', anio: 2, cuatrimestre: 3, horas_totales: 96 },
];

describe('Estadisticas - Página de métricas y gráficos académicos', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('muestra estado vacío cuando no hay progreso ni notas cargadas', () => {
        mockUsePlanData.mockReturnValue({
            materias: MOCK_MATERIAS,
            progreso: { '11071': 'Disponible', '11072': 'Disponible' },
            setProgreso: vi.fn(),
            progresoDetalles: {},
            setProgresoDetalles: vi.fn(),
            cargandoPlan: false,
        });

        render(
            <MemoryRouter>
                <Estadisticas />
            </MemoryRouter>,
        );

        expect(screen.getByText('Todavía no hay datos para graficar')).toBeTruthy();
        expect(screen.getAllByRole('button', { name: 'Importar Analítico SAWeb' })).toHaveLength(2);
        expect(screen.getByText('Cargar en Mis Materias')).toBeTruthy();
    });

    it('renderiza los 4 bloques principales, alterna pestañas por cuatrimestre y alterna aplazos en histograma', () => {
        mockUsePlanData.mockReturnValue({
            materias: MOCK_MATERIAS,
            progreso: {
                '11071': 'Promocionado',
                '11072': 'Aprobado',
                '11074': 'Aprobado',
                '11075': 'Regular',
            },
            setProgreso: vi.fn(),
            progresoDetalles: {
                '11071': { notaFinal: 8, notaRegularizacion: 8, fechaAprobacion: '2024-06-25' },
                '11072': {
                    notaFinal: 8,
                    fechaAprobacion: '2024-12-15',
                    intentosFinal: [
                        { nota: 2, estado: 'reprobado', fecha: '2024-07-15' },
                        { nota: 8, estado: 'aprobado', fecha: '2024-12-15' },
                    ],
                },
                '11074': {
                    notaFinal: 7,
                    rendidaLibre: true,
                    fechaAprobacion: '2025-06-20',
                    intentosFinal: [{ nota: 7, estado: 'aprobado', fecha: '2025-06-20' }],
                },
            },
            setProgresoDetalles: vi.fn(),
            cargandoPlan: false,
        });

        render(
            <MemoryRouter>
                <Estadisticas />
            </MemoryRouter>,
        );

        // Los 4 bloques principales presentes
        expect(screen.getByText('Histograma de Notas')).toBeTruthy();
        expect(screen.getByText('Rendimiento por Cuatrimestre')).toBeTruthy();
        expect(screen.getByText('Finales y Modalidades')).toBeTruthy();
        expect(screen.getByText('Avance por Año de la Carrera')).toBeTruthy();

        // Histograma por defecto en "Solo aprobadas (4–10)" y cambio a "Con aplazos (1–10)"
        expect(screen.getByLabelText('Nota 8: 2 actas')).toBeTruthy();
        expect(screen.queryByLabelText('Nota 2: 1 acta')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Con aplazos (1–10)' }));
        expect(screen.getByLabelText('Nota 2: 1 acta')).toBeTruthy();

        // Inspeccionar detalle de una barra
        fireEvent.click(screen.getByLabelText('Nota 8: 2 actas'));
        expect(screen.getByText('Nota 8 · 2 actas')).toBeTruthy();

        // Pestaña Materia por materia en Bloque 1
        fireEvent.click(screen.getByRole('tab', { name: 'Materia por materia (Desagrupado)' }));
        expect(screen.getByText(/materias con calificación/i)).toBeTruthy();
        expect(screen.getByLabelText('Intro a la Programación - Nota 8')).toBeTruthy();
        expect(screen.getByLabelText('Álgebra y Lógica - Nota 8')).toBeTruthy();

        // Pestaña 1 por defecto: Materias por cuatri -> cambia a Promedio por cuatri
        expect(screen.getByRole('button', { name: 'Horas' })).toBeTruthy();
        fireEvent.click(screen.getByRole('tab', { name: 'Promedio por cuatri' }));
        expect(screen.getByLabelText('Evolución cronológica del promedio por cuatrimestre y promedio acumulado')).toBeTruthy();

        // Sección desagregada al pie
        expect(screen.getByText('Detalle Completo de Cursadas')).toBeTruthy();
        const tabla = screen.getByRole('table');
        expect(within(tabla).getByText('Intro a la Programación')).toBeTruthy();
        expect(within(tabla).getByText('Álgebra y Lógica')).toBeTruthy();

        // Buscador de materias desagregadas
        const inputBuscar = screen.getByPlaceholderText('Buscar por materia o código...');
        fireEvent.change(inputBuscar, { target: { value: 'Intro' } });
        expect(within(tabla).getByText('Intro a la Programación')).toBeTruthy();
        expect(within(tabla).queryByText('Álgebra y Lógica')).toBeNull();

        // Limpiar búsqueda
        fireEvent.change(inputBuscar, { target: { value: '' } });
        expect(within(tabla).getByText('Álgebra y Lógica')).toBeTruthy();

        // Colapsar y expandir detalle
        const toggleBtn = screen.getByRole('button', { name: /Ocultar listado/i });
        fireEvent.click(toggleBtn);
        expect(screen.queryByPlaceholderText('Buscar por materia o código...')).toBeNull();
        const verBtn = screen.getByRole('button', { name: /Ver listado completo/i });
        fireEvent.click(verBtn);
        expect(screen.getByPlaceholderText('Buscar por materia o código...')).toBeTruthy();
    });
});
