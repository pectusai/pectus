import { createServerClient } from "@pectus/supabase";
import { getBrandBySlug } from "@/lib/active-brand";
import { SubmitButton } from "@/app/components/SubmitButton";
import {
  GoogleSAForm,
  Ga4PropertyForm,
  GscSiteForm,
} from "./Forms";
import { clearGoogleServiceAccount } from "./actions";

type GoogleIntegration = {
  service_account_json: { client_email?: string } | null;
  account_email: string | null;
  ga4_property_id: string | null;
  gsc_site_url: string | null;
  last_verified_at: string | null;
  last_verify_note: string | null;
} | null;

export default async function GoogleIntegrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("integrations")
    .select(
      "service_account_json, account_email, ga4_property_id, gsc_site_url, last_verified_at, last_verify_note",
    )
    .eq("brand_id", brand.id)
    .eq("provider", "google")
    .maybeSingle();
  const integration = data as GoogleIntegration;
  const connected = Boolean(integration?.service_account_json);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Google integration
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          One service account credentials this brand&apos;s GA4, Search Console,
          and Google Ads apps. Per-API config (property ID, site URL) lives
          below the credential.
        </p>
      </header>

      <ConnectionPanel
        integration={integration}
        connected={connected}
        brandSlug={slug}
      />

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">GA4 property</h2>
          {integration?.ga4_property_id ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-emerald-700">
              Saved
            </span>
          ) : null}
        </header>
        <p className="mt-2 text-sm text-zinc-700">
          The numeric Property ID Pectus reads from. Find it under GA4 → Admin →
          Property settings (not the Measurement ID that starts with G-).
        </p>
        {!connected ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <strong>Connect Google first.</strong> Upload the service account
            JSON above.
          </div>
        ) : (
          <Ga4PropertyForm
            brandSlug={slug}
            defaultPropertyId={integration?.ga4_property_id ?? ""}
          />
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            Search Console site
          </h2>
          {integration?.gsc_site_url ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-emerald-700">
              Saved
            </span>
          ) : null}
        </header>
        <p className="mt-2 text-sm text-zinc-700">
          URL-prefix property: paste it like{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
            https://example.com/
          </code>
          . Domain property: use{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
            sc-domain:example.com
          </code>
          .
        </p>
        {!connected ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <strong>Connect Google first.</strong> Upload the service account
            JSON above.
          </div>
        ) : (
          <GscSiteForm
            brandSlug={slug}
            defaultSiteUrl={integration?.gsc_site_url ?? ""}
          />
        )}
      </section>
    </div>
  );
}

function ConnectionPanel({
  integration,
  connected,
  brandSlug,
}: {
  integration: GoogleIntegration;
  connected: boolean;
  brandSlug: string;
}) {
  if (connected) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            Service account
          </h2>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-emerald-700">
            Connected
          </span>
        </header>
        <dl className="mt-3 grid gap-2 text-xs text-zinc-700 sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Email</dt>
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
        <form action={clearGoogleServiceAccount} className="mt-3">
          <input type="hidden" name="brand_slug" value={brandSlug} />
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
        <h2 className="text-sm font-semibold text-zinc-900">Service account</h2>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
          Not connected
        </span>
      </header>
      <p className="mt-2 text-sm text-zinc-700">
        Create a Google Cloud service account, download its JSON key, and
        upload it here. The same key powers GA4, Search Console, and Google
        Ads.
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
          Click <strong>Create service account</strong>, name it{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
            pectus-reader
          </code>
          , skip the optional permissions step.
        </li>
        <li>
          Open the new account → <strong>Keys</strong> → <strong>Add key</strong>{" "}
          → <strong>Create new key</strong> → <strong>JSON</strong>.
        </li>
        <li>
          Enable two APIs in the same Google Cloud project:{" "}
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
          .
        </li>
        <li>
          In GA4 (Admin → Property access), add the service account email as a{" "}
          <strong>Viewer</strong>. In Search Console (Settings → Users &
          permissions), add the same email as a <strong>User</strong>.
        </li>
        <li>Upload the JSON below or paste its contents.</li>
      </ol>
      <GoogleSAForm brandSlug={brandSlug} />
    </section>
  );
}
