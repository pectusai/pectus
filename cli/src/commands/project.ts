// pectus project create / list — manage projects (markets) in Supabase.

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

type BrandRow = { id: string; slug: string; name: string | null };

async function pickBrand(
  supabase: Awaited<ReturnType<typeof getServiceClient>>,
): Promise<BrandRow> {
  const { data, error } = await supabase
    .from("brands")
    .select("id, slug, name")
    .order("created_at", { ascending: true });
  if (error) {
    console.error(kleur.red(`brands lookup failed: ${error.message}`));
    process.exit(1);
  }
  const brands = (data ?? []) as BrandRow[];
  if (brands.length === 0) {
    bail(
      "No brands in Supabase yet. Run `npx pectus brand sync` first to push your brands/<slug>/brand.json onto the brands table.",
    );
  }
  if (brands.length === 1) {
    const only = brands[0];
    console.log(
      kleur.dim(
        `Using the only brand: ${only.name ?? only.slug} (${only.slug}).`,
      ),
    );
    return only;
  }
  const choice = await select({
    message: "Which brand should this project belong to?",
    options: brands.map((b) => ({
      label: `${b.name ?? b.slug} (${b.slug})`,
      value: b.slug,
    })),
  });
  if (isCancel(choice)) bail();
  const selected = brands.find((b) => b.slug === choice);
  if (!selected) bail(`Brand ${choice} not found.`);
  return selected!;
}

export async function create(): Promise<void> {
  loadEnv();
  intro(kleur.bold().bgMagenta().white(" Pectus / Project create "));

  const supabase = await getServiceClient();
  const brand = await pickBrand(supabase);

  const name = await text({
    message: 'Market name (e.g. "United Kingdom")',
    validate(v) {
      if (!v || !v.trim()) return "Required.";
      return undefined;
    },
  });
  if (isCancel(name)) bail();

  const code = await text({
    message:
      'Short identifier for this project (e.g. "uk", "dtc-us", or "main" if you only have one market). Lowercase letters, digits, and hyphens only. Used in URLs.',
    placeholder: "main",
    validate(v) {
      if (!v || !v.trim()) return "Required.";
      if (!KEBAB.test(v.trim()))
        return "Use lowercase letters, digits, and hyphens. No spaces, no uppercase, no special characters.";
      return undefined;
    },
  });
  if (isCancel(code)) bail();

  // Uniqueness check (per-brand: a brand can have only one project per code).
  const codeStr = (code as string).trim();
  const { data: existing, error: exErr } = await supabase
    .from("projects")
    .select("id")
    .eq("brand_id", brand.id)
    .eq("code", codeStr)
    .maybeSingle();
  if (exErr && !/no rows/i.test(exErr.message)) {
    console.error(kleur.red(`projects lookup failed: ${exErr.message}`));
    process.exit(1);
  }
  if (existing) {
    bail(
      `Brand ${brand.slug} already has a project with code "${codeStr}".`,
    );
  }

  const locale = await text({
    message:
      'Language and country code (e.g. "en-US" for American English, "en-GB" for British English, "sv-SE" for Swedish, "de-DE" for German). Two lowercase letters for the language, a dash, two uppercase letters for the country.',
    initialValue: "en-US",
    validate(v) {
      if (!v) return "Required.";
      if (!/^[a-z]{2}(-[A-Z]{2})?$/u.test(v.trim()))
        return 'Format: lowercase language + "-" + uppercase country, e.g. en-US, en-GB, sv-SE.';
      return undefined;
    },
  });
  if (isCancel(locale)) bail();

  const seedKeywordsRaw = await text({
    message:
      "Seed keywords (5-10) — short phrases this project plans content around when there's no Search Console traffic yet. Comma-separated, or leave blank if you'll add them later.",
    placeholder:
      "observability for python, structured logging, distributed tracing",
    validate(v) {
      const parts = (v ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length === 0) return undefined;
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
  s.start("Creating project");

  const localeStr = (locale as string).trim();
  const { data: created, error: insErr } = await supabase
    .from("projects")
    .insert({
      brand_id: brand.id,
      name: (name as string).trim(),
      code: codeStr,
      locale: localeStr,
      default_locale: localeStr,
      enabled_locales: [localeStr],
    })
    .select("id, code")
    .single();

  if (insErr || !created) {
    s.stop("Project insert failed.");
    console.error(
      kleur.red(insErr?.message ?? "No row returned from projects insert."),
    );
    process.exit(1);
  }

  // Default review policy.
  const { error: rpErr } = await supabase.from("review_policy").insert({
    project_id: created.id,
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
        project_id: created.id,
        keyword,
      })),
    );
    if (skErr) {
      console.warn(kleur.yellow(`seed_keywords: ${skErr.message}`));
    }
  }

  s.stop("Project created.");

  outro(
    kleur.green(
      `Project ready. Open http://localhost:3000/brands/${brand.slug}/projects/${created.code} to see it. ` +
        `To turn on the public site (Pages, Articles, Publish), open the project's Apps page and activate Content Hub.`,
    ),
  );
}

export async function list(): Promise<void> {
  loadEnv();
  const supabase = await getServiceClient();

  const { data, error } = await supabase
    .from("projects")
    .select("code, name, locale, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(kleur.red(`Failed to list projects: ${error.message}`));
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log(
      kleur.dim("No projects yet. Run `npx pectus project create`."),
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
