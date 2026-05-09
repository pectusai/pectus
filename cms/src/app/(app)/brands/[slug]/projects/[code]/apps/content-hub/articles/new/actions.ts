"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/active-brand";
import { createServiceClient } from "@pectus/supabase";
import { slugify } from "@/lib/slugify";
import { structuredCall } from "@/lib/insights/structured-call";
import { ArticleDraftSchema, type ArticleDraft } from "@/lib/insights/schemas";

export type BlankResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export async function createBlankArticle(
  _prev: BlankResult | null,
  formData: FormData,
): Promise<BlankResult> {
  const brandSlug = String(formData.get("brand_slug") ?? "");
  const code = String(formData.get("code") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!brandSlug || !code) return { ok: false, error: "Missing project context." };
  if (!title) return { ok: false, error: "Give it a working title first." };

  const brand = await getBrandBySlug(brandSlug);
  const { supabase, user } = await requireUser();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("brand_id", brand.id)
    .eq("code", code)
    .maybeSingle();
  if (!project) return { ok: false, error: `Project ${code} not found.` };

  let slug = slugify(title) || `article-${Date.now()}`;
  const { data: existing } = await supabase
    .from("articles")
    .select("id")
    .eq("project_id", project.id)
    .eq("slug", slug)
    .maybeSingle();
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const { error: insertErr } = await supabase.from("articles").insert({
    project_id: project.id,
    slug,
    title,
    description: null,
    category: null,
    blocks: [],
    word_count: 0,
    status: "draft",
    source: "manual",
    created_by: user.id,
  });
  if (insertErr) {
    return { ok: false, error: `Couldn't create draft: ${insertErr.message}` };
  }

  revalidatePath(
    `/brands/${brandSlug}/projects/${code}/apps/content-hub/articles`,
  );
  redirect(
    `/brands/${brandSlug}/projects/${code}/apps/content-hub/articles/${slug}`,
  );
}

const ARTICLE_MODEL = "claude-sonnet-4-6";
const ARTICLE_MAX_TOKENS = 8192;

function buildArticleSystemPrompt(args: {
  voice: string | null;
  tonality: string | null;
  guidelines: string | null;
  personaText: string;
  painpointText: string;
  notes: string | null;
  hasKeyword: boolean;
}): string {
  const parts: string[] = [
    "You are a senior content writer producing an on-brand blog post.",
    "Return a single JSON object matching the provided schema. No prose outside JSON.",
    "",
    `BRAND VOICE:\n${args.voice ?? "(not set — write in a direct, warm, confident human voice, never corporate)"}`,
    "",
    `BRAND TONALITY:\n${args.tonality ?? "(not set — default to helpful and specific)"}`,
  ];
  if (args.guidelines) parts.push("", `BRAND GUIDELINES:\n${args.guidelines}`);
  parts.push("", `TARGET AUDIENCE (ICP):\n${args.personaText}`);
  parts.push("", `Painpoints to draw from:\n${args.painpointText}`);
  if (args.notes) parts.push("", `ICP notes:\n${args.notes}`);
  parts.push(
    "",
    "RULES:",
    "- Lead with the reader's problem in the opening paragraph. No preamble.",
    "- 4 to 6 h2 sections. Each h2 has 1 or 2 p blocks beneath it.",
    "- Concrete examples over abstract claims.",
  );
  if (args.hasKeyword) {
    parts.push("- Target the keyword naturally. No stuffing.");
  }
  parts.push(
    "- End with a short, actionable takeaway paragraph.",
    "- Avoid em dashes and en dashes. Restructure the sentence instead.",
  );
  return parts.join("\n");
}

function buildArticleUserPrompt(args: {
  keyword: string | null;
  purpose: string | null;
  brief: string | null;
  angle: string | null;
  references: string[];
}): string {
  const parts: string[] = [];
  if (args.keyword) parts.push(`TARGET KEYWORD OR TOPIC: ${args.keyword}`);
  if (args.purpose) parts.push(`PURPOSE: ${args.purpose}`);
  if (args.brief) parts.push(`BRIEF:\n${args.brief}`);
  if (args.angle) parts.push(`ANGLE: ${args.angle}`);
  if (args.references.length) {
    parts.push(
      `REFERENCE ARTICLES (match tone, style, or draw from the framing):\n${args.references.map((u) => `- ${u}`).join("\n")}`,
    );
  }
  parts.push("Generate the article now.");
  return parts.join("\n\n");
}

function blocksToWordCount(blocks: ArticleDraft["blocks"]): number {
  return blocks
    .filter((b) => b.type === "p")
    .map((b) => b.text.trim().split(/\s+/).filter(Boolean).length)
    .reduce((a, b) => a + b, 0);
}

export type GenerateResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export async function generateArticle(
  _prev: GenerateResult | null,
  formData: FormData,
): Promise<GenerateResult> {
  const brandSlug = String(formData.get("brand_slug") ?? "");
  const code = String(formData.get("code") ?? "");
  const keyword = (String(formData.get("keyword") ?? "")).trim() || null;
  const purpose = (String(formData.get("purpose") ?? "")).trim() || null;
  const brief = (String(formData.get("brief") ?? "")).trim() || null;
  const angle = (String(formData.get("angle") ?? "")).trim() || null;
  const persona = (String(formData.get("persona") ?? "")).trim() || null;
  const referencesRaw = String(formData.get("references") ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!brandSlug || !code) {
    return { ok: false, error: "Missing project context." };
  }
  if (!brief && !purpose && !keyword) {
    return {
      ok: false,
      error: "Give it a brief, a purpose, or a target keyword to work from.",
    };
  }

  const { user } = await requireUser();
  const brand = await getBrandBySlug(brandSlug);
  const supabase = createServiceClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("brand_id", brand.id)
    .eq("code", code)
    .maybeSingle();
  if (!project) return { ok: false, error: `Project ${code} not found.` };

  const [brandRow, icpRow] = await Promise.all([
    supabase
      .from("brands")
      .select("voice, tonality, guidelines_md")
      .eq("id", brand.id)
      .single(),
    supabase
      .from("icp_profiles")
      .select("personas, painpoints, notes")
      .eq("project_id", project.id)
      .maybeSingle(),
  ]);

  const personas = (icpRow.data?.personas as Array<{
    name?: string;
    role?: string;
    description?: string;
  }> | undefined) ?? [];
  const painpoints = (icpRow.data?.painpoints as Array<{
    title?: string;
    description?: string;
  }> | undefined) ?? [];

  const chosenPersona = persona
    ? personas.find(
        (p) =>
          (p.name ?? "").toLowerCase() === persona.toLowerCase() ||
          (p.role ?? "").toLowerCase() === persona.toLowerCase(),
      )
    : null;
  const personaText = chosenPersona
    ? `${chosenPersona.name ?? ""}${chosenPersona.role ? ` — ${chosenPersona.role}` : ""}${chosenPersona.description ? `\n${chosenPersona.description}` : ""}`
    : personas.length
      ? personas
          .map((p, i) =>
            `${i + 1}. ${p.name ?? "(unnamed)"}${
              p.role ? ` — ${p.role}` : ""
            }${p.description ? `\n   ${p.description}` : ""}`,
          )
          .join("\n")
      : "(no personas defined — write to anyone responsible for hiring at a small to mid-market company)";

  const painpointText = painpoints.length
    ? painpoints
        .map((p) => `- ${p.title ?? "(untitled)"}${p.description ? `: ${p.description}` : ""}`)
        .join("\n")
    : "(no painpoints defined)";

  const systemPrompt = buildArticleSystemPrompt({
    voice: brandRow.data?.voice ?? null,
    tonality: brandRow.data?.tonality ?? null,
    guidelines: brandRow.data?.guidelines_md ?? null,
    personaText,
    painpointText,
    notes: icpRow.data?.notes ?? null,
    hasKeyword: !!keyword,
  });
  const userPrompt = buildArticleUserPrompt({
    keyword,
    purpose,
    brief,
    angle,
    references: referencesRaw,
  });

  let draft: ArticleDraft;
  try {
    const result = await structuredCall<ArticleDraft>({
      model: ARTICLE_MODEL,
      maxTokens: ARTICLE_MAX_TOKENS,
      systemBlocks: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      userText: userPrompt,
      schema: ArticleDraftSchema,
      toolName: "emit_article",
      toolDescription: "Emit the structured article draft.",
    });
    draft = result.data;
  } catch (e) {
    return {
      ok: false,
      error: `Generation failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  let slug = slugify(draft.title) || `article-${Date.now()}`;
  const { data: existing } = await supabase
    .from("articles")
    .select("id")
    .eq("project_id", project.id)
    .eq("slug", slug)
    .maybeSingle();
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const wordCount = blocksToWordCount(draft.blocks);

  const { error: insertErr } = await supabase.from("articles").insert({
    project_id: project.id,
    slug,
    title: draft.title,
    description: draft.description,
    category: draft.category,
    blocks: draft.blocks,
    word_count: wordCount,
    status: "draft",
    source: `generated:${ARTICLE_MODEL}`,
    created_by: user.id,
  });
  if (insertErr) {
    return {
      ok: false,
      error: `Couldn't save the generated draft: ${insertErr.message}`,
    };
  }

  revalidatePath(
    `/brands/${brandSlug}/projects/${code}/apps/content-hub/articles`,
  );
  redirect(
    `/brands/${brandSlug}/projects/${code}/apps/content-hub/articles/${slug}`,
  );
}
