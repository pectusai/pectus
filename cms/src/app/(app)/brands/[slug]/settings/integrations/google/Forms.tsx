"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  saveGoogleServiceAccount,
  saveGa4,
  saveGsc,
  type ActionState,
} from "./actions";

const INITIAL: ActionState = { ok: false };

function FeedbackBlock({ state }: { state: ActionState }) {
  if (state.ok && state.message) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        {state.message}
      </div>
    );
  }
  if (state.error) {
    return (
      <div className="whitespace-pre-wrap rounded-md border border-red-300 bg-red-50 p-3 text-sm leading-relaxed text-red-900">
        {state.error}
      </div>
    );
  }
  return null;
}

function Submit({
  pendingLabel,
  children,
}: {
  pendingLabel: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function GoogleSAForm({ brandSlug }: { brandSlug: string }) {
  const [state, formAction] = useActionState(saveGoogleServiceAccount, INITIAL);
  return (
    <form action={formAction} className="mt-5 space-y-3">
      <input type="hidden" name="brand_slug" value={brandSlug} />
      <div>
        <label className="block text-xs font-medium text-zinc-700">
          Upload the JSON file
        </label>
        <input
          type="file"
          name="service_account_file"
          accept="application/json,.json"
          className="mt-1 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-zinc-800"
        />
      </div>

      <div className="relative flex items-center gap-2 text-[11px] uppercase tracking-widest text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200" />
        <span>or paste it</span>
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700">
          Paste the JSON contents
        </label>
        <textarea
          name="service_account_json"
          rows={5}
          placeholder='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs"
        />
      </div>

      <p className="text-[11px] text-zinc-500">
        Stored in the <code>integrations</code> table in your Supabase. Never
        leaves your install.
      </p>
      <FeedbackBlock state={state} />
      <Submit pendingLabel="Saving…">Save Google connection</Submit>
    </form>
  );
}

export function Ga4PropertyForm({
  brandSlug,
  defaultPropertyId,
}: {
  brandSlug: string;
  defaultPropertyId: string;
}) {
  const [state, formAction] = useActionState(saveGa4, INITIAL);
  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="brand_slug" value={brandSlug} />
      <label className="block text-xs font-medium text-zinc-700">
        Property ID
      </label>
      <input
        type="text"
        name="ga4_property_id"
        defaultValue={defaultPropertyId}
        placeholder="123456789"
        required
        inputMode="numeric"
        pattern="\d+"
        className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm sm:max-w-xs"
      />
      <FeedbackBlock state={state} />
      <Submit pendingLabel="Testing + saving…">Test + save</Submit>
    </form>
  );
}

export function GscSiteForm({
  brandSlug,
  defaultSiteUrl,
}: {
  brandSlug: string;
  defaultSiteUrl: string;
}) {
  const [state, formAction] = useActionState(saveGsc, INITIAL);
  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="brand_slug" value={brandSlug} />
      <label className="block text-xs font-medium text-zinc-700">
        Site identifier
      </label>
      <input
        type="text"
        name="gsc_site_url"
        defaultValue={defaultSiteUrl}
        placeholder="https://example.com/  or  sc-domain:example.com"
        required
        className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm"
      />
      <FeedbackBlock state={state} />
      <Submit pendingLabel="Testing + saving…">Test + save</Submit>
    </form>
  );
}
