import { useState, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button, addToast } from '@heroui/react';
import { BookOpen, Pencil, Plus, Search as SearchIcon, Trash2, X } from 'lucide-react';
import MateriaSelect from './MateriaSelect';
import {
    getTodayISODate,
    parseISODateParts,
    formatFechaCorta,
    filtrarBitacora,
} from '../../utils/Cursada/cursadaUtils';

/**
 * Bitácora liviana de clases: fecha, materia, tema visto y notas de texto libre.
 */
export default function BitacoraTab({
    bitacora,
    materiasAgrupadas,
    materiasPorCodigo,
    onAddBitacora,
    onUpdateBitacora,
    onDeleteBitacora,
}) {
    const todayISO = useMemo(() => getTodayISODate(), []);

    const [editingId, setEditingId] = useState(null);
    const [fecha, setFecha] = useState(() => todayISO);
    const [codigoMateria, setCodigoMateria] = useState('');
    const [tema, setTema] = useState('');
    const [notas, setNotas] = useState('');
    const [errors, setErrors] = useState({});

    // Filtros
    const [filtroMateria, setFiltroMateria] = useState('todas');
    const [busqueda, setBusqueda] = useState('');

    const materiaRef = useRef(null);
    const temaRef = useRef(null);
    const fechaRef = useRef(null);

    const entradasFiltradas = useMemo(
        () => filtrarBitacora(bitacora, { codigoMateria: filtroMateria, busqueda }),
        [bitacora, filtroMateria, busqueda],
    );

    const materiasEnBitacora = useMemo(() => {
        const codes = Array.from(new Set(bitacora.map((e) => e.codigoMateria)));
        return codes.map((code) => ({
            codigo: code,
            nombre: materiasPorCodigo.get(code)?.nombre || code,
        }));
    }, [bitacora, materiasPorCodigo]);

    const resetForm = () => {
        setEditingId(null);
        setFecha(todayISO);
        setTema('');
        setNotas('');
        setErrors({});
    };

    const handleStartEdit = (entry) => {
        setEditingId(entry.id);
        setFecha(entry.fecha);
        setCodigoMateria(entry.codigoMateria);
        setTema(entry.tema);
        setNotas(entry.notas || '');
        setErrors({});
        temaRef.current?.focus();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const nextErrors = {};

        if (!codigoMateria) {
            nextErrors.codigoMateria = 'Seleccioná la materia de la clase.';
        }
        if (!parseISODateParts(fecha)) {
            nextErrors.fecha = 'Ingresá una fecha válida.';
        }
        if (!tema.trim()) {
            nextErrors.tema = 'Escribí brevemente el tema visto en clase.';
        }

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            if (nextErrors.codigoMateria) materiaRef.current?.focus();
            else if (nextErrors.fecha) fechaRef.current?.focus();
            else if (nextErrors.tema) temaRef.current?.focus();
            return;
        }

        if (editingId) {
            onUpdateBitacora(editingId, { fecha, codigoMateria, tema, notas });
            addToast({
                title: 'Entrada actualizada',
                description: `Se actualizó el registro de "${tema.trim()}".`,
                color: 'success',
            });
            resetForm();
            return;
        }

        onAddBitacora({ fecha, codigoMateria, tema, notas });
        addToast({
            title: 'Clase registrada',
            description: `Se agregó "${tema.trim()}" a tu bitácora.`,
            color: 'success',
        });
        setTema('');
        setNotas('');
        setErrors({});
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Formulario liviano de registro */}
            <section className="lg:col-span-5 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 mb-3.5">
                    <h2 id="form-bitacora-heading" className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
                        <BookOpen size={16} className="text-[#005A36] dark:text-[#6EE7B7]" aria-hidden="true" />
                        <span>{editingId ? 'Editar entrada de bitácora' : 'Registrar clase vista'}</span>
                    </h2>
                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F1F5F9] cursor-pointer"
                        >
                            <X size={14} aria-hidden="true" />
                            Cancelar
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} aria-labelledby="form-bitacora-heading" noValidate className="space-y-3.5">
                    <MateriaSelect
                        id="bitacora-materia"
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
                        <label htmlFor="bitacora-fecha" className="text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                            Fecha de la clase <span className="text-[#DC2626]" aria-hidden="true">*</span>
                        </label>
                        <input
                            ref={fechaRef}
                            id="bitacora-fecha"
                            name="fecha"
                            type="date"
                            required
                            value={fecha}
                            onChange={(e) => {
                                setFecha(e.target.value);
                                if (errors.fecha) setErrors((prev) => ({ ...prev, fecha: '' }));
                            }}
                            aria-invalid={errors.fecha ? 'true' : undefined}
                            aria-describedby={errors.fecha ? 'bitacora-fecha-err' : undefined}
                            className={`w-full min-h-11 rounded-xl px-3 py-2 text-base sm:text-sm bg-[#F8FAFC] dark:bg-[#11171D] text-[#1E293B] dark:text-[#F1F5F9] border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005A36] ${
                                errors.fecha ? 'border-[#DC2626]' : 'border-[#CBD5E1] dark:border-[#2A3540]'
                            }`}
                        />
                        {errors.fecha && (
                            <p id="bitacora-fecha-err" role="alert" className="text-xs text-[#991B1B] dark:text-[#FCA5A5]">
                                {errors.fecha}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="bitacora-tema" className="text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                            Tema visto <span className="text-[#DC2626]" aria-hidden="true">*</span>
                        </label>
                        <input
                            ref={temaRef}
                            id="bitacora-tema"
                            name="tema"
                            type="text"
                            required
                            maxLength={160}
                            value={tema}
                            onChange={(e) => {
                                setTema(e.target.value);
                                if (errors.tema) setErrors((prev) => ({ ...prev, tema: '' }));
                            }}
                            placeholder="Ej: Normalización 3FN y Boyce-Codd"
                            aria-invalid={errors.tema ? 'true' : undefined}
                            aria-describedby={errors.tema ? 'bitacora-tema-err' : undefined}
                            className={`w-full min-h-11 rounded-xl px-3 py-2 text-base sm:text-sm bg-[#F8FAFC] dark:bg-[#11171D] text-[#1E293B] dark:text-[#F1F5F9] placeholder:text-[#64748B] border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005A36] ${
                                errors.tema ? 'border-[#DC2626]' : 'border-[#CBD5E1] dark:border-[#2A3540]'
                            }`}
                        />
                        {errors.tema && (
                            <p id="bitacora-tema-err" role="alert" className="text-xs text-[#991B1B] dark:text-[#FCA5A5]">
                                {errors.tema}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="bitacora-notas" className="text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                            Notas libres (opcional)
                        </label>
                        <textarea
                            id="bitacora-notas"
                            name="notas"
                            rows={4}
                            maxLength={1500}
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            placeholder="Anotaciones, dudas para consultar, ejercicios mencionados por el docente..."
                            className="w-full rounded-xl px-3 py-2.5 text-base sm:text-sm bg-[#F8FAFC] dark:bg-[#11171D] text-[#1E293B] dark:text-[#F1F5F9] placeholder:text-[#64748B] border border-[#CBD5E1] dark:border-[#2A3540] resize-y focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005A36]"
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] dark:hover:bg-[#247250] text-white font-semibold rounded-xl h-11"
                        startContent={editingId ? <Pencil size={15} /> : <Plus size={16} />}
                    >
                        {editingId ? 'Guardar cambios' : 'Agregar a la bitácora'}
                    </Button>
                </form>
            </section>

            {/* Listado y búsqueda de bitácora */}
            <div className="lg:col-span-7 flex flex-col gap-4">
                <search className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-3 flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1 min-w-0">
                        <label htmlFor="bitacora-buscar" className="sr-only">
                            Buscar por tema o nota en la bitácora
                        </label>
                        <SearchIcon
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none"
                            aria-hidden="true"
                        />
                        <input
                            id="bitacora-buscar"
                            type="search"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por tema o nota..."
                            autoCorrect="off"
                            spellCheck={false}
                            className="w-full min-h-11 pl-9 pr-3 rounded-xl text-base sm:text-sm bg-[#F8FAFC] dark:bg-[#11171D] text-[#1E293B] dark:text-[#F1F5F9] placeholder:text-[#64748B] border border-[#E2E8F0] dark:border-[#2A3540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005A36]"
                        />
                    </div>

                    <div className="sm:w-56 shrink-0">
                        <label htmlFor="bitacora-filtro-materia" className="sr-only">
                            Filtrar bitácora por materia
                        </label>
                        <select
                            id="bitacora-filtro-materia"
                            value={filtroMateria}
                            onChange={(e) => setFiltroMateria(e.target.value)}
                            className="w-full min-h-11 rounded-xl px-3 text-base sm:text-sm bg-[#F8FAFC] dark:bg-[#11171D] text-[#1E293B] dark:text-[#F1F5F9] border border-[#E2E8F0] dark:border-[#2A3540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005A36]"
                        >
                            <option value="todas">Todas las materias ({bitacora.length})</option>
                            {materiasEnBitacora.map((m) => (
                                <option key={m.codigo} value={m.codigo}>
                                    {m.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                </search>

                {entradasFiltradas.length === 0 ? (
                    <div className="bg-white dark:bg-[#161D24] border border-dashed border-[#CBD5E1] dark:border-[#2A3540] rounded-2xl p-8 text-center space-y-1.5">
                        <BookOpen size={28} className="mx-auto text-[#94A3B8] mb-2" aria-hidden="true" />
                        <p className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                            {bitacora.length === 0
                                ? 'Tu bitácora todavía está vacía'
                                : 'No hay entradas que coincidan con el filtro'}
                        </p>
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                            {bitacora.length === 0
                                ? 'Anotá el tema que viste hoy en clase para repasar rápido antes de los parciales.'
                                : 'Probá limpiando la búsqueda o eligiendo otra materia.'}
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {entradasFiltradas.map((entry) => {
                            const materia = materiasPorCodigo.get(entry.codigoMateria);
                            const matLabel = materia?.nombre || entry.codigoMateria;

                            return (
                                <li
                                    key={entry.id}
                                    className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-4 space-y-2"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38]">
                                                    {matLabel}
                                                </span>
                                                <span className="text-xs text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                                                    {formatFechaCorta(entry.fecha)}
                                                </span>
                                            </div>
                                            <h3 className="text-sm sm:text-base font-bold text-[#1E293B] dark:text-[#F1F5F9] leading-snug">
                                                {entry.tema}
                                            </h3>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleStartEdit(entry)}
                                                aria-label={`Editar entrada "${entry.tema}" de ${matLabel}`}
                                                className="min-w-9 min-h-9 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#005A36] hover:bg-[#ECFDF5] dark:hover:text-[#86EFAC] dark:hover:bg-[#102A20] transition-colors cursor-pointer"
                                            >
                                                <Pencil size={14} aria-hidden="true" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (editingId === entry.id) resetForm();
                                                    onDeleteBitacora(entry.id);
                                                }}
                                                aria-label={`Eliminar entrada "${entry.tema}" de ${matLabel}`}
                                                className="min-w-9 min-h-9 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#991B1B] hover:bg-[#FEE2E2]/60 dark:hover:text-[#FCA5A5] dark:hover:bg-[#2D1619] transition-colors cursor-pointer"
                                            >
                                                <Trash2 size={14} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>

                                    {entry.notas && (
                                        <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed whitespace-pre-wrap pt-1 border-t border-[#F1F5F9] dark:border-[#2A3540]">
                                            {entry.notas}
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}

BitacoraTab.propTypes = {
    bitacora: PropTypes.array.isRequired,
    materiasAgrupadas: PropTypes.object.isRequired,
    materiasPorCodigo: PropTypes.instanceOf(Map).isRequired,
    onAddBitacora: PropTypes.func.isRequired,
    onUpdateBitacora: PropTypes.func.isRequired,
    onDeleteBitacora: PropTypes.func.isRequired,
};
