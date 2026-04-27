import type { NextConfig } from "next";

const config: NextConfig = {
  /* Workspace packages ship .ts source. Next must transpile them. */
  transpilePackages: [
    "@pectus/supabase",
    "@pectus/anthropic",
    "@pectus/google",
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
