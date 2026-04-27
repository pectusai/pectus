import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { config as siteConfig } from "./pectus.config";

export default defineConfig({
  site: siteConfig.site.url,
  trailingSlash: "always",
  build: {
    format: "directory",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
