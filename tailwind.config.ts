import type { Config } from "tailwindcss";
// Import ESM en vez de require(): según cómo Node cargue este archivo, el
// require no está definido y Tailwind revienta al leer la configuración.
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Dos sistemas de diseño conviven en esta app y no se mezclan:
 *
 *  - `ex-*`  (executive-dashboard-ui) → todo lo que cuelga de /admin.
 *            Midnight Command Center: fondos casi negros azulados, azul
 *            eléctrico exclusivamente como acento, bordes de 1px casi
 *            invisibles.
 *
 *  - `mn-*`  (minimalist-ui) → las páginas públicas de /pulsera, que ve el
 *            cliente del restaurante en el celular. Minimalismo editorial:
 *            blanco cálido, tinta apagada, pasteles desaturados.
 *
 * El prefijo evita que un token del panel se cuele en la página pública.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── executive-dashboard-ui ───────────────────────────────────────
        ex: {
          black: "#070A0F", // fondo raíz
          navy: "#0B1018", // fondo de sección
          surface: "#101722", // superficie de tarjeta
          elevated: "#141C28", // superficie elevada / hover
          border: "#1D2734",
          "border-subtle": "#151E2A",
          text: "#F3F7FC",
          "text-secondary": "#9BA8B8",
          "text-muted": "#647184",
          "text-disabled": "#3F4B5B",
          blue: "#3B82F6", // acento principal
          "blue-bright": "#60A5FA",
          "blue-deep": "#2563EB",
          success: "#34D399",
          warning: "#FBBF24",
          danger: "#F87171",
          neutral: "#94A3B8",
        },
        // ── landing pública del restaurante ──────────────────────────────
        // Negro con acentos dorado neón. Es la pantalla que ve el cliente del
        // restaurante en el celular, y la única que lleva la marca del local.
        tq: {
          black: "#050505", // fondo
          surface: "#0C0C0C", // tarjetas y botones
          elevated: "#141414", // hover
          border: "#241F10", // borde apagado, para lo secundario
          gold: "#D4AF37", // dorado base
          "gold-bright": "#F0D97A", // texto sobre negro, más legible
          "gold-dim": "#8A7328",
          text: "#F5F1E6",
          "text-muted": "#9A937F",
        },
        // ── minimalist-ui ────────────────────────────────────────────────
        mn: {
          canvas: "#F7F6F3",
          "canvas-alt": "#FBFBFA",
          card: "#FFFFFF",
          "card-alt": "#F9F9F8",
          border: "#EAEAEA",
          ink: "#111111", // nunca negro absoluto
          "ink-soft": "#5C5C58",
          "ink-muted": "#8A8A85",
          red: "#FDEBEC",
          blue: "#E1F3FE",
          green: "#EDF3EC",
          yellow: "#FBF3DB",
        },
      },
      fontFamily: {
        // Geist se sirve local vía next/font (paquete `geist`), sin pedidos de red.
        sans: ["var(--font-geist-sans)", "SF Pro Display", "Helvetica Neue", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "monospace"],
        // Serif editorial solo para las páginas públicas.
        serif: ["Ivy Text", "Newsreader", "Playfair Display", "Georgia", "serif"],
      },
      borderRadius: {
        // Nada de tarjetas excesivamente redondeadas.
        card: "6px",
        control: "4px",
      },
      boxShadow: {
        // Sombras prácticamente inexistentes: opacidad muy baja y difusas.
        subtle: "0 1px 2px rgba(0,0,0,0.04)",
        "ex-glow": "0 0 0 1px rgba(59,130,246,0.25)",
      },
      fontSize: {
        // Escala para métricas: el número pesa más que su etiqueta.
        metric: ["2.125rem", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "metric-lg": ["2.75rem", { lineHeight: "1", letterSpacing: "-0.035em" }],
        label: ["0.75rem", { lineHeight: "1.3", letterSpacing: "0.01em" }],
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
