// Pectus hub-template configuration.
// Read at build time. Wired to brand/brand.json for tokens; copy and structure are configured here.
//
// This is a placeholder. The full Astro template lands in PR5.

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
