import { getAvailableCareers, getAvailablePlans } from '../../config/careersRegistry';

/** @typedef {{ key: string, label: string }} SelectOption */
/** @typedef {{ key: string, label: string, careerId: string | null, carrera: string }} PlanSelectOption */

/** @returns {SelectOption[]} */
const generateYears = () => {
    /** @type {SelectOption[]} */
    const years = [];
    for (let i = 1980; i <= 2035; i++) {
        years.push({ key: String(i), label: String(i) });
    }
    return years;
};

const anios = generateYears();

/** @type {SelectOption[]} */
const cuatris = [
    { key: '1', label: '1° Cuatrimestre' },
    { key: '2', label: '2° Cuatrimestre' },
];

const multipleCareers = getAvailableCareers().length > 1;

/** @type {PlanSelectOption[]} */
const plans = getAvailablePlans()
    .filter((plan) => Boolean(plan.planNumero))
    .map((plan) => {
        const planKey = /** @type {string} */ (plan.planNumero);
        return {
            key: planKey,
            label: multipleCareers ? `${plan.careerShortName} · Plan ${planKey}` : planKey,
            careerId: plan.careerId,
            carrera: plan.carrera,
        };
    });

export default {
    anios,
    cuatris,
    plans,
};
