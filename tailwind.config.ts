import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#06070b",
          900: "#0a0c12",
          850: "#0e1119",
          800: "#12151f",
        },
        glass: {
          border: "rgba(255,255,255,0.08)",
          fill: "rgba(255,255,255,0.04)",
        },
        accent: {
          DEFAULT: "#6d8dff",
          soft: "#8fa6ff",
        },
        customer: "#34d399",
        prospect: "#60a5fa",
        lowfit: "#6b7280",
      },
      fontFamily: {
        sans: ["var(--font-geist)", "-apple-system", "BlinkMacSystemFont", "Inter", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(109,141,255,0.35)",
        "glow-green": "0 0 24px rgba(52,211,153,0.45)",
        glass: "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      backdropBlur: {
        glass: "18px",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.7" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.22,1,0.36,1) infinite",
        "fade-up": "fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "slide-in": "slide-in 0.45s cubic-bezier(0.22,1,0.36,1) both",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.22,1.4,0.36,1)",
      },
    },
  },
  plugins: [],
};

export default config;
