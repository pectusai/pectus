import path from "node:path";

export function brandsRoot(repo: string): string {
  return path.join(repo, "brands");
}

export function brandDir(repo: string, slug: string): string {
  return path.join(brandsRoot(repo), slug);
}

export function brandJsonPath(repo: string, slug: string): string {
  return path.join(brandDir(repo, slug), "brand.json");
}

export function guidelinesPath(repo: string, slug: string): string {
  return path.join(brandDir(repo, slug), "guidelines.md");
}

export function knowledgeDir(repo: string, slug: string): string {
  return path.join(brandDir(repo, slug), "knowledge");
}

export function knowledgeRawDir(repo: string, slug: string): string {
  return path.join(knowledgeDir(repo, slug), "raw");
}

export function knowledgeInsightsPath(repo: string, slug: string): string {
  return path.join(knowledgeDir(repo, slug), "insights.md");
}

export function referenceImagesDir(repo: string, slug: string): string {
  return path.join(brandDir(repo, slug), "reference-images");
}

export function importsDir(repo: string, slug: string): string {
  return path.join(brandDir(repo, slug), "imports");
}

export function slugify(input: string | null | undefined): string {
  if (!input) return "default";
  const s = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s || "default";
}
