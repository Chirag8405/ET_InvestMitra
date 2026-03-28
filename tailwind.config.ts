import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./types/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#111111",
        card: {
          DEFAULT: "#ffffff",
          foreground: "#111111",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#111111",
        },
        primary: {
          DEFAULT: "#000000",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f4f4f5",
          foreground: "#111111",
        },
        muted: {
          DEFAULT: "#e4e4e7",
          foreground: "#52525b",
        },
        accent: {
          DEFAULT: "#d4d4d8",
          foreground: "#18181b",
        },
        destructive: {
          DEFAULT: "#52525b",
          foreground: "#ffffff",
        },
        border: "#d4d4d8",
        input: "#d4d4d8",
        ring: "#71717a",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}

export default config
