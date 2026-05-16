"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { runGscFetch, type GscFetchActionResult } from "./actions";

const INITIAL: GscFetchActionResult = { ok: false };

async function action(
  _prev: GscFetchActionResult,
  formData: FormData,
): Promise<GscFetchActionResult> {
  return runGscFetch(formData);
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Fetching…" : "Refresh Search Console data now"}
    </button>
  );
}

export function GscRefreshForm({
  brandSlug,
  projectCode,
}: {
  brandSlug: string;
  projectCode: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="brand_slug" value={brandSlug} />
      <input type="hidden" name="project_code" value={projectCode} />
      <Submit />
      {state.ok ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Wrote {(state.keywordRowCount ?? 0).toLocaleString()} keyword
          aggregates into <code>keywords</code> and{" "}
          {(state.dailyRowCount ?? 0).toLocaleString()} daily rows into{" "}
          <code>gsc_daily</code>.
        </div>
      ) : null}
      {state.error ? (
        <div className="whitespace-pre-wrap rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {state.error}
        </div>
      ) : null}
    </form>
  );
}
