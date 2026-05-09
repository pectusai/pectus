import Link from "next/link";
import { createServerClient } from "@pectus/supabase";
import { listMigrations } from "@/lib/migrations-list";

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

  const bookkeepingMissing =
    error && (error as { code?: string }).code === "42P01";

  const applied = new Set<string>(
    bookkeepingMissing
      ? []
      : (appliedRows ?? []).map((r) => r.filename as string),
  );

  const all = listMigrations();
  const pending = all.filter((m) => !applied.has(m.filename));

  if (pending.length === 0) return null;

  const count = pending.length;

  return (
    <div className="pectus-migration-overlay" role="dialog" aria-modal="true">
      <div className="pectus-migration-overlay-card">
        <h2 className="pectus-migration-overlay-title">Schema update available</h2>
        <p className="pectus-migration-overlay-body">
          {bookkeepingMissing
            ? "First-time setup hasn't recorded any applied migrations yet. Open the updates screen to bootstrap and apply pending changes."
            : count === 1
              ? `One pending migration: `
              : `${count} pending migrations: `}
          {!bookkeepingMissing ? (
            <code>{pending.map((m) => m.filename).join(", ")}</code>
          ) : null}
        </p>
        <p className="pectus-migration-overlay-help">
          You can apply automatically (Pectus runs the SQL via Supabase&apos;s
          Management API) or copy the SQL and paste it into Supabase&apos;s SQL
          editor yourself.
        </p>
        <Link
          href="/settings/updates"
          className="pectus-migration-overlay-button"
        >
          Open updates
        </Link>
      </div>
    </div>
  );
}
