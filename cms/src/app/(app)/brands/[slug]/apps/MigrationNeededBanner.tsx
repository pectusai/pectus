import { readFile } from "node:fs/promises";
import path from "node:path";

export async function MigrationNeededBanner() {
  let sql = "";
  try {
    sql = await readFile(
      path.join(
        process.cwd(),
        "..",
        "connectors",
        "supabase",
        "migrations",
        "0006_activated_apps.sql",
      ),
      "utf8",
    );
  } catch {
    sql = "(could not read 0006_activated_apps.sql from this install)";
  }

  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 p-5">
      <h2 className="text-sm font-semibold text-amber-900">
        Migration required
      </h2>
      <p className="mt-1 text-sm text-amber-900">
        Pectus v0.3 added two new tables that this Supabase project does not
        have yet. Apps will keep showing as Available until the migration runs.
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-amber-900">
        <li>
          Open your Supabase SQL Editor:{" "}
          <code className="rounded bg-white/60 px-1 py-0.5 text-xs">
            Supabase dashboard → SQL Editor → New query
          </code>
        </li>
        <li>Paste the SQL below.</li>
        <li>
          Run it. The DO block at the bottom auto-activates content-hub for any
          workspace that already has a mount slug or content_hub_repo set.
        </li>
        <li>Refresh this page.</li>
      </ol>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-amber-900 hover:text-amber-950">
          Show the SQL (also at{" "}
          <code className="rounded bg-white/60 px-1 py-0.5 text-xs">
            connectors/supabase/migrations/0006_activated_apps.sql
          </code>
          )
        </summary>
        <pre className="mt-3 max-h-[40vh] overflow-auto rounded bg-white p-3 text-xs leading-relaxed text-zinc-800">
          {sql}
        </pre>
      </details>

      <p className="mt-4 text-xs text-amber-800">
        Future Pectus releases that add migrations will surface here too. When
        the pectus.ai release notes page is live it will index every required
        action across versions; for now this banner is the source of truth.
      </p>
    </section>
  );
}
