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
          DEFAULT: "#0B2545",
          dark: "#071B33",
          deep: "#051426",
          surface: "#0F325E",
          light: "#E0EDF8",
          border: "#1E4E79",
        },
        charcoal: {
          DEFAULT: "#111111",
          muted: "#475569",
          subtle: "#64748B",
          faint: "#94A3B8",
        },
        // Trinity Gold / Dark Yellow
        brand: {
          DEFAULT: "#F59E0B",
          hover: "#D97706",
          dark: "#B45309",
          light: "#FEF3C7",
          border: "#FCD34D",
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
          alert: "#B45309",
          light: "#FEF3C7",
          border: "#FDE68A",
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
