"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ApplyMigrationsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const apply = async () => {
    setError(null);
    setRunning(true);
    try {
      const res = await fetch("/api/admin/migrate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(
          `Failed at ${data.failedAt ?? "unknown"}: ${data.error ?? "unknown error"}`,
        );
        setRunning(false);
        return;
      }
      startTransition(() => router.refresh());
      setRunning(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setRunning(false);
    }
  };

  return (
    <div className="pectus-migration-banner-actions">
      <button
        type="button"
        onClick={apply}
        disabled={running || isPending}
        className="pectus-migration-banner-button"
      >
        {running || isPending ? "Applying..." : "Apply now"}
      </button>
      {error ? (
        <div className="pectus-migration-banner-error">{error}</div>
      ) : null}
    </div>
  );
}
