"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@pectus/supabase";
import { fetchGa4 } from "@pectus/apps/ga4/fetch";
import { fetchGsc } from "@pectus/apps/gsc/fetch";
import type { ServiceAccountKey } from "@pectus/google/service-account";
import { requireAdmin } from "@/lib/auth";
import { structuredCall } from "./structured-call";
import {
  AnalysisStage1,
  AnalysisStage2,
  type AnalysisStage1 as Stage1Type,
  type AnalysisStage2 as Stage2Type,
} from "./schemas";
import {
  formatGa4ForPrompt,
  gatherGa4,
  type Ga4Gather,
} from "./gather-ga4";
import {
  formatGscDailyForPrompt,
  gatherGscDaily,
  type GscDailyGather,
} from "./gather-gsc-daily";

const STAGE_1_MODEL = "claude-opus-4-7";
const STAGE_2_MODEL = "claude-opus-4-7";
const STAGE_1_MAX_TOKENS = 6000;
const STAGE_2_MAX_TOKENS = 4000;
const AUTO_FETCH_STALE_HOURS = 24;
const GA4_LOOKBACK_DAYS = 30;

type Supabase = ReturnType<typeof createServiceClient>;

type SnapshotInputs = {
  keywords: number;
  articles: number;
  atp: number;
  ga4_active: boolean;
  gsc_active: boolean;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

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
  brandSlug: string;
  icpText: string;
  keywordLines: string[];
  articleLines: string[];
  atpLines: string[];
  ga4: Ga4Gather;
  gscDaily: GscDailyGather;
  freshness: {
    ga4_last: string | null;
    gsc_last: string | null;
  };
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

  const [brand, icp, keywords, articles, atp, ga4, gscDaily, freshness] =
    await Promise.all([
      supabase
        .from("brands")
        .select("name, slug, voice, tonality, guidelines_md")
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
      gatherGa4(supabase, projectId),
      gatherGscDaily(supabase, projectId),
      supabase
        .from("project_data_freshness")
        .select("surface, last_updated_at")
        .eq("project_id", projectId)
        .in("surface", ["ga4", "gsc"]),
    ]);

  const brandRow = brand.data as
    | {
        name: string;
        slug: string;
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

  const freshnessRows = (freshness.data ?? []) as Array<{
    surface: string;
    last_updated_at: string;
  }>;
  const ga4Last =
    freshnessRows.find((r) => r.surface === "ga4")?.last_updated_at ?? null;
  const gscLast =
    freshnessRows.find((r) => r.surface === "gsc")?.last_updated_at ?? null;

  return {
    brandText,
    projectName: project.data.name as string,
    brandName: brandRow?.name ?? "the brand",
    brandSlug: brandRow?.slug ?? "",
    icpText,
    keywordLines,
    articleLines,
    atpLines,
    ga4,
    gscDaily,
    freshness: { ga4_last: ga4Last, gsc_last: gscLast },
  };
}

function buildStage1Prompt(ctx: ContextLines): string {
  const freshnessLine = `GA4 last fetched: ${ctx.freshness.ga4_last ?? "never"}
GSC last fetched: ${ctx.freshness.gsc_last ?? "never"}`;

  return `You are a senior SEO analyst reading this week's data for ${ctx.brandName} → ${ctx.projectName}.

BRAND CONTEXT
${ctx.brandText}

ICP
${ctx.icpText}

DATA FRESHNESS
${freshnessLine}

${formatGa4ForPrompt(ctx.ga4)}

${formatGscDailyForPrompt(ctx.gscDaily)}

KEYWORDS (top 200 by volume, last 28d GSC aggregate where available)
${ctx.keywordLines.length ? ctx.keywordLines.join("\n") : "(no keywords)"}

EXISTING ARTICLES (title · category · published · words)
${ctx.articleLines.length ? ctx.articleLines.join("\n") : "(no articles)"}

ANSWER-THE-PUBLIC ENTRIES (verbatim audience questions, by seed keyword)
${ctx.atpLines.length ? ctx.atpLines.join("\n\n") : "(no ATP entries)"}

YOUR JOB
Produce the data-interpretation half of this week's analysis. You are NOT producing post suggestions yet — that's a separate downstream call. Focus exclusively on what the data says.

**Only \`summary\` is required.** Every other field is optional. Omit any section where the supplied data has nothing to put there — empty arrays or invented content are both worse than a missing field. The summary is where you explain what's actually there and what's missing.

1. Summary (required): 3-5 sentences framing the week. What changed in search and on-site? Where is the biggest opportunity? Which ICP to target? If data is stale, thin, or entirely absent, say so plainly here — that IS the analysis when there's nothing else to read.
2. Traffic source mix (optional): short prose on where GA4 traffic is coming from this period and where the brand should lean. Omit if GA4 data is absent.
3. Weekly query movers (optional): queries with notable week-over-week impression shifts (from the GSC LAST 14 DAYS section). Mix risers and decliners. Each row includes the impressions and position delta plus a one-sentence interpretation. Omit if no daily GSC data.
4. Top performing pages (optional): pages from GA4 already pulling traffic / converting. Defend and expand. Omit if no GA4 page data.
5. Declining pages (optional): pages from GA4 where traffic is slipping (or low-converters worth retiring). Omit if no GA4 page data.
6. Rising keywords (optional): keywords with growing impressions but poor rank (avg position > 10) or zero clicks. The sweet spot. Omit if no keywords have usable signal.
7. Old posts gaining traffic (optional): existing articles where data suggests rising relevance. Tie this to the GSC movers and GA4 top pages above when possible. Omit if no articles or no movement.
8. Keyword clusters (optional): group keywords into topical clusters with dominant intent and a pillar-page recommendation. Omit if there isn't enough keyword data to form meaningful clusters.
9. Suggested new categories (optional): topics not yet covered as site categories but emerging in the data. Spot the next "AI" before it's obvious. Omit if no signal points to one.
10. Suggested negatives (optional): keywords to deprioritise because they pull the wrong audience, wrong intent, or pollute data. Omit if nothing suspicious is in the data.

Be specific. Reference the actual keywords, pages, and queries shown above. Never fabricate.`;
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

KEYWORDS (top by volume, last 28d GSC aggregate where available)
${ctx.keywordLines.length ? ctx.keywordLines.join("\n") : "(no keywords)"}

EXISTING ARTICLES (title · category · published · words)
${ctx.articleLines.length ? ctx.articleLines.join("\n") : "(no articles)"}
${alreadySuggestedBlock}
YOUR JOB
Produce the action-plan half of this week's analysis:

1. EXACTLY 5 prioritised post suggestions with concrete titles, angle, primary + supporting keywords, target persona, content type, projected monthly traffic if ranked top 5, and a sharp rationale that references the Stage 1 findings by name. Lean on top_performing_pages, weekly_query_movers, and rising_keywords when ranking — those are the highest-signal sections.${overlapHint}
2. Suggested articles ranked by traffic potential if published and ranked in the top 5. Use impressions × a realistic CTR for positions 1-5 when reasoning.

Be specific. Each post suggestion should connect explicitly to a cluster, rising keyword, top performing page, or content gap from Stage 1. If the data is thin, say so in the rationale.`;
}

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type AutoFetchResult = {
  ran: boolean;
  source: "ga4" | "gsc";
  ok: boolean;
  error?: string;
};

async function maybeAutoFetchGa4(
  supabase: Supabase,
  projectId: string,
): Promise<AutoFetchResult> {
  const project = await supabase
    .from("projects")
    .select("brand_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project.data) return { ran: false, source: "ga4", ok: false, error: "Project not found." };

  const ga4Active = await supabase
    .from("activated_apps")
    .select("status")
    .eq("project_id", projectId)
    .eq("app_name", "ga4")
    .eq("status", "active")
    .maybeSingle();
  if (!ga4Active.data) return { ran: false, source: "ga4", ok: true };

  const freshness = await supabase
    .from("project_data_freshness")
    .select("last_updated_at")
    .eq("project_id", projectId)
    .eq("surface", "ga4")
    .maybeSingle();
  const last = freshness.data?.last_updated_at as string | undefined;
  if (last) {
    const ageHours = (Date.now() - new Date(last).getTime()) / 3600_000;
    if (ageHours < AUTO_FETCH_STALE_HOURS) {
      return { ran: false, source: "ga4", ok: true };
    }
  }

  const integration = await supabase
    .from("integrations")
    .select("service_account_json, ga4_property_id")
    .eq("brand_id", project.data.brand_id as string)
    .eq("provider", "google")
    .maybeSingle();
  if (
    !integration.data?.service_account_json ||
    !integration.data?.ga4_property_id
  ) {
    return {
      ran: false,
      source: "ga4",
      ok: false,
      error: "GA4 integration not fully configured.",
    };
  }

  const since = isoDate(new Date(Date.now() - GA4_LOOKBACK_DAYS * 24 * 3600 * 1000));
  const until = isoDate(new Date());

  try {
    const result = await fetchGa4({
      projectId,
      propertyId: integration.data.ga4_property_id as string,
      key: integration.data.service_account_json as ServiceAccountKey,
      since,
      until,
    });

    await supabase
      .from("analytics_metrics")
      .delete()
      .eq("project_id", projectId)
      .eq("source", "ga4")
      .gte("date", since)
      .lte("date", until);

    if (result.rows.length > 0) {
      const insertRows = result.rows.map((r) => ({
        project_id: r.project_id,
        source: "ga4",
        date: r.date,
        metric_name: r.metric_name,
        value: r.value,
        dimensions: r.dimensions,
      }));
      const CHUNK = 500;
      for (let i = 0; i < insertRows.length; i += CHUNK) {
        const { error } = await supabase
          .from("analytics_metrics")
          .insert(insertRows.slice(i, i + CHUNK));
        if (error) {
          return {
            ran: true,
            source: "ga4",
            ok: false,
            error: `GA4 insert failed: ${error.message}`,
          };
        }
      }
    }

    await supabase.from("project_data_freshness").upsert(
      {
        project_id: projectId,
        surface: "ga4",
        last_updated_at: new Date().toISOString(),
        source: "ga4",
      },
      { onConflict: "project_id,surface" },
    );
    return { ran: true, source: "ga4", ok: true };
  } catch (err) {
    return {
      ran: true,
      source: "ga4",
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function maybeAutoFetchGsc(
  supabase: Supabase,
  projectId: string,
): Promise<AutoFetchResult> {
  const project = await supabase
    .from("projects")
    .select("brand_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project.data) return { ran: false, source: "gsc", ok: false, error: "Project not found." };

  const gscActive = await supabase
    .from("activated_apps")
    .select("status")
    .eq("project_id", projectId)
    .eq("app_name", "gsc")
    .eq("status", "active")
    .maybeSingle();
  if (!gscActive.data) return { ran: false, source: "gsc", ok: true };

  const freshness = await supabase
    .from("project_data_freshness")
    .select("last_updated_at")
    .eq("project_id", projectId)
    .eq("surface", "gsc")
    .maybeSingle();
  const last = freshness.data?.last_updated_at as string | undefined;
  if (last) {
    const ageHours = (Date.now() - new Date(last).getTime()) / 3600_000;
    if (ageHours < AUTO_FETCH_STALE_HOURS) {
      return { ran: false, source: "gsc", ok: true };
    }
  }

  const integration = await supabase
    .from("integrations")
    .select("service_account_json, gsc_site_url")
    .eq("brand_id", project.data.brand_id as string)
    .eq("provider", "google")
    .maybeSingle();
  if (
    !integration.data?.service_account_json ||
    !integration.data?.gsc_site_url
  ) {
    return {
      ran: false,
      source: "gsc",
      ok: false,
      error: "GSC integration not fully configured.",
    };
  }

  try {
    const result = await fetchGsc({
      projectId,
      siteUrl: integration.data.gsc_site_url as string,
      key: integration.data.service_account_json as ServiceAccountKey,
    });

    if (result.keyword_rows.length > 0) {
      const queries = result.keyword_rows.map((r) => r.query);
      const { data: existing } = await supabase
        .from("keywords")
        .select(
          "keyword, metadata, search_volume, difficulty, intent, cpc, current_rank",
        )
        .eq("project_id", projectId)
        .in("keyword", queries);
      const byKeyword = new Map<string, Record<string, unknown>>();
      for (const row of existing ?? []) {
        byKeyword.set(row.keyword as string, {
          metadata: row.metadata as Record<string, unknown>,
          search_volume: row.search_volume,
          difficulty: row.difficulty,
          intent: row.intent,
          cpc: row.cpc,
          current_rank: row.current_rank,
        });
      }
      const upsertRows = result.keyword_rows.map((r) => {
        const ex = byKeyword.get(r.query);
        const prior = (ex?.metadata as Record<string, unknown> | undefined) ?? {};
        return {
          project_id: projectId,
          keyword: r.query,
          search_volume: ex?.search_volume ?? null,
          difficulty: ex?.difficulty ?? null,
          intent: ex?.intent ?? null,
          cpc: ex?.cpc ?? null,
          current_rank: ex?.current_rank ?? null,
          metadata: {
            ...prior,
            gsc_impressions: r.impressions,
            gsc_clicks: r.clicks,
            gsc_position: r.position,
            gsc_ctr: r.ctr,
            gsc_window_days: r.window_days,
            gsc_updated_at: result.fetched_at,
          },
        };
      });
      const CHUNK = 500;
      for (let i = 0; i < upsertRows.length; i += CHUNK) {
        const { error } = await supabase
          .from("keywords")
          .upsert(upsertRows.slice(i, i + CHUNK), {
            onConflict: "project_id,keyword",
          });
        if (error) {
          return {
            ran: true,
            source: "gsc",
            ok: false,
            error: `GSC keyword upsert failed: ${error.message}`,
          };
        }
      }
    }

    if (result.gsc_daily_rows.length > 0) {
      const dailyUntil = isoDate(new Date());
      const dailySince = isoDate(new Date(Date.now() - 7 * 24 * 3600 * 1000));
      await supabase
        .from("gsc_daily")
        .delete()
        .eq("project_id", projectId)
        .gte("date", dailySince)
        .lte("date", dailyUntil);

      const insertRows = result.gsc_daily_rows.map((r) => ({
        project_id: r.project_id,
        date: r.date,
        query: r.query,
        page: r.page,
        impressions: r.impressions,
        clicks: r.clicks,
        position: r.position,
      }));
      const CHUNK = 500;
      for (let i = 0; i < insertRows.length; i += CHUNK) {
        const { error } = await supabase
          .from("gsc_daily")
          .insert(insertRows.slice(i, i + CHUNK));
        if (error) {
          return {
            ran: true,
            source: "gsc",
            ok: false,
            error: `GSC daily insert failed: ${error.message}`,
          };
        }
      }
    }

    await supabase.from("project_data_freshness").upsert(
      {
        project_id: projectId,
        surface: "gsc",
        last_updated_at: new Date().toISOString(),
        source: "gsc",
      },
      { onConflict: "project_id,surface" },
    );
    return { ran: true, source: "gsc", ok: true };
  } catch (err) {
    return {
      ran: true,
      source: "gsc",
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runAnalyzeOnly(
  projectId: string,
): Promise<ActionResult<{ interpretationId: string }>> {
  await requireAdmin();
  const supabase = createServiceClient();

  const autoFetchResults = await Promise.all([
    maybeAutoFetchGa4(supabase, projectId),
    maybeAutoFetchGsc(supabase, projectId),
  ]);
  const autoFetchErrors = autoFetchResults
    .filter((r) => r.ran && !r.ok)
    .map((r) => `${r.source}: ${r.error ?? "unknown"}`);

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
        auto_fetch_errors: autoFetchErrors,
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
  const interpretationId = interp.data.id as string;

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
    await supabase
      .from("data_interpretations")
      .update({
        status: "done",
        interpretation: result.data,
        duration_ms: result.durationMs,
      })
      .eq("id", interpretationId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("data_interpretations")
      .update({ status: "failed", error_message: msg })
      .eq("id", interpretationId);
    return { ok: false, error: `Stage 1 failed: ${msg}` };
  }

  revalidatePath(
    `/brands/[slug]/projects/[code]/apps/content-insights/insights`,
    "page",
  );
  return { ok: true, data: { interpretationId } };
}

export async function runRecommendOnly(
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
      error: "No interpretation found. Click Analyze first.",
    };
  }
  const interpretationId = latestInterp.id as string;
  const stage1 = latestInterp.interpretation as Stage1Type;

  const gen = await supabase
    .from("idea_generations")
    .insert({
      project_id: projectId,
      interpretation_id: interpretationId,
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
    `/brands/[slug]/projects/[code]/apps/content-insights/insights`,
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
      error: "No interpretation found. Click Analyze first.",
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
    `/brands/[slug]/projects/[code]/apps/content-insights/insights`,
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
