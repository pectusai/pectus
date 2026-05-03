import { SubmitButton } from "@/app/components/SubmitButton";
import {
  saveGoogleServiceAccount,
  clearGoogleServiceAccount,
} from "./actions";

export type GoogleIntegration = {
  service_account_json: { client_email?: string } | null;
  account_email: string | null;
  last_verified_at: string | null;
  last_verify_note: string | null;
} | null;

export function GoogleConnectionPanel({
  integration,
}: {
  integration: GoogleIntegration;
}) {
  const connected = Boolean(integration?.service_account_json);

  if (connected) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            Google Cloud connection
          </h2>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-emerald-700">
            Connected
          </span>
        </header>
        <dl className="mt-3 grid gap-2 text-xs text-zinc-700 sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Service account</dt>
            <dd className="mt-0.5 break-all font-mono">
              {integration?.account_email ?? "(missing email)"}
            </dd>
          </div>
          {integration?.last_verified_at ? (
            <div>
              <dt className="text-zinc-500">Last verified</dt>
              <dd className="mt-0.5">
                {new Date(integration.last_verified_at).toLocaleString()}
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-3 text-xs text-zinc-500">
          GA4, Search Console, and Google Ads all share this credential. Per-API
          configuration (property ID, site URL, customer ID) lives on each
          app&apos;s page.
        </p>
        <form action={clearGoogleServiceAccount} className="mt-3">
          <SubmitButton
            pendingLabel="Clearing…"
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Disconnect Google
          </SubmitButton>
        </form>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900">
          Google Cloud connection
        </h2>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
          Not connected
        </span>
      </header>
      <p className="mt-2 text-xs text-zinc-600">
        GA4, Search Console, and Google Ads all read through one Google service
        account. Create one in Google Cloud Console (project → Service
        accounts → Create), download its JSON key, and grant it Viewer access
        to your GA4 property and User access to your Search Console site.
        Paste the full JSON below.
      </p>
      <form action={saveGoogleServiceAccount} className="mt-3 space-y-2">
        <textarea
          name="service_account_json"
          required
          rows={6}
          placeholder='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
          className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs"
        />
        <p className="text-[11px] text-zinc-500">
          Pectus stores the JSON in the <code>integrations</code> table in
          your Supabase. It never leaves your install.
        </p>
        <SubmitButton
          pendingLabel="Saving…"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
        >
          Save Google connection
        </SubmitButton>
      </form>
    </section>
  );
}
