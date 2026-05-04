// pectus connect <service> — wire up an external service.
// Implemented: supabase, google. Stubbed in v1: vercel, github.

import fs from "node:fs";
import path from "node:path";
import {
  intro,
  outro,
  text,
  password,
  confirm,
  isCancel,
  cancel,
  note,
  spinner,
} from "@clack/prompts";
import kleur from "kleur";
import { findRepoRoot } from "../lib/repo-root.js";
import { readEnvLocal, writeEnvLocal } from "../lib/env-file.js";
import { loadEnv } from "../lib/load-env.js";
import { getServiceClient } from "../lib/supabase.js";
import { brandsRoot, brandJsonPath } from "../lib/brand-paths.js";
import { runV04DiskMigration, reportV04Migration } from "../lib/disk-migration.js";

type Service = "supabase" | "google" | "vercel" | "github";

function bail(msg = "Cancelled."): never {
  cancel(msg);
  process.exit(1);
}

function maskSecret(value: string): string {
  if (value.length <= 8) return "•".repeat(value.length);
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

async function reuseOrPromptSecret(
  label: string,
  saved: string | undefined,
): Promise<string> {
  const trimmed = saved?.trim() ?? "";
  if (trimmed) {
    console.log(kleur.dim(`${label}: using saved value (${maskSecret(trimmed)}).`));
    return trimmed;
  }
  const next = await password({ message: label, mask: "*" });
  if (isCancel(next)) bail();
  const v = (next as string).trim();
  if (!v) bail(`${label} is required.`);
  return v;
}

export async function run(service: Service): Promise<void> {
  loadEnv();
  switch (service) {
    case "supabase":
      await connectSupabase();
      return;
    case "google":
      await connectGoogle();
      return;
    case "vercel":
      console.log(kleur.yellow("pectus connect vercel — coming in v2."));
      return;
    case "github":
      console.log(kleur.yellow("pectus connect github — coming in v2."));
      return;
  }
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

async function connectSupabase(): Promise<void> {
  intro(kleur.bold().bgGreen().white(" Pectus / Supabase "));

  note(
    [
      "1. Create a Supabase project at https://supabase.com/dashboard.",
      "2. On https://supabase.com/dashboard/account/tokens click Generate new token; copy the value.",
      "3. Open the project's API settings to grab the URL, anon key, service-role key.",
    ].join("\n"),
    "Before we start",
  );

  const existing = readEnvLocal();

  const accessToken = await reuseOrPromptSecret(
    "Supabase access token",
    existing.SUPABASE_ACCESS_TOKEN,
  );

  const projectUrl = await text({
    message: "Supabase project URL (https://<ref>.supabase.co)",
    initialValue: existing.NEXT_PUBLIC_SUPABASE_URL ?? "",
    validate(v) {
      if (!v) return "Required.";
      try {
        const u = new URL(v);
        if (!u.host.endsWith(".supabase.co")) return "Should be *.supabase.co URL.";
        return undefined;
      } catch {
        return "Use a valid URL.";
      }
    },
  });
  if (isCancel(projectUrl)) bail();

  const anonKey = await reuseOrPromptSecret(
    "Supabase anon (public) key",
    existing.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const serviceRoleKey = await reuseOrPromptSecret(
    "Supabase service-role (secret) key",
    existing.SUPABASE_SERVICE_ROLE_KEY,
  );

  // Extract project ref from URL.
  let projectRef = "";
  try {
    const u = new URL(projectUrl as string);
    projectRef = u.host.split(".")[0] ?? "";
  } catch {
    /* validated above */
  }

  writeEnvLocal({
    SUPABASE_ACCESS_TOKEN: accessToken,
    NEXT_PUBLIC_SUPABASE_URL: projectUrl as string,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey as string,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey as string,
    SUPABASE_PROJECT_REF: projectRef,
  });

  // Reload env so getServiceClient picks them up.
  process.env.NEXT_PUBLIC_SUPABASE_URL = projectUrl as string;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey as string;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey as string;
  process.env.SUPABASE_PROJECT_REF = projectRef;
  process.env.SUPABASE_ACCESS_TOKEN = accessToken;

  // Verify connectivity.
  const s = spinner();
  s.start("Verifying service-role connectivity");
  let supabase;
  try {
    supabase = await getServiceClient();
    const { error } = await supabase.from("pg_settings").select("name").limit(1);
    // pg_settings probably isn't queryable through PostgREST; fall back to a
    // raw REST ping which works as long as the URL + key are valid.
    if (error && !/relation .* does not exist|permission denied|could not find/i.test(error.message)) {
      throw new Error(error.message);
    }
    const ping = await fetch(`${projectUrl}/rest/v1/`, {
      headers: {
        apikey: serviceRoleKey as string,
        Authorization: `Bearer ${serviceRoleKey as string}`,
      },
    });
    if (!ping.ok && ping.status !== 404) {
      const body = await ping.text();
      throw new Error(`REST ping ${ping.status}: ${body.slice(0, 200)}`);
    }
    s.stop("Supabase reachable.");
  } catch (err) {
    s.stop("Supabase verify failed.");
    console.error(kleur.red(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }

  // Migrations — manual paste in v1.
  const repo = findRepoRoot();
  const migration = path.join(repo, "connectors/supabase/migrations/0001_initial.sql");
  if (fs.existsSync(migration)) {
    note(
      [
        `Open the Supabase SQL editor for project ${projectRef}:`,
        `  https://supabase.com/dashboard/project/${projectRef}/sql/new`,
        "",
        `Paste the contents of ${path.relative(repo, migration)}`,
        "and run it. When done, come back here and confirm.",
      ].join("\n"),
      "Run migrations manually (v1)",
    );
    const ok = await confirm({
      message: "Migration ran successfully?",
      initialValue: true,
    });
    if (isCancel(ok) || !ok) {
      bail("Migration not confirmed. Stopping so we don't make things worse.");
    }
  } else {
    note(
      `No migration file found at ${migration} — skipping.`,
      "Migrations",
    );
  }

  // First admin user.
  note("Create the first admin user. Use a real email; you'll log in with it.", "Admin user");

  const adminEmail = await text({
    message: "Admin email",
    validate(v) {
      if (!v || !/.+@.+\..+/u.test(v)) return "Use a valid email.";
      return undefined;
    },
  });
  if (isCancel(adminEmail)) bail();

  const adminPass = await password({
    message: "Admin password (min 8 chars)",
    mask: "*",
  });
  if (isCancel(adminPass)) bail();
  if (!adminPass || (adminPass as string).length < 8) {
    bail("Password must be at least 8 characters.");
  }

  const s2 = spinner();
  s2.start("Creating admin user");
  try {
    let userId: string | undefined;
    let existed = false;

    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail as string,
      password: adminPass as string,
      email_confirm: true,
    });

    if (error) {
      const isDuplicate = /already (registered|been registered|exists)|duplicate/iu.test(
        error.message,
      );
      if (!isDuplicate) throw new Error(error.message);

      // User exists from a prior run. Look up the id and update the password
      // to the value the user just typed (matches their expectation).
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (listErr) throw new Error(listErr.message);
      const match = list?.users?.find(
        (u) => u.email?.toLowerCase() === (adminEmail as string).toLowerCase(),
      );
      if (!match) {
        throw new Error(
          `Supabase says the user exists but listUsers didn't find ${adminEmail}.`,
        );
      }
      userId = match.id;
      existed = true;

      const { error: updErr } = await supabase.auth.admin.updateUserById(userId, {
        password: adminPass as string,
        email_confirm: true,
      });
      if (updErr) throw new Error(updErr.message);
    } else {
      userId = data.user?.id;
    }

    if (!userId) throw new Error("No user id available.");

    const profileRow: Record<string, unknown> = {
      id: userId,
      email: adminEmail as string,
      is_admin: true,
      role: "admin",
    };
    const { error: pErr } = await supabase
      .from("profiles")
      .upsert(profileRow, { onConflict: "id" });
    if (pErr && !/profiles/i.test(pErr.message)) {
      throw new Error(pErr.message);
    }

    s2.stop(existed ? "Admin user already existed — password updated, admin flag set." : "Admin user created.");
  } catch (err) {
    s2.stop("Admin user creation failed.");
    console.error(kleur.red(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }

  // Sync brand profiles. v0.4: walk brands/<slug>/brand.json for every brand
  // directory. Convert old singleton brand/ layout first if needed.
  const brandsDir = brandsRoot(repo);
  if (!fs.existsSync(brandsDir)) {
    const result = runV04DiskMigration(repo);
    reportV04Migration(result);
  }
  if (fs.existsSync(brandsDir)) {
    const slugs = fs
      .readdirSync(brandsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    for (const slug of slugs) {
      const brandFile = brandJsonPath(repo, slug);
      if (!fs.existsSync(brandFile)) continue;
      try {
        const brand = JSON.parse(fs.readFileSync(brandFile, "utf8"));
        const payload: Record<string, unknown> = {
          slug,
          name: brand.name ?? null,
          tagline: brand.tagline ?? null,
          website_url: brand.website_url ?? null,
          sitemap_url: brand.sitemap_url ?? null,
          voice: brand.voice ?? null,
          tonality: brand.tonality ?? null,
          image_model: brand.image_model ?? null,
          colors: brand.colors ?? null,
          fonts: brand.fonts ?? null,
          radius: brand.radius ?? null,
          imported_from: brand.imported_from ?? null,
        };
        const { error } = await supabase
          .from("brands")
          .upsert(payload, { onConflict: "slug" });
        if (error) {
          console.warn(
            kleur.yellow(`brands sync skipped for ${slug}: ${error.message}`),
          );
        } else {
          console.log(kleur.dim(`brands/${slug}/brand.json synced.`));
        }
      } catch (err) {
        console.warn(
          kleur.yellow(
            `brands sync error for ${slug}: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
      }
    }
  }

  outro(
    kleur.green(
      "Supabase set up. Admin user created. Next: npx pectus connect google.",
    ),
  );
}

// ---------------------------------------------------------------------------
// Google
// ---------------------------------------------------------------------------

async function connectGoogle(): Promise<void> {
  intro(kleur.bold().bgRed().white(" Pectus / Google "));

  note(
    [
      "Before we start, in Google Cloud Console:",
      "  1. Create or pick a project.",
      "  2. Enable: Search Console API, Analytics Data API.",
      "  3. Create a service account; download its JSON key.",
      "  4. Grant the service account 'Viewer' on your GA4 property.",
      "  5. In Search Console, add the service account email as a 'User'.",
    ].join("\n"),
    "Setup",
  );

  const repo = findRepoRoot();
  const { parseServiceAccountKey, testGa4Property, testSearchConsoleSite } =
    await loadGoogleApps(repo);

  const jsonRaw = await password({
    message: "Paste the full service account JSON",
    mask: "*",
  });
  if (isCancel(jsonRaw)) bail();
  if (!jsonRaw || !(jsonRaw as string).trim()) {
    bail("Service account JSON is required.");
  }

  const parsed = parseServiceAccountKey(jsonRaw as string);
  if (!parsed.ok) {
    console.error(kleur.red(parsed.error));
    process.exit(1);
  }
  const key = parsed.key;

  const ga4PropertyId = await text({
    message: "GA4 property ID (e.g. 123456789)",
    validate(v) {
      if (!v || !/^\d+$/u.test(v.trim())) return "Use a numeric property ID.";
      return undefined;
    },
  });
  if (isCancel(ga4PropertyId)) bail();

  const gscSiteUrl = await text({
    message: "Search Console site (https URL or sc-domain:example.com)",
    validate(v) {
      if (!v) return "Required.";
      const t = v.trim();
      if (t.startsWith("sc-domain:")) return undefined;
      try {
        new URL(t);
        return undefined;
      } catch {
        return "Use https://example.com/ or sc-domain:example.com.";
      }
    },
  });
  if (isCancel(gscSiteUrl)) bail();

  const s = spinner();
  s.start("Testing GA4 access");
  const ga = await testGa4Property(key, (ga4PropertyId as string).trim());
  if (!ga.ok) {
    s.stop("GA4 test failed.");
    console.error(kleur.red(ga.message));
    process.exit(1);
  }
  s.stop("GA4 reachable.");

  const s2 = spinner();
  s2.start("Testing Search Console access");
  const gsc = await testSearchConsoleSite(key, (gscSiteUrl as string).trim());
  if (!gsc.ok) {
    s2.stop("GSC test failed.");
    console.error(kleur.red(gsc.message));
    process.exit(1);
  }
  s2.stop("Search Console reachable.");

  // Write to integrations table.
  const supabase = await getServiceClient();
  const row = {
    provider: "google",
    service_account_json: key,
    ga4_property_id: (ga4PropertyId as string).trim(),
    gsc_site_url: (gscSiteUrl as string).trim(),
    account_email: key.client_email,
    last_verified_at: new Date().toISOString(),
    last_verify_note: "OK",
  };
  const { error } = await supabase
    .from("integrations")
    .upsert(row, { onConflict: "provider" });
  if (error) {
    console.error(kleur.red(`integrations upsert failed: ${error.message}`));
    process.exit(1);
  }

  outro(kleur.green("Google connected. Next: npx pectus project create."));
}

// Dynamically load connectors/google/* by absolute file URL. Works under tsx (which
// resolves .ts files at runtime) and under a built dist/ if those modules are
// also compiled to .js — extension will be .js in that case.
type ServiceAccountKey = {
  type: "service_account";
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
};
type GoogleApps = {
  parseServiceAccountKey: (
    raw: string,
  ) => { ok: true; key: ServiceAccountKey } | { ok: false; error: string };
  testGa4Property: (
    key: ServiceAccountKey,
    propertyId: string,
  ) => Promise<{ ok: boolean; message: string }>;
  testSearchConsoleSite: (
    key: ServiceAccountKey,
    siteUrl: string,
  ) => Promise<{ ok: boolean; message: string }>;
};

async function loadGoogleApps(repo: string): Promise<GoogleApps> {
  const { pathToFileURL } = await import("node:url");
  // Try .ts first (tsx dev mode), fall back to .js (built mode).
  async function importFirstAvailable(rel: string[]): Promise<unknown> {
    let lastErr: unknown;
    for (const r of rel) {
      const candidate = path.join(repo, r);
      if (!fs.existsSync(candidate)) continue;
      try {
        return await import(pathToFileURL(candidate).href);
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr ?? new Error(`No module found in: ${rel.join(", ")}`);
  }

  const [saMod, ga4Mod, gscMod] = (await Promise.all([
    importFirstAvailable([
      "connectors/google/service-account.ts",
      "connectors/google/service-account.js",
    ]),
    importFirstAvailable(["connectors/google/ga4.ts", "connectors/google/ga4.js"]),
    importFirstAvailable(["connectors/google/gsc.ts", "connectors/google/gsc.js"]),
  ])) as [
    { parseServiceAccountKey: GoogleApps["parseServiceAccountKey"] },
    { testGa4Property: GoogleApps["testGa4Property"] },
    { testSearchConsoleSite: GoogleApps["testSearchConsoleSite"] },
  ];
  return {
    parseServiceAccountKey: saMod.parseServiceAccountKey,
    testGa4Property: ga4Mod.testGa4Property,
    testSearchConsoleSite: gscMod.testSearchConsoleSite,
  };
}
