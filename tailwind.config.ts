import type { Config } from "tailwindcss";

// Palette sampled directly from the Gamefy logo (logo.png): the deep
// near-black background, the violet-purple "G", and the gold/amber accent
// stroke + tagline. See public/logo.png / src/app/icon.png for the source.
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#08060c",
        surface: "#120c1a",
        surface2: "#1c1326",
        border: "#2b1e3a",
        accent: {
          DEFAULT: "#a83fe0",
          soft: "#c987ee",
          deep: "#3c1878",
          glow: "#a83fe055",
        },
        gold: {
          DEFAULT: "#edaf59",
          soft: "#f5cd93",
          deep: "#b17944",
        },
        success: "#3ddc97",
        warn: "#ffb84d",
        danger: "#ff5c72",
      },
      boxShadow: {
        glow: "0 0 24px 0 rgba(168,63,224,0.35)",
        goldGlow: "0 0 24px 0 rgba(237,175,89,0.30)",
      },
      fontFamily: {
        // Body text, nav, buttons, forms, the admin panel — everything
        // that isn't a headline or a price.
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        // The one big hero headline per page — see layout.tsx for the
        // full reasoning on why this isn't reused everywhere anymore.
        display: ["var(--font-display)", "ui-sans-serif", "sans-serif"],
        // Section titles, page headings, prices — the "gaming" register
        // at readable sizes, with real weight range unlike display.
        heading: ["var(--font-heading)", "ui-sans-serif", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
