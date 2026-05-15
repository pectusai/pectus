"use client";

import { useState, useTransition } from "react";
import { updateVariantSlug } from "./actions";

export function SlugEditor({
  projectCode,
  variantId,
  initialSlug,
  isHomepage = false,
}: {
  projectCode: string;
  variantId: string;
  initialSlug: string;
  isHomepage?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [slug, setSlug] = useState(initialSlug);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isHomepage) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded border border-transparent px-1 text-xs text-zinc-700"
        title="Homepage. Published at the root URL (/). The slug is locked because the homepage always lives at the root."
      >
        <span aria-hidden className="font-mono">/</span>
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">
          homepage
        </span>
      </span>
    );
  }

  const save = () => {
    setError(null);
    startTransition(async () => {
      const r = await updateVariantSlug({
        projectCode,
        variantId,
        slug,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSlug(r.slug);
      setEditing(false);
    });
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 rounded border border-transparent px-1 font-mono text-xs text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
        title="Click to edit the slug. Saves immediately. Publish afterwards to commit the new URL — the publish flow auto-creates a 301 redirect from the previous published path."
      >
        <span aria-hidden>/</span>
        {slug}
        <span aria-hidden className="text-[10px] text-zinc-400">
          ✎
        </span>
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span className="inline-flex items-center gap-1">
        <span aria-hidden className="font-mono text-xs text-zinc-500">
          /
        </span>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          autoFocus
          disabled={pending}
          className="rounded border border-zinc-300 px-2 py-0.5 font-mono text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setSlug(initialSlug);
              setEditing(false);
            }
          }}
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded bg-zinc-900 px-2 py-0.5 text-[11px] text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setSlug(initialSlug);
            setError(null);
            setEditing(false);
          }}
          className="rounded px-2 py-0.5 text-[11px] text-zinc-600 hover:bg-zinc-100"
        >
          Cancel
        </button>
      </span>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </span>
  );
}
