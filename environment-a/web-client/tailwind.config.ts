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
          ink: "#042351",
          logoBlue: "#042351",
          logoYellow: "#F79C05",
          steel: "#24486B",
          mint: "#E4F6F0",
          success: "#16856E",
          sky: "#EDF5FF",
          amber: "#F79C05",
          coral: "#D94A35",
          blueprint: "#476C9B",
          line: "#D7E4F2"
        }
      },
      boxShadow: {
        deck: "0 16px 42px rgba(6, 27, 58, 0.16)",
        soft: "0 8px 24px rgba(6, 27, 58, 0.08)"
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
