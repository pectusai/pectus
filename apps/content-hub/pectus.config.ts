// Pectus content-hub app configuration.
// Read at build time. Wired to brands/<slug>/brand.json for tokens (selected
// via PECTUS_BRAND_SLUG env, or the first brands/ dir found); copy and
// structure are configured here.

export const config = {
  site: {
    url: "http://localhost:4321",
    name: "Your Hub",
    description: "",
  },
  org: {
    name: "Your Brand",
    url: "https://example.com",
    logo: "/logo.svg",
  },
  // Brand tokens come from brand/brand.json; override here only if you need to.
  tokensOverride: null,
  nav: {
    links: [
      // { label: "Product", href: "/" },
    ],
    cta: { label: "Contact", href: "/contact" },
  },
  footer: {
    columns: [
      // { heading: "Product", links: [{ label: "...", href: "..." }] },
    ],
    cta: { label: "Get in touch", href: "/contact" },
  },
  hero: {
    title: "Insights, ideas, and ways forward",
    intro: "",
    cta: { label: "Read the latest", href: "#articles" },
  },
  articles: {
    typeTabs: ["Articles", "Guides", "Videos"],
    categoryIntroTemplate: "{count} articles on {label}",
  },
} as const;

export type PectusConfig = typeof config;
