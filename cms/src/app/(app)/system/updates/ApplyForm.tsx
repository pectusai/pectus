"use client";

import { useState, useTransition } from "react";
import { applyMigration, type ApplyResult } from "./actions";

export function ApplyForm({ migrationId }: { migrationId: string }) {
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const res = await applyMigration(formData);
          setResult(res);
        })
      }
      className="updates-apply"
    >
      <input type="hidden" name="id" value={migrationId} />
      <button type="submit" disabled={isPending} className="pectus-button">
        {isPending ? "Applying…" : "Apply via Management API"}
      </button>
      {result ? (
        <p className={result.ok ? "updates-ok" : "updates-error"}>{result.message}</p>
      ) : null}
    </form>
  );
}
