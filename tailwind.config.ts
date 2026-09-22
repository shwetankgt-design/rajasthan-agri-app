import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Grant Thornton Bharat primary — signature GT purple at 600.
        brand: {
          50: "#f4f0f9",
          100: "#e7def2",
          200: "#cfbee5",
          300: "#b199d4",
          400: "#8b6bbd",
          500: "#6b45a3",
          600: "#4f2d7f",
          700: "#422569",
          800: "#351e54",
          900: "#2a1843",
        },
        // GT secondary/vibrant palette, for charts and categorical accents.
        accent: {
          teal: "#00a7b5",
          lime: "#a4d65e",
          orange: "#ff6900",
          berry: "#c6007e",
          sky: "#0085ca",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)",
        "card-hover": "0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.06)",
        panel: "0 1px 2px rgba(15, 23, 42, 0.03)",
      },
      borderRadius: {
        xl2: "0.875rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
