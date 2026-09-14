import type { Config } from "tailwindcss";

/**
 * The marketing palette, and only the marketing palette.
 *
 * These are the brand tokens from `@novahost/shared/brand` written as Tailwind
 * colours so the page can say `bg-ground` instead of `bg-[#07070E]` in ninety
 * places. The portal's neutral dual-theme system is deliberately absent — this
 * site is one theme, always dark, always on brand.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "#07070E",
        surface: "#0B0B16",
        card: "#0C0E14",
        hairline: "#14171E",
        edge: "#1D2029",
        ink: "#F2F4F8",
        "ink-2": "#A9B0BF",
        "ink-3": "#8B92A3",
        "ink-4": "#6C7484",
        "ink-5": "#5B6272",
        magenta: "#F0439E",
        violet: "#A855F7",
        cyan: "#22C9E8",
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "sans-serif"],
        sans: ["Figtree", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
