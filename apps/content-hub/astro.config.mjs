import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";
import { config as siteConfig } from "./pectus.config";

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
