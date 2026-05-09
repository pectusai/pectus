import { createServerClient } from "@pectus/supabase";
import { listMigrations } from "@/lib/migrations-list";
import { ApplyMigrationsButton } from "./ApplyMigrationsButton";

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

  const { data: appliedRows, error } = await supabase
    .from("_pectus_migrations")
    .select("filename");

  const applied = new Set<string>(
    (appliedRows ?? []).map((r) => r.filename as string),
  );
  const all = listMigrations();
  const pending = all
    .filter((m) => !applied.has(m.filename))
    .map((m) => m.filename);

  if (pending.length === 0) return null;

  const bookkeepingMissing =
    error && (error as { code?: string }).code === "42P01";

  return (
    <div className="pectus-migration-banner">
      <div className="pectus-migration-banner-inner">
        <div className="pectus-migration-banner-text">
          <strong>Schema update available.</strong>{" "}
          {bookkeepingMissing ? (
            <>
              First-time bookkeeping is not in your database yet. Apply{" "}
              <code>{pending[0]}</code> to set it up.
            </>
          ) : (
            <>
              {pending.length} pending migration
              {pending.length === 1 ? "" : "s"}:{" "}
              <code>{pending.join(", ")}</code>
            </>
          )}
        </div>
        <ApplyMigrationsButton />
      </div>
    </div>
  );
}
