// Tooltip copy for every Brand-page field. One-line "what is this and why does
// it matter" so the form is self-teaching for first-time admins.

export const TOOLTIPS = {
  name: "Your brand name. Used in skill outputs, email signatures, and the public hub.",
  tagline: "One short sentence describing what you do. Shown under your name on hub pages.",
  website_url: "Your live site. Used to fetch your sitemap and link from generated content.",
  sitemap_url: "Your sitemap.xml. Pectus uses it to know what pages exist when planning new ones.",

  accent: "Primary brand color. Buttons, links, key UI accents.",
  surface: "Page background color.",
  text: "Default text color.",
  muted: "Secondary text color, captions, timestamps.",
  border: "Hairline color for cards and dividers.",

  accent_alt:
    "Secondary signature color for duotone brands. Pectus uses this for highlights and pull quotes. Leave blank if your brand is monochromatic.",
  accent_alt_ink:
    "Text color that sits on top of accent_alt. White or near-black depending on contrast.",
  surface_alt: "Secondary background, used for cards and raised panels.",
  surface_inv:
    "Inverted background — dark for light-themed brands, light for dark-themed. Used for marquees and inverted call-outs.",
  ok: "Semantic success color. Skipped if your design system doesn't define it.",
  warn: "Semantic warning color. Skipped if your design system doesn't define it.",
  err: "Semantic error color. Skipped if your design system doesn't define it.",

  voice: "How your brand sounds. Skills read this to match tone in generated content.",
  tonality: "How your voice shifts by context. Playful in blog, sober in legal, etc.",
  guidelines: "Long-form brand reference. Skills consult this for vocabulary and don'ts.",

  font_heading: "Headings. System for native UI feel; Google for branded type.",
  font_body: "Body copy. Usually sans-serif.",
  font_mono:
    "Code, technical content, and deliberate retro/brutalist accents. Falls back to the system mono stack if unset.",

  radius:
    "Corner sharpness across the brand. Sharp = 0px, Default = 6px, Soft = 12px. Affects buttons, cards, and inputs.",

  image_model:
    "Default model used when skills generate brand imagery. Imagen 4 is the safe default.",
} as const;

export type TooltipKey = keyof typeof TOOLTIPS;
