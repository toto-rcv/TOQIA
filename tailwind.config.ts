import type { Config } from "tailwindcss";
// Import ESM en vez de require(): según cómo Node cargue este archivo, el
// require no está definido y Tailwind revienta al leer la configuración.
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Tres sistemas de diseño conviven en esta app y no se mezclan:
 *
 *  - `ex-*`  → el panel interno (/admin, /panel, /distribuidor).
 *            SaaS claro: lienzo lavanda muy pálido, tarjetas blancas con
 *            esquinas redondeadas, violeta como único acento, tinta azul
 *            oscura para el texto. Los nombres de token son semánticos
 *            (surface, border, text…), así que el mismo `bg-ex-surface`
 *            siguió funcionando cuando el panel pasó de oscuro a claro.
 *
 *  - `tq-*`  → la landing del restaurante y la carta que ve su cliente.
 *            Dos ambientes: la portada negra con dorado, y la carta en tonos
 *            arena, cálida y liviana.
 *
 *  - `mn-*`  → las páginas de estado de /pulsera (no reconocida, inactiva).
 *
 *  - `mk-*`  → el sitio público de Toqia en `/`: la web comercial que ve el
 *            dueño de un restaurante antes de ser cliente. Oscuro y
 *            minimalista, con el degradado de marca solo en logo, botones y
 *            detalles destacados.
 *
 * El prefijo evita que un token del panel se cuele en la página pública.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Panel interno (SaaS claro) ───────────────────────────────────
        ex: {
          // `black` y `navy` conservan el nombre por compatibilidad: hoy son
          // el lienzo de la app y las zonas hundidas, no colores oscuros.
          black: "#F3F4FB", // lienzo de la aplicación
          navy: "#EAECF7", // zonas hundidas (cabeceras de tabla, rieles)
          surface: "#FFFFFF", // tarjeta
          elevated: "#F7F8FD", // hover / superficie sutil
          border: "#E3E6F2",
          "border-subtle": "#EFF1F8",

          text: "#12162E", // tinta principal
          "text-secondary": "#4B5170",
          "text-muted": "#787E9C",
          "text-disabled": "#A9AEC5",

          blue: "#6D5BF6", // acento único
          "blue-bright": "#8B7CF8",
          "blue-deep": "#5A46E8",
          "blue-wash": "#EFEDFE", // fondo de estado activo

          // Paneles oscuros de contraste: la tarjeta destacada del dashboard.
          ink: "#191C33",
          "ink-soft": "#242847",

          success: "#0E9F6E",
          warning: "#D97706",
          danger: "#E5484D",
          neutral: "#8A90A8",
        },
        // ── landing pública del restaurante ──────────────────────────────
        // Negro de fondo, tarjeta color crema y dorado como acento. Es la
        // pantalla que ve el cliente del restaurante en el celular, y la única
        // que lleva la marca del local.
        tq: {
          black: "#0C0C0A", // fondo de la página
          surface: "#151512", // tarjetas sobre el negro
          elevated: "#1E1E1A",
          border: "#2A2822",

          cream: "#F6F2EA", // la tarjeta principal
          "cream-alt": "#FFFFFF", // los accesos, un escalón por encima
          "cream-border": "#E6DFD2",

          gold: "#C9A961", // acento y filetes
          "gold-soft": "#E3D2A6",
          "gold-dim": "#8A7328",

          green: "#14442E", // el botón de reseña
          "green-dark": "#0F3324",

          ink: "#1B1B18", // texto sobre crema
          "ink-soft": "#54514A",
          muted: "#8B8779",

          text: "#F5F1E6", // texto sobre negro
          "text-muted": "#9A937F",

          /* ── La carta ──────────────────────────────────────────────────
             Ambiente nocturno y sobrio: fondo casi negro, champagne apagado
             como único acento y blanco roto para el texto. El dorado mate no
             compite con la comida como competía el naranja, y sobre el fondo
             oscuro da 9:1 de contraste: se lee igual con la luz del mediodía
             pegando en la pantalla. */
          night: "#181817", // fondo de la carta
          "night-raised": "#20201F", // superficies sobre el fondo
          "night-line": "#353432", // filete entre platos
          "night-ink": "#F2EFE8", // blanco roto: nombres y textos
          "night-soft": "#A9A6A0", // descripciones
          "night-muted": "#8C8A84", // firmas y avisos, un escalón más abajo

          /* El acento. `light` y `deep` solo existen para los estados de un
             botón (reposo / hover); el color que manda en toda la carta es
             `champagne` a secas. */
          champagne: "#C9B88A",
          "champagne-light": "#D8CBA5",
          "champagne-deep": "#B3A075",
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
        // ── Sitio público de Toqia (la web comercial, "/") ───────────────
        // Oscuro, limpio y minimalista. El degradado azul → turquesa → verde
        // es la marca y se reserva para el logo, los botones y los detalles
        // destacados; el resto de la página es fondo oscuro y tipografía.
        mk: {
          bg: "#050B12",        // fondo principal
          surface: "#0B141D",   // tarjetas y bandas
          elevated: "#101B26",  // hover sobre una tarjeta
          border: "#1C2935",    // bordes y divisores

          text: "#F5F7FA",      // texto principal
          muted: "#A7B0BA",     // texto secundario

          blue: "#1677FF",
          turquoise: "#00B8C8",
          green: "#00D084",
        },
      },
      fontFamily: {
        // Geist se sirve local vía next/font (paquete `geist`), sin pedidos de red.
        sans: ["var(--font-geist-sans)", "SF Pro Display", "Helvetica Neue", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "monospace"],
        // Serif editorial solo para las páginas públicas.
        serif: ["Ivy Text", "Newsreader", "Playfair Display", "Georgia", "serif"],
      },
      backgroundImage: {
        // El degradado principal de Toqia. Vive acá y no repetido en cada
        // componente para que un cambio de marca sea una línea.
        "mk-brand":
          "linear-gradient(90deg, #1677FF 0%, #00B8C8 50%, #00D084 100%)",
        "mk-brand-diag":
          "linear-gradient(135deg, #1677FF 0%, #00B8C8 50%, #00D084 100%)",
      },
      borderRadius: {
        // Redondeo generoso: es lo que le da el aire de producto moderno.
        card: "16px",
        control: "10px",
        pill: "999px",
      },
      boxShadow: {
        // En un panel claro la sombra es lo que separa la tarjeta del lienzo:
        // muy difusa y de opacidad baja, nunca un borde gris duro.
        subtle: "0 1px 2px rgba(18,22,46,0.04)",
        card: "0 1px 2px rgba(18,22,46,0.04), 0 8px 24px -12px rgba(18,22,46,0.10)",
        pop: "0 12px 32px -12px rgba(18,22,46,0.22)",
        "ex-glow": "0 0 0 3px rgba(109,91,246,0.14)",
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
