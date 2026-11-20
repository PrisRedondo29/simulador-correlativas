import { useState, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button, addToast } from '@heroui/react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, Clock } from 'lucide-react';
import MateriaSelect from './MateriaSelect';
import {
    TIPOS_EVENTO,
    getTodayISODate,
    parseISODateParts,
    diffDaysISO,
    formatFechaCorta,
    formatMesAnio,
    formatCuentaRegresiva,
    buildCalendarMonthGrid,
} from '../../utils/Cursada/cursadaUtils';

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const TIPO_KEYS = Object.keys(TIPOS_EVENTO);

export default function AgendaCalendarioTab({
    eventos,
    bitacora,
    materiasAgrupadas,
    materiasPorCodigo,
    onAddEvento,
    onDeleteEvento,
}) {
    const todayISO = useMemo(() => getTodayISODate(), []);
    const todayParts = useMemo(() => parseISODateParts(todayISO), [todayISO]);

    const [viewYear, setViewYear] = useState(() => todayParts?.year || new Date().getFullYear());
    const [viewMonth, setViewMonth] = useState(() => todayParts?.month || new Date().getMonth() + 1);
    const [selectedDate, setSelectedDate] = useState(() => todayISO);

    // Estado del formulario "Nuevo evento"
    const [titulo, setTitulo] = useState('');
    const [tipo, setTipo] = useState('parcial');
    const [fecha, setFecha] = useState(() => todayISO);
    const [hora, setHora] = useState('');
    const [codigoMateria, setCodigoMateria] = useState('');
    const [nota, setNota] = useState('');
    const [errors, setErrors] = useState({});

    const tituloInputRef = useRef(null);
    const fechaInputRef = useRef(null);

    const calendarCells = useMemo(
        () => buildCalendarMonthGrid(viewYear, viewMonth),
        [viewYear, viewMonth],
    );

    const eventosPorFecha = useMemo(() => {
        const map = new Map();
        eventos.forEach((ev) => {
            if (!map.has(ev.fecha)) map.set(ev.fecha, []);
            map.get(ev.fecha).push(ev);
        });
        return map;
    }, [eventos]);

    const bitacoraPorFecha = useMemo(() => {
        const map = new Map();
        bitacora.forEach((entry) => {
            if (!map.has(entry.fecha)) map.set(entry.fecha, []);
            map.get(entry.fecha).push(entry);
        });
        return map;
    }, [bitacora]);

    const eventosDelDia = useMemo(
        () => eventosPorFecha.get(selectedDate) || [],
        [eventosPorFecha, selectedDate],
    );

    const bitacoraDelDia = useMemo(
        () => bitacoraPorFecha.get(selectedDate) || [],
        [bitacoraPorFecha, selectedDate],
    );

    const proximosEventos = useMemo(() => {
        return eventos
            .map((ev) => ({ ...ev, diasRestantes: diffDaysISO(todayISO, ev.fecha) }))
            .filter((ev) => ev.diasRestantes !== null && ev.diasRestantes >= 0)
            .slice(0, 12);
    }, [eventos, todayISO]);

    const handleChangeMonth = (delta) => {
        let nextMonth = viewMonth + delta;
        let nextYear = viewYear;
        if (nextMonth < 1) {
            nextMonth = 12;
            nextYear -= 1;
        } else if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
        }
        setViewMonth(nextMonth);
        setViewYear(nextYear);
    };

    const handleGoToday = () => {
        if (!todayParts) return;
        setViewYear(todayParts.year);
        setViewMonth(todayParts.month);
        setSelectedDate(todayISO);
        setFecha(todayISO);
    };

    const handleSelectDay = (cellIso) => {
        setSelectedDate(cellIso);
        setFecha(cellIso);
        const parts = parseISODateParts(cellIso);
        if (parts && (parts.year !== viewYear || parts.month !== viewMonth)) {
            setViewYear(parts.year);
            setViewMonth(parts.month);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const nextErrors = {};
        if (!titulo.trim()) {
            nextErrors.titulo = 'Ingresá un título para identificar la fecha (ej: 1° Parcial).';
        }
        if (!parseISODateParts(fecha)) {
            nextErrors.fecha = 'Seleccioná una fecha válida.';
        }

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            if (nextErrors.titulo) tituloInputRef.current?.focus();
            else if (nextErrors.fecha) fechaInputRef.current?.focus();
            return;
        }

        onAddEvento({
            titulo,
            tipo,
            fecha,
            hora,
            codigoMateria: codigoMateria || null,
            nota,
        });

        setSelectedDate(fecha);
        const parts = parseISODateParts(fecha);
        if (parts) {
            setViewYear(parts.year);
            setViewMonth(parts.month);
        }

        setTitulo('');
        setHora('');
        setNota('');
        setErrors({});
        addToast({
            title: 'Evento agendado',
            description: `Se guardó "${titulo.trim()}" para el ${formatFechaCorta(fecha)}.`,
            color: 'success',
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Columna izquierda: Calendario mensual + detalle del día */}
            <div className="lg:col-span-7 flex flex-col gap-5">
                <section className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-2 mb-4">
                        <h2 className="text-base sm:text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                            {formatMesAnio(viewYear, viewMonth)}
                        </h2>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handleGoToday}
                                className="min-h-10 px-3 rounded-xl text-xs font-semibold bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0] border border-[#E2E8F0] dark:border-[#2A3540] hover:border-[#005A36]/40 cursor-pointer transition-colors"
                            >
                                Hoy
                            </button>
                            <button
                                type="button"
                                onClick={() => handleChangeMonth(-1)}
                                aria-label="Mes anterior"
                                className="min-w-10 min-h-10 rounded-xl flex items-center justify-center bg-[#F8FAFC] dark:bg-[#1E2730] text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#2A3540] hover:border-[#005A36]/40 cursor-pointer transition-colors"
                            >
                                <ChevronLeft size={16} aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleChangeMonth(1)}
                                aria-label="Mes siguiente"
                                className="min-w-10 min-h-10 rounded-xl flex items-center justify-center bg-[#F8FAFC] dark:bg-[#1E2730] text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#2A3540] hover:border-[#005A36]/40 cursor-pointer transition-colors"
                            >
                                <ChevronRight size={16} aria-hidden="true" />
                            </button>
                        </div>
                    </div>

                    {/* Encabezado de días */}
                    <div className="grid grid-cols-7 gap-1 mb-1.5" role="row">
                        {WEEKDAY_HEADERS.map((d) => (
                            <div
                                key={d}
                                className="text-center text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] py-1"
                            >
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Grilla de días */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarCells.map((cell) => {
                            const dayEvents = eventosPorFecha.get(cell.iso) || [];
                            const dayBitacora = bitacoraPorFecha.get(cell.iso) || [];
                            const isToday = cell.iso === todayISO;
                            const isSelected = cell.iso === selectedDate;

                            return (
                                <button
                                    key={cell.iso}
                                    type="button"
                                    onClick={() => handleSelectDay(cell.iso)}
                                    aria-pressed={isSelected}
                                    aria-current={isToday ? 'date' : undefined}
                                    aria-label={`${formatFechaCorta(cell.iso)}${dayEvents.length > 0 ? `, ${dayEvents.length} ${dayEvents.length === 1 ? 'evento' : 'eventos'}` : ''}${dayBitacora.length > 0 ? `, ${dayBitacora.length} en bitácora` : ''}`}
                                    className={`min-h-11 sm:min-h-12 rounded-xl p-1 flex flex-col items-center justify-between border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005A36] ${
                                        isSelected
                                            ? 'bg-[#005A36] dark:bg-[#2E8B63] text-white border-[#005A36] dark:border-[#4A9D68] font-semibold'
                                            : isToday
                                                ? 'bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border-[#A7F3D0] dark:border-[#1E4D38] font-semibold'
                                                : cell.inCurrentMonth
                                                    ? 'bg-[#F8FAFC] dark:bg-[#11171D] text-[#1E293B] dark:text-[#F1F5F9] border-transparent hover:border-[#CBD5E1] dark:hover:border-[#2A3540]'
                                                    : 'bg-transparent text-[#94A3B8] dark:text-[#475569] border-transparent hover:bg-[#F8FAFC]/60 dark:hover:bg-[#1E2730]/40'
                                    }`}
                                >
                                    <span className="text-xs sm:text-sm tabular-nums leading-none mt-0.5">
                                        {cell.day}
                                    </span>
                                    <div className="flex items-center justify-center gap-0.5 min-h-[6px]">
                                        {dayEvents.slice(0, 3).map((ev) => (
                                            <span
                                                key={ev.id}
                                                aria-hidden="true"
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                    isSelected ? 'bg-white' : (TIPOS_EVENTO[ev.tipo]?.dotClass || 'bg-[#64748B]')
                                                }`}
                                            />
                                        ))}
                                        {dayEvents.length === 0 && dayBitacora.length > 0 && (
                                            <span
                                                aria-hidden="true"
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                    isSelected ? 'bg-white/80' : 'bg-[#478559]/60'
                                                }`}
                                            />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Leyenda compacta */}
                    <div className="mt-4 pt-3 border-t border-[#F1F5F9] dark:border-[#2A3540] flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        {TIPO_KEYS.map((key) => (
                            <span key={key} className="inline-flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${TIPOS_EVENTO[key].dotClass}`} aria-hidden="true" />
                                {TIPOS_EVENTO[key].label}
                            </span>
                        ))}
                    </div>
                </section>

                {/* Detalle del día seleccionado */}
                <section className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
                            <CalendarIcon size={15} className="text-[#005A36] dark:text-[#6EE7B7]" aria-hidden="true" />
                            <span>Actividad del {formatFechaCorta(selectedDate)}</span>
                        </h3>
                        {selectedDate === todayISO && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38]">
                                Hoy
                            </span>
                        )}
                    </div>

                    {eventosDelDia.length === 0 && bitacoraDelDia.length === 0 ? (
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] py-3">
                            No hay eventos ni entradas de bitácora registradas para este día. Podés agendar uno desde el formulario.
                        </p>
                    ) : (
                        <div className="space-y-2.5">
                            {eventosDelDia.map((ev) => {
                                const meta = TIPOS_EVENTO[ev.tipo] || TIPOS_EVENTO.otro;
                                const materia = ev.codigoMateria ? materiasPorCodigo.get(ev.codigoMateria) : null;
                                return (
                                    <div
                                        key={ev.id}
                                        className="flex items-start justify-between gap-3 p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#2A3540]"
                                    >
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${meta.badgeClass}`}>
                                                    <i className={`${meta.icon} text-[10px]`} aria-hidden="true" />
                                                    {meta.label}
                                                </span>
                                                {ev.hora && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#475569] dark:text-[#CBD5E1] tabular-nums">
                                                        <Clock size={12} aria-hidden="true" />
                                                        {ev.hora} hs
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                                                {ev.titulo}
                                            </p>
                                            {materia && (
                                                <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                                                    {materia.nombre} ({materia.codigo})
                                                </p>
                                            )}
                                            {ev.nota && (
                                                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                                                    {ev.nota}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onDeleteEvento(ev.id)}
                                            aria-label={`Eliminar evento ${ev.titulo}`}
                                            className="min-w-9 min-h-9 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#991B1B] hover:bg-[#FEE2E2]/60 dark:hover:text-[#FCA5A5] dark:hover:bg-[#2D1619] transition-colors cursor-pointer shrink-0"
                                        >
                                            <Trash2 size={15} aria-hidden="true" />
                                        </button>
                                    </div>
                                );
                            })}

                            {bitacoraDelDia.map((entry) => {
                                const materia = materiasPorCodigo.get(entry.codigoMateria);
                                return (
                                    <div
                                        key={entry.id}
                                        className="p-3 rounded-xl bg-[#ECFDF5]/60 dark:bg-[#102A20]/50 border border-[#A7F3D0]/70 dark:border-[#1E4D38]"
                                    >
                                        <span className="text-[11px] font-semibold text-[#005A36] dark:text-[#86EFAC]">
                                            Bitácora · {materia?.nombre || entry.codigoMateria}
                                        </span>
                                        <p className="text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] mt-0.5">
                                            {entry.tema}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {/* Columna derecha: Formulario nuevo evento + Próximos eventos */}
            <div className="lg:col-span-5 flex flex-col gap-5">
                <section className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-4 sm:p-5">
                    <h2 id="form-evento-heading" className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] mb-3.5 flex items-center gap-2">
                        <Plus size={16} className="text-[#005A36] dark:text-[#6EE7B7]" aria-hidden="true" />
                        <span>Agendar evaluación o entrega</span>
                    </h2>

                    <form onSubmit={handleSubmit} aria-labelledby="form-evento-heading" noValidate className="space-y-3.5">
                        <fieldset className="space-y-1.5">
                            <legend className="text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                                Tipo de evento
                            </legend>
                            <div className="flex flex-wrap gap-1.5">
                                {TIPO_KEYS.map((key) => {
                                    const active = tipo === key;
                                    const meta = TIPOS_EVENTO[key];
                                    return (
                                        <label
                                            key={key}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border cursor-pointer transition-colors ${
                                                active
                                                    ? 'border-[#005A36] dark:border-[#4A9D68] bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC]'
                                                    : 'border-[#E2E8F0] dark:border-[#2A3540] bg-[#F8FAFC] dark:bg-[#11171D] text-[#475569] dark:text-[#CBD5E1]'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="tipo-evento"
                                                value={key}
                                                checked={active}
                                                onChange={() => setTipo(key)}
                                                className="sr-only"
                                            />
                                            <i className={`${meta.icon} text-[11px]`} aria-hidden="true" />
                                            <span>{meta.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </fieldset>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="evento-titulo" className="text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                                Título <span className="text-[#DC2626]" aria-hidden="true">*</span>
                            </label>
                            <input
                                ref={tituloInputRef}
                                id="evento-titulo"
                                name="titulo"
                                type="text"
                                required
                                maxLength={120}
                                value={titulo}
                                onChange={(e) => {
                                    setTitulo(e.target.value);
                                    if (errors.titulo) setErrors((prev) => ({ ...prev, titulo: '' }));
                                }}
                                placeholder="Ej: 1° Parcial práctico, Entrega TP 2..."
                                aria-invalid={errors.titulo ? 'true' : undefined}
                                aria-describedby={errors.titulo ? 'evento-titulo-err' : undefined}
                                className={`w-full min-h-11 rounded-xl px-3 py-2 text-base sm:text-sm bg-[#F8FAFC] dark:bg-[#11171D] text-[#1E293B] dark:text-[#F1F5F9] placeholder:text-[#64748B] border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005A36] ${
                                    errors.titulo ? 'border-[#DC2626]' : 'border-[#CBD5E1] dark:border-[#2A3540]'
                                }`}
                            />
                            {errors.titulo && (
                                <p id="evento-titulo-err" role="alert" className="text-xs text-[#991B1B] dark:text-[#FCA5A5]">
                                    {errors.titulo}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="evento-fecha" className="text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                                    Fecha <span className="text-[#DC2626]" aria-hidden="true">*</span>
                                </label>
                                <input
                                    ref={fechaInputRef}
                                    id="evento-fecha"
                                    name="fecha"
                                    type="date"
                                    required
                                    value={fecha}
                                    onChange={(e) => {
                                        setFecha(e.target.value);
                                        if (errors.fecha) setErrors((prev) => ({ ...prev, fecha: '' }));
                                    }}
                                    aria-invalid={errors.fecha ? 'true' : undefined}
                                    aria-describedby={errors.fecha ? 'evento-fecha-err' : undefined}
                                    className={`w-full min-h-11 rounded-xl px-3 py-2 text-base sm:text-sm bg-[#F8FAFC] dark:bg-[#11171D] text-[#1E293B] dark:text-[#F1F5F9] border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005A36] ${
                                        errors.fecha ? 'border-[#DC2626]' : 'border-[#CBD5E1] dark:border-[#2A3540]'
                                    }`}
                                />
                                {errors.fecha && (
                                    <p id="evento-fecha-err" role="alert" className="text-xs text-[#991B1B] dark:text-[#FCA5A5]">
                                        {errors.fecha}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="evento-hora" className="text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                                    Hora (opcional)
                                </label>
                                <input
                                    id="evento-hora"
                                    name="hora"
                                    type="time"
                                    value={hora}
                                    onChange={(e) => setHora(e.target.value)}
                                    className="w-full min-h-11 rounded-xl px-3 py-2 text-base sm:text-sm bg-[#F8FAFC] dark:bg-[#11171D] text-[#1E293B] dark:text-[#F1F5F9] border border-[#CBD5E1] dark:border-[#2A3540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005A36]"
                                />
                            </div>
                        </div>

                        <MateriaSelect
                            id="evento-materia"
                            label="Materia asociada"
                            value={codigoMateria}
                            onChange={setCodigoMateria}
                            materiasAgrupadas={materiasAgrupadas}
                            allowGeneral
                            prioritizeRegular={tipo === 'final'}
                        />

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="evento-nota" className="text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                                Nota breve (opcional)
                            </label>
                            <input
                                id="evento-nota"
                                name="nota"
                                type="text"
                                maxLength={240}
                                value={nota}
                                onChange={(e) => setNota(e.target.value)}
                                placeholder="Ej: Aula 204, entra hasta unidad 4..."
                                className="w-full min-h-11 rounded-xl px-3 py-2 text-base sm:text-sm bg-[#F8FAFC] dark:bg-[#11171D] text-[#1E293B] dark:text-[#F1F5F9] placeholder:text-[#64748B] border border-[#CBD5E1] dark:border-[#2A3540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005A36]"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] dark:hover:bg-[#247250] text-white font-semibold rounded-xl h-11"
                            startContent={<Plus size={16} />}
                        >
                            Guardar fecha
                        </Button>
                    </form>
                </section>

                {/* Próximas fechas */}
                <section className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                            Próximas fechas
                        </h3>
                        <span className="text-xs text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                            {proximosEventos.length} {proximosEventos.length === 1 ? 'pendiente' : 'pendientes'}
                        </span>
                    </div>

                    {proximosEventos.length === 0 ? (
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] py-2">
                            Todavía no agendaste evaluaciones ni entregas próximas.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {proximosEventos.map((ev) => {
                                const meta = TIPOS_EVENTO[ev.tipo] || TIPOS_EVENTO.otro;
                                const materia = ev.codigoMateria ? materiasPorCodigo.get(ev.codigoMateria) : null;
                                const esUrgente = ev.diasRestantes <= 1;
                                const esSemana = ev.diasRestantes <= 7;

                                return (
                                    <li
                                        key={ev.id}
                                        className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#2A3540]"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleSelectDay(ev.fecha)}
                                            className="flex-1 min-w-0 text-left cursor-pointer"
                                        >
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dotClass}`} aria-hidden="true" />
                                                <span className="text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9] truncate">
                                                    {ev.titulo}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate mt-0.5">
                                                {formatFechaCorta(ev.fecha)}
                                                {ev.hora ? ` · ${ev.hora} hs` : ''}
                                                {materia ? ` · ${materia.nombre}` : ''}
                                            </p>
                                        </button>

                                        <span
                                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border shrink-0 tabular-nums ${
                                                esUrgente
                                                    ? 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA] dark:bg-[#2D1619] dark:text-[#FCA5A5] dark:border-[#5C262B]'
                                                    : esSemana
                                                        ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] dark:bg-[#2D2210] dark:text-[#FCD34D] dark:border-[#5C4318]'
                                                        : 'bg-white text-[#475569] border-[#E2E8F0] dark:bg-[#161D24] dark:text-[#CBD5E1] dark:border-[#2A3540]'
                                            }`}
                                        >
                                            {formatCuentaRegresiva(ev.diasRestantes)}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}

AgendaCalendarioTab.propTypes = {
    eventos: PropTypes.array.isRequired,
    bitacora: PropTypes.array.isRequired,
    materiasAgrupadas: PropTypes.object.isRequired,
    materiasPorCodigo: PropTypes.instanceOf(Map).isRequired,
    onAddEvento: PropTypes.func.isRequired,
    onDeleteEvento: PropTypes.func.isRequired,
};
