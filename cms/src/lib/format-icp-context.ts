/* Format an ICP profile + brand profile into the kind of context block we
 * paste into prompts. Used by the skill runner. */

export type Persona = {
  name?: string;
  role?: string;
  description?: string;
  industry?: string;
  company_size?: string;
  challenges?: string[];
  goals?: string[];
};

export type Painpoint = {
  title?: string;
  description?: string;
};

export type IcpProfile = {
  personas?: Persona[] | null;
  painpoints?: Painpoint[] | null;
  notes?: string | null;
};

export type BrandProfile = {
  name?: string | null;
  tagline?: string | null;
  voice?: string | null;
  tonality?: string | null;
  guidelines_md?: string | null;
};

export function formatIcpContext(icp: IcpProfile | null | undefined): string {
  if (!icp) return "(no ICP defined yet)";

  const personas = (icp.personas ?? []).filter(
    (p) => p && (p.name || p.role || p.description),
  );
  const painpoints = (icp.painpoints ?? []).filter(
    (p) => p && (p.title || p.description),
  );

  const personaLines = personas.length
    ? personas
        .map((p, i) => {
          const parts: string[] = [];
          parts.push(`Persona ${i + 1}: ${p.name ?? "(unnamed)"}`);
          if (p.role) parts.push(`  Role: ${p.role}`);
          if (p.industry) parts.push(`  Industry: ${p.industry}`);
          if (p.company_size) parts.push(`  Company size: ${p.company_size}`);
          if (p.description) parts.push(`  ${p.description}`);
          if (p.challenges?.length)
            parts.push(`  Challenges: ${p.challenges.join("; ")}`);
          if (p.goals?.length) parts.push(`  Goals: ${p.goals.join("; ")}`);
          return parts.join("\n");
        })
        .join("\n\n")
    : "(no personas)";

  const painLines = painpoints.length
    ? painpoints
        .map((p, i) => {
          const head = `Painpoint ${i + 1}: ${p.title ?? "(untitled)"}`;
          return p.description ? `${head}\n  ${p.description}` : head;
        })
        .join("\n")
    : "(no painpoints)";

  const notes = icp.notes?.trim() ? `Notes:\n${icp.notes.trim()}` : "";

  return [personaLines, painLines, notes].filter(Boolean).join("\n\n");
}

export function formatBrandContext(
  brand: BrandProfile | null | undefined,
  workspaceName?: string,
): string {
  if (!brand) {
    return workspaceName ? `Workspace: ${workspaceName}` : "(no brand profile)";
  }
  const lines: string[] = [];
  if (brand.name || workspaceName)
    lines.push(`Name: ${brand.name ?? workspaceName ?? ""}`);
  if (brand.tagline) lines.push(`Tagline: ${brand.tagline}`);
  if (brand.voice) lines.push(`Voice: ${brand.voice}`);
  if (brand.tonality) lines.push(`Tonality: ${brand.tonality}`);
  if (brand.guidelines_md) lines.push(`Guidelines:\n${brand.guidelines_md}`);
  return lines.join("\n");
}
