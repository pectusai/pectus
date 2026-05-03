"use client";

import { useState, useTransition } from "react";
import {
  importBrandFromUrl,
  type ImportBrandResult,
  type ImportDraft,
  type ImportedFrom,
} from "./actions";

type Props = {
  disabled?: boolean;
  onImported: (
    draft: ImportDraft,
    importedFrom: ImportedFrom,
    missing: string[],
  ) => void;
};

export function ImportButton({ disabled, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setInput("");
    setError(null);
  }

  function submit() {
    setError(null);
    const formData = new FormData();
    formData.set("input", input);
    startTransition(async () => {
      const result: ImportBrandResult = await importBrandFromUrl(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onImported(result.draft, result.importedFrom, result.missing);
      close();
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Import from Claude Design
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white p-5 shadow-xl">
            <h2 id="import-modal-title" className="text-base font-semibold">
              Import from Claude Design
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Paste your Claude Design URL or handoff prompt below. Your existing
              brand values won&apos;t be overwritten until you click Apply.
            </p>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={4}
              placeholder="https://api.anthropic.com/v1/design/h/..."
              className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono"
              autoFocus
            />

            {error ? (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || !input.trim()}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60"
              >
                {pending ? "Fetching…" : "Fetch and preview"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
