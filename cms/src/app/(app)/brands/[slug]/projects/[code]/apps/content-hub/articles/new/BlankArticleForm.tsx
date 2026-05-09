"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/app/components/SubmitButton";
import { createBlankArticle, type BlankResult } from "./actions";

export function BlankArticleForm({
  brandSlug,
  code,
}: {
  brandSlug: string;
  code: string;
}) {
  const [state, formAction] = useActionState<BlankResult | null, FormData>(
    createBlankArticle,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="brand_slug" value={brandSlug} />
      <input type="hidden" name="code" value={code} />

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-zinc-600">
          Working title
        </span>
        <input
          name="title"
          required
          placeholder="e.g. Why small teams still struggle with time-to-hire"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-xs text-zinc-500">
          You can change this in the editor. Nothing else is required.
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton
          pendingLabel="Creating…"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Open editor
        </SubmitButton>
        {state && !state.ok ? (
          <span className="text-sm text-red-600">{state.error}</span>
        ) : null}
      </div>
    </form>
  );
}
