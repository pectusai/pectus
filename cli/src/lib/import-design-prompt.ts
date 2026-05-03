// Extraction prompt for the Claude Design importer.
// Lives in its own file so the prompt is reviewable / version-controlled
// independently of the surrounding fetch-and-extract plumbing.

export function buildExtractionPrompt(bundleContents: string): string {
  return `You are extracting a Pectus brand profile from a Claude Design handoff bundle.

The bundle is the user's design exploration. Read it as evidence about who their brand is — colors, fonts, voice, story.

Return ONLY a JSON object matching this schema (use null for any field the bundle does not establish):

{
  "name": string | null,
  "tagline": string | null,
  "voice": string | null,
  "tonality": string | null,
  "guidelines_md": string | null,
  "colors": {
    "accent": "#hex" | null, "surface": "#hex" | null, "text": "#hex" | null,
    "muted": "#hex" | null, "border": "#hex" | null,
    "accent_alt": "#hex" | null, "accent_alt_ink": "#hex" | null,
    "surface_alt": "#hex" | null, "surface_inv": "#hex" | null,
    "ok": "#hex" | null, "warn": "#hex" | null, "err": "#hex" | null
  },
  "fonts": {
    "heading": { "source": "system"|"google", "family": string, "google_url": string | null } | null,
    "body":    { "source": "system"|"google", "family": string, "google_url": string | null } | null,
    "mono":    { "source": "system"|"google", "family": string, "google_url": string | null } | null
  },
  "radius": "sharp" | "default" | "soft" | null
}

MAPPING GUIDANCE:
- accent: the brand's signature color. Often a hot/saturated tone.
- accent_alt: a secondary signature color when the brand uses a duotone (e.g. acid green alongside hot orange). Null if the brand is monochromatic.
- surface: page background. Usually the lightest neutral.
- surface_alt: secondary surface (cards, panels).
- surface_inv: inverted surface (dark on light brands, light on dark).
- text: primary ink.
- muted: tertiary text color.
- border: hairline color.
- ok/warn/err: semantic colors. Null if not in the bundle.
- radius: "sharp" if the design uses 0-2px corners, "default" if 4-8px, "soft" if 12px+.

VOICE/TONALITY GUIDANCE:
- voice: 1-3 sentences capturing how the brand sounds. Pull from the chat transcript's discussion of brand character. Don't invent.
- tonality: 1-3 sentences on context-dependent adjustments. Often implicit; null if not discussed.
- guidelines_md: 100-500 words of long-form brand reference, structured with H2 sections (Voice, Vocabulary, Don'ts) when warranted. Synthesize from the chat. Null if the chat is purely visual.

If a field has no evidence in the bundle, return null. Do not guess.

BUNDLE CONTENTS:
${bundleContents}`;
}
