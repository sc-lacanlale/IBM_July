import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./shared/**/*.{js,ts,jsx,tsx,mdx}",
    "./services/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tanaw: {
          yellow: "var(--tanaw-yellow)",
          cream: "var(--tanaw-cream)",
          ink: "var(--tanaw-ink)",
          brown: "var(--tanaw-brown)",
          white: "var(--tanaw-white)",
          muted: "var(--tanaw-muted)",
          danger: "var(--tanaw-danger)",
          ok: "var(--tanaw-ok)",
          outdoor: "var(--mode-outdoor)",
          indoor: "var(--mode-indoor)",
          social: "var(--mode-social)",
          study: "var(--mode-study)",
          cooking: "var(--mode-cooking)",
        },
      },
      fontFamily: {
        brand: ["var(--font-brand)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
        tile: "25px",
        nav: "30px",
      },
      minHeight: {
        touch: "48px",
      },
      minWidth: {
        touch: "48px",
      },
    },
  },
  plugins: [],
};

export default config;
