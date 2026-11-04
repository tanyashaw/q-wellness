import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effaf7", 100: "#d7f3ec", 200: "#b0e6da", 300: "#7dd2c2", 400: "#48b8a7",
          500: "#2a9d8f", 600: "#1f7f75", 700: "#1d655e", 800: "#1b514c", 900: "#19433f",
        },
        sage: { 50: "#f6f8f5", 100: "#e8eee4", 200: "#d3dfcc", 300: "#b3c8a9", 400: "#8fae82", 500: "#6f9262" },
      },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
