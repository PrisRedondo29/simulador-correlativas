import PropTypes from 'prop-types';

/**
 * Selector nativo accesible de materias agrupado por estado en Mi Progreso:
 * prioriza En curso (Cursando) y Regulares (final pendiente), permitiendo elegir
 * cualquier otra materia del plan activo o un evento general sin materia.
 */
export default function MateriaSelect({
    id,
    name,
    label,
    value,
    onChange,
    materiasAgrupadas,
    allowGeneral = false,
    generalLabel = 'Evento general (sin materia)',
    required = false,
    prioritizeRegular = false,
    errorMessage = '',
    inputRef = null,
}) {
    const { cursando = [], regulares = [], otras = [] } = materiasAgrupadas || {};
    const errorId = `${id}-error`;

    const primaryGroups = prioritizeRegular
        ? [
              { label: 'Regulares (final pendiente)', items: regulares },
              { label: 'En curso (Cursando)', items: cursando },
          ]
        : [
              { label: 'En curso (Cursando)', items: cursando },
              { label: 'Regulares (final pendiente)', items: regulares },
          ];

    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor={id}
                className="text-xs font-medium text-[#334155] dark:text-[#CBD5E1]"
            >
                {label}
                {required && (
                    <span className="text-[#DC2626] dark:text-[#F87171] ml-0.5" aria-hidden="true">
                        *
                    </span>
                )}
            </label>
            <select
                ref={inputRef}
                id={id}
                name={name || id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                aria-invalid={errorMessage ? 'true' : undefined}
                aria-describedby={errorMessage ? errorId : undefined}
                className={`w-full min-h-11 rounded-xl px-3 py-2 text-base sm:text-sm bg-[#F8FAFC] dark:bg-[#11171D] text-[#1E293B] dark:text-[#F1F5F9] border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005A36] dark:focus-visible:outline-[#4A9D68] ${
                    errorMessage
                        ? 'border-[#DC2626] dark:border-[#F87171]'
                        : 'border-[#CBD5E1] dark:border-[#2A3540] hover:border-[#94A3B8] dark:hover:border-[#3B4958]'
                }`}
            >
                {allowGeneral ? (
                    <option value="">{generalLabel}</option>
                ) : (
                    <option value="">Seleccioná una materia...</option>
                )}

                {primaryGroups.map(
                    (group) =>
                        group.items.length > 0 && (
                            <optgroup key={group.label} label={group.label}>
                                {group.items.map((m) => (
                                    <option key={m.codigo} value={m.codigo}>
                                        {m.nombre} ({m.codigo})
                                    </option>
                                ))}
                            </optgroup>
                        ),
                )}

                {otras.length > 0 && (
                    <optgroup label="Otras materias del plan">
                        {otras.map((m) => (
                            <option key={m.codigo} value={m.codigo}>
                                {m.nombre} ({m.codigo})
                            </option>
                        ))}
                    </optgroup>
                )}
            </select>
            {errorMessage && (
                <p id={errorId} role="alert" className="text-xs text-[#991B1B] dark:text-[#FCA5A5]">
                    {errorMessage}
                </p>
            )}
        </div>
    );
}

MateriaSelect.propTypes = {
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    materiasAgrupadas: PropTypes.shape({
        cursando: PropTypes.array,
        regulares: PropTypes.array,
        otras: PropTypes.array,
    }),
    allowGeneral: PropTypes.bool,
    generalLabel: PropTypes.string,
    required: PropTypes.bool,
    prioritizeRegular: PropTypes.bool,
    errorMessage: PropTypes.string,
    inputRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
};
