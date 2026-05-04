"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createBrand, type CreateBrandResult } from "./actions";

const INITIAL: CreateBrandResult | null = null;

function slugSuggest(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
    >
      {pending ? "Creating…" : "Create brand"}
    </button>
  );
}

export function AddBrandForm() {
  const [state, formAction] = useActionState(createBrand, INITIAL);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Add brand
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-700">
          New brand
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 hover:text-zinc-900"
        >
          Cancel
        </button>
      </header>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span
            className="text-xs uppercase tracking-widest text-zinc-500"
            title="Display name shown across the CMS. Max 200 chars."
          >
            Name
          </span>
          <input
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugSuggest(e.target.value));
            }}
            required
            maxLength={200}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Acme Coffee"
          />
        </label>

        <label className="block">
          <span
            className="text-xs uppercase tracking-widest text-zinc-500"
            title="URL slug used in /brands/<slug>/. Lowercase letters, digits, and hyphens only. Max 80 chars."
          >
            Slug
          </span>
          <input
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            pattern="[a-z0-9](?:[a-z0-9-]{0,79})"
            required
            maxLength={80}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
            placeholder={slugSuggest(name) || "acme-coffee"}
          />
          <span className="mt-1 block text-[11px] text-zinc-500">
            Auto-derived from Name. Override before submit if you want.
          </span>
        </label>

        {state && !state.ok ? (
          <p className="text-xs text-red-600">{state.error}</p>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Submit />
      </div>
    </form>
  );
}
