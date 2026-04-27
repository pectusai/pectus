"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/app/components/SubmitButton";
import { importKeywordsCsv, type ImportResult } from "./actions";

export function KeywordImportForm({ code }: { code: string }) {
  const [state, formAction] = useActionState<ImportResult | null, FormData>(
    importKeywordsCsv,
    null,
  );

  return (
    <form
      action={formAction}
      className="rounded-lg border border-zinc-200 bg-white p-5"
    >
      <h2 className="text-sm font-semibold">Upload CSV</h2>
      <p className="mt-1 text-xs text-zinc-600">
        Headers like <code>keyword</code>, <code>volume</code>,{" "}
        <code>difficulty</code>, <code>intent</code>, <code>position</code> are
        auto-mapped. Other columns end up in metadata.
      </p>
      <input type="hidden" name="code" value={code} />
      <input
        type="file"
        name="file"
        accept=".csv"
        required
        className="mt-3 block w-full text-sm"
      />
      <div className="mt-3 flex items-center gap-3">
        <SubmitButton
          pendingLabel="Importing…"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Import
        </SubmitButton>
        {state ? (
          <p
            className={`text-xs ${state.ok ? "text-emerald-600" : "text-red-600"}`}
          >
            {state.ok
              ? `Imported ${state.imported}. Skipped ${state.skipped}.`
              : (state.error ?? "Import failed.")}
          </p>
        ) : null}
      </div>
    </form>
  );
}
