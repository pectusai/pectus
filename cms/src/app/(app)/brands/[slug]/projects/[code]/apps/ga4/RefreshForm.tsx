"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { runGa4Fetch, type Ga4FetchActionResult } from "./actions";

const INITIAL: Ga4FetchActionResult = { ok: false };

async function action(
  _prev: Ga4FetchActionResult,
  formData: FormData,
): Promise<Ga4FetchActionResult> {
  return runGa4Fetch(formData);
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Fetching…" : "Refresh GA4 data now"}
    </button>
  );
}

export function Ga4RefreshForm({
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
      {state.ok && state.rowCount !== undefined ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Wrote {state.rowCount.toLocaleString()} rows into{" "}
          <code>analytics_metrics</code>
          {state.range ? (
            <>
              {" "}
              for {state.range.since} → {state.range.until}
            </>
          ) : null}
          .
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
