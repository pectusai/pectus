"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { importKeywords, type ImportResult } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Importing…" : "Import keywords"}
    </button>
  );
}

export function KeywordImportForm({ code }: { code: string }) {
  const [state, formAction] = useActionState<ImportResult | null, FormData>(
    importKeywords,
    null,
  );
  const [filename, setFilename] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action={formAction}
      className="rounded-lg border border-zinc-200 bg-white p-5"
    >
      <h2 className="text-sm font-semibold">Add keywords</h2>
      <p className="mt-1 text-xs text-zinc-600">
        Upload a CSV / XLS / XLSX file or paste rows. Headers like{" "}
        <code>keyword</code>, <code>volume</code>, <code>difficulty</code>,{" "}
        <code>intent</code>, <code>position</code> are auto-mapped. Other
        columns end up in metadata.
      </p>
      <input type="hidden" name="code" value={code} />

      <div className="mt-4">
        <label
          htmlFor="kw-import-file"
          className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          title="Pick a .csv, .xls, or .xlsx file from your machine."
        >
          Choose file
        </label>
        <input
          id="kw-import-file"
          ref={fileRef}
          type="file"
          name="file"
          accept=".csv,.tsv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => setFilename(e.target.files?.[0]?.name ?? null)}
        />
        {filename ? (
          <span className="ml-3 text-xs text-zinc-600">
            {filename}{" "}
            <button
              type="button"
              onClick={() => {
                if (fileRef.current) fileRef.current.value = "";
                setFilename(null);
              }}
              className="ml-1 text-zinc-400 hover:text-zinc-700"
              title="Clear selected file"
            >
              ×
            </button>
          </span>
        ) : (
          <span className="ml-3 text-xs text-zinc-400">No file selected</span>
        )}
      </div>

      <div className="mt-4">
        <label
          htmlFor="kw-import-text"
          className="block text-xs font-medium text-zinc-700"
          title="Paste rows here if you don't want to upload a file. CSV or TSV format. The first line should be headers."
        >
          Or paste CSV / TSV
        </label>
        <textarea
          id="kw-import-text"
          name="pasted"
          rows={4}
          placeholder={`keyword,volume,difficulty\nbest espresso machine,12000,42\n…`}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Submit />
        {state ? (
          <p
            className={`text-xs ${
              state.ok ? "text-emerald-600" : "text-red-600"
            }`}
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
