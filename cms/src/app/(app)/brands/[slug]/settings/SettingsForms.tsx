"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Brand } from "@/lib/active-brand";
import { renameBrand, deleteBrand } from "./actions";

export function SettingsForms({ brand }: { brand: Brand }) {
  return (
    <div className="space-y-8">
      <RenameForm brand={brand} />
      <DeleteForm brand={brand} />
    </div>
  );
}

function RenameForm({ brand }: { brand: Brand }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nextSlug, setNextSlug] = useState(brand.slug);
  const [name, setName] = useState(brand.name ?? "");

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-700">
        Rename
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Slug appears in every brand URL. Lowercase letters, digits, and hyphens.
      </p>
      <form
        className="mt-4 space-y-3"
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await renameBrand(formData);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.push(`/brands/${result.slug}/settings`);
            router.refresh();
          });
        }}
      >
        <input type="hidden" name="current_slug" value={brand.slug} />
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-zinc-500">
            Display name
          </span>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-zinc-500">
            Slug
          </span>
          <input
            name="slug"
            value={nextSlug}
            onChange={(e) => setNextSlug(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
            pattern="[a-z0-9-]+"
            required
          />
        </label>
        {error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </section>
  );
}

function DeleteForm({ brand }: { brand: Brand }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const matches = confirmation === brand.slug;

  return (
    <section className="rounded-lg border border-red-300 bg-red-50 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-red-700">
        Danger zone
      </h2>
      <p className="mt-1 text-xs text-red-700">
        Deleting <span className="font-mono">{brand.slug}</span> drops every
        workspace, integration, article, page, insight, and review attached to
        it, plus the disk folder <span className="font-mono">brands/{brand.slug}/</span>.
        This cannot be undone.
      </p>
      <form
        className="mt-4 space-y-3"
        action={(formData) => {
          setError(null);
          if (!matches) return;
          startTransition(async () => {
            const result = await deleteBrand(formData);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.push(result.next);
            router.refresh();
          });
        }}
      >
        <input type="hidden" name="brand_slug" value={brand.slug} />
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-red-700">
            Type the slug to confirm
          </span>
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="mt-1 w-full rounded border border-red-300 px-3 py-2 font-mono text-sm"
            placeholder={brand.slug}
          />
        </label>
        {error ? <p className="text-xs text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || !matches}
          className="rounded bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Delete this brand"}
        </button>
      </form>
    </section>
  );
}
