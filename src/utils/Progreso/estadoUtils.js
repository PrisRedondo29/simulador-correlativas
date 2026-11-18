/**
 * Configuración unificada de estados académicos (Semáforo Calmo UNLu).
 * Garantiza coherencia visual en Progreso, Simulador (Malla/Grafo/Lista) y Equivalencias.
 */
const ESTADO_CONFIG = {
    Bloqueado: {
        estilo: "bg-[#F1F5F9] dark:bg-[#1A2129] border-[#E2E8F0] dark:border-[#2D3743] hover:border-[#CBD5E1] dark:hover:border-[#3B4958] text-[#64748B] dark:text-[#94A3B8]",
        badgeClass: "bg-[#E2E8F0]/70 text-[#475569] dark:bg-[#2A3540] dark:text-[#94A3B8]",
        color: "default",
        icono: "fa-solid fa-lock",
    },
    Disponible: {
        estilo: "bg-[#F0F9FF] dark:bg-[#0F2636]/70 border-[#BAE6FD] dark:border-[#1E4E6E] hover:border-[#7DD3FC] dark:hover:border-[#38BDF8]/60 text-[#075985] dark:text-[#BAE6FD]",
        badgeClass: "bg-[#E0F2FE] text-[#075985] dark:bg-[#16384F] dark:text-[#7DD3FC]",
        color: "default",
        icono: "fa-solid fa-lock-open",
    },
    Cursando: {
        estilo: "bg-[#F0FDF4] dark:bg-[#122D22] border-[#005A36]/60 dark:border-[#34D399]/60 hover:border-[#005A36] dark:hover:border-[#34D399] text-[#005A36] dark:text-[#A7F3D0]",
        badgeClass: "bg-[#005A36] text-white dark:bg-[#2E8B63] dark:text-white",
        color: "primary",
        icono: "fa-solid fa-pen",
    },
    Regular: {
        estilo: "bg-[#FFFBEB] dark:bg-[#2D2210]/70 border-[#FDE68A] dark:border-[#5C4318] hover:border-[#FCD34D] dark:hover:border-[#855E1E] text-[#92400E] dark:text-[#FCD34D]",
        badgeClass: "bg-[#FEF3C7] text-[#92400E] dark:bg-[#423115] dark:text-[#FCD34D]",
        color: "warning",
        icono: "fa-regular fa-clock",
    },
    Aprobado: {
        estilo: "bg-[#ECFDF5] dark:bg-[#102A20]/80 border-[#A7F3D0] dark:border-[#1E4D38] hover:border-[#478559]/70 dark:hover:border-[#4A9D68] text-[#166534] dark:text-[#86EFAC]",
        badgeClass: "bg-[#D1FAE5] text-[#166534] dark:bg-[#173A24] dark:text-[#86EFAC]",
        color: "success",
        icono: "fa-regular fa-circle-check",
    },
    Promocionado: {
        estilo: "bg-[#ECFDF5] dark:bg-[#112E22] border-[#478559]/60 dark:border-[#2E8B63] hover:border-[#005A36] dark:hover:border-[#4A9D68] text-[#005A36] dark:text-[#A7F3D0]",
        badgeClass: "bg-[#478559] text-white dark:bg-[#2E8B63] dark:text-white",
        color: "success",
        icono: "fa-solid fa-award",
    },
    Libre: {
        estilo: "bg-[#FEF2F2] dark:bg-[#2D1619]/70 border-[#FECACA] dark:border-[#5C262B] hover:border-[#FCA5A5] dark:hover:border-[#853139] text-[#991B1B] dark:text-[#FCA5A5]",
        badgeClass: "bg-[#FEE2E2] text-[#991B1B] dark:bg-[#421D22] dark:text-[#FCA5A5]",
        color: "danger",
        icono: "fa-solid fa-user-slash",
    },
    // --- Estados para el Simulador ---
    Seleccionada: {
        estilo: "bg-[#F0FDF4] dark:bg-[#122D22] border-2 border-[#005A36] dark:border-[#4A9D68] text-[#005A36] dark:text-[#A7F3D0]",
        badgeClass: "bg-[#005A36] text-white dark:bg-[#2E8B63] dark:text-white",
        color: "primary",
        icono: "fa-solid fa-check-double",
    },
    Proyectada: {
        estilo: "bg-[#FFFFFF] dark:bg-[#161D24] border-dashed border-[#CBD5E1] dark:border-[#2A3540] text-[#64748B] dark:text-[#94A3B8]",
        badgeClass: "bg-[#F1F5F9] text-[#475569] dark:bg-[#1E2730] dark:text-[#94A3B8]",
        color: "default",
        icono: "fa-regular fa-calendar",
    },
    Aprobada: {
        estilo: "bg-[#ECFDF5] dark:bg-[#102A20]/80 border-[#A7F3D0] dark:border-[#1E4D38] text-[#166534] dark:text-[#86EFAC]",
        badgeClass: "bg-[#D1FAE5] text-[#166534] dark:bg-[#173A24] dark:text-[#86EFAC]",
        color: "success",
        icono: "fa-solid fa-circle-check",
    },
    NoCursada: {
        estilo: "bg-[#F8FAFC] dark:bg-[#161D24] border-dashed border-[#CBD5E1] dark:border-[#2A3540] text-[#64748B] dark:text-[#94A3B8] opacity-75",
        badgeClass: "bg-[#F1F5F9] text-[#64748B] dark:bg-[#1E2730] dark:text-[#94A3B8]",
        color: "default",
        icono: "fa-solid fa-xmark",
    },
};

export default {
    ESTADO_CONFIG,
};
