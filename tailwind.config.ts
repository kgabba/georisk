import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mint: {
          50: "#f0f7f4"
        },
        geoblue: {
          DEFAULT: "#2563eb"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 18px 45px rgba(15, 23, 42, 0.15)"
      }
    }
  },
  plugins: []
};

export default config;
