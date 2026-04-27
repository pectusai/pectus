import type { Config } from "tailwindcss";

/* Tailwind v4 reads config primarily through globals.css (@import "tailwindcss"
 * + @theme). This config file exists for editor tooling and to scope content
 * scanning. Tokens live in src/app/globals.css under :root. */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
