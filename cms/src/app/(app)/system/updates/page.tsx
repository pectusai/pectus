import { requireUser } from "@/lib/auth";
import { listMigrations } from "@/lib/migrations-list";
import { ApplyForm } from "./ApplyForm";

export const dynamic = "force-dynamic";

export default async function UpdatesPage() {
  await requireUser();
  const migrations = listMigrations();

  return (
    <main className="pectus-page" style={{ maxWidth: 880, margin: "2rem auto", padding: "0 1.5rem" }}>
      <h1>Updates</h1>
      <p style={{ color: "#555" }}>
        Schema migrations on disk under <code>connectors/supabase/migrations/</code>. Click <strong>Apply</strong> to run a migration against your Supabase project. Pectus uses the <code>SUPABASE_ACCESS_TOKEN</code> from your <code>.env.local</code> to talk to Supabase&apos;s Management API.
      </p>
      <p style={{ color: "#555" }}>
        <strong>You decide which to apply.</strong> Pectus doesn&apos;t yet track which migrations are already applied (that&apos;s v0.4.2). For now, apply only the migrations new to your install. Each one is idempotent, so re-applying an already-applied migration is harmless.
      </p>

      {migrations.length === 0 ? (
        <p>No migrations found. Check that <code>connectors/supabase/migrations/</code> exists in this install.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {migrations.map((m) => (
            <li key={m.id} style={{ borderTop: "1px solid #eee", padding: "1rem 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <strong style={{ fontFamily: "ui-monospace, monospace" }}>{m.filename}</strong>
                <ApplyForm migrationId={m.id} />
              </div>
              <details style={{ marginTop: "0.5rem" }}>
                <summary style={{ cursor: "pointer", color: "#0057b8" }}>View SQL</summary>
                <pre style={{ background: "#f7f7f7", padding: "0.8rem", borderRadius: 4, overflow: "auto", fontSize: "0.85em", marginTop: "0.5rem" }}>{m.sql}</pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
