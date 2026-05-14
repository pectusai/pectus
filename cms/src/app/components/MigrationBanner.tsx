import { createServerClient } from "@pectus/supabase";
import { listMigrations } from "@/lib/migrations-list";
import { runPendingMigrations } from "@/lib/migrations-apply";
import { MigrationOverlayClient } from "./MigrationOverlayClient";

export async function MigrationBanner() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return null;

  async function readApplied(): Promise<{
    applied: Set<string>;
    bookkeepingMissing: boolean;
  }> {
    const { data, error } = await supabase
      .from("_pectus_migrations")
      .select("filename");
    const missing = !!error && (error as { code?: string }).code === "42P01";
    return {
      applied: new Set(
        missing ? [] : (data ?? []).map((r) => r.filename as string),
      ),
      bookkeepingMissing: missing,
    };
  }

  let { applied, bookkeepingMissing } = await readApplied();
  const all = listMigrations();
  let pending = all
    .filter((m) => !applied.has(m.filename))
    .map((m) => m.filename);

  if (pending.length === 0) return null;

  if (process.env.SUPABASE_ACCESS_TOKEN) {
    const report = await runPendingMigrations();
    if (report.succeeded.length > 0) {
      const reread = await readApplied();
      applied = reread.applied;
      bookkeepingMissing = reread.bookkeepingMissing;
      pending = all
        .filter((m) => !applied.has(m.filename))
        .map((m) => m.filename);
    }
  }

  if (pending.length === 0) return null;

  return (
    <MigrationOverlayClient
      pending={pending}
      bookkeepingMissing={bookkeepingMissing}
    />
  );
}
