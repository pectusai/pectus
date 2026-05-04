"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createProject, type CreateProjectResult } from "./actions";

const INITIAL: CreateProjectResult | null = null;

function codeSuggest(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
    >
      {pending ? "Creating…" : "Create project"}
    </button>
  );
}

export function AddProjectForm({ brandSlug }: { brandSlug: string }) {
  const [state, formAction] = useActionState(createProject, INITIAL);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Add project
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
          New project
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 hover:text-zinc-900"
        >
          Cancel
        </button>
      </header>

      <input type="hidden" name="brand_slug" value={brandSlug} />

      <div className="mt-4 space-y-3">
        <label className="block">
          <span
            className="text-xs uppercase tracking-widest text-zinc-500"
            title="Human label for this market or audience. Examples: Main, United Kingdom, DTC US."
          >
            Name
          </span>
          <input
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!codeTouched) setCode(codeSuggest(e.target.value));
            }}
            required
            maxLength={200}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Main"
          />
        </label>

        <label className="block">
          <span
            className="text-xs uppercase tracking-widest text-zinc-500"
            title="Short identifier used in URLs. Lowercase letters, digits, hyphens. For a single-market install, 'main' is the standard pick."
          >
            Code
          </span>
          <input
            name="code"
            value={code}
            onChange={(e) => {
              setCodeTouched(true);
              setCode(e.target.value);
            }}
            pattern="[a-z0-9](?:[a-z0-9-]{0,39})"
            required
            maxLength={40}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
            placeholder="main"
          />
          <span className="mt-1 block text-[11px] text-zinc-500">
            Auto-derived from Name. Override before submit if you want.
          </span>
        </label>

        <label className="block">
          <span
            className="text-xs uppercase tracking-widest text-zinc-500"
            title="BCP-47 language and country tag. Drives content language and what data sources scope to. en-US for American English, en-GB for British English, sv-SE for Swedish."
          >
            Locale
          </span>
          <input
            name="locale"
            defaultValue="en-US"
            pattern="[a-z]{2}(-[A-Z]{2})?"
            required
            className="mt-1 w-32 rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
            placeholder="en-US"
          />
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
