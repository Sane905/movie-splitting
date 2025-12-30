import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["\"Space Grotesk\"", "sans-serif"],
        body: ["\"IBM Plex Sans\"", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        "float-slow": "float-slow 12s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
