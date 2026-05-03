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
        <p className="mt-2 text-sm text-zinc-700">
          Tell Pectus which Search Console site feeds this install.
        </p>

        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
          <li>
            Open{" "}
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Search Console
            </a>{" "}
            and pick the site you want Pectus to read from.
          </li>
          <li>
            Look at the property selector at the top-left. Two flavours:
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              <li>
                <strong>URL-prefix property</strong>: paste the URL with the
                trailing slash, e.g.{" "}
                <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
                  https://example.com/
                </code>
                .
              </li>
              <li>
                <strong>Domain property</strong>: paste it as{" "}
                <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
                  sc-domain:example.com
                </code>{" "}
                (no protocol, no slash).
              </li>
            </ul>
          </li>
          <li>
            Paste the identifier below and click <strong>Test + save</strong>.
            Pectus runs a live API call; if the service account isn&apos;t
            added as a User on the site, you&apos;ll get the Google error
            verbatim and the save aborts.
          </li>
        </ol>

        {!connected ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <strong>Connect Google first.</strong> Scroll up to the Google
            Cloud connection panel and upload your service account JSON.
          </div>
        ) : (
          <form action={saveGsc} className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-zinc-700">
              Site identifier
            </label>
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
