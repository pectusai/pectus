// Check which migration files on disk have not yet been recorded in the
// user's Supabase `_pectus_migrations` table. Used by `pectus update` to
// tell the user there are pending DB changes after a pull.
//
// Best-effort: if env vars aren't set, or the DB is unreachable, or the
// bookkeeping table doesn't exist yet (pre-v0.4 install), returns null.
// Don't fail the update over this.

import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./load-env.js";

export type PendingResult = {
  pending: string[];
  reason?: string;
};

export async function checkPendingMigrations(
  repo: string,
): Promise<PendingResult | null> {
  loadEnv();

  const migrationsDir = path.join(repo, "connectors", "supabase", "migrations");
  if (!fs.existsSync(migrationsDir)) return null;

  const onDisk = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (onDisk.length === 0) return null;

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return { pending: onDisk, reason: "no-env" };
  }

  let applied: Set<string>;
  try {
    const { getServiceClient } = await import("./supabase.js");
    const supabase = await getServiceClient();
    const { data, error } = await supabase
      .from("_pectus_migrations")
      .select("filename");
    if (error) {
      const msg = String(error.message ?? "");
      if (/relation .* does not exist|does not exist/i.test(msg)) {
        return { pending: onDisk, reason: "no-baseline" };
      }
      return { pending: [], reason: "query-error" };
    }
    applied = new Set((data ?? []).map((r) => r.filename as string));
  } catch {
    return { pending: [], reason: "connect-error" };
  }

  const pending = onDisk.filter((f) => !applied.has(f));
  return { pending };
}
