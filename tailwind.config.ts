import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FBFAF7",
        ink: "#1B1D1F",
        ink2: "#4A4E52",
        ledger: "#2F5D50",
        ledgerDark: "#1F433A",
        brass: "#B08D57",
        line: "#E4E1D8",
        danger: "#B3413A",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(27,29,31,0.04), 0 8px 24px -12px rgba(27,29,31,0.12)",
      },
      borderRadius: {
        card: "10px",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
