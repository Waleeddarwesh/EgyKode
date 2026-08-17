import type { Config } from "tailwindcss";

/**
 * Colours reference the CSS custom properties generated from
 * packages/design-tokens/tokens.json, so the theme flips with a single
 * `data-theme` attribute and no React re-render (MASTER_PROMPT §3.2, §4.1).
 *
 * Nothing here may hardcode a hex value — edit tokens.json instead.
 */
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "var(--clr-brand)",
        primary: {
          DEFAULT: "var(--clr-primary)",
          light: "var(--clr-primary-light)",
          pale: "var(--clr-primary-pale)",
          dark: "var(--clr-primary-dark)",
        },
        accent: {
          DEFAULT: "var(--clr-accent)",
          light: "var(--clr-accent-light)",
        },
        bg: {
          DEFAULT: "var(--clr-bg)",
          secondary: "var(--clr-bg-secondary)",
        },
        surface: {
          DEFAULT: "var(--clr-surface)",
          hover: "var(--clr-surface-hover)",
          active: "var(--clr-surface-active)",
        },
        border: "var(--clr-surface-border)",
        content: {
          DEFAULT: "var(--clr-text)",
          secondary: "var(--clr-text-secondary)",
          muted: "var(--clr-text-muted)",
          inverse: "var(--clr-text-inverse)",
        },
        success: "var(--clr-success)",
        warning: "var(--clr-warning)",
        danger: "var(--clr-danger)",
        info: "var(--clr-info)",
        // Domain identifiers (§3.2) — stable per technology family.
        dm: {
          foundation: "var(--dm-foundation)",
          container: "var(--dm-container)",
          orchestration: "var(--dm-orchestration)",
          iac: "var(--dm-iac)",
          cloud: "var(--dm-cloud)",
          cicd: "var(--dm-cicd)",
          gitops: "var(--dm-gitops)",
          observability: "var(--dm-observability)",
          security: "var(--dm-security)",
          platform: "var(--dm-platform)",
        },
      },
      backgroundColor: {
        "success-soft": "var(--clr-success-bg)",
        "warning-soft": "var(--clr-warning-bg)",
        "danger-soft": "var(--clr-danger-bg)",
        "info-soft": "var(--clr-info-bg)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        // --font-mono-drawing is a unicode-range-scoped face carrying the box
        // characters the Latin subset omits. It must sit *after* --font-mono so
        // Latin still comes from the main file, and *before* the generics so a
        // box glyph never reaches a system font with a different advance.
        mono: ["var(--font-mono)", "var(--font-mono-drawing)", "ui-monospace", "monospace"],
        arabic: ["var(--font-arabic)", "Tahoma", "sans-serif"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        glow: "var(--shadow-glow)",
      },
      maxWidth: { content: "1440px", prose: "72ch" },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        "in-out": "var(--ease-in-out)",
        spring: "var(--ease-spring)",
      },
    },
  },
  plugins: [],
};

export default config;
