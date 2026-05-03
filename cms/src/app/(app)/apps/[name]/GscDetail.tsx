import {
  GoogleConnectionPanel,
  type GoogleIntegration,
} from "./GoogleConnectionPanel";
import { SubmitButton } from "@/app/components/SubmitButton";
import { saveGsc } from "./actions";

export function GscDetail({
  integration,
}: {
  integration: GoogleIntegration;
}) {
  const connected = Boolean(integration?.service_account_json);
  const siteUrl = (integration as { gsc_site_url?: string } | null)
    ?.gsc_site_url;

  return (
    <div className="space-y-5">
      <GoogleConnectionPanel integration={integration} />

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            Search Console site
          </h2>
          {siteUrl ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-emerald-700">
              Saved
            </span>
          ) : null}
        </header>
        <p className="mt-1 text-xs text-zinc-600">
          The exact site identifier from Search Console. URL-prefix properties
          look like <code className="rounded bg-zinc-100 px-1 py-0.5">https://example.com/</code>{" "}
          (with the trailing slash). Domain properties look like{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">sc-domain:example.com</code>.
          Saving runs a live test; if the service account isn&apos;t added as a User on
          the site, the save fails with the API error.
        </p>

        {!connected ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Connect a Google service account above first. The same credential
            is used for GA4, Search Console, and Google Ads.
          </p>
        ) : (
          <form action={saveGsc} className="mt-3 space-y-3">
            <input
              type="text"
              name="gsc_site_url"
              defaultValue={siteUrl ?? ""}
              placeholder="https://example.com/  or  sc-domain:example.com"
              required
              className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm"
            />
            <SubmitButton
              pendingLabel="Testing + saving…"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
            >
              Test + save (activates Search Console)
            </SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
