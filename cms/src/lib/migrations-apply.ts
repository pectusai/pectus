import { createServiceClient } from "@pectus/supabase";
import { listMigrations, type Migration } from "./migrations-list";
import { runManagementSql } from "./management-api";

export type MigrationApplyOutcome =
  | { filename: string; ok: true }
  | { filename: string; ok: false; error: string };

export type MigrationApplyFailure = {
  filename: string;
  ok: false;
  error: string;
};

export type PendingApplyReport = {
  attempted: number;
  succeeded: string[];
  failed: MigrationApplyFailure[];
  remaining: string[];
};

async function fetchAppliedFilenames(): Promise<{
  applied: Set<string>;
  bookkeepingMissing: boolean;
}> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("_pectus_migrations")
      .select("filename");
    if (error && (error as { code?: string }).code === "42P01") {
      return { applied: new Set(), bookkeepingMissing: true };
    }
    if (error) {
      return { applied: new Set(), bookkeepingMissing: false };
    }
    return {
      applied: new Set((data ?? []).map((r) => r.filename as string)),
      bookkeepingMissing: false,
    };
  } catch {
    return { applied: new Set(), bookkeepingMissing: false };
  }
}

async function recordApplied(filename: string): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase
      .from("_pectus_migrations")
      .upsert({ filename }, { onConflict: "filename" });
  } catch {
    /* the migration's own self-insert covers this */
  }
}

export async function applyOne(m: Migration): Promise<MigrationApplyOutcome> {
  const res = await runManagementSql(m.sql);
  if (!res.ok) {
    return { filename: m.filename, ok: false, error: res.error };
  }
  await recordApplied(m.filename);
  return { filename: m.filename, ok: true };
}

export async function runPendingMigrations(): Promise<PendingApplyReport> {
  const all = listMigrations();
  const { applied } = await fetchAppliedFilenames();
  const pending = all.filter((m) => !applied.has(m.filename));

  if (pending.length === 0) {
    return { attempted: 0, succeeded: [], failed: [], remaining: [] };
  }

  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    return {
      attempted: 0,
      succeeded: [],
      failed: [],
      remaining: pending.map((m) => m.filename),
    };
  }

  const succeeded: string[] = [];
  const failed: MigrationApplyFailure[] = [];

  for (const m of pending) {
    const outcome = await applyOne(m);
    if (outcome.ok) {
      succeeded.push(outcome.filename);
    } else {
      failed.push(outcome);
      break;
    }
  }

  const { applied: appliedAfter } = await fetchAppliedFilenames();
  const remaining = all
    .filter((m) => !appliedAfter.has(m.filename))
    .map((m) => m.filename);

  return {
    attempted: succeeded.length + failed.length,
    succeeded,
    failed,
    remaining,
  };
}
