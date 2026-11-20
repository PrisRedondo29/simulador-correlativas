import React from 'react';
import PropTypes from 'prop-types';

/**
 * ErrorBoundary institucional UNLu.
 * Evita pantallas en blanco ante errores inesperados de renderizado
 * sin depender de Providers ni librerías UI externas.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error, errorInfo) {
        if (import.meta.env.DEV) {
            console.error('[ErrorBoundary]', error, errorInfo);
        }
    }

    componentDidUpdate(prevProps) {
        if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ hasError: false, error: null });
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
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

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

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
                            Algo salió mal en esta pantalla
                        </h1>
                        <p className="text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                            Ocurrió un error inesperado al mostrar el contenido. Tu progreso guardado en el dispositivo permanece intacto.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                        <button
                            type="button"
                            onClick={isPageLevel ? this.handleReset : this.handleReload}
                            className="flex-1 min-h-10 px-4 py-2 rounded-xl bg-[#005A36] hover:bg-[#00462A] dark:bg-[#2E8B63] text-white text-sm font-semibold transition-colors cursor-pointer"
                        >
                            {isPageLevel ? 'Reintentar' : 'Recargar aplicación'}
                        </button>
                        <button
                            type="button"
                            onClick={this.handleGoHome}
                            className="flex-1 min-h-10 px-4 py-2 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] dark:bg-[#1E2730] dark:hover:bg-[#283440] text-[#334155] dark:text-[#CBD5E1] text-sm font-medium transition-colors cursor-pointer"
                        >
                            Ir al Inicio
                        </button>
                    </div>

                    <details className="text-left rounded-xl bg-[#F8FAFC] dark:bg-[#11171D] border border-[#E2E8F0] dark:border-[#24303C] p-3">
                        <summary className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8] cursor-pointer select-none">
                            Ver detalle técnico para reportar
                        </summary>
                        <p className="mt-2 text-xs font-mono text-[#991B1B] dark:text-[#FCA5A5] break-words">
                            {errorMessage}
                        </p>
                    </details>

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
};

ErrorBoundary.defaultProps = {
    resetKey: undefined,
    scope: 'app',
    onReset: undefined,
};

export default ErrorBoundary;
