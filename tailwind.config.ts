import type { Config } from "tailwindcss";

// SendYurt design tokens.
// Palette drawn from Uzbek craft traditions: "samarkand" — the deep
// turquoise of Registan tilework; "terracotta" — fired clay and warm
// brick; "sand" — warm neutrals of adobe walls and steppe. Contrast
// pairs used in the UI (samarkand-700 on white, white on samarkand-700,
// ink on sand-50) all meet WCAG AA.
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        samarkand: {
          50: "#effbfa",
          100: "#d3f4f2",
          200: "#ace8e6",
          300: "#75d5d4",
          400: "#3fb8b9",
          500: "#239b9e",
          600: "#1a7d81",
          700: "#186367",
          800: "#175055",
          900: "#184347",
          950: "#08282c",
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
        ink: "#202a27",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(24 67 71 / 0.08), 0 4px 16px -4px rgb(24 67 71 / 0.10)",
      },
    },
  },
  plugins: [],
};
export default config;
