import Link from "next/link";
import { createServerClient } from "@pectus/supabase";
import { requireAdmin } from "@/lib/auth";
import { listMigrations, type Migration } from "@/lib/migrations-list";
import { MigrationRow } from "./MigrationRow";
import { ApplyAllButton } from "./ApplyAllButton";

export const dynamic = "force-dynamic";

async function getAppliedFilenames(): Promise<{
  applied: Set<string>;
  bookkeepingMissing: boolean;
}> {
  const supabase = await createServerClient();
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
}

export default async function UpdatesPage() {
  await requireAdmin();
  const migrations = listMigrations();
  const { applied, bookkeepingMissing } = await getAppliedFilenames();

  const pending: Migration[] = migrations.filter((m) => !applied.has(m.filename));
  const done: Migration[] = migrations.filter((m) => applied.has(m.filename));

  return (
    <main className="pectus-updates">
      <header className="pectus-updates-header">
        <Link href="/settings" className="pectus-updates-back">← Settings</Link>
        <h1>Schema updates</h1>
        <p className="pectus-updates-lede">
          Each pending migration can be applied automatically (Pectus runs the
          SQL against your Supabase via the Management API) or copy-pasted into
          Supabase&apos;s SQL editor by hand. Both paths record themselves in
          the bookkeeping table when finished.
        </p>
      </header>

      {bookkeepingMissing ? (
        <div className="pectus-updates-callout">
          <strong>First-time bootstrap.</strong> Your database doesn&apos;t have
          the bookkeeping table yet. Apply <code>0001_pectus_v04.sql</code>{" "}
          using either path below — it&apos;s idempotent, safe to re-run on a
          live install. After it finishes, the rest of your migrations will
          appear correctly here.
        </div>
      ) : null}

      <section className="pectus-updates-section">
        <h2>Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="pectus-updates-empty">Nothing to apply. You&apos;re up to date.</p>
        ) : (
          <>
            <ApplyAllButton pendingCount={pending.length} />
            <ul className="pectus-updates-list">
              {pending.map((m) => (
                <MigrationRow key={m.id} migration={m} status="pending" />
              ))}
            </ul>
          </>
        )}
      </section>

      {done.length > 0 ? (
        <section className="pectus-updates-section pectus-updates-section-quiet">
          <h2>Already applied ({done.length})</h2>
          <ul className="pectus-updates-list">
            {done.map((m) => (
              <MigrationRow key={m.id} migration={m} status="done" />
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
