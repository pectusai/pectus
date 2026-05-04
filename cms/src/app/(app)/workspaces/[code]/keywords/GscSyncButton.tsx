"use client";

import { useState, useTransition } from "react";
import { syncFromGsc } from "./actions";

export function GscSyncButton({ code }: { code: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold">Sync from Search Console</h2>
      <p className="mt-1 text-xs text-zinc-600">
        Pulls the last 90 days of queries that landed on{" "}
        <code>/{code}/</code> and upserts them as keywords. Configure the
        Google connection on <code>/apps/gsc</code> first.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await syncFromGsc(code);
            setMessage(
              result.ok
                ? {
                    ok: true,
                    text: `Imported ${result.imported}. Skipped ${result.skipped}.`,
                  }
                : { ok: false, text: result.error },
            );
          });
        }}
        className="mt-3 inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Syncing…" : "Sync now"}
      </button>
      {message ? (
        <p
          className={`mt-2 text-xs ${message.ok ? "text-emerald-600" : "text-red-600"}`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
