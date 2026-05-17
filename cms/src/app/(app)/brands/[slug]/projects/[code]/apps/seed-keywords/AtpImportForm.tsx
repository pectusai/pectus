"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importAtpCsv, type ImportResult } from "./import-actions";

export function AtpImportForm({
  brandSlug,
  projectCode,
}: {
  brandSlug: string;
  projectCode: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setRunning(true);
    setResult(null);
    try {
      const res = await importAtpCsv(fd);
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
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="brand_slug" value={brandSlug} />
      <input type="hidden" name="project_code" value={projectCode} />

      <div className="space-y-1">
        <label
          htmlFor="seed-fallback"
          className="text-xs font-semibold uppercase tracking-widest text-zinc-700"
        >
          Seed keyword (fallback)
        </label>
        <input
          id="seed-fallback"
          type="text"
          name="seed_keyword_fallback"
          placeholder="e.g. data-driven marketing"
          className="block w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900"
        />
        <p className="text-[11px] text-zinc-500">
          Used when the CSV doesn&apos;t have a Seed column. Most
          AnswerThePublic exports cover a single seed at a time — type it
          here.
        </p>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="atp-csv"
          className="text-xs font-semibold uppercase tracking-widest text-zinc-700"
        >
          AnswerThePublic CSV
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="atp-csv"
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
        <p className="text-[11px] text-zinc-500">
          Accepts AnswerThePublic CSV exports plus any CSV with a text column
          (Question / Phrase / Query). Optional columns: Seed, Tab
          (questions / prepositions / comparisons / alphabeticals / related),
          Bucket, Locale.
        </p>
      </div>

      {result?.ok ? (
        <p className="text-[12px] font-medium text-emerald-700">
          ✓ Imported {result.rowCount} new row
          {result.rowCount === 1 ? "" : "s"}
          {result.skipped > 0
            ? ` · ${result.skipped} duplicate${result.skipped === 1 ? "" : "s"} skipped`
            : ""}
        </p>
      ) : null}
      {result && !result.ok ? (
        <p className="text-[12px] text-red-700">{result.error}</p>
      ) : null}
    </form>
  );
}
