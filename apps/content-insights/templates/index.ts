/* Template registry. The CMS imports this to render the template chooser
 * during the Create Page flow.
 *
 * To add a template:
 * 1. Create apps/content-insights/templates/pages/<name>/ with manifest.json,
 *    Render.astro, and thumbnail.png.
 * 2. Add an entry below.
 */

import type { PageBlock } from "../src/components/blocks/types";

import home from "./pages/home/manifest.json";
import pillar from "./pages/pillar/manifest.json";
import content from "./pages/content/manifest.json";
import landing from "./pages/landing/manifest.json";
import listing from "./pages/listing/manifest.json";
import contact from "./pages/contact/manifest.json";
import about from "./pages/about/manifest.json";

export type PagePurpose =
  | "home"
  | "content"
  | "landing"
  | "listing"
  | "contact"
  | "about";

export type TemplateManifest = {
  id: string;
  name: string;
  purpose: PagePurpose;
  description: string;
  thumbnail: string;
  default_blocks: PageBlock[];
};

/* JSON imports come back with widened types ('string' instead of literal
 * unions). Cast through unknown to apply the precise TemplateManifest type. */
const raw: Record<string, TemplateManifest> = {
  home: { ...(home as unknown as TemplateManifest), id: "home" },
  pillar: { ...(pillar as unknown as TemplateManifest), id: "pillar" },
  content: { ...(content as unknown as TemplateManifest), id: "content" },
  landing: { ...(landing as unknown as TemplateManifest), id: "landing" },
  listing: { ...(listing as unknown as TemplateManifest), id: "listing" },
  contact: { ...(contact as unknown as TemplateManifest), id: "contact" },
  about: { ...(about as unknown as TemplateManifest), id: "about" },
};

export const templates: TemplateManifest[] = Object.values(raw);
export const templatesById: Record<string, TemplateManifest> = raw;

export function getTemplate(id: string): TemplateManifest | null {
  return templatesById[id] ?? null;
}

export function templatesByPurpose(purpose: PagePurpose): TemplateManifest[] {
  return templates.filter((t) => t.purpose === purpose);
}
