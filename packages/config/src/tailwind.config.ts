import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#e0e9ff",
          500: "#4F6EF7",
          600: "#3B56E8",
          700: "#2C41CC",
          900: "#1a2580",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#F8F9FB",
          border: "#E5E7EB",
        },
        text: {
          primary: "#111827",
          secondary: "#6B7280",
          disabled: "#9CA3AF",
        },
        success: {
          DEFAULT: "#10B981",
          light: "#D1FAE5",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FEF3C7",
        },
        error: {
          DEFAULT: "#EF4444",
          light: "#FEE2E2",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
      },
    },
  },
  plugins: [],
};

export default config;
