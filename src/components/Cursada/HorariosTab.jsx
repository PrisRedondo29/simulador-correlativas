import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button, addToast } from '@heroui/react';
import { AlertTriangle, Clock, MapPin, Plus, Trash2 } from 'lucide-react';
import MateriaSelect from './MateriaSelect';
import {
    DIAS_SEMANA,
    MODALIDADES_CLASE,
    parseTimeToMinutes,
} from '../../utils/Cursada/cursadaUtils';

export default function HorariosTab({
    horarios,
    superposiciones,
    materiasAgrupadas,
    materiasPorCodigo,
    onAddHorario,
    onDeleteHorario,
}) {
    const [codigoMateria, setCodigoMateria] = useState('');
    const [dia, setDia] = useState('1');
    const [horaInicio, setHoraInicio] = useState('18:00');
    const [horaFin, setHoraFin] = useState('21:00');
    const [aula, setAula] = useState('');
    const [modalidad, setModalidad] = useState('Presencial');
    const [errors, setErrors] = useState({});

    const materiaRef = useRef(null);
    const horaFinRef = useRef(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        const nextErrors = {};

        if (!codigoMateria) {
            nextErrors.codigoMateria = 'Elegí la materia para este bloque horario.';
        }

        const startMin = parseTimeToMinutes(horaInicio);
        const endMin = parseTimeToMinutes(horaFin);
        if (startMin === null || endMin === null || endMin <= startMin) {
            nextErrors.horaFin = 'La hora de fin debe ser posterior a la hora de inicio.';
        }

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            if (nextErrors.codigoMateria) materiaRef.current?.focus();
            else if (nextErrors.horaFin) horaFinRef.current?.focus();
            return;
        }

        onAddHorario({
            codigoMateria,
            dia: Number(dia),
            horaInicio,
            horaFin,
            aula,
            modalidad,
        });

        const mat = materiasPorCodigo.get(codigoMateria);
        setAula('');
        setErrors({});
        addToast({
            title: 'Horario agregado',
            description: `${mat?.nombre || codigoMateria} (${horaInicio} – ${horaFin}).`,
            color: 'success',
        });
    };

    const diasConClases = DIAS_SEMANA.map((diaInfo) => ({
        ...diaInfo,
        bloques: horarios.filter((h) => h.dia === diaInfo.id),
    }));

    return (
        <div className="flex flex-col gap-5">
            {superposiciones.size > 0 && (
                <div
                    role="alert"
                    className="p-3.5 sm:p-4 rounded-2xl bg-[#FFFBEB] dark:bg-[#2D2210]/80 border border-[#FDE68A] dark:border-[#5C4318] flex items-start gap-3"
                >
                    <AlertTriangle size={18} className="text-[#92400E] dark:text-[#FCD34D] shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="text-xs sm:text-sm text-[#92400E] dark:text-[#FCD34D]">
                        <strong className="font-semibold">Superposición horaria detectada:</strong> hay bloques que coinciden en el mismo día y franja horaria (resaltados en ámbar).
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Formulario de carga de horario */}
                <section className="lg:col-span-4 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-4 sm:p-5">
                    <h2 id="form-horario-heading" className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] mb-3.5 flex items-center gap-2">
                        <Plus size={16} className="text-[#005A36] dark:text-[#6EE7B7]" aria-hidden="true" />
                        <span>Agregar bloque semanal</span>
                    </h2>

                    <form onSubmit={handleSubmit} aria-labelledby="form-horario-heading" noValidate className="space-y-3.5">
                        <MateriaSelect
                            id="horario-materia"
                            label="Materia"
                            value={codigoMateria}
                            onChange={(val) => {
                                setCodigoMateria(val);
                                if (errors.codigoMateria) setErrors((prev) => ({ ...prev, codigoMateria: '' }));
                            }}
                            materiasAgrupadas={materiasAgrupadas}
                            required
                            errorMessage={errors.codigoMateria}
                            inputRef={materiaRef}
                        />

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="horario-dia" className="text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                                Día de la semana
                            </label>
                            <select
                                id="horario-dia"
                                name="dia"
                                value={dia}
                                onChange={(e) => setDia(e.target.value)}
                                className="w-full min-h-11 rounded-xl px-3 py-2 text-base sm:text-sm bg-[#F8FAFC] dark:bg-[#11171D] text-[#1E293B] dark:text-[#F1F5F9] border border-[#CBD5E1] dark:border-[#2A3540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005A36]"
                            >
                                {DIAS_SEMANA.map((d) => (
                                    <option key={d.id} value={String(d.id)}>
                                        {d.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="horario-inicio" className="text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                                    Inicio
                                </label>
                                <input
                                    id="horario-inicio"
                                    name="horaInicio"
                                    type="time"
                                    required
                                    value={horaInicio}
                                    onChange={(e) => {
                                        setHoraInicio(e.target.value);
                                        if (errors.horaFin) setErrors((prev) => ({ ...prev, horaFin: '' }));
                                    }}
                                    className="w-full min-h-11 rounded-xl px-3 py-2 text-base sm:text-sm bg-[#F8FAFC] dark:bg-[#11171D] text-[#1E293B] dark:text-[#F1F5F9] border border-[#CBD5E1] dark:border-[#2A3540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005A36]"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="horario-fin" className="text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                                    Fin
                                </label>
                                <input
                                    ref={horaFinRef}
                                    id="horario-fin"
                                    name="horaFin"
                                    type="time"
                                    required
                                    value={horaFin}
                                    onChange={(e) => {
                                        setHoraFin(e.target.value);
                                        if (errors.horaFin) setErrors((prev) => ({ ...prev, horaFin: '' }));
                                    }}
                                    aria-invalid={errors.horaFin ? 'true' : undefined}
                                    aria-describedby={errors.horaFin ? 'horario-fin-err' : undefined}
                                    className={`w-full min-h-11 rounded-xl px-3 py-2 text-base sm:text-sm bg-[#F8FAFC] dark:bg-[#11171D] text-[#1E293B] dark:text-[#F1F5F9] border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005A36] ${
                                        errors.horaFin ? 'border-[#DC2626]' : 'border-[#CBD5E1] dark:border-[#2A3540]'
                                    }`}
                                />
                            </div>
                        </div>
                        {errors.horaFin && (
                            <p id="horario-fin-err" role="alert" className="text-xs text-[#991B1B] dark:text-[#FCA5A5] -mt-1.5">
                                {errors.horaFin}
                            </p>
                        )}

                        <fieldset className="space-y-1.5">
                            <legend className="text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                                Modalidad
                            </legend>
                            <div className="grid grid-cols-3 gap-1.5">
                                {MODALIDADES_CLASE.map((mod) => {
                                    const active = modalidad === mod;
                                    return (
                                        <label
                                            key={mod}
                                            className={`min-h-10 px-2 rounded-xl text-xs font-medium border flex items-center justify-center cursor-pointer transition-colors ${
                                                active
                                                    ? 'border-[#005A36] dark:border-[#4A9D68] bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC]'
                                                    : 'border-[#E2E8F0] dark:border-[#2A3540] bg-[#F8FAFC] dark:bg-[#11171D] text-[#475569] dark:text-[#CBD5E1]'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="modalidad"
                                                value={mod}
                                                checked={active}
                                                onChange={() => setModalidad(mod)}
                                                className="sr-only"
                                            />
                                            <span>{mod}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </fieldset>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="horario-aula" className="text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                                Aula / Sede / Link (opcional)
                            </label>
                            <input
                                id="horario-aula"
                                name="aula"
                                type="text"
                                maxLength={100}
                                value={aula}
                                onChange={(e) => setAula(e.target.value)}
                                placeholder="Ej: Aula 105 · Sede Central, Lab 2..."
                                className="w-full min-h-11 rounded-xl px-3 py-2 text-base sm:text-sm bg-[#F8FAFC] dark:bg-[#11171D] text-[#1E293B] dark:text-[#F1F5F9] placeholder:text-[#64748B] border border-[#CBD5E1] dark:border-[#2A3540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005A36]"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] dark:hover:bg-[#247250] text-white font-semibold rounded-xl h-11"
                            startContent={<Plus size={16} />}
                        >
                            Guardar horario
                        </Button>
                    </form>
                </section>

                {/* Grilla semanal Lunes a Sábado */}
                <section className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {diasConClases.map((diaInfo) => (
                        <div
                            key={diaInfo.id}
                            className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-4 flex flex-col gap-3 min-h-[150px]"
                        >
                            <div className="flex items-center justify-between border-b border-[#F1F5F9] dark:border-[#2A3540] pb-2">
                                <h3 className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                                    {diaInfo.nombre}
                                </h3>
                                <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                                    {diaInfo.bloques.length} {diaInfo.bloques.length === 1 ? 'clase' : 'clases'}
                                </span>
                            </div>

                            {diaInfo.bloques.length === 0 ? (
                                <p className="text-xs text-[#94A3B8] dark:text-[#64748B] my-auto text-center py-4">
                                    Sin clases cargadas
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {diaInfo.bloques.map((bloque) => {
                                        const materia = materiasPorCodigo.get(bloque.codigoMateria);
                                        const enConflicto = superposiciones.has(bloque.id);
                                        const matLabel = materia?.nombre || bloque.codigoMateria;

                                        return (
                                            <li
                                                key={bloque.id}
                                                className={`p-3 rounded-xl border transition-colors ${
                                                    enConflicto
                                                        ? 'bg-[#FFFBEB] dark:bg-[#2D2210]/80 border-[#F59E0B]/70 dark:border-[#B45309]'
                                                        : 'bg-[#F8FAFC] dark:bg-[#11171D] border-[#E2E8F0] dark:border-[#2A3540]'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 space-y-1">
                                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#005A36] dark:text-[#86EFAC] tabular-nums">
                                                            <Clock size={12} aria-hidden="true" />
                                                            <span>
                                                                {bloque.horaInicio} – {bloque.horaFin}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] leading-snug">
                                                            {matLabel}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                                            {bloque.modalidad && (
                                                                <span className="px-1.5 py-0.5 rounded bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540]">
                                                                    {bloque.modalidad}
                                                                </span>
                                                            )}
                                                            {bloque.aula && (
                                                                <span className="inline-flex items-center gap-1 truncate">
                                                                    <MapPin size={11} aria-hidden="true" />
                                                                    {bloque.aula}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {enConflicto && (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#92400E] dark:text-[#FCD34D]">
                                                                <AlertTriangle size={11} aria-hidden="true" />
                                                                Superposición horaria
                                                            </span>
                                                        )}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => onDeleteHorario(bloque.id)}
                                                        aria-label={`Eliminar horario de ${matLabel} el ${diaInfo.nombre} de ${bloque.horaInicio} a ${bloque.horaFin}`}
                                                        className="min-w-8 min-h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#991B1B] hover:bg-[#FEE2E2]/60 dark:hover:text-[#FCA5A5] dark:hover:bg-[#2D1619] transition-colors cursor-pointer shrink-0"
                                                    >
                                                        <Trash2 size={14} aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    ))}
                </section>
            </div>
        </div>
    );
}

HorariosTab.propTypes = {
    horarios: PropTypes.array.isRequired,
    superposiciones: PropTypes.instanceOf(Set).isRequired,
    materiasAgrupadas: PropTypes.object.isRequired,
    materiasPorCodigo: PropTypes.instanceOf(Map).isRequired,
    onAddHorario: PropTypes.func.isRequired,
    onDeleteHorario: PropTypes.func.isRequired,
};
