"use client";

import { useState, useTransition } from "react";
import { refreshInsights, getInsightsActionableSnapshot } from "./actions";

type Snapshot = {
  insightCount: number;
  unadoptedSuggestedNodes: number;
  hasSeedKeywords: boolean;
};
type Result =
  | null
  | { kind: "ok"; reinterpreted: string[]; skipped: string[]; failed: string[] }
  | { kind: "err"; message: string };

export function RefreshInsightsButton({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmPending, startConfirm] = useTransition();
  const [result, setResult] = useState<Result>(null);

  const onClick = () => {
    setResult(null);
    startTransition(async () => {
      const snap = await getInsightsActionableSnapshot(code);
      setSnapshot(snap);
      setOpen(true);
    });
  };

  const onConfirm = () => {
    startConfirm(async () => {
      const r = await refreshInsights(code);
      if (!r.ok) {
        setResult({ kind: "err", message: r.error });
      } else {
        setResult({
          kind: "ok",
          reinterpreted: r.reinterpreted,
          skipped: r.skipped,
          failed: r.failed,
        });
      }
      setOpen(false);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending || confirmPending}
        onClick={onClick}
        className="inline-flex w-fit items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60"
        title="Re-interpret data from every connected app into Insights. Each connected app costs one Claude call. Useful after adding seed keywords or connecting a new data source."
      >
        {pending
          ? "Checking…"
          : confirmPending
            ? "Refreshing insights…"
            : "Refresh insights"}
      </button>

      {result?.kind === "ok" && (
        <p className="text-xs text-emerald-700">
          Re-interpreted {result.reinterpreted.length} app(s).{" "}
          {result.skipped.length > 0 && (
            <>Skipped {result.skipped.length} (already fresh). </>
          )}
          {result.failed.length > 0 && (
            <span className="text-amber-700">
              Failed: {result.failed.join(", ")}.
            </span>
          )}
        </p>
      )}
      {result?.kind === "err" && (
        <p className="text-xs text-red-600">{result.message}</p>
      )}

      {open && snapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold">Refresh insights?</h3>
            <p className="mt-2 text-sm text-zinc-700">
              This re-runs every connected app&apos;s interpretation skill
              against Claude. Each connected app costs one paid call.
            </p>

            <ul className="mt-4 space-y-1 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
              <li>
                <strong>{snapshot.insightCount}</strong> existing insights in
                this workspace.
              </li>
              <li
                title="Suggested-but-unadopted plan nodes from the last interpretation. If these are sitting unactioned, you may not need fresher insights yet — adopt or dismiss those first."
              >
                <strong>{snapshot.unadoptedSuggestedNodes}</strong> suggested
                tree nodes still waiting on you.
              </li>
              <li>
                {snapshot.hasSeedKeywords
                  ? "Seed keywords configured."
                  : "No seed keywords yet — interpretation will have little to work with."}
              </li>
            </ul>

            {snapshot.unadoptedSuggestedNodes > 0 && (
              <p
                className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
                title="Pectus generally encourages acting on previous output before regenerating. Refresh-without-action means the new run is interpreting against the same source data."
              >
                Consider adopting or dismissing the suggested nodes above
                first. Refreshing now produces new insights from the same
                source data.
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={confirmPending}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={confirmPending}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
              >
                {confirmPending ? "Refreshing…" : "Refresh now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
