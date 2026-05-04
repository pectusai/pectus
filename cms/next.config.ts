import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load .env / .env.local from the repo root (one level up from cms/) so
// the install flow's canonical .env.local at the repo root works without
// a duplicate copy or symlink inside cms/.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvConfig(repoRoot);

const config: NextConfig = {
  /* Project packages ship .ts source. Next must transpile them. */
  transpilePackages: [
    "@pectus/supabase",
    "@pectus/anthropic",
    "@pectus/google",
    "@pectus/github",
    "@pectus/cli",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default config;
