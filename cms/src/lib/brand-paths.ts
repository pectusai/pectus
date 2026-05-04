import path from "node:path";

export function repoRoot(): string {
  return path.resolve(process.cwd(), "..");
}

export function brandsRoot(): string {
  return path.join(repoRoot(), "brands");
}

export function brandDir(slug: string): string {
  return path.join(brandsRoot(), slug);
}

export function brandJsonPath(slug: string): string {
  return path.join(brandDir(slug), "brand.json");
}

export function guidelinesPath(slug: string): string {
  return path.join(brandDir(slug), "guidelines.md");
}

export function knowledgeDir(slug: string): string {
  return path.join(brandDir(slug), "knowledge");
}

export function knowledgeRawDir(slug: string): string {
  return path.join(knowledgeDir(slug), "raw");
}

export function knowledgeInsightsPath(slug: string): string {
  return path.join(knowledgeDir(slug), "insights.md");
}

export function referenceImagesDir(slug: string): string {
  return path.join(brandDir(slug), "reference-images");
}

export function importsDir(slug: string): string {
  return path.join(brandDir(slug), "imports");
}
