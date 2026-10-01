import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#F8FAFC",
        navy: {
          900: "#0F172A",
          800: "#172554",
          700: "#1E3A8A"
        },
        brand: {
          600: "#2563EB",
          700: "#1D4ED8"
        },
        success: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626"
      },
      boxShadow: {
        panel: "0 1px 2px 0 rgb(15 23 42 / 0.06)"
      }
    }
  },
  plugins: []
} satisfies Config;
