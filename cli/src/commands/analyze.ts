// pectus analyze --project <code> --skill <name>
// Minimal in-CLI skill runner for v1: reads SKILL.md, gathers a small input
// payload from Supabase, calls Claude with the body as system prompt and the
// inputs as user message, writes a skill_runs row.

import fs from "node:fs";
import path from "node:path";
import { spinner } from "@clack/prompts";
import kleur from "kleur";
import { findRepoRoot } from "../lib/repo-root.js";
import { loadEnv } from "../lib/load-env.js";
import { getServiceClient } from "../lib/supabase.js";

interface AnalyzeOptions {
  project: string;
  skill: string;
}

type Frontmatter = {
  name?: string;
  description?: string;
  version?: string;
  model?: string;
  inputs?: string[];
  outputs?: string[];
};

function parseFrontmatter(src: string): { fm: Frontmatter; body: string } {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/u);
  if (!m) return { fm: {}, body: src };
  const fmRaw = m[1];
  const body = m[2];
  const fm: Frontmatter = {};
  let currentList: keyof Frontmatter | null = null;
  for (const line of fmRaw.split(/\r?\n/u)) {
    if (!line.trim()) continue;
    const listItem = line.match(/^\s+-\s*(.*)$/u);
    if (listItem && currentList) {
      const arr = (fm[currentList] as string[] | undefined) ?? [];
      arr.push(listItem[1].trim());
      (fm as Record<string, unknown>)[currentList] = arr;
      continue;
    }
    const kv = line.match(/^([a-zA-Z_][\w-]*)\s*:\s*(.*)$/u);
    if (!kv) continue;
    const key = kv[1] as keyof Frontmatter;
    const val = kv[2].trim();
    if (val === "") {
      // Probably starts a list.
      currentList = key;
      (fm as Record<string, unknown>)[key] = [];
    } else {
      currentList = null;
      (fm as Record<string, unknown>)[key] = val.replace(/^['"]|['"]$/gu, "");
    }
  }
  return { fm, body: body.trim() };
}

export async function run(opts: AnalyzeOptions): Promise<void> {
  loadEnv();

  if (!opts.project || !opts.skill) {
    console.error(
      kleur.red("Both --project and --skill are required."),
    );
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      kleur.red(
        "ANTHROPIC_API_KEY is not set. Add it to .env.local before running analyze.",
      ),
    );
    process.exit(1);
  }

  const repo = findRepoRoot();
  const skillDir = path.join(repo, "skills", opts.skill);
  const skillFile = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(skillFile)) {
    console.error(
      kleur.red(`Skill not found: ${skillFile}.`),
    );
    process.exit(1);
  }

  const supabase = await getServiceClient();

  // Look up project (allow "global" as a sentinel for cross-project skills).
  let projectId: string | null = null;
  let brandSlug: string | null = null;
  if (opts.project !== "global") {
    const { data: project, error: projectErr } = await supabase
      .from("projects")
      .select("id, code, brand_id")
      .eq("code", opts.project)
      .maybeSingle();
    if (projectErr) {
      console.error(kleur.red(`project lookup failed: ${projectErr.message}`));
      process.exit(1);
    }
    if (!project) {
      console.error(
        kleur.red(`No project with code "${opts.project}". Run \`pectus project create\` first.`),
      );
      process.exit(1);
    }
    projectId = project.id;
    if (project.brand_id) {
      const { data: brand } = await supabase
        .from("brands")
        .select("slug")
        .eq("id", project.brand_id)
        .maybeSingle();
      brandSlug = brand?.slug ?? null;
    }
  }

  const raw = fs.readFileSync(skillFile, "utf8");
  const { fm, body } = parseFrontmatter(raw);

  const model = fm.model ?? "claude-opus-4-7";

  // Gather a minimal input payload. v1 keeps this generic — pulls anything
  // the skill named in `inputs` if a same-named table column exists. The
  // canonical, richer per-skill input gathering will live in
  // cms/src/lib/skill-runner.ts later.
  const inputs: Record<string, unknown> = {
    project_id: projectId,
    project_code: opts.project,
    week_start: new Date().toISOString().slice(0, 10),
  };

  // Pull brands + icp_profile if those tables exist; tolerate absence.
  for (const table of ["brands", "icp_profile"]) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .limit(1)
        .maybeSingle();
      if (!error && data) inputs[table] = data;
    } catch {
      // Skip silently — table may not exist on minimal installs.
    }
  }

  const s = spinner();
  s.start(`Running ${opts.skill} (${model})`);

  let outputText = "";
  let usage: Record<string, unknown> = {};
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await client.messages.create({
      model,
      max_tokens: 4000,
      system: body,
      messages: [
        {
          role: "user",
          content: `Inputs:\n\n${JSON.stringify(inputs, null, 2)}`,
        },
      ],
    });
    outputText = resp.content
      .map((block) =>
        block.type === "text" ? block.text : "",
      )
      .join("\n")
      .trim();
    usage = resp.usage as unknown as Record<string, unknown>;
    s.stop("Skill run complete.");
  } catch (err) {
    s.stop("Skill run failed.");
    console.error(
      kleur.red(err instanceof Error ? err.message : String(err)),
    );
    process.exit(1);
  }

  // Write skill_runs row. Tolerate schema variations.
  try {
    const { error } = await supabase.from("skill_runs").insert({
      project_id: projectId,
      skill_name: opts.skill,
      model,
      inputs,
      output: { text: outputText, usage },
      status: "complete",
    });
    if (error) {
      console.warn(kleur.yellow(`skill_runs insert: ${error.message}`));
    }
  } catch (err) {
    console.warn(
      kleur.yellow(
        `skill_runs insert error: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }

  // Print top-line outcome.
  const preview = outputText.split("\n").slice(0, 8).join("\n");
  console.log("");
  console.log(kleur.bold("Top-line output"));
  console.log(preview);
  console.log("");
  if (opts.project === "global") {
    console.log(kleur.dim("Global skill complete. Output written to skill_runs."));
  } else {
    console.log(
      kleur.dim(
        `Output written to skill_runs (CLI store). The Insights dashboard reads from a separate store (data_interpretations + idea_generations) populated by the in-CMS Run analysis button. To see this run in the UI, open:`,
      ),
    );
    if (brandSlug) {
      console.log(
        kleur.cyan(
          `  http://localhost:3000/brands/${brandSlug}/projects/${opts.project}/apps/content-insights/insights`,
        ),
      );
    } else {
      console.log(
        kleur.cyan(
          `  http://localhost:3000/brands/<your-brand-slug>/projects/${opts.project}/apps/content-insights/insights`,
        ),
      );
    }
    console.log(
      kleur.dim(
        `…and click "Run analysis" there. The CLI path is for scripting; the dashboard is fed by the UI button.`,
      ),
    );
  }
}
