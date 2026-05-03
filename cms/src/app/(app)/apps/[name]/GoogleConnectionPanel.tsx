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
      <p className="mt-2 text-sm text-zinc-700">
        GA4, Search Console, and Google Ads all read through one Google
        service account. Set it up once here.
      </p>

      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
        <li>
          Open{" "}
          <a
            href="https://console.cloud.google.com/iam-admin/serviceaccounts"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            Google Cloud Console → Service accounts
          </a>{" "}
          and pick a project (or create one).
        </li>
        <li>
          Click <strong>Create service account</strong>. Give it a name like
          <code className="ml-1 rounded bg-zinc-100 px-1 py-0.5 text-xs">
            pectus-reader
          </code>
          . Skip the optional permissions step.
        </li>
        <li>
          Open the new account → <strong>Keys</strong> tab → <strong>Add key</strong> →{" "}
          <strong>Create new key</strong> → <strong>JSON</strong>. A file
          downloads to your machine.
        </li>
        <li>
          Enable two APIs for the same project:{" "}
          <a
            href="https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            Analytics Data API
          </a>{" "}
          and{" "}
          <a
            href="https://console.cloud.google.com/apis/library/searchconsole.googleapis.com"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            Search Console API
          </a>
          . Click each, then <strong>Enable</strong>.
        </li>
        <li>
          In GA4 (Admin → Property access), add the service account email
          (from the JSON&apos;s <code>client_email</code> field) as a{" "}
          <strong>Viewer</strong>. In Search Console (Settings → Users &
          permissions), add the same email as a <strong>User</strong>.
        </li>
        <li>Upload the JSON below (or paste its contents).</li>
      </ol>

      <form action={saveGoogleServiceAccount} className="mt-5 space-y-3">
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
