import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#FFFFFF",
          warm: "#F8FAFC",
          surface: "#FFFFFF",
          border: "#D1D9E4",
          "border-dark": "#94A3B8",
        },
        navy: {
          DEFAULT: "rgb(var(--c-navy) / <alpha-value>)",
          dark: "rgb(var(--c-navy-dark) / <alpha-value>)",
          deep: "rgb(var(--c-navy-deep) / <alpha-value>)",
          surface: "rgb(var(--c-navy-surface) / <alpha-value>)",
          "surface-hover": "rgb(var(--c-navy-surface-hover) / <alpha-value>)",
          light: "rgb(var(--c-navy-light) / <alpha-value>)",
          border: "rgb(var(--c-navy-border) / <alpha-value>)",
        },
        charcoal: {
          DEFAULT: "#111111",
          muted: "#475569",
          subtle: "#64748B",
          faint: "#94A3B8",
        },
        brand: {
          DEFAULT: "rgb(var(--c-brand) / <alpha-value>)",
          hover: "rgb(var(--c-brand-hover) / <alpha-value>)",
          dark: "rgb(var(--c-brand-dark) / <alpha-value>)",
          light: "rgb(var(--c-brand-light) / <alpha-value>)",
          border: "rgb(var(--c-brand-border) / <alpha-value>)",
        },
        gold: {
          DEFAULT: "#F59E0B",
          hover: "#D97706",
          dark: "#B45309",
          light: "#FEF3C7",
          border: "#FCD34D",
        },
        terracotta: {
          DEFAULT: "#DC2626",
          light: "#FEE2E2",
          border: "#FCA5A5",
        },
        amber: {
          50: "rgb(var(--c-accent-50) / <alpha-value>)",
          100: "rgb(var(--c-accent-100) / <alpha-value>)",
          200: "rgb(var(--c-accent-200) / <alpha-value>)",
          300: "rgb(var(--c-accent-300) / <alpha-value>)",
          400: "rgb(var(--c-accent-400) / <alpha-value>)",
          500: "rgb(var(--c-accent-500) / <alpha-value>)",
          600: "rgb(var(--c-accent-600) / <alpha-value>)",
          700: "rgb(var(--c-accent-700) / <alpha-value>)",
          800: "rgb(var(--c-accent-800) / <alpha-value>)",
          900: "rgb(var(--c-accent-900) / <alpha-value>)",
          alert: "rgb(var(--c-accent-700) / <alpha-value>)",
          light: "rgb(var(--c-accent-100) / <alpha-value>)",
          border: "rgb(var(--c-accent-200) / <alpha-value>)",
        },
      },
      fontFamily: {
        serif: ["Candara", "Candana", "Cabin", "Georgia", "serif"],
        sans: ["Candara", "Candana", "Cabin", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "Monaco", "monospace"],
      },
      fontWeight: {
        normal: "500",
        medium: "600",
        semibold: "700",
        bold: "800",
      },
      borderRadius: {
        none: "0px",
        subtle: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
