import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "Segoe UI", "sans-serif"],
        body: ["IBM Plex Sans", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"]
      },
      colors: {
        brand: {
          ink: "#10202A",
          steel: "#2A4F63",
          mint: "#D4F4E6",
          sky: "#E8F4FF",
          amber: "#F7B267",
          coral: "#E9724C"
        }
      },
      boxShadow: {
        deck: "0 16px 42px rgba(13, 29, 38, 0.14)",
        soft: "0 8px 24px rgba(16, 32, 42, 0.08)"
      },
      keyframes: {
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        "rise-in": "rise-in 320ms ease-out forwards",
        shimmer: "shimmer 2.2s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
