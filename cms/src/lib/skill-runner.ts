import fs from "node:fs/promises";
import path from "node:path";
import type { ZodSchema } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { createServerClient } from "@pectus/supabase";
import { getClaude, DEFAULT_MODEL } from "@pectus/anthropic";
import {
  formatBrandContext,
  formatIcpContext,
  type BrandProfile,
  type IcpProfile,
} from "@/lib/format-icp-context";
import { knowledgeInsightsPath } from "@/lib/brand-paths";
import { skillSchemas } from "@/lib/skill-schemas";
import { InsightBatch, type InsightBatchOutput } from "@/lib/types/insight";

/* ------------------------------------------------------------------------- *
 * Skill runner. Loads a skill folder, gathers inputs, calls Claude, logs.
 * cms/src/lib/skill-runner.ts
 *
 * Two output modes:
 *   - text mode: skill SKILL.md has no `schema:` frontmatter. Returns raw text.
 *   - structured mode: skill declares `schema: ./schema.ts`. Runner looks up
 *     the schema in skill-schemas.ts, forces a tool call shaped like the
 *     schema, parses + validates with Zod, returns the typed object.
 *
 * Status enum matches the migration check constraint:
 *   'running' | 'completed' | 'failed'
 * ------------------------------------------------------------------------- */

export type SkillInput =
  | "project_id"
  | "top_keywords"
  | "recent_articles"
  | "icp_profile"
  | "brand_profile"
  | "knowledge_insights"
  | "answer_public_entries"
  | "last_run"
  | "sitemap"
  | "article_bodies"
  | "topic_clusters"
  | "site_plan_tree"
  | "seed_keywords"
  | "topics"
  | "insights";

export type SkillFrontmatter = {
  name?: string;
  description?: string;
  version?: string;
  inputs?: SkillInput[];
  outputs?: string[];
  schema?: string;
  model?: string;
  max_tokens?: number;
  cache_inputs?: SkillInput[];
};

export type SkillRunOptions = {
  skill: string;
  projectId: string;
  userId?: string;
  /* Override the model declared in frontmatter. */
  model?: string;
  /* Free-form per-invocation arguments injected as a USER ARGS block. */
  args?: Record<string, unknown>;
};

export type SkillRunResultText = {
  ok: true;
  mode: "text";
  output: string;
  runId: string | null;
};

export type SkillRunResultStructured<T = unknown> = {
  ok: true;
  mode: "structured";
  output: T;
  rawOutput: string;
  runId: string | null;
};

export type SkillRunResultError = {
  ok: false;
  error: string;
  runId: string | null;
};

export type SkillRunResult<T = unknown> =
  | SkillRunResultText
  | SkillRunResultStructured<T>
  | SkillRunResultError;

const SKILLS_ROOT = path.resolve(process.cwd(), "..", "skills");
const APPS_ROOT = path.resolve(process.cwd(), "..", "apps");

/* Resolve a skill name to its folder.
 *
 * Names without a "/" → project-level skill at skills/<name>/.
 * Names with a "/" → inbound app interpretation skill at apps/<app>/<sub>/.
 *   E.g. "seed-keywords/insights" → apps/seed-keywords/insights/.
 *
 * The skill-schemas.ts registry uses the same string as the key. */
function resolveSkillDir(skill: string): string {
  if (skill.includes("/")) {
    const [app, ...rest] = skill.split("/");
    return path.join(APPS_ROOT, app, ...rest);
  }
  return path.join(SKILLS_ROOT, skill);
}

/* ------------------------------------------------------------------------- *
 * Frontmatter parser. Local mini-YAML, no extra dep.
 * ------------------------------------------------------------------------- */
function parseFrontmatter(raw: string): {
  meta: SkillFrontmatter;
  body: string;
} {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const block = match[1];
  const body = match[2] ?? "";
  const meta: Record<string, unknown> = {};
  const lines = block.split(/\r?\n/);
  let currentKey: string | null = null;
  let currentList: string[] | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem && currentKey && currentList) {
      currentList.push(listItem[1].trim());
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (kv) {
      const [, key, rawVal] = kv;
      currentKey = key;
      const val = rawVal.trim();
      if (val === "") {
        currentList = [];
        meta[key] = currentList;
      } else {
        currentList = null;
        const stripped = val.replace(/^["'](.*)["']$/, "$1");
        const asNum = Number(stripped);
        meta[key] = stripped !== "" && !Number.isNaN(asNum) && /^[-\d.]+$/.test(stripped)
          ? asNum
          : stripped;
      }
    }
  }

  return { meta: meta as SkillFrontmatter, body };
}

async function expandReferences(
  body: string,
  skillDir: string,
): Promise<string> {
  const directive = /\{\{\s*reference\/([\w./-]+)\s*\}\}/g;
  const matches = [...body.matchAll(directive)];
  if (matches.length === 0) return body;

  let out = body;
  for (const m of matches) {
    const rel = m[1];
    const abs = path.resolve(skillDir, "reference", rel);
    try {
      const contents = await fs.readFile(abs, "utf8");
      out = out.replaceAll(m[0], contents);
    } catch {
      out = out.replaceAll(m[0], `[reference ${rel} not found]`);
    }
  }
  return out;
}

/* ------------------------------------------------------------------------- *
 * Input gatherers. One function per declared input.
 * ------------------------------------------------------------------------- */

type GatheredInput = { label: string; text: string; count: number };
type Supabase = Awaited<ReturnType<typeof createServerClient>>;

async function gatherTopKeywords(
  supabase: Supabase,
  projectId: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("keywords")
    .select("keyword, search_volume, current_rank, intent, metadata")
    .eq("project_id", projectId)
    .order("search_volume", { ascending: false, nullsFirst: false })
    .limit(200);

  const lines = (data ?? []).map((k) => {
    const md = (k.metadata ?? {}) as Record<string, unknown>;
    const impressions = md.gsc_impressions ?? "?";
    const clicks = md.gsc_clicks ?? "?";
    const position = md.gsc_position ?? k.current_rank ?? "?";
    return `- "${k.keyword}" · vol=${k.search_volume ?? "?"} · impressions=${impressions} · clicks=${clicks} · position=${position} · intent=${k.intent ?? "?"}`;
  });
  return {
    label: "TOP KEYWORDS",
    text: lines.length ? lines.join("\n") : "(no keywords imported yet)",
    count: data?.length ?? 0,
  };
}

async function gatherRecentArticles(
  supabase: Supabase,
  projectId: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("articles")
    .select("slug, title, description, category, date_published, word_count, status")
    .eq("project_id", projectId)
    .order("date_published", { ascending: false, nullsFirst: false })
    .limit(500);

  const lines = (data ?? []).map(
    (a) =>
      `- "${a.title}" · cat=${a.category ?? "?"} · published=${a.date_published ?? "?"} · words=${a.word_count ?? "?"} · status=${a.status ?? "?"}`,
  );
  return {
    label: "RECENT ARTICLES",
    text: lines.length ? lines.join("\n") : "(no articles)",
    count: data?.length ?? 0,
  };
}

async function gatherIcpProfile(
  supabase: Supabase,
  projectId: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("icp_profiles")
    .select("personas, painpoints, notes")
    .eq("project_id", projectId)
    .maybeSingle();
  return {
    label: "ICP",
    text: formatIcpContext(data as IcpProfile | null),
    count: data ? 1 : 0,
  };
}

async function gatherBrandProfile(
  supabase: Supabase,
  brandId: string,
  projectName: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("brands")
    .select("name, tagline, voice, tonality, guidelines_md")
    .eq("id", brandId)
    .maybeSingle();
  return {
    label: "BRAND",
    text: formatBrandContext(data as BrandProfile | null, projectName),
    count: data ? 1 : 0,
  };
}

/* Knowledge insights live at brands/<slug>/knowledge/insights.md, written by
 * the knowledge-digest skill from raw files in brands/<slug>/knowledge/raw/. */
async function gatherKnowledgeInsights(
  brandSlug: string,
): Promise<GatheredInput> {
  try {
    const text = await fs.readFile(knowledgeInsightsPath(brandSlug), "utf8");
    if (text.trim()) {
      return {
        label: "KNOWLEDGE INSIGHTS",
        text: text.trim(),
        count: 1,
      };
    }
  } catch {
    /* fall through to empty state */
  }
  return {
    label: "KNOWLEDGE INSIGHTS",
    text: `(no knowledge insights — run knowledge-digest after dropping files into brands/${brandSlug}/knowledge/raw/)`,
    count: 0,
  };
}

async function gatherAnswerPublic(
  supabase: Supabase,
  projectId: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("answer_public_entries")
    .select("seed_keyword, tab, bucket, text")
    .eq("project_id", projectId)
    .limit(2000);

  const lines = (data ?? []).map(
    (r) => `- [${r.tab}${r.bucket ? "/" + r.bucket : ""}] ${r.text}`,
  );
  return {
    label: "ANSWER THE PUBLIC",
    text: lines.length ? lines.join("\n") : "(no AnswerThePublic data)",
    count: data?.length ?? 0,
  };
}

async function gatherLastRun(
  supabase: Supabase,
  projectId: string,
  skillName: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("skill_runs")
    .select("output, model, started_at")
    .eq("project_id", projectId)
    .eq("skill_name", skillName)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    label: "LAST RUN",
    text: data?.output
      ? `(generated ${data.started_at})\n${typeof data.output === "string" ? data.output.slice(0, 4000) : JSON.stringify(data.output).slice(0, 4000)}`
      : "(no previous run)",
    count: data ? 1 : 0,
  };
}

async function gatherSitemap(
  supabase: Supabase,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("content_source_pages")
    .select("url, published_at")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(500);
  const lines = (data ?? []).map(
    (p) => `- ${p.url}${p.published_at ? ` (${p.published_at})` : ""}`,
  );
  return {
    label: "SITEMAP",
    text: lines.length ? lines.join("\n") : "(no sitemap pages on file)",
    count: data?.length ?? 0,
  };
}

/* Articles have `blocks jsonb`, not body_markdown. Derive a plaintext approximation. */
async function gatherArticleBodies(
  supabase: Supabase,
  projectId: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("articles")
    .select("title, blocks")
    .eq("project_id", projectId)
    .limit(20);
  const lines = (data ?? []).map((a) => {
    const blocks = Array.isArray(a.blocks) ? (a.blocks as Array<Record<string, unknown>>) : [];
    const text = blocks
      .map((b) => {
        if (typeof b.text === "string") return b.text;
        if (Array.isArray(b.items)) return (b.items as unknown[]).join(" · ");
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .slice(0, 2000);
    return `--- ${a.title}\n${text}`;
  });
  return {
    label: "ARTICLE BODIES",
    text: lines.length ? lines.join("\n\n") : "(no article bodies)",
    count: data?.length ?? 0,
  };
}

async function gatherTopicClusters(
  supabase: Supabase,
  projectId: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("weekly_analyses")
    .select("analysis, week_start")
    .eq("project_id", projectId)
    .eq("status", "done")
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  const analysis = (data?.analysis ?? null) as { keyword_clusters?: unknown[] } | null;
  const clusters = Array.isArray(analysis?.keyword_clusters)
    ? analysis!.keyword_clusters
    : [];
  return {
    label: "TOPIC CLUSTERS",
    text: clusters.length
      ? `(from week ${data?.week_start})\n${JSON.stringify(clusters, null, 2)}`
      : "(no topic clusters — run weekly-analysis first)",
    count: clusters.length,
  };
}

async function gatherSitePlanTree(
  supabase: Supabase,
  projectId: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("site_plan_nodes")
    .select("id, parent_id, title, intent, suggested_template, suggested_purpose, materialized_path, status")
    .eq("project_id", projectId)
    .order("materialized_path", { ascending: true });
  return {
    label: "EXISTING SITE PLAN",
    text: data && data.length
      ? JSON.stringify(data, null, 2)
      : "(no plan yet)",
    count: data?.length ?? 0,
  };
}

async function gatherSeedKeywords(
  supabase: Supabase,
  projectId: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("seed_keywords")
    .select("keyword")
    .eq("project_id", projectId);
  const lines = (data ?? []).map((k) => `- ${k.keyword}`);
  return {
    label: "SEED KEYWORDS",
    text: lines.length ? lines.join("\n") : "(no seed keywords)",
    count: data?.length ?? 0,
  };
}

async function gatherTopics(
  supabase: Supabase,
  projectId: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("topics")
    .select("id, name, intent, source, status")
    .eq("project_id", projectId);
  return {
    label: "TOPICS",
    text: data && data.length
      ? data.map((t) => `- ${t.name} (${t.intent}, ${t.status}, ${t.source})`).join("\n")
      : "(no topics yet)",
    count: data?.length ?? 0,
  };
}

/* Gather active Insights from every connected app. Grouped by source for the
 * consumer's prompt readability. Filters out expired insights. */
async function gatherInsights(
  supabase: Supabase,
  projectId: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("insights")
    .select(
      "app_id, source, type, title, opportunity, evidence, confidence, topic_hint, related_keywords, related_urls, created_at",
    )
    .eq("project_id", projectId)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) {
    return {
      label: "INSIGHTS",
      text: "(no active insights — connect data sources or add seed keywords to populate)",
      count: 0,
    };
  }

  const bySource = new Map<string, typeof data>();
  for (const i of data) {
    if (!bySource.has(i.source)) bySource.set(i.source, []);
    bySource.get(i.source)!.push(i);
  }

  const lines: string[] = [];
  for (const [source, items] of bySource) {
    lines.push(`### ${source.toUpperCase()} (${items.length})`);
    for (const i of items) {
      const kws = i.related_keywords?.length
        ? ` · keywords: ${i.related_keywords.slice(0, 5).join(", ")}`
        : "";
      const topic = i.topic_hint ? ` · topic: ${i.topic_hint}` : "";
      lines.push(
        `- [${i.type}, ${i.confidence}] ${i.title}\n  → ${i.opportunity}${topic}${kws}`,
      );
    }
    lines.push("");
  }

  return {
    label: "INSIGHTS",
    text: lines.join("\n"),
    count: data.length,
  };
}

/* ------------------------------------------------------------------------- *
 * Public entry.
 * ------------------------------------------------------------------------- */

export async function runSkill<T = unknown>(
  options: SkillRunOptions,
): Promise<SkillRunResult<T>> {
  const { skill, projectId, userId, args } = options;

  let runId: string | null = null;
  const supabase = await createServerClient();

  try {
    const skillDir = resolveSkillDir(skill);
    const skillFile = path.join(skillDir, "SKILL.md");

    let raw: string;
    try {
      raw = await fs.readFile(skillFile, "utf8");
    } catch {
      return {
        ok: false,
        error: `Skill not found at ${skillFile}.`,
        runId,
      };
    }

    const { meta, body } = parseFrontmatter(raw);
    const expandedBody = await expandReferences(body, skillDir);

    const { data: project } = await supabase
      .from("projects")
      .select("id, name, code, locale, brand_id")
      .eq("id", projectId)
      .maybeSingle();

    if (!project) {
      return { ok: false, error: `Project ${projectId} not found.`, runId };
    }

    const { data: brand } = await supabase
      .from("brands")
      .select("id, slug")
      .eq("id", project.brand_id)
      .maybeSingle();

    if (!brand) {
      return {
        ok: false,
        error: `Brand ${project.brand_id} not found for project ${projectId}.`,
        runId,
      };
    }

    const declared = meta.inputs ?? [];
    const gathered: GatheredInput[] = [];
    for (const input of declared) {
      switch (input) {
        case "project_id":
          gathered.push({
            label: "PROJECT",
            text: `id=${project.id}\ncode=${project.code}\nname=${project.name}\nlocale=${project.locale}`,
            count: 1,
          });
          break;
        case "top_keywords":
          gathered.push(await gatherTopKeywords(supabase, project.id));
          break;
        case "recent_articles":
          gathered.push(await gatherRecentArticles(supabase, project.id));
          break;
        case "icp_profile":
          gathered.push(await gatherIcpProfile(supabase, project.id));
          break;
        case "brand_profile":
          gathered.push(await gatherBrandProfile(supabase, brand.id, project.name));
          break;
        case "knowledge_insights":
          gathered.push(await gatherKnowledgeInsights(brand.slug));
          break;
        case "answer_public_entries":
          gathered.push(await gatherAnswerPublic(supabase, project.id));
          break;
        case "last_run":
          gathered.push(await gatherLastRun(supabase, project.id, skill));
          break;
        case "sitemap":
          gathered.push(await gatherSitemap(supabase));
          break;
        case "article_bodies":
          gathered.push(await gatherArticleBodies(supabase, project.id));
          break;
        case "topic_clusters":
          gathered.push(await gatherTopicClusters(supabase, project.id));
          break;
        case "site_plan_tree":
          gathered.push(await gatherSitePlanTree(supabase, project.id));
          break;
        case "seed_keywords":
          gathered.push(await gatherSeedKeywords(supabase, project.id));
          break;
        case "topics":
          gathered.push(await gatherTopics(supabase, project.id));
          break;
        case "insights":
          gathered.push(await gatherInsights(supabase, project.id));
          break;
        default:
          gathered.push({
            label: String(input).toUpperCase(),
            text: `(unknown input "${input}")`,
            count: 0,
          });
      }
    }

    if (args && Object.keys(args).length) {
      gathered.push({
        label: "USER ARGS",
        text: JSON.stringify(args, null, 2),
        count: 1,
      });
    }

    const inputDigest: Record<string, number> = {};
    for (const g of gathered) {
      inputDigest[g.label.toLowerCase().replace(/\s+/g, "_")] = g.count;
    }

    /* Split inputs into a cacheable layer (stable across runs) and a volatile
     * layer. The cacheable half gets cache_control: ephemeral so successive
     * runs in the same week reuse the input tokens. SkillFrontmatter exposes
     * `cache_inputs` for per-skill overrides; not yet wired up. */
    const cacheableLabels = new Set(["BRAND", "ICP", "KNOWLEDGE INSIGHTS"]);
    const stable = gathered.filter((g) => cacheableLabels.has(g.label));
    const volatile = gathered.filter((g) => !cacheableLabels.has(g.label));
    const stableText = stable
      .map((g) => `## ${g.label}\n\n${g.text}`)
      .join("\n\n");
    const volatileText =
      volatile
        .map((g) => `## ${g.label}\n\n${g.text}`)
        .join("\n\n") || "(no volatile inputs)";

    /* Pre-insert a "running" row for correlation. */
    const model = options.model ?? meta.model ?? DEFAULT_MODEL;
    const { data: insertedRun } = await supabase
      .from("skill_runs")
      .insert({
        skill_name: skill,
        project_id: project.id,
        generated_by: userId ?? null,
        status: "running",
        model,
        input_digest: inputDigest,
      })
      .select("id")
      .single();
    runId = insertedRun?.id ?? null;

    const claude = getClaude();
    const startedAt = Date.now();

    const useStructured = Boolean(meta.schema && skillSchemas[skill]);
    const schema = useStructured ? skillSchemas[skill] : null;

    let rawOutput = "";
    let structuredOutput: unknown = null;

    if (useStructured && schema) {
      const jsonSchema = zodToJsonSchema(schema as ZodSchema, {
        target: "openApi3",
      }) as Record<string, unknown>;
      /* zod-to-json-schema may wrap in { definitions, $ref }; flatten if so. */
      const flattened = flattenJsonSchema(jsonSchema);

      const response = await claude.beta.promptCaching.messages.create({
        model,
        max_tokens: meta.max_tokens ?? 16000,
        system: [
          {
            type: "text",
            text: expandedBody.trim(),
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: [
              ...(stableText
                ? [
                    {
                      type: "text" as const,
                      text: stableText,
                      cache_control: { type: "ephemeral" as const },
                    },
                  ]
                : []),
              { type: "text" as const, text: volatileText },
            ],
          },
        ],
        tools: [
          {
            name: "produce_output",
            description: "Produce the structured output for this skill.",
            input_schema: flattened as { type: "object" } & Record<string, unknown>,
          },
        ],
        tool_choice: { type: "tool", name: "produce_output" },
      });

      const toolUse = response.content.find(
        (c): c is Extract<typeof c, { type: "tool_use" }> => c.type === "tool_use",
      );
      if (!toolUse) {
        throw new Error("Claude did not return a tool_use block.");
      }
      rawOutput = JSON.stringify(toolUse.input);
      const parsed = (schema as ZodSchema).safeParse(toolUse.input);
      if (!parsed.success) {
        throw new Error(
          `Output failed schema validation: ${parsed.error.message}`,
        );
      }
      structuredOutput = parsed.data;

      await finalizeRun(supabase, runId, {
        status: "completed",
        output: structuredOutput,
        durationMs: Date.now() - startedAt,
        usage: response.usage,
      });

      /* If this is an app interpretation skill (apps/<X>/insights/), persist
       * the produced Insight rows to the insights table. The skill's schema
       * extends InsightBatch; runtime parse via the shared schema confirms.
       * If the parse fails, log loudly — silent zero-output here was the
       * v0.4.1 seed-keywords bug. */
      if (skill.endsWith("/insights")) {
        const appId = skill.slice(0, -"/insights".length);
        const batchParse = InsightBatch.safeParse(structuredOutput);
        if (batchParse.success) {
          await persistInsights(
            supabase,
            project.id,
            appId,
            batchParse.data,
            runId,
          );
        } else {
          console.error(
            `[skill-runner] ${skill}: structured output did not match InsightBatch shape. Insights NOT persisted.`,
            batchParse.error.flatten(),
            structuredOutput,
          );
        }
      }

      return {
        ok: true,
        mode: "structured",
        output: structuredOutput as T,
        rawOutput,
        runId,
      };
    }

    /* Text mode — original behavior. */
    const response = await claude.beta.promptCaching.messages.create({
      model,
      max_tokens: meta.max_tokens ?? 16000,
      system: [
        {
          type: "text",
          text: expandedBody.trim(),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            ...(stableText
              ? [
                  {
                    type: "text" as const,
                    text: stableText,
                    cache_control: { type: "ephemeral" as const },
                  },
                ]
              : []),
            { type: "text" as const, text: volatileText },
          ],
        },
      ],
    });

    rawOutput = response.content
      .filter((c): c is Extract<typeof c, { type: "text" }> => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    await finalizeRun(supabase, runId, {
      status: "completed",
      output: rawOutput,
      durationMs: Date.now() - startedAt,
      usage: response.usage,
    });

    return { ok: true, mode: "text", output: rawOutput, runId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (runId) {
      await supabase
        .from("skill_runs")
        .update({ status: "failed", error_message: message })
        .eq("id", runId);
    }
    return { ok: false, error: message, runId };
  }
}

/* ------------------------------------------------------------------------- *
 * Interpretation pipeline.
 *
 * Consumers (weekly-analysis, plan-sitemap) call this BEFORE their own input
 * gather phase. It checks each connected inbound app's interpretation skill,
 * detects staleness, and runs interpretations in parallel for any that need
 * refreshing. By the time the consumer runs, the `insights` table is fresh.
 * ------------------------------------------------------------------------- */

/** List inbound apps that have an insights/ skill. Read at module init time. */
async function listAppsWithInsights(): Promise<string[]> {
  try {
    const apps = await fs.readdir(APPS_ROOT);
    const checks = await Promise.all(
      apps.map(async (app) => {
        try {
          await fs.access(path.join(APPS_ROOT, app, "insights", "SKILL.md"));
          return app;
        } catch {
          return null;
        }
      }),
    );
    return checks.filter((a): a is string => Boolean(a));
  } catch {
    return [];
  }
}

/** Run any stale app interpretations for the project, in parallel.
 *
 * Staleness rule: if there's no insight for this (project, app) pair, OR if
 * the app's last_fetched_at in project_data_freshness is newer than the
 * most recent insight, the app needs re-interpretation.
 *
 * Returns the apps that were re-interpreted. */
export async function runInterpretationsIfStale(
  projectId: string,
  options: { force?: boolean } = {},
): Promise<{ reinterpreted: string[]; skipped: string[]; failed: string[] }> {
  const supabase = await createServerClient();
  const apps = await listAppsWithInsights();
  if (apps.length === 0) {
    return { reinterpreted: [], skipped: [], failed: [] };
  }

  const [{ data: latestInsights }, { data: freshness }] = await Promise.all([
    supabase
      .from("insights")
      .select("app_id, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_data_freshness")
      .select("surface, last_updated_at")
      .eq("project_id", projectId),
  ]);

  /* Latest insight per app. */
  const latestByApp = new Map<string, string>();
  for (const i of latestInsights ?? []) {
    if (!latestByApp.has(i.app_id)) latestByApp.set(i.app_id, i.created_at);
  }
  /* Last fetched per surface (we use app_id as surface key). */
  const fetchedByApp = new Map<string, string>();
  for (const f of freshness ?? []) {
    fetchedByApp.set(f.surface, f.last_updated_at);
  }

  const stale: string[] = [];
  for (const app of apps) {
    if (options.force) {
      stale.push(app);
      continue;
    }
    const lastInsight = latestByApp.get(app);
    const lastFetched = fetchedByApp.get(app);
    /* Special case for seed-keywords: there's no fetch step, so check whether
     * any seed_keywords row is newer than the latest insight. */
    if (app === "seed-keywords") {
      const { data: seeds } = await supabase
        .from("seed_keywords")
        .select("created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!seeds) continue;
      if (!lastInsight || new Date(seeds.created_at) > new Date(lastInsight)) {
        stale.push(app);
      }
      continue;
    }
    /* Regular apps: stale if no insight, or if data has been fetched since. */
    if (!lastInsight) {
      if (lastFetched) stale.push(app);
      continue;
    }
    if (lastFetched && new Date(lastFetched) > new Date(lastInsight)) {
      stale.push(app);
    }
  }

  const results = await Promise.allSettled(
    stale.map((app) =>
      runSkill({
        skill: `${app}/insights`,
        projectId,
      }),
    ),
  );

  const reinterpreted: string[] = [];
  const failed: string[] = [];
  for (let i = 0; i < stale.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled" && r.value.ok) {
      reinterpreted.push(stale[i]);
    } else {
      failed.push(stale[i]);
    }
  }
  const skipped = apps.filter((a) => !stale.includes(a));
  return { reinterpreted, skipped, failed };
}

/* Persist a fresh batch of insights from an app interpretation skill.
 * Strategy: replace-on-rerun. Delete existing insights for (project, app)
 * before inserting the new set. Avoids stale insights piling up across
 * reruns. The previous batch lives in skill_runs.output for history. */
async function persistInsights(
  supabase: Supabase,
  projectId: string,
  appId: string,
  batch: InsightBatchOutput,
  runId: string | null,
): Promise<void> {
  await supabase
    .from("insights")
    .delete()
    .eq("project_id", projectId)
    .eq("app_id", appId);

  if (batch.insights.length === 0) {
    console.warn(
      `[skill-runner] ${appId}: skill returned zero insights. Existing rows were cleared and nothing replaced them.`,
    );
    return;
  }

  const rows = batch.insights.map((i) => ({
    project_id: projectId,
    app_id: appId,
    source: appId,
    type: i.type,
    title: i.title,
    opportunity: i.opportunity,
    evidence: i.evidence,
    confidence: i.confidence,
    topic_hint: i.topic_hint,
    related_keywords: i.related_keywords,
    related_urls: i.related_urls,
    expires_at: i.expires_at,
    generated_by_run_id: runId,
  }));
  const { error } = await supabase.from("insights").insert(rows);
  if (error) {
    console.error(
      `[skill-runner] ${appId}: failed to insert ${rows.length} insight rows:`,
      error,
    );
  }
}

async function finalizeRun(
  supabase: Supabase,
  runId: string | null,
  args: {
    status: "completed" | "failed";
    output: unknown;
    durationMs: number;
    usage?: { input_tokens?: number; output_tokens?: number } | null;
  },
) {
  if (!runId) return;
  await supabase
    .from("skill_runs")
    .update({
      status: args.status,
      output: args.output,
      duration_ms: args.durationMs,
      input_tokens: args.usage?.input_tokens ?? null,
      output_tokens: args.usage?.output_tokens ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);
}

/* zod-to-json-schema sometimes emits { $ref: "#/definitions/X", definitions: {X: {...}} }.
 * The Anthropic tools API wants the schema inline. Flatten one level. */
function flattenJsonSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const ref = schema.$ref;
  const definitions = schema.definitions as Record<string, unknown> | undefined;
  if (typeof ref === "string" && definitions) {
    const key = ref.replace(/^#\/definitions\//, "");
    const target = definitions[key];
    if (target && typeof target === "object") {
      return target as Record<string, unknown>;
    }
  }
  // Strip $schema field which Anthropic doesn't accept
  const { $schema: _$schema, ...rest } = schema;
  return rest;
}

