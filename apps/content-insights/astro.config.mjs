import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";
import { config as siteConfig } from "./pectus.config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPectusEnv } from "../../scripts/load-pectus-env.mjs";

/* Share the canonical Pectus env (cms/.env.local) with the Astro preview
 * runtime, so the user only ever maintains one env file. */
loadPectusEnv({
  appDir: path.dirname(fileURLToPath(import.meta.url)),
});

export default defineConfig({
  site: siteConfig.site.url,
  trailingSlash: "always",
  output: "static",
  adapter: vercel(),
  build: {
    format: "directory",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
