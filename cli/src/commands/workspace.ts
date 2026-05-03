// pectus workspace create / list — manage workspaces (markets) in Supabase.

import {
  intro,
  outro,
  text,
  select,
  isCancel,
  cancel,
  spinner,
} from "@clack/prompts";
import kleur from "kleur";
import { loadEnv } from "../lib/load-env.js";
import { getServiceClient } from "../lib/supabase.js";

function bail(msg = "Cancelled."): never {
  cancel(msg);
  process.exit(1);
}

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/u;

export async function create(): Promise<void> {
  loadEnv();
  intro(kleur.bold().bgMagenta().white(" Pectus / Workspace create "));

  const supabase = await getServiceClient();

  const name = await text({
    message: 'Market name (e.g. "United Kingdom")',
    validate(v) {
      if (!v || !v.trim()) return "Required.";
      return undefined;
    },
  });
  if (isCancel(name)) bail();

  const code = await text({
    message: 'Code (e.g. "uk") — kebab-case, must be unique',
    validate(v) {
      if (!v || !v.trim()) return "Required.";
      if (!KEBAB.test(v.trim())) return "Use lowercase letters, digits, and hyphens.";
      return undefined;
    },
  });
  if (isCancel(code)) bail();

  // Uniqueness check.
  const codeStr = (code as string).trim();
  const { data: existing, error: exErr } = await supabase
    .from("workspaces")
    .select("id")
    .eq("code", codeStr)
    .maybeSingle();
  if (exErr && !/no rows/i.test(exErr.message)) {
    console.error(kleur.red(`workspaces lookup failed: ${exErr.message}`));
    process.exit(1);
  }
  if (existing) {
    bail(`A workspace with code "${codeStr}" already exists.`);
  }

  const locale = await text({
    message: 'Locale (e.g. "en-GB")',
    initialValue: "en-US",
    validate(v) {
      if (!v) return "Required.";
      if (!/^[a-z]{2}(-[A-Z]{2})?$/u.test(v.trim())) return "Use BCP-47 like en-GB.";
      return undefined;
    },
  });
  if (isCancel(locale)) bail();

  const siteShape = await select({
    message: "Where will Pectus content live on this site?",
    options: [
      {
        value: "greenfield",
        label: "Greenfield — brand new site, Pectus pages live at the root",
        hint: "mount slug = /",
      },
      {
        value: "coexist",
        label: "Coexist — there's an existing site, Pectus pages live under a sub-path",
        hint: "mount slug like /insights/",
      },
    ],
    initialValue: "greenfield",
  });
  if (isCancel(siteShape)) bail();

  let mountSlug = "/";
  if (siteShape === "coexist") {
    const sub = await text({
      message: "Sub-path for Pectus pages (you can change this later)",
      initialValue: "/insights/",
      validate(v) {
        if (!v) return "Required.";
        const t = v.trim();
        if (!t.startsWith("/")) return "Must start with /";
        if (!t.endsWith("/")) return "Must end with /";
        if (!/^\/[a-z0-9/-]+\/$/.test(t)) {
          return "Use lowercase letters, digits, hyphens, and slashes.";
        }
        return undefined;
      },
    });
    if (isCancel(sub)) bail();
    mountSlug = (sub as string).trim();
  }

  const repoString = await text({
    message:
      "Content-hub GitHub repo (owner/name) — leave blank to set later in Workspace Settings",
    placeholder: "your-org/site",
    validate(v) {
      if (!v || !v.trim()) return undefined;
      if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/u.test(v.trim())) {
        return "Use the form 'owner/name'.";
      }
      return undefined;
    },
  });
  if (isCancel(repoString)) bail();
  const contentHubRepo = (repoString as string).trim() || null;

  const seedHelp =
    siteShape === "greenfield"
      ? "Greenfield workspaces have no GSC traffic data yet. Pectus uses these to plan a sitemap. 5–10 phrases, comma-separated."
      : "Optional. Coexist sites usually have GSC data, but seeds are still useful as ICP-aligned anchors. 5–10 phrases, comma-separated, or leave blank.";
  const seedKeywordsRaw = await text({
    message: `Seed keywords (5–10) — ${seedHelp}`,
    placeholder:
      "observability for python, structured logging, distributed tracing",
    validate(v) {
      const parts = (v ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (siteShape === "coexist" && parts.length === 0) return undefined;
      if (parts.length === 0) return "At least one keyword for greenfield workspaces.";
      if (parts.length > 10) return "Cap is 10. Pick the most representative.";
      return undefined;
    },
  });
  if (isCancel(seedKeywordsRaw)) bail();
  const seedKeywords = (seedKeywordsRaw as string)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const s = spinner();
  s.start("Creating workspace");

  const { data: created, error: insErr } = await supabase
    .from("workspaces")
    .insert({
      name: (name as string).trim(),
      code: codeStr,
      locale: (locale as string).trim(),
      mount_slug: mountSlug,
      content_hub_repo: contentHubRepo,
    })
    .select("id, code")
    .single();

  if (insErr || !created) {
    s.stop("Workspace insert failed.");
    console.error(
      kleur.red(insErr?.message ?? "No row returned from workspaces insert."),
    );
    process.exit(1);
  }

  // Default review policy.
  const { error: rpErr } = await supabase.from("review_policy").insert({
    workspace_id: created.id,
    required_roles: ["brand_reviewer"],
    min_approvals: 1,
  });
  if (rpErr) {
    console.warn(kleur.yellow(`review_policy: ${rpErr.message}`));
  }

  // Seed keywords.
  if (seedKeywords.length > 0) {
    const { error: skErr } = await supabase.from("seed_keywords").insert(
      seedKeywords.map((keyword) => ({
        workspace_id: created.id,
        keyword,
      })),
    );
    if (skErr) {
      console.warn(kleur.yellow(`seed_keywords: ${skErr.message}`));
    }
  }

  s.stop("Workspace created.");

  outro(
    kleur.green(
      `Workspace ready. Open http://localhost:3000/workspaces/${created.code} to see it.`,
    ),
  );
}

export async function list(): Promise<void> {
  loadEnv();
  const supabase = await getServiceClient();

  const { data, error } = await supabase
    .from("workspaces")
    .select("code, name, locale, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(kleur.red(`Failed to list workspaces: ${error.message}`));
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log(
      kleur.dim("No workspaces yet. Run `npx pectus workspace create`."),
    );
    return;
  }

  const rows = data.map((w) => ({
    code: w.code ?? "",
    name: w.name ?? "",
    locale: w.locale ?? "",
    created_at: w.created_at ? String(w.created_at).slice(0, 10) : "",
  }));

  const widths = {
    code: Math.max(4, ...rows.map((r) => r.code.length)),
    name: Math.max(4, ...rows.map((r) => r.name.length)),
    locale: Math.max(6, ...rows.map((r) => r.locale.length)),
    created: Math.max(10, ...rows.map((r) => r.created_at.length)),
  };

  const pad = (s: string, n: number) => s.padEnd(n, " ");
  const sep = `${"-".repeat(widths.code)}  ${"-".repeat(widths.name)}  ${"-".repeat(widths.locale)}  ${"-".repeat(widths.created)}`;

  console.log(
    `${pad("code", widths.code)}  ${pad("name", widths.name)}  ${pad("locale", widths.locale)}  ${pad("created", widths.created)}`,
  );
  console.log(sep);
  for (const r of rows) {
    console.log(
      `${pad(r.code, widths.code)}  ${pad(r.name, widths.name)}  ${pad(r.locale, widths.locale)}  ${pad(r.created_at, widths.created)}`,
    );
  }
}
