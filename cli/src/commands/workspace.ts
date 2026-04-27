// pectus workspace create / list — manage workspaces (markets) in Supabase.

import {
  intro,
  outro,
  text,
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

  const s = spinner();
  s.start("Creating workspace");

  const { data: created, error: insErr } = await supabase
    .from("workspaces")
    .insert({
      name: (name as string).trim(),
      code: codeStr,
      locale: (locale as string).trim(),
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
    s.stop("Workspace created, review_policy insert failed.");
    console.warn(kleur.yellow(`review_policy: ${rpErr.message}`));
  } else {
    s.stop("Workspace created.");
  }

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
