import PropTypes from 'prop-types';
import { Button, Card, CardBody } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { useActivePlan, usePlanCapabilities } from '../../context/PlanContext';
import { getPlansSupportingFeature } from '../../config/careersRegistry';

const FEATURE_LABELS = {
    planTransition: 'El simulador de cambio de plan',
    equivalencias: 'La tabla de equivalencias entre planes',
};

/**
 * Guardia declarativa para rutas restringidas a capacidades del plan activo.
 * Se adapta dinámicamente a cualquier carrera y plan registrado en careersRegistry.js.
 */
export default function PlanFeatureRoute({ feature, children }) {
    const navigate = useNavigate();
    const { setPlan } = useActivePlan();
    const { plan, career, can } = usePlanCapabilities();

    if (can(feature)) {
        return children;
    }

    const compatiblePlans = getPlansSupportingFeature(feature, { careerId: career?.id });
    const sameCareerCompatible = compatiblePlans.find((p) => p.careerId === career?.id) || null;
    const suggestedPlan = sameCareerCompatible || (!plan ? compatiblePlans[0] : null);
    const featureTitle = FEATURE_LABELS[feature] || 'Esta herramienta';

    const heading = suggestedPlan
        ? `Herramienta disponible para el ${suggestedPlan.label}`
        : 'Herramienta no disponible para tu plan actual';

    const description = (() => {
        if (plan && suggestedPlan) {
            const transitionNote =
                feature === 'planTransition' && suggestedPlan.transition
                    ? ` (${suggestedPlan.transition.resolution}) está pensado únicamente para estudiantes que evalúan migrar desde el Plan ${suggestedPlan.transition.sourcePlan} hacia el Plan ${suggestedPlan.transition.targetPlan}.`
                    : ` está disponible para el ${suggestedPlan.label}.`;
            return `Actualmente tenés activo el Plan ${plan}. ${featureTitle}${transitionNote}`;
        }
        if (plan) {
            return `Actualmente tenés activo el Plan ${plan} (${career?.name || 'tu carrera'}). ${featureTitle} no aplica a este plan de estudios.`;
        }
        return suggestedPlan
            ? `Todavía no seleccionaste un plan de estudios. Elegí tu plan actual o activá el ${suggestedPlan.label} para acceder.`
            : 'Todavía no seleccionaste un plan de estudios compatible con esta sección.';
    })();

    return (
        <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
            <Card shadow="none" className="max-w-lg w-full bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl">
                <CardBody className="p-6 sm:p-8 text-center flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38] flex items-center justify-center">
                        <i className="fa-solid fa-graduation-cap text-lg" aria-hidden="true" />
                    </div>

                    <div className="space-y-1.5">
                        <h1 className="text-lg sm:text-xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                            {heading}
                        </h1>
                        <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                            {description}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 w-full justify-center pt-1">
                        <Button
                            size="sm"
                            className="bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] text-white font-semibold rounded-xl px-5 h-9"
                            onPress={() => navigate('/mis-materias')}
                        >
                            Ir a Mis Materias
                        </Button>
                        {suggestedPlan ? (
                            <Button
                                size="sm"
                                variant="flat"
                                className="bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0] border border-[#E2E8F0] dark:border-[#2A3540] font-medium rounded-xl px-4 h-9"
                                onPress={() => setPlan(suggestedPlan.planNumero)}
                            >
                                Cambiar a {suggestedPlan.label}
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="flat"
                                className="bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0] border border-[#E2E8F0] dark:border-[#2A3540] font-medium rounded-xl px-4 h-9"
                                onPress={() => navigate('/configuracion')}
                            >
                                Ir a Configuración
                            </Button>
                        )}
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}

PlanFeatureRoute.propTypes = {
    feature: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
};
