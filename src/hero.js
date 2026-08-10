import { heroui } from "@heroui/react";

export default heroui({
    themes: {
        /* --- 1. MODO CLARO (UNLu Institucional) --- */
        /* Paleta dominada por BLANCO y VERDE institucional oscuro */
        light: {
            colors: {
                background: "#ffffff",
                foreground: "#1a2e1a",
                focus: "#2E7D32",
                overlay: "#ffffff",
                default: {
                    50: "#f8faf8", 100: "#f1f4f1", 200: "#e2e8e2", 300: "#ced8ce",
                    400: "#8e9e8e", 500: "#6c7e6c", 600: "#4a5e4a", 700: "#374837",
                    800: "#1f2e1f", 900: "#111a11",
                    foreground: "#1a2e1a", DEFAULT: "#8e9e8e"
                },
                primary: {
                    50: "#e8f5e9", 100: "#c8e6c9", 200: "#a5d6a7", 300: "#81c784",
                    400: "#66bb6a", 500: "#2E7D32", 600: "#27692a", 700: "#1B5E20",
                    800: "#155a1e", 900: "#0d3b12",
                    foreground: "#fff", DEFAULT: "#2E7D32"
                },
                secondary: {
                    50: "#fce8e8", 100: "#f7b8b8", 200: "#f28888", 300: "#ed5858",
                    400: "#e83a3a", 500: "#c62828", 600: "#b71c1c", 700: "#991515",
                    800: "#7a1010", 900: "#5c0b0b",
                    foreground: "#fff", DEFAULT: "#c62828"
                },
                success: {
                    50: "#e6f5ec", 100: "#b3e2c8", 200: "#80cfa3", 300: "#4dbc7f",
                    400: "#26ad64", 500: "#009d49", 600: "#008a40", 700: "#007535",
                    800: "#005f2b", 900: "#004a21",
                    foreground: "#fff", DEFAULT: "#009d49"
                },
                warning: {
                    50: "#fff8e6", 100: "#ffe9b3", 200: "#ffda80", 300: "#ffcb4d",
                    400: "#ffc026", 500: "#e6a800", 600: "#cc9500", 700: "#a67a00",
                    800: "#805e00", 900: "#594200",
                    foreground: "#1a2e1a", DEFAULT: "#e6a800"
                },
                danger: {
                    50: "#fde8eb", 100: "#f9b8c1", 200: "#f58897", 300: "#f1586d",
                    400: "#ee3a4e", 500: "#d4213b", 600: "#b91c33", 700: "#9e172b",
                    800: "#831223", 900: "#5c0c18",
                    foreground: "#fff", DEFAULT: "#d4213b"
                },
                content1: { DEFAULT: "#ffffff", foreground: "#1a2e1a" },
                content2: { DEFAULT: "#f1f4f1", foreground: "#1a2e1a" },
                content3: { DEFAULT: "#e2e8e2", foreground: "#1a2e1a" },
                content4: { DEFAULT: "#ced8ce", foreground: "#1a2e1a" },
            }
        },

        /* --- 2. MODO OSCURO (UNLu Oscuro) --- */
        dark: {
            colors: {
                background: "#0a120a",
                foreground: "#e8f0e8",
                focus: "#66bb6a",
                overlay: "#0a120a",
                default: {
                    50: "#0d150d", 100: "#142014", 200: "#1e2e1e", 300: "#2d422d",
                    400: "#8e9e8e", 500: "#a8b8a8", 600: "#c2d0c2", 700: "#d8e2d8",
                    800: "#e8f0e8", 900: "#f5f8f5",
                    foreground: "#e8f0e8", DEFAULT: "#8e9e8e"
                },
                primary: {
                    50: "#0d3b12", 100: "#155a1e", 200: "#1B5E20", 300: "#27692a",
                    400: "#2E7D32", 500: "#43A047", 600: "#66bb6a", 700: "#81c784",
                    800: "#a5d6a7", 900: "#c8e6c9",
                    foreground: "#fff", DEFAULT: "#43A047"
                },
                secondary: {
                    50: "#5c0b0b", 100: "#7a1010", 200: "#991515", 300: "#b71c1c",
                    400: "#c62828", 500: "#e53935", 600: "#ef5350", 700: "#f28888",
                    800: "#f7b8b8", 900: "#fce8e8",
                    foreground: "#fff", DEFAULT: "#e53935"
                },
                success: {
                    50: "#004a21", 100: "#005f2b", 200: "#007535", 300: "#008a40",
                    400: "#009d49", 500: "#26ad64", 600: "#4dbc7f", 700: "#80cfa3",
                    800: "#b3e2c8", 900: "#e6f5ec",
                    foreground: "#fff", DEFAULT: "#26ad64"
                },
                warning: {
                    50: "#594200", 100: "#805e00", 200: "#a67a00", 300: "#cc9500",
                    400: "#e6a800", 500: "#ffc026", 600: "#ffcb4d", 700: "#ffda80",
                    800: "#ffe9b3", 900: "#fff8e6",
                    foreground: "#1a2e1a", DEFAULT: "#ffc026"
                },
                danger: {
                    50: "#5c0c18", 100: "#831223", 200: "#9e172b", 300: "#b91c33",
                    400: "#d4213b", 500: "#ee3a4e", 600: "#f1586d", 700: "#f58897",
                    800: "#f9b8c1", 900: "#fde8eb",
                    foreground: "#fff", DEFAULT: "#ee3a4e"
                },
                content1: { DEFAULT: "#142014", foreground: "#e8f0e8" },
                content2: { DEFAULT: "#1e2e1e", foreground: "#e8f0e8" },
                content3: { DEFAULT: "#2d422d", foreground: "#e8f0e8" },
                content4: { DEFAULT: "#3d5a3d", foreground: "#e8f0e8" },
            }
        },

        /* --- 3. MODO GIRLIE 🌸 --- */
        /* Paleta 100% rosa: desde el blanco rosado hasta el vino profundo */
        girlie: {
            extend: "light",
            colors: {
                background: "#fff0f6",   // Fondo rosa muy pálido (lavender blush)
                foreground: "#4a0028",   // Texto principal: vino oscuro
                focus: "#ec4899",
                overlay: "#fff0f6",

                /* Grises → grises rosados */
                default: {
                    /* Rosa-gris: 400+ oscuros para legibilidad en texto */
                    50: "#fdf5f9", 100: "#faeaf4", 200: "#f5d5ea", 300: "#efbfdf",
                    400: "#a05e86", 500: "#7e4068", 600: "#5d264c", 700: "#3e1332",
                    800: "#2d0d24", 900: "#1a0615",
                    foreground: "#4a0028", DEFAULT: "#a05e86"
                },

                /* Azules → Rosa fuerte / Hot pink (color de marca) */
                primary: {
                    50: "#fff0f6", 100: "#ffd6e8", 200: "#ffadd1", 300: "#ff85ba",
                    400: "#f85ca1", 500: "#ec4899", 600: "#d63384", 700: "#b91c6e",
                    800: "#831843", 900: "#4a0028",
                    foreground: "#4a0028", DEFAULT: "#ec4899"
                },

                /* Secundario → Fucsia / Magenta vibrante */
                secondary: {
                    50: "#fdf4ff", 100: "#fae8ff", 200: "#f3d0fe", 300: "#e9a8fd",
                    400: "#d973f8", 500: "#c026d3", 600: "#a21caf", 700: "#86198f",
                    800: "#701a75", 900: "#581c6d",
                    foreground: "#ffffff", DEFAULT: "#d946ef"
                },

                /* Verde → Verde menta femenino */
                success: {
                    50: "#f0fdf4", 100: "#dcfce7", 200: "#bbf7d0", 300: "#86efac",
                    400: "#4ade80", 500: "#22c55e", 600: "#16a34a", 700: "#15803d",
                    800: "#166534", 900: "#14532d",
                    foreground: "#fff", DEFAULT: "#22c55e"
                },

                /* Amarillo → Naranja melocotón cálido */
                warning: {
                    50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa", 300: "#fdba74",
                    400: "#fb923c", 500: "#f97316", 600: "#ea580c", 700: "#c2410c",
                    800: "#9a3412", 900: "#7c2d12",
                    foreground: "#fff", DEFAULT: "#fb923c"
                },

                /* Rojo → Rojo cereza / Carmine */
                danger: {
                    50: "#fff1f2", 100: "#ffe4e8", 200: "#fecdd3", 300: "#fda4af",
                    400: "#fb7185", 500: "#f43f5e", 600: "#e11d48", 700: "#be123c",
                    800: "#9f1239", 900: "#881337",
                    foreground: "#fff", DEFAULT: "#c53976"
                },

                /* Tarjetas y superficies en la gamma rosa */
                content1: { DEFAULT: "#fce7f3", foreground: "#4a0028" },
                content2: { DEFAULT: "#fbcfe8", foreground: "#4a0028" },
                content3: { DEFAULT: "#f9a8d4", foreground: "#4a0028" },
                content4: { DEFAULT: "#f472b6", foreground: "#ffffff" },
                divider: "#fbcfe8",
            }
        },

        /* --- 4. MODO BOYIE 🌊 --- */
        /* Paleta 100% azul: desde el blanco glaciar hasta el azul profundo */
        boyie: {
            extend: "light",
            colors: {
                background: "#f0f9ff",   // Fondo azul glaciar muy pálido
                foreground: "#0c4a6e",   // Texto principal: azul oscuro (sky-900)
                focus: "#0ea5e9",
                overlay: "#f0f9ff",

                /* Grises → grises azulados */
                default: {
                    50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0", 300: "#cbd5e1",
                    400: "#64748b", 500: "#475569", 600: "#334155", 700: "#1e293b",
                    800: "#0f172a", 900: "#020617",
                    foreground: "#0c4a6e", DEFAULT: "#64748b"
                },

                /* Primario → Azul vibrante / Royal Blue */
                primary: {
                    50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd",
                    400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8",
                    800: "#1e40af", 900: "#1e3a8a",
                    foreground: "#ffffff", DEFAULT: "#3b82f6"
                },

                /* Secundario → Cyan / Sky vibrante */
                secondary: {
                    50: "#f0f9ff", 100: "#e0f2fe", 200: "#bae6fd", 300: "#7dd3fc",
                    400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7", 700: "#0369a1",
                    800: "#075985", 900: "#0c4a6e",
                    foreground: "#ffffff", DEFAULT: "#0ea5e9"
                },

                /* Verde → Esmeralda */
                success: {
                    50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7",
                    400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857",
                    800: "#065f46", 900: "#064e3b",
                    foreground: "#fff", DEFAULT: "#10b981"
                },

                /* Amarillo → Ámbar */
                warning: {
                    50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 300: "#fcd34d",
                    400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309",
                    800: "#92400e", 900: "#78350f",
                    foreground: "#fff", DEFAULT: "#f59e0b"
                },

                /* Rojo → Rose / Crimson */
                danger: {
                    50: "#fff1f2", 100: "#ffe4e6", 200: "#fecdd3", 300: "#fda4af",
                    400: "#fb7185", 500: "#f43f5e", 600: "#e11d48", 700: "#be123c",
                    800: "#9f1239", 900: "#881337",
                    foreground: "#fff", DEFAULT: "#f43f5e"
                },

                /* Tarjetas y superficies en la gamma azul */
                content1: { DEFAULT: "#e0f2fe", foreground: "#0c4a6e" },
                content2: { DEFAULT: "#bae6fd", foreground: "#0c4a6e" },
                content3: { DEFAULT: "#7dd3fc", foreground: "#0c4a6e" },
                content4: { DEFAULT: "#38bdf8", foreground: "#ffffff" },
                divider: "#bae6fd",
            }
        }
    }
});