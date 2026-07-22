import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: { 0: "#f4f4f0", 1: "#eeede9" },
        ink: {
          DEFAULT: "#1a1a18",
          secondary: "#5c5b55",
          muted: "#9c9a92",
        },
        accent: {
          bg: "#e6f1fb",
          DEFAULT: "#185fa5",
          border: "#85b7eb",
        },
      },
      fontFamily: {
        sans: ["Noto Sans KR", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
