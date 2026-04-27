import type { Block } from "./articles";
import { config } from "../../pectus.config";

const HUB_PATH = "/content-hub";

export function siteBase(site: URL | string): string {
  return (typeof site === "string" ? site : site.href).replace(/\/$/, "");
}

export function hubUrl(site: URL | string): string {
  return `${siteBase(site)}${HUB_PATH}/`;
}

export function articleUrl(site: URL | string, slug: string): string {
  return `${siteBase(site)}${HUB_PATH}/${slug}/`;
}

export function categoryUrl(site: URL | string, slug: string): string {
  return `${siteBase(site)}${HUB_PATH}/${slug}/`;
}

export function plainText(blocks: Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === "p" || b.type === "h2" || b.type === "h3" || b.type === "h4") out.push(b.text);
    else if (b.type === "ul" || b.type === "ol") out.push(b.items.join(" "));
    else if (b.type === "quote") out.push(b.text);
  }
  return out.join("\n").replace(/\s+/g, " ").trim();
}

export function siteName(): string {
  return config.site.name;
}
