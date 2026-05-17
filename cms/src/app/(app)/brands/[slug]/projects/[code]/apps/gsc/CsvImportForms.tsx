"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  importGscQueriesCsv,
  importGscPagesCsv,
  type ImportResult,
} from "./import-actions";

type Mode = "queries" | "pages";

function ImportSlot({
  mode,
  brandSlug,
  projectCode,
}: {
  mode: Mode;
  brandSlug: string;
  projectCode: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const label = mode === "queries" ? "Queries CSV" : "Pages CSV";
  const hint =
    mode === "queries"
      ? "Performance → Queries tab → Export → CSV. Columns expected: Top queries, Clicks, Impressions, CTR, Position."
      : "Performance → Pages tab → Export → CSV. Columns expected: Top pages, Clicks, Impressions, CTR, Position.";
  const action =
    mode === "queries" ? importGscQueriesCsv : importGscPagesCsv;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setRunning(true);
    setResult(null);
    try {
      const res = await action(fd);
      setResult(res);
      if (res.ok) {
        form.reset();
        startTransition(() => router.refresh());
      }
    } catch (err) {
      setResult({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRunning(false);
    }
  };

  const isBusy = running || isPending;

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={`csv-${mode}`}
          className="text-xs font-semibold uppercase tracking-widest text-zinc-700"
        >
          {label}
        </label>
        {result?.ok ? (
          <span className="text-[11px] font-medium text-emerald-700">
            ✓ Imported {result.rowCount} row{result.rowCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      <p className="text-xs text-zinc-500">{hint}</p>
      <input type="hidden" name="brand_slug" value={brandSlug} />
      <input type="hidden" name="project_code" value={projectCode} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={`csv-${mode}`}
          type="file"
          name="csv"
          accept=".csv,text/csv"
          required
          className="block max-w-full text-xs text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-black"
        />
        <button
          type="submit"
          disabled={isBusy}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {isBusy ? "Importing…" : "Import"}
        </button>
      </div>
      {result && !result.ok ? (
        <p className="text-xs text-red-700">{result.error}</p>
      ) : null}
    </form>
  );
}

export function CsvImportForms({
  brandSlug,
  projectCode,
}: {
  brandSlug: string;
  projectCode: string;
}) {
  return (
    <div className="space-y-5">
      <ImportSlot
        mode="queries"
        brandSlug={brandSlug}
        projectCode={projectCode}
      />
      <div className="border-t border-zinc-100" />
      <ImportSlot
        mode="pages"
        brandSlug={brandSlug}
        projectCode={projectCode}
      />
    </div>
  );
}
