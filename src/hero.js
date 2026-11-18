import { heroui } from "@heroui/react";

export default heroui({
    themes: {
        /* --- 1. MODO CLARO: Identidad UNLu Calma --- */
        light: {
            colors: {
                background: "#F8FAFC",
                foreground: "#1E293B",
                focus: "#005A36",
                overlay: "#FFFFFF",
                divider: "#E2E8F0",
                default: {
                    50: "#F8FAFC", 100: "#F1F5F9", 200: "#E2E8F0", 300: "#CBD5E1",
                    400: "#94A3B8", 500: "#64748B", 600: "#475569", 700: "#334155",
                    800: "#1E293B", 900: "#0F172A",
                    foreground: "#1E293B", DEFAULT: "#64748B"
                },
                primary: {
                    50: "#ECFDF5", 100: "#D1FAE5", 200: "#A7F3D0", 300: "#6EE7B7",
                    400: "#34A875", 500: "#005A36", 600: "#00472B", 700: "#003822",
                    800: "#002B1A", 900: "#001F13",
                    foreground: "#FFFFFF", DEFAULT: "#005A36"
                },
                secondary: {
                    50: "#EEF6F0", 100: "#D7EAD9", 200: "#B1D5B8", 300: "#84BC90",
                    400: "#5FA16E", 500: "#478559", 600: "#3A6E49", 700: "#2E583A",
                    800: "#23432C", 900: "#182F1F",
                    foreground: "#FFFFFF", DEFAULT: "#478559"
                },
                success: {
                    50: "#ECFDF5", 100: "#D1FAE5", 200: "#A7F3D0", 300: "#79C992",
                    400: "#58A670", 500: "#478559", 600: "#376B47", 700: "#2B5338",
                    800: "#1F3D29", 900: "#14291B",
                    foreground: "#FFFFFF", DEFAULT: "#478559"
                },
                warning: {
                    50: "#FFFBEB", 100: "#FEF3C7", 200: "#FDE68A", 300: "#FCD34D",
                    400: "#F59E0B", 500: "#D97706", 600: "#B45309", 700: "#92400E",
                    800: "#78350F", 900: "#451A03",
                    foreground: "#FFFFFF", DEFAULT: "#D97706"
                },
                danger: {
                    50: "#FEF2F2", 100: "#FEE2E2", 200: "#FECACA", 300: "#FCA5A5",
                    400: "#F87171", 500: "#DC2626", 600: "#B91C1C", 700: "#991B1B",
                    800: "#7F1D1D", 900: "#450A0A",
                    foreground: "#FFFFFF", DEFAULT: "#DC2626"
                },
                content1: { DEFAULT: "#FFFFFF", foreground: "#1E293B" },
                content2: { DEFAULT: "#F1F5F9", foreground: "#334155" },
                content3: { DEFAULT: "#E2E8F0", foreground: "#1E293B" },
                content4: { DEFAULT: "#CBD5E1", foreground: "#0F172A" },
            }
        },

        /* --- 2. MODO OSCURO: Pizarra Serena & Verde UNLu --- */
        dark: {
            colors: {
                background: "#0F1419",
                foreground: "#F1F5F9",
                focus: "#4A9D68",
                overlay: "#161D24",
                divider: "#2A3540",
                default: {
                    50: "#161D24", 100: "#1E2730", 200: "#2A3540", 300: "#3B4958",
                    400: "#64748B", 500: "#94A3B8", 600: "#CBD5E1", 700: "#E2E8F0",
                    800: "#F1F5F9", 900: "#FFFFFF",
                    foreground: "#F1F5F9", DEFAULT: "#94A3B8"
                },
                primary: {
                    50: "#0D241A", 100: "#123526", 200: "#1A4D38", 300: "#246B4E",
                    400: "#2E8B63", 500: "#3BA578", 600: "#6EE7B7", 700: "#A7F3D0",
                    800: "#D1FAE5", 900: "#ECFDF5",
                    foreground: "#FFFFFF", DEFAULT: "#2E8B63"
                },
                secondary: {
                    50: "#102819", 100: "#173A24", 200: "#215435", 300: "#2D7349",
                    400: "#3D8F5E", 500: "#4A9D68", 600: "#74BD8E", 700: "#A3D7B5",
                    800: "#CFEBD8", 900: "#EEF8F1",
                    foreground: "#FFFFFF", DEFAULT: "#4A9D68"
                },
                success: {
                    50: "#102819", 100: "#173A24", 200: "#215435", 300: "#2D7349",
                    400: "#3D8F5E", 500: "#4A9D68", 600: "#74BD8E", 700: "#A3D7B5",
                    800: "#CFEBD8", 900: "#EEF8F1",
                    foreground: "#FFFFFF", DEFAULT: "#4A9D68"
                },
                warning: {
                    50: "#2D2210", 100: "#423115", 200: "#5C4318", 300: "#855E1E",
                    400: "#B45309", 500: "#D97706", 600: "#F59E0B", 700: "#FCD34D",
                    800: "#FDE68A", 900: "#FEF3C7",
                    foreground: "#FFFFFF", DEFAULT: "#D97706"
                },
                danger: {
                    50: "#2D1619", 100: "#421D22", 200: "#5C262B", 300: "#853139",
                    400: "#B91C1C", 500: "#E05252", 600: "#F87171", 700: "#FCA5A5",
                    800: "#FECACA", 900: "#FEE2E2",
                    foreground: "#FFFFFF", DEFAULT: "#E05252"
                },
                content1: { DEFAULT: "#161D24", foreground: "#F1F5F9" },
                content2: { DEFAULT: "#1E2730", foreground: "#E2E8F0" },
                content3: { DEFAULT: "#2A3540", foreground: "#F1F5F9" },
                content4: { DEFAULT: "#3B4958", foreground: "#FFFFFF" },
            }
        }
    }
});
