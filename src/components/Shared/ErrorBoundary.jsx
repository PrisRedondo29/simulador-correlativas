import React from 'react';
import PropTypes from 'prop-types';
import { logError } from '../../services/logService';

/**
 * ErrorBoundary institucional UNLu.
 * - Evita pantallas en blanco ante errores inesperados de renderizado.
 * - En DEV/Test (`isDev`): muestra el detalle técnico en pantalla para depuración local.
 * - En Producción (`!isDev`): oculta cualquier detalle técnico o sensible, envía
 *   automáticamente el reporte sanitizado a la base de datos (`app_logs`) para
 *   su revisión desde el Panel Admin, e invita a recargar o ir a Contacto (`/contacto`).
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            reportSent: false,
        };
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
            reportSent: true,
        };
    }

    isDevEnvironment() {
        if (typeof this.props.isDev === 'boolean') {
            return this.props.isDev;
        }
        return Boolean(import.meta.env.DEV);
    }

    componentDidCatch(error, errorInfo) {
        if (this.isDevEnvironment()) {
            console.error('[ErrorBoundary]', error, errorInfo);
        }

        const reportFn = this.props.onReportError || logError;
        reportFn(error, {
            errorCode: 'ui/error-boundary',
            componentStack: errorInfo?.componentStack || null,
            persistToDatabase: true,
            context: {
                scope: this.props.scope || 'app',
            },
        });
    }

    componentDidUpdate(prevProps) {
        if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ hasError: false, error: null, reportSent: false });
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, reportSent: false });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.assign('/');
    };

    handleGoContact = () => {
        window.location.assign('/contacto');
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        const isDev = this.isDevEnvironment();
        const errorMessage = this.state.error?.message || 'Error desconocido en la interfaz.';
        const isPageLevel = this.props.scope === 'page';

        return (
            <div
                role="alert"
                className={`${
                    isPageLevel ? 'min-h-[70vh]' : 'min-h-screen'
                } w-full flex items-center justify-center p-4 bg-[#F8FAFC] dark:bg-[#0F1419]`}
            >
                <div className="max-w-md w-full rounded-2xl border border-[#E2E8F0] dark:border-[#2A3540] bg-white dark:bg-[#161D24] p-7 text-center shadow-sm space-y-5">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FEF2F2] dark:bg-[#2D1619] border border-[#FECACA] dark:border-[#5C262B] flex items-center justify-center text-[#991B1B] dark:text-[#FCA5A5]">
                        <i className="fa-solid fa-triangle-exclamation text-xl" aria-hidden="true" />
                    </div>

                    <div className="space-y-1.5">
                        <h1 className="text-xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                            Ocurrió un inconveniente inesperado
                        </h1>
                        <p className="text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                            No pudimos mostrar esta pantalla correctamente. Tu progreso guardado en el dispositivo permanece intacto.
                        </p>
                    </div>

                    <div
                        role="status"
                        className="rounded-xl bg-[#F0FDF4] dark:bg-[#11241B] border border-[#005A36]/25 dark:border-[#2E8B63]/40 px-3.5 py-2.5 text-xs text-[#166534] dark:text-[#A7F3D0] leading-relaxed"
                    >
                        El reporte del error fue enviado automáticamente para su posterior tratamiento. Podés recargar la página o escribirnos desde la pestaña de{' '}
                        <button
                            type="button"
                            onClick={this.handleGoContact}
                            className="font-semibold underline hover:opacity-80 cursor-pointer"
                        >
                            Contacto
                        </button>{' '}
                        si querés comentarnos qué estabas haciendo.
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                        <button
                            type="button"
                            onClick={isPageLevel ? this.handleReset : this.handleReload}
                            className="flex-1 min-h-10 px-4 py-2 rounded-xl bg-[#005A36] hover:bg-[#00462A] dark:bg-[#2E8B63] text-white text-sm font-semibold transition-colors cursor-pointer"
                        >
                            {isPageLevel ? 'Reintentar' : 'Recargar página'}
                        </button>
                        <button
                            type="button"
                            onClick={this.handleGoHome}
                            className="flex-1 min-h-10 px-4 py-2 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] dark:bg-[#1E2730] dark:hover:bg-[#283440] text-[#334155] dark:text-[#CBD5E1] text-sm font-medium transition-colors cursor-pointer"
                        >
                            Ir al Inicio
                        </button>
                        <button
                            type="button"
                            onClick={this.handleGoContact}
                            className="flex-1 min-h-10 px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#24303C] bg-white hover:bg-[#F8FAFC] dark:bg-[#161D24] dark:hover:bg-[#1E2730] text-[#334155] dark:text-[#CBD5E1] text-sm font-medium transition-colors cursor-pointer"
                        >
                            Contacto
                        </button>
                    </div>

                    {isDev && (
                        <details className="text-left rounded-xl bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] p-3">
                            <summary className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8] cursor-pointer select-none">
                                Ver detalle técnico (solo visible en desarrollo)
                            </summary>
                            <p className="mt-2 text-xs font-mono text-[#991B1B] dark:text-[#FCA5A5] break-words">
                                {errorMessage}
                            </p>
                        </details>
                    )}

                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        Simulador de Correlativas UNLu
                    </p>
                </div>
            </div>
        );
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
    resetKey: PropTypes.string,
    scope: PropTypes.oneOf(['app', 'page']),
    onReset: PropTypes.func,
    isDev: PropTypes.bool,
    onReportError: PropTypes.func,
};

ErrorBoundary.defaultProps = {
    resetKey: undefined,
    scope: 'app',
    onReset: undefined,
    isDev: undefined,
    onReportError: undefined,
};

export default ErrorBoundary;
