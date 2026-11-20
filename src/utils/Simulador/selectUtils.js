import { getAvailableCareers, getAvailablePlans } from '../../config/careersRegistry';

const generateYears = () => {
    const years = [];
    for (let i = 1980; i <= 2035; i++) {
        years.push({ key: String(i), label: String(i) });
    }
    return years;
};

const anios = generateYears();

const cuatris = [
    { key: '1', label: '1° Cuatrimestre' },
    { key: '2', label: '2° Cuatrimestre' },
];

const multipleCareers = getAvailableCareers().length > 1;

const plans = getAvailablePlans().map((plan) => ({
    key: plan.planNumero,
    label: multipleCareers ? `${plan.careerShortName} · Plan ${plan.planNumero}` : plan.planNumero,
    careerId: plan.careerId,
    carrera: plan.carrera,
}));

export default {
    anios,
    cuatris,
    plans,
};
