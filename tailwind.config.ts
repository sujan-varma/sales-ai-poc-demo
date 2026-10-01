import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc5fb",
          400: "#36a5f6",
          500: "#0c87eb",
          600: "#026ac8",
          700: "#0355a2",
          800: "#074884",
          900: "#0b3c6e",
        },
        cortex: {
          bg: "#f8fafc",
          surface: "#ffffff",
          border: "#e2e8f0",
          muted: "#64748b",
          dark: "#0f172a",
        },
        // Dark palette for the Cortex Home wireframes (/home-a, /home-b)
        cx: {
          // Theme variables (RGB triplets) so Option A can switch dark/light.
          // Defaults in globals.css equal the original dark values.
          bg: "rgb(var(--cx-bg) / <alpha-value>)",
          panel: "rgb(var(--cx-panel) / <alpha-value>)",
          raised: "rgb(var(--cx-raised) / <alpha-value>)",
          hover: "rgb(var(--cx-hover) / <alpha-value>)",
          line: "rgb(var(--cx-line) / <alpha-value>)",
          strong: "rgb(var(--cx-strong) / <alpha-value>)",
          text: "rgb(var(--cx-text) / <alpha-value>)",
          muted: "rgb(var(--cx-muted) / <alpha-value>)",
          faint: "rgb(var(--cx-faint) / <alpha-value>)",
        },
        // Reserved for AI-generated content only — used nowhere else.
        ai: "rgb(var(--ai) / <alpha-value>)",
        status: {
          healthy: "#16a34a",
          moderate: "#eab308",
          attention: "#f97316",
          critical: "#dc2626",
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        plex: ["var(--font-plex-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        data: ["var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        serif: ["var(--font-serif)", "Georgia", "Times New Roman", "serif"],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        card: "0 1px 3px 0 rgba(16, 24, 40, 0.08), 0 1px 2px 0 rgba(16, 24, 40, 0.04)",
        elevated: "0 8px 24px -4px rgba(16, 24, 40, 0.08), 0 4px 8px -4px rgba(16, 24, 40, 0.03)",
        drawer: "-4px 0 24px 0 rgba(16, 24, 40, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
