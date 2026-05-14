"use client";

import { useState, useTransition } from "react";
import { applyAllPending, type ApplyAllResult } from "./actions";

export function ApplyAllButton({ pendingCount }: { pendingCount: number }) {
  const [result, setResult] = useState<ApplyAllResult | null>(null);
  const [isPending, startTransition] = useTransition();

  if (pendingCount === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <form
        className="m-0"
        action={() =>
          startTransition(async () => {
            const r = await applyAllPending();
            setResult(r);
          })
        }
      >
        <button
          type="submit"
          disabled={isPending}
          className="pectus-updates-button-primary"
        >
          {isPending
            ? "Applying all..."
            : `Apply all ${pendingCount} pending automatically`}
        </button>
      </form>
      <span className="pectus-updates-hint">
        Runs each pending migration through Supabase&apos;s Management API in
        order. Uses <code>SUPABASE_ACCESS_TOKEN</code> from{" "}
        <code>cms/.env.local</code>.
      </span>
      {result ? (
        <p
          className={`basis-full ${result.ok ? "pectus-updates-ok" : "pectus-updates-error"}`}
          style={{ whiteSpace: "pre-wrap" }}
        >
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
