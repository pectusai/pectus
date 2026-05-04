"use client";

import { useState, useTransition } from "react";
import { generateWeeklyAnalysis } from "./actions";

export function RunAnalysisButton({ code }: { code: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await generateWeeklyAnalysis(code);
            if (!result.ok) setError(result.error);
          });
        }}
        className="inline-flex w-fit items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Running…" : "Run weekly analysis"}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
