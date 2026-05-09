"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@pectus/supabase";
import { requireAdmin } from "@/lib/auth";
import { structuredCall } from "./structured-call";
import {
  AnalysisStage1,
  AnalysisStage2,
  type AnalysisStage1 as Stage1Type,
  type AnalysisStage2 as Stage2Type,
} from "./schemas";

const STAGE_1_MODEL = "claude-opus-4-7";
const STAGE_2_MODEL = "claude-opus-4-7";
const STAGE_1_MAX_TOKENS = 5000;
const STAGE_2_MAX_TOKENS = 4000;

type Supabase = ReturnType<typeof createServiceClient>;

type SnapshotInputs = {
  keywords: number;
  articles: number;
  atp: number;
  ga4_active: boolean;
  gsc_active: boolean;
};

async function gatherSnapshotInputs(
  supabase: Supabase,
  projectId: string,
): Promise<SnapshotInputs> {
  const [k, a, t, ga4Row, gscRow] = await Promise.all([
    supabase
      .from("keywords")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    supabase
      .from("answer_public_entries")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    supabase
      .from("activated_apps")
      .select("status")
      .eq("project_id", projectId)
      .eq("app_name", "ga4")
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("activated_apps")
      .select("status")
      .eq("project_id", projectId)
      .eq("app_name", "gsc")
      .eq("status", "active")
      .maybeSingle(),
  ]);
  return {
    keywords: k.count ?? 0,
    articles: a.count ?? 0,
    atp: t.count ?? 0,
    ga4_active: !!ga4Row.data,
    gsc_active: !!gscRow.data,
  };
}

type ContextLines = {
  brandText: string;
  projectName: string;
  brandName: string;
  icpText: string;
  keywordLines: string[];
  articleLines: string[];
  atpLines: string[];
};

async function gatherInterpretContext(
  supabase: Supabase,
  projectId: string,
): Promise<ContextLines> {
  const project = await supabase
    .from("projects")
    .select("id, name, brand_id")
    .eq("id", projectId)
    .single();
  if (!project.data) throw new Error("Project not found.");
  const brandId = project.data.brand_id as string;

  const [brand, icp, keywords, articles, atp] = await Promise.all([
    supabase
      .from("brands")
      .select("name, voice, tonality, guidelines_md")
      .eq("id", brandId)
      .single(),
    supabase
      .from("icp_profiles")
      .select("personas, painpoints, notes")
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("keywords")
      .select("keyword, search_volume, current_rank, intent, metadata")
      .eq("project_id", projectId)
      .order("search_volume", { ascending: false, nullsFirst: false })
      .limit(200),
    supabase
      .from("articles")
      .select("title, category, date_published, word_count")
      .eq("project_id", projectId)
      .order("date_published", { ascending: false, nullsFirst: false })
      .limit(500),
    supabase
      .from("answer_public_entries")
      .select("seed_keyword, tab, text")
      .eq("project_id", projectId)
      .limit(500),
  ]);

  const brandRow = brand.data as
    | {
        name: string;
        voice: string | null;
        tonality: string | null;
        guidelines_md: string | null;
      }
    | null;
  const brandText =
    [
      brandRow?.voice ? `VOICE:\n${brandRow.voice}` : null,
      brandRow?.tonality ? `TONALITY:\n${brandRow.tonality}` : null,
      brandRow?.guidelines_md
        ? `GUIDELINES:\n${brandRow.guidelines_md}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n") || "(brand voice not set)";

  const icpRow = icp.data as
    | {
        personas: unknown;
        painpoints: unknown;
        notes: string | null;
      }
    | null;
  const personas = (icpRow?.personas as Array<{
    name?: string;
    role?: string;
    description?: string;
  }> | undefined) ?? [];
  const painpoints = (icpRow?.painpoints as Array<{
    title?: string;
    description?: string;
  }> | undefined) ?? [];
  const personaText = personas.length
    ? personas
        .map((p, i) =>
          `${i + 1}. ${p.name ?? "(unnamed)"}${
            p.role ? ` — ${p.role}` : ""
          }${p.description ? `\n   ${p.description}` : ""}`,
        )
        .join("\n")
    : "(no personas defined)";
  const painpointText = painpoints.length
    ? painpoints
        .map((p) => `- ${p.title ?? "(untitled)"}${
          p.description ? `: ${p.description}` : ""
        }`)
        .join("\n")
    : "(no painpoints defined)";
  const icpText = `Personas:\n${personaText}\n\nPainpoints:\n${painpointText}${
    icpRow?.notes ? `\n\nNotes:\n${icpRow.notes}` : ""
  }`;

  const keywordLines = (keywords.data ?? []).map((k) => {
    const md = (k.metadata ?? {}) as Record<string, unknown>;
    const impr = md.gsc_impressions ?? "?";
    const clicks = md.gsc_clicks ?? "?";
    const pos = md.gsc_position ?? k.current_rank ?? "?";
    return `"${k.keyword}" · vol=${k.search_volume ?? "?"} · gsc_impr=${impr} · gsc_clicks=${clicks} · pos=${pos}`;
  });

  const articleLines = (articles.data ?? []).map(
    (a) =>
      `"${a.title}" · ${a.category ?? "?"} · ${a.date_published ?? "?"} · ${a.word_count ?? "?"}w`,
  );

  const atpBySeed = new Map<string, Map<string, string[]>>();
  for (const entry of atp.data ?? []) {
    const seed = (entry.seed_keyword as string) ?? "";
    const tab = (entry.tab as string) ?? "";
    const text = (entry.text as string) ?? "";
    if (!atpBySeed.has(seed)) atpBySeed.set(seed, new Map());
    const tabMap = atpBySeed.get(seed)!;
    if (!tabMap.has(tab)) tabMap.set(tab, []);
    tabMap.get(tab)!.push(text);
  }
  const atpLines: string[] = [];
  for (const [seed, tabMap] of atpBySeed) {
    const tabsBlock = [...tabMap.entries()]
      .map(
        ([tab, texts]) =>
          `  ${tab}: ${texts.slice(0, 8).join(" · ")}`,
      )
      .join("\n");
    atpLines.push(`${seed}:\n${tabsBlock}`);
  }

  return {
    brandText,
    projectName: project.data.name as string,
    brandName: brandRow?.name ?? "the brand",
    icpText,
    keywordLines,
    articleLines,
    atpLines,
  };
}

function buildStage1Prompt(ctx: ContextLines): string {
  return `You are a senior SEO analyst reading this week's data for ${ctx.brandName} → ${ctx.projectName}.

BRAND CONTEXT
${ctx.brandText}

ICP
${ctx.icpText}

KEYWORDS (top 200 by volume, last 90d GSC where available)
${ctx.keywordLines.length ? ctx.keywordLines.join("\n") : "(no keywords)"}

EXISTING ARTICLES (title · category · published · words)
${ctx.articleLines.length ? ctx.articleLines.join("\n") : "(no articles)"}

ANSWER-THE-PUBLIC ENTRIES (verbatim audience questions, by seed keyword)
${ctx.atpLines.length ? ctx.atpLines.join("\n\n") : "(no ATP entries)"}

YOUR JOB
Produce the data-interpretation half of this week's analysis. You are NOT producing post suggestions yet — that's a separate downstream call. Focus exclusively on what the data says:

1. Summary: 3-5 sentences framing the week. What changed in search? Where is the biggest opportunity? Which ICP to target?
2. Rising keywords: keywords with growing impressions but poor rank (avg position > 10) or zero clicks. The sweet spot.
3. Old posts gaining traffic: existing articles where data suggests rising relevance. Refresh / expansion opportunities.
4. Keyword clusters: group keywords into topical clusters with dominant intent and a pillar-page recommendation.
5. Suggested new categories: topics not yet covered as site categories but emerging in the data. Spot the next "AI" before it's obvious.
6. Suggested negatives: keywords to deprioritise because they pull the wrong audience, wrong intent, or pollute data.

Be specific. Reference the actual keywords and articles shown above. If data is thin, say so inside the rationale rather than inventing.`;
}

function buildStage2Prompt(
  ctx: ContextLines,
  stage1: Stage1Type,
  alreadySuggestedTitles: string[],
): string {
  const stage1Block = JSON.stringify(stage1, null, 2);
  const alreadySuggestedBlock = alreadySuggestedTitles.length
    ? `\nALREADY SUGGESTED THIS CYCLE (do not repeat or reword these — pick genuinely different angles):\n${alreadySuggestedTitles.map((t) => `- "${t}"`).join("\n")}\n`
    : "";

  const overlapHint = alreadySuggestedTitles.length
    ? " Pick angles that don't overlap with the ALREADY SUGGESTED list above — different topics, different intents, different personas where possible."
    : "";

  return `You are a senior content strategist. The data interpretation has already been done — you are reading those findings and the workspace data, and producing this week's action plan.

BRAND CONTEXT
${ctx.brandText}

ICP
${ctx.icpText}

STAGE 1 FINDINGS (already-produced data interpretation — reference these by name in your rationales)
${stage1Block}

KEYWORDS (top by volume, last 90d GSC where available)
${ctx.keywordLines.length ? ctx.keywordLines.join("\n") : "(no keywords)"}

EXISTING ARTICLES (title · category · published · words)
${ctx.articleLines.length ? ctx.articleLines.join("\n") : "(no articles)"}
${alreadySuggestedBlock}
YOUR JOB
Produce the action-plan half of this week's analysis:

1. EXACTLY 5 prioritised post suggestions with concrete titles, angle, primary + supporting keywords, target persona, content type, projected monthly traffic if ranked top 5, and a sharp rationale that references the Stage 1 findings (cluster names, rising keywords, etc.) by name.${overlapHint}
2. Suggested articles ranked by traffic potential if published and ranked in the top 5. Use impressions × a realistic CTR for positions 1-5 when reasoning.

Be specific. Each post suggestion should connect explicitly to a cluster, rising keyword, or content gap from Stage 1. If the data is thin, say so in the rationale.`;
}

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function runFullAnalysis(
  projectId: string,
): Promise<ActionResult<{ generationId: string }>> {
  await requireAdmin();
  const supabase = createServiceClient();

  // ── Stage 0: snapshot ──────────────────────────────────────────────────
  const snapshotStarted = Date.now();
  const inputs = await gatherSnapshotInputs(supabase, projectId);
  const { data: snapshotRow, error: snapshotErr } = await supabase
    .from("data_snapshots")
    .insert({
      project_id: projectId,
      status: "done",
      sources: {
        keywords: inputs.keywords,
        articles: inputs.articles,
        atp: inputs.atp,
        ga4_active: inputs.ga4_active,
        gsc_active: inputs.gsc_active,
      },
      duration_ms: Date.now() - snapshotStarted,
    })
    .select("id")
    .single();
  if (snapshotErr || !snapshotRow) {
    return {
      ok: false,
      error: `Snapshot failed: ${snapshotErr?.message ?? "no row"}`,
    };
  }
  const snapshotId = snapshotRow.id as string;

  // ── Stage 1: interpretation ────────────────────────────────────────────
  const interp = await supabase
    .from("data_interpretations")
    .insert({
      project_id: projectId,
      snapshot_id: snapshotId,
      status: "running",
    })
    .select("id")
    .single();
  if (interp.error || !interp.data) {
    return {
      ok: false,
      error: `Could not open interpretation row: ${interp.error?.message}`,
    };
  }
  const interpId = interp.data.id as string;

  let stage1: Stage1Type;
  try {
    const ctx = await gatherInterpretContext(supabase, projectId);
    const result = await structuredCall<Stage1Type>({
      model: STAGE_1_MODEL,
      maxTokens: STAGE_1_MAX_TOKENS,
      systemBlocks: [
        {
          type: "text",
          text:
            "You are reading data and producing a structured interpretation. Return only the structured tool call. No prose outside it.",
          cache_control: { type: "ephemeral" },
        },
      ],
      userText: buildStage1Prompt(ctx),
      schema: AnalysisStage1,
      toolName: "emit_interpretation",
      toolDescription: "Emit the data interpretation in the schema shape.",
    });
    stage1 = result.data;
    await supabase
      .from("data_interpretations")
      .update({
        status: "done",
        interpretation: stage1,
        duration_ms: result.durationMs,
      })
      .eq("id", interpId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("data_interpretations")
      .update({ status: "failed", error_message: msg })
      .eq("id", interpId);
    return { ok: false, error: `Stage 1 failed: ${msg}` };
  }

  // ── Stage 2: idea generation ───────────────────────────────────────────
  const gen = await supabase
    .from("idea_generations")
    .insert({
      project_id: projectId,
      interpretation_id: interpId,
      status: "running",
    })
    .select("id")
    .single();
  if (gen.error || !gen.data) {
    return {
      ok: false,
      error: `Could not open generation row: ${gen.error?.message}`,
    };
  }
  const generationId = gen.data.id as string;

  try {
    const ctx = await gatherInterpretContext(supabase, projectId);
    const result = await structuredCall<Stage2Type>({
      model: STAGE_2_MODEL,
      maxTokens: STAGE_2_MAX_TOKENS,
      systemBlocks: [
        {
          type: "text",
          text:
            "You are reading findings and producing a ranked action plan. Return only the structured tool call. No prose outside it.",
          cache_control: { type: "ephemeral" },
        },
      ],
      userText: buildStage2Prompt(ctx, stage1, []),
      schema: AnalysisStage2,
      toolName: "emit_ideas",
      toolDescription: "Emit the post suggestions in the schema shape.",
    });
    await supabase
      .from("idea_generations")
      .update({
        status: "done",
        ideas: result.data,
        duration_ms: result.durationMs,
      })
      .eq("id", generationId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("idea_generations")
      .update({ status: "failed", error_message: msg })
      .eq("id", generationId);
    return { ok: false, error: `Stage 2 failed: ${msg}` };
  }

  revalidatePath(
    `/brands/[slug]/projects/[code]/apps/content-hub/insights`,
    "page",
  );
  return { ok: true, data: { generationId } };
}

export async function renewIdeas(
  projectId: string,
): Promise<ActionResult<{ generationId: string }>> {
  await requireAdmin();
  const supabase = createServiceClient();

  const { data: latestInterp } = await supabase
    .from("data_interpretations")
    .select("id, interpretation")
    .eq("project_id", projectId)
    .eq("status", "done")
    .order("interpreted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latestInterp) {
    return {
      ok: false,
      error: "No interpretation found. Run a full analysis first.",
    };
  }
  const interpId = latestInterp.id as string;
  const stage1 = latestInterp.interpretation as Stage1Type;

  const { data: priorRows } = await supabase
    .from("idea_generations")
    .select("ideas")
    .eq("interpretation_id", interpId)
    .eq("status", "done");
  const priorTitles: string[] = [];
  for (const row of priorRows ?? []) {
    const ideas = row.ideas as Stage2Type | null;
    if (!ideas?.post_suggestions) continue;
    for (const p of ideas.post_suggestions) priorTitles.push(p.title);
  }

  const gen = await supabase
    .from("idea_generations")
    .insert({
      project_id: projectId,
      interpretation_id: interpId,
      status: "running",
    })
    .select("id")
    .single();
  if (gen.error || !gen.data) {
    return {
      ok: false,
      error: `Could not open generation row: ${gen.error?.message}`,
    };
  }
  const generationId = gen.data.id as string;

  try {
    const ctx = await gatherInterpretContext(supabase, projectId);
    const result = await structuredCall<Stage2Type>({
      model: STAGE_2_MODEL,
      maxTokens: STAGE_2_MAX_TOKENS,
      systemBlocks: [
        {
          type: "text",
          text:
            "You are reading findings and producing a ranked action plan. Return only the structured tool call. No prose outside it.",
          cache_control: { type: "ephemeral" },
        },
      ],
      userText: buildStage2Prompt(ctx, stage1, priorTitles),
      schema: AnalysisStage2,
      toolName: "emit_ideas",
      toolDescription: "Emit the post suggestions in the schema shape.",
    });
    await supabase
      .from("idea_generations")
      .update({
        status: "done",
        ideas: result.data,
        duration_ms: result.durationMs,
      })
      .eq("id", generationId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("idea_generations")
      .update({ status: "failed", error_message: msg })
      .eq("id", generationId);
    return { ok: false, error: `Stage 2 failed: ${msg}` };
  }

  revalidatePath(
    `/brands/[slug]/projects/[code]/apps/content-hub/insights`,
    "page",
  );
  return { ok: true, data: { generationId } };
}

export async function dismissIdea(
  projectId: string,
  generationId: string,
  postIndex: number,
): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from("idea_post_dismissals").upsert(
    {
      project_id: projectId,
      generation_id: generationId,
      post_index: postIndex,
      dismissed_by: user.id,
    },
    { onConflict: "project_id,generation_id,post_index" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function undismissIdea(
  projectId: string,
  generationId: string,
  postIndex: number,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("idea_post_dismissals")
    .delete()
    .eq("project_id", projectId)
    .eq("generation_id", generationId)
    .eq("post_index", postIndex);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
