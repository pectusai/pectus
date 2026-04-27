import fs from "node:fs/promises";
import path from "node:path";
import { createServerClient } from "@pectus/supabase";
import { getClaude, DEFAULT_MODEL } from "@pectus/anthropic";
import {
  formatBrandContext,
  formatIcpContext,
  type BrandProfile,
  type IcpProfile,
} from "@/lib/format-icp-context";

/* ------------------------------------------------------------------------- *
 * Skill runner. Loads a skill folder, gathers inputs, calls Claude, logs.
 * cms/src/lib/skill-runner.ts
 *
 * Skills live at ../../skills/<skill-name>/ relative to cms/. Each folder
 * contains SKILL.md (with YAML frontmatter) and optionally a reference/
 * subfolder. The frontmatter declares the inputs the skill needs; this
 * runner pulls them from Supabase and feeds them to Claude as one message.
 *
 * For now we return the raw text response. PR4 will plug Zod schemas in.
 * ------------------------------------------------------------------------- */

export type SkillInput =
  | "workspace_id"
  | "top_keywords"
  | "recent_articles"
  | "icp_profile"
  | "brand_profile"
  | "knowledge_insights"
  | "answer_public_entries"
  | "last_run"
  | "sitemap"
  | "article_bodies";

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
  workspaceId: string;
  userId?: string;
  /* Override the model declared in frontmatter. */
  model?: string;
};

export type SkillRunResult =
  | { ok: true; output: string; runId: string | null }
  | { ok: false; error: string; runId: string | null };

const SKILLS_ROOT = path.resolve(process.cwd(), "..", "skills");

/* ------------------------------------------------------------------------- *
 * Frontmatter parser. We don't pull in `gray-matter` to keep deps minimal.
 * Skills frontmatter is YAML-ish but only uses simple key/value, lists, and
 * scalars. Good enough.
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
        // Strip surrounding quotes if present.
        const stripped = val.replace(/^["'](.*)["']$/, "$1");
        // Coerce numbers.
        const asNum = Number(stripped);
        meta[key] = stripped !== "" && !Number.isNaN(asNum) && /^[-\d.]+$/.test(stripped)
          ? asNum
          : stripped;
      }
    }
  }

  return { meta: meta as SkillFrontmatter, body };
}

/* Replace `{{ reference/<file> }}` directives with the referenced file's
 * contents. Files are resolved relative to the skill folder. */
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
 * Input gatherers. One function per declared input. Each returns a string
 * fragment we paste into the user message, plus a count for the digest.
 * ------------------------------------------------------------------------- */

type GatheredInput = { label: string; text: string; count: number };
type Supabase = Awaited<ReturnType<typeof createServerClient>>;

async function gatherTopKeywords(
  supabase: Supabase,
  workspaceId: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("keywords")
    .select("keyword, search_volume, current_rank, intent, metadata")
    .eq("workspace_id", workspaceId)
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
  workspaceId: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("articles")
    .select("slug, title, description, category, date_published, word_count, status")
    .eq("workspace_id", workspaceId)
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
  workspaceId: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("icp_profiles")
    .select("personas, painpoints, notes")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return {
    label: "ICP",
    text: formatIcpContext(data as IcpProfile | null),
    count: data ? 1 : 0,
  };
}

async function gatherBrandProfile(
  supabase: Supabase,
  workspaceName: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("brand_profile")
    .select("name, tagline, voice, tonality, guidelines_md")
    .limit(1)
    .maybeSingle();
  return {
    label: "BRAND",
    text: formatBrandContext(data as BrandProfile | null, workspaceName),
    count: data ? 1 : 0,
  };
}

async function gatherKnowledgeInsights(
  supabase: Supabase,
  workspaceId: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("knowledge_insights")
    .select("title, summary, source")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(50);

  const lines = (data ?? []).map(
    (i) => `- ${i.title ?? "(untitled)"}${i.source ? ` (${i.source})` : ""}: ${i.summary ?? ""}`,
  );
  return {
    label: "KNOWLEDGE INSIGHTS",
    text: lines.length ? lines.join("\n") : "(no insights uploaded yet)",
    count: data?.length ?? 0,
  };
}

async function gatherAnswerPublic(
  supabase: Supabase,
  workspaceId: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("answer_public_entries")
    .select("seed_keyword, tab, bucket, text")
    .eq("workspace_id", workspaceId)
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
  workspaceId: string,
  skillName: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("skill_runs")
    .select("output, model, created_at")
    .eq("workspace_id", workspaceId)
    .eq("skill_name", skillName)
    .eq("status", "ok")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    label: "LAST RUN",
    text: data?.output
      ? `(generated ${data.created_at})\n${String(data.output).slice(0, 4000)}`
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

async function gatherArticleBodies(
  supabase: Supabase,
  workspaceId: string,
): Promise<GatheredInput> {
  const { data } = await supabase
    .from("articles")
    .select("title, body_markdown")
    .eq("workspace_id", workspaceId)
    .not("body_markdown", "is", null)
    .limit(20);
  const lines = (data ?? []).map(
    (a) => `--- ${a.title}\n${String(a.body_markdown ?? "").slice(0, 2000)}`,
  );
  return {
    label: "ARTICLE BODIES",
    text: lines.length ? lines.join("\n\n") : "(no article bodies stored)",
    count: data?.length ?? 0,
  };
}

/* ------------------------------------------------------------------------- *
 * Public entry.
 * ------------------------------------------------------------------------- */

export async function runSkill(
  options: SkillRunOptions,
): Promise<SkillRunResult> {
  const { skill, workspaceId, userId } = options;

  let runId: string | null = null;
  const supabase = await createServerClient();

  try {
    const skillDir = path.join(SKILLS_ROOT, skill);
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

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, name, code, locale")
      .eq("id", workspaceId)
      .maybeSingle();

    if (!workspace) {
      return { ok: false, error: `Workspace ${workspaceId} not found.`, runId };
    }

    const declared = meta.inputs ?? [];
    const gathered: GatheredInput[] = [];
    for (const input of declared) {
      switch (input) {
        case "workspace_id":
          gathered.push({
            label: "WORKSPACE",
            text: `id=${workspace.id}\ncode=${workspace.code}\nname=${workspace.name}\nlocale=${workspace.locale}`,
            count: 1,
          });
          break;
        case "top_keywords":
          gathered.push(await gatherTopKeywords(supabase, workspace.id));
          break;
        case "recent_articles":
          gathered.push(await gatherRecentArticles(supabase, workspace.id));
          break;
        case "icp_profile":
          gathered.push(await gatherIcpProfile(supabase, workspace.id));
          break;
        case "brand_profile":
          gathered.push(await gatherBrandProfile(supabase, workspace.name));
          break;
        case "knowledge_insights":
          gathered.push(await gatherKnowledgeInsights(supabase, workspace.id));
          break;
        case "answer_public_entries":
          gathered.push(await gatherAnswerPublic(supabase, workspace.id));
          break;
        case "last_run":
          gathered.push(await gatherLastRun(supabase, workspace.id, skill));
          break;
        case "sitemap":
          gathered.push(await gatherSitemap(supabase));
          break;
        case "article_bodies":
          gathered.push(await gatherArticleBodies(supabase, workspace.id));
          break;
        default:
          gathered.push({
            label: String(input).toUpperCase(),
            text: `(unknown input "${input}")`,
            count: 0,
          });
      }
    }

    const inputDigest: Record<string, number> = {};
    for (const g of gathered) {
      inputDigest[g.label.toLowerCase().replace(/\s+/g, "_")] = g.count;
    }

    const userMessage =
      gathered
        .map((g) => `## ${g.label}\n\n${g.text}`)
        .join("\n\n") || "(no inputs declared)";

    /* Pre-insert a "running" row so we can correlate logs / failures. */
    const { data: insertedRun } = await supabase
      .from("skill_runs")
      .insert({
        skill_name: skill,
        workspace_id: workspace.id,
        user_id: userId ?? null,
        status: "running",
        model: options.model ?? meta.model ?? DEFAULT_MODEL,
        input_digest: inputDigest,
      })
      .select("id")
      .single();
    runId = insertedRun?.id ?? null;

    const claude = getClaude();
    const startedAt = Date.now();

    const response = await claude.messages.create({
      model: options.model ?? meta.model ?? DEFAULT_MODEL,
      max_tokens: meta.max_tokens ?? 16000,
      system: expandedBody.trim(),
      messages: [{ role: "user", content: userMessage }],
    });

    const durationMs = Date.now() - startedAt;
    const output = response.content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    const usage = response.usage as
      | { input_tokens?: number; output_tokens?: number }
      | undefined;

    if (runId) {
      await supabase
        .from("skill_runs")
        .update({
          status: "ok",
          output,
          duration_ms: durationMs,
          input_tokens: usage?.input_tokens ?? null,
          output_tokens: usage?.output_tokens ?? null,
        })
        .eq("id", runId);
    }

    return { ok: true, output, runId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (runId) {
      await supabase
        .from("skill_runs")
        .update({ status: "error", error_message: message })
        .eq("id", runId);
    }
    return { ok: false, error: message, runId };
  }
}
