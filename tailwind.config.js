/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand & Accent
        primary: {
          DEFAULT: "var(--color-primary)",
          active: "var(--color-primary-active)",
          foreground: "var(--color-on-primary)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          foreground: "var(--color-on-secondary)",
        },
        // Sticker palette — decorative only
        accent: {
          sky: "var(--color-accent-sky)",
          purple: "var(--color-accent-purple)",
          "purple-deep": "var(--color-accent-purple-deep)",
          pink: "var(--color-accent-pink)",
          orange: "var(--color-accent-orange)",
          "orange-deep": "var(--color-accent-orange-deep)",
          teal: "var(--color-accent-teal)",
          green: "var(--color-accent-green)",
          brown: "var(--color-accent-brown)",
        },
        // Surface
        canvas: {
          DEFAULT: "var(--color-canvas)",
          soft: "var(--color-canvas-soft)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          elevated: "var(--color-surface-elevated)",
        },
        hairline: "var(--color-hairline)",
        // Text
        ink: {
          DEFAULT: "var(--color-ink)",
          secondary: "var(--color-ink-secondary)",
          muted: "var(--color-ink-muted)",
          faint: "var(--color-ink-faint)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        "display-1": ["4rem", { lineHeight: "1.0", letterSpacing: "-0.1328em", fontWeight: "700" }],
        "display-2": ["3.375rem", { lineHeight: "1.04", letterSpacing: "-0.1172em", fontWeight: "700" }],
        "heading-1": ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.0625em", fontWeight: "700" }],
        "heading-2": ["1.625rem", { lineHeight: "1.23", letterSpacing: "-0.0391em", fontWeight: "700" }],
        "heading-3": ["1.375rem", { lineHeight: "1.27", letterSpacing: "-0.0156em", fontWeight: "700" }],
        title: ["1.25rem", { lineHeight: "1.4", letterSpacing: "-0.0078em", fontWeight: "600" }],
        "body-md": ["1rem", { lineHeight: "1.5", letterSpacing: "0em", fontWeight: "400" }],
        "body-sm": ["0.9375rem", { lineHeight: "1.33", letterSpacing: "0em", fontWeight: "400" }],
        button: ["1rem", { lineHeight: "1.5", letterSpacing: "0em", fontWeight: "500" }],
        caption: ["0.875rem", { lineHeight: "1.43", letterSpacing: "0em", fontWeight: "400" }],
        eyebrow: ["0.75rem", { lineHeight: "1.33", letterSpacing: "0.0078em", fontWeight: "600" }],
      },
      spacing: {
        xxs: "0.25rem",
        xs: "0.5rem",
        sm: "0.75rem",
        md: "1rem",
        lg: "1.5rem",
        xl: "1.75rem",
        xxl: "2rem",
      },
      borderRadius: {
        xs: "0.25rem",
        sm: "0.3125rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        full: "9999px",
      },
      boxShadow: {
        soft: "rgba(0,0,0,0.01) 0 0.175px 1.041px, rgba(0,0,0,0.02) 0 0 0.8px 2.925px, rgba(0,0,0,0.027) 0 2.025px 7.847px, rgba(0,0,0,0.04) 0 4px 18px",
        elevated: "rgba(0,0,0,0.01) 0 0.175px 1.041px, rgba(0,0,0,0.02) 0 0 0.8px 2.925px, rgba(0,0,0,0.027) 0 2.025px 7.847px, rgba(0,0,0,0.04) 0 4px 18px, rgba(0,0,0,0.05) 0 23px 52px",
        focus: "0 0 0 2px var(--color-primary)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "slide-in-right": "slide-in-right 250ms ease-out",
      },
    },
  },
  plugins: [],
};
