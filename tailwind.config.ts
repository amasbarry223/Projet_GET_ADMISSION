import type { Config } from "tailwindcss";

// Tailwind v4: tokens live in src/app/globals.css (@theme block).
// This config is intentionally minimal; tw-animate-css is imported in globals.css.
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {} },
  plugins: [],
};
export default config;
