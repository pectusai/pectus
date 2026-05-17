"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MigrationOverlayClient({
  pending,
  bookkeepingMissing,
}: {
  pending: string[];
  bookkeepingMissing: boolean;
}) {
  const pathname = usePathname();
  if (pathname?.startsWith("/settings/updates")) return null;

  const count = pending.length;

  return (
    <div className="pectus-migration-overlay" role="dialog" aria-modal="true">
      <div className="pectus-migration-overlay-card">
        <h2 className="pectus-migration-overlay-title">
          Schema update available
        </h2>
        <p className="pectus-migration-overlay-body">
          {bookkeepingMissing
            ? "First-time setup hasn't recorded any applied migrations yet. Open the updates screen to bootstrap and apply pending changes."
            : count === 1
              ? "One pending migration: "
              : `${count} pending migrations: `}
          {!bookkeepingMissing ? <code>{pending.join(", ")}</code> : null}
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
        <p className="pectus-migration-overlay-help" style={{ marginTop: "0.75rem", opacity: 0.75 }}>
          If every update on the updates screen shows <strong>Applied</strong>{" "}
          but this card is still here, do a hard refresh of the page
          (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows). The card is rendered
          by the layout and a soft navigation can keep a cached copy around.
        </p>
      </div>
    </div>
  );
}
