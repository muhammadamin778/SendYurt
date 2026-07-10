import type { Config } from "tailwindcss";

// SendYurt design tokens — rooted in specific Uzbek craft sources:
//
//   samarkand — the deep cobalt of Registan majolica tilework. Historic
//     Uzbek lapis glazes sit in the saturated cobalt range (not teal);
//     700 is the primary action color and passes AA on white at 7.5:1.
//   terracotta — unglazed clay brick of Bukhara and Khiva.
//   zar — muted gold/ochre of zardoʻzi embroidery. Used sparingly:
//     achievements, highlights, "quiet pride" moments. Never for large
//     surfaces.
//   sand — warm desert/adobe neutrals instead of cold SaaS gray.
//
// Dark mode uses class strategy; night surfaces are deep indigo
// (night sky over tiled domes), defined inline via dark: variants.
const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        samarkand: {
          50: "#f1f5fb",
          100: "#dee8f6",
          200: "#c4d7ef",
          300: "#9cbce3",
          400: "#6d9ad3",
          500: "#4b7cc2",
          600: "#3862b0",
          700: "#2f5096",
          800: "#2a4478",
          900: "#273b63",
          950: "#1a2740",
        },
        terracotta: {
          50: "#fdf6ef",
          100: "#fae9d9",
          200: "#f4cfb1",
          300: "#edaf80",
          400: "#e4854d",
          500: "#de662a",
          600: "#cf4e20",
          700: "#ac3a1c",
          800: "#89301e",
          900: "#6f2a1b",
          950: "#3c130c",
        },
        zar: {
          50: "#fbf7ec",
          100: "#f5ecd3",
          200: "#eadaa7",
          300: "#dcc377",
          400: "#cdab4f",
          500: "#bc9432",
          600: "#a67c28",
          700: "#866122",
          800: "#6e4f21",
          900: "#5d431f",
          950: "#362410",
        },
        sand: {
          50: "#faf8f3",
          100: "#f2eee3",
          200: "#e4dbc6",
          300: "#d2c3a2",
          400: "#bfa77c",
          500: "#b19262",
          600: "#a48156",
          700: "#886948",
          800: "#6f563e",
          900: "#5b4734",
          950: "#30241a",
        },
        // Warm charcoal, not green-black or blue-black.
        ink: "#26221b",
        // Night-sky indigo surfaces for dark mode (tiled dome at night).
        night: {
          DEFAULT: "#0f1729",
          raised: "#182238",
          line: "#26314b",
          soft: "#8fa3c4",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(26 39 64 / 0.07), 0 4px 16px -4px rgb(26 39 64 / 0.09)",
      },
      borderRadius: {
        // Iwan arch: pointed-oval top used on portal-shaped surfaces.
        arch: "9rem 9rem 0.75rem 0.75rem",
      },
      keyframes: {
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.97)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "page-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "toast-in": "toast-in 200ms ease-out",
        "page-in": "page-in 280ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
