import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";
import { config as siteConfig } from "./pectus.config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* Load env from the canonical Pectus env file (cms/.env.local). The CMS
 * reads this automatically; loading it here lets the Astro preview route
 * reach Supabase without the user maintaining a second .env file. */
const here = path.dirname(fileURLToPath(import.meta.url));
const envCandidates = [
  path.resolve(here, "../../cms/.env.local"),
  path.resolve(here, "../../.env.local"),
  path.resolve(here, ".env.local"),
];
for (const file of envCandidates) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

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
