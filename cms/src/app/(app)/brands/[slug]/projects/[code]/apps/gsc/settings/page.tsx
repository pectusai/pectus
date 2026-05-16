import { createServerClient } from "@pectus/supabase";
import { getBrandBySlug } from "@/lib/active-brand";
import { getProjectByCode } from "@/lib/project";
import {
  GoogleSAForm,
  GscSiteForm,
} from "@/app/(app)/brands/[slug]/settings/integrations/google/Forms";
import { clearGoogleServiceAccount } from "@/app/(app)/brands/[slug]/settings/integrations/google/actions";
import { SubmitButton } from "@/app/components/SubmitButton";

type GoogleIntegration = {
  service_account_json: { client_email?: string } | null;
  account_email: string | null;
  gsc_site_url: string | null;
  last_verified_at: string | null;
  last_verify_note: string | null;
} | null;

export default async function GscSettingsPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  const brand = await getBrandBySlug(slug);
  await getProjectByCode(code);

  const supabase = await createServerClient();
  const { data } = await supabase
    .from("integrations")
    .select(
      "service_account_json, account_email, gsc_site_url, last_verified_at, last_verify_note",
    )
    .eq("brand_id", brand.id)
    .eq("provider", "google")
    .maybeSingle();
  const integration = data as GoogleIntegration;
  const connected = Boolean(integration?.service_account_json);
  const siteSet = Boolean(integration?.gsc_site_url);
  const ready = connected && siteSet;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-2 py-2">
      <header>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Search Console
          </h1>
          <span
            className={
              "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest " +
              (ready
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-800")
            }
          >
            {ready ? "Ready" : "Setup needed"}
          </span>
        </div>
        <p className="mt-2 max-w-prose text-sm text-zinc-600">
          Inbound app. Pulls organic-search performance from Google Search
          Console so other apps can read it.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">
          What this feeds in Pectus
        </h2>
        <p className="text-sm leading-6 text-zinc-700">
          Content Insights uses Search Console to see which queries already
          bring people to your site, which queries you almost rank for, and
          which pages are leaking impressions to better-ranked competitors.
          That signal drives the keyword view and the gap analysis.
        </p>
        <p className="text-sm leading-6 text-zinc-700">
          Search Console is a data source, not a dashboard. The reports
          themselves live in Search Console. The interpretation lives inside
          whichever consumer app is reading them, today that&apos;s Content
          Insights.
        </p>
      </section>

      <ServiceAccountPanel
        integration={integration}
        connected={connected}
        brandSlug={slug}
      />

      <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            Search Console site
          </h2>
          {siteSet ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-emerald-700">
              Saved
            </span>
          ) : null}
        </header>
        <p className="text-sm text-zinc-700">
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
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Connect a Google service account above first. Then come back and
            paste the site URL.
          </div>
        ) : (
          <GscSiteForm
            brandSlug={slug}
            defaultSiteUrl={integration?.gsc_site_url ?? ""}
          />
        )}
        {integration?.last_verified_at && siteSet ? (
          <p className="text-xs text-zinc-500">
            Last verified{" "}
            {new Date(integration.last_verified_at).toLocaleString()}
            {integration?.last_verify_note
              ? ` — ${integration.last_verify_note}`
              : ""}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function ServiceAccountPanel({
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
      <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            Service account
          </h2>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-emerald-700">
            Connected
          </span>
        </header>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-widest text-zinc-500">
              Email
            </dt>
            <dd className="mt-1 break-all font-mono text-xs text-zinc-800">
              {integration?.account_email ?? "(connected)"}
            </dd>
          </div>
          {integration?.last_verified_at ? (
            <div>
              <dt className="text-xs uppercase tracking-widest text-zinc-500">
                Last verified
              </dt>
              <dd className="mt-1 text-xs text-zinc-800">
                {new Date(integration.last_verified_at).toLocaleString()}
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="text-xs text-zinc-500">
          The same credential powers GA4. Disconnecting clears it for both apps.
        </p>
        <form action={clearGoogleServiceAccount}>
          <input type="hidden" name="brand_slug" value={brandSlug} />
          <SubmitButton
            pendingLabel="Disconnecting…"
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Disconnect Google
          </SubmitButton>
        </form>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900">Service account</h2>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
          Not connected
        </span>
      </header>
      <p className="text-sm text-zinc-700">
        Pectus reads Search Console through a Google service account. One JSON
        key powers GA4 and Search Console for this brand. Upload it here or
        paste the contents.
      </p>

      <details className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-zinc-600">
          How to create the service account
        </summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
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
            <code className="rounded bg-white px-1 py-0.5 text-xs">
              pectus-reader
            </code>
            , skip the optional permissions step.
          </li>
          <li>
            Open the account → <strong>Keys</strong> → <strong>Add key</strong>{" "}
            → <strong>Create new key</strong> → <strong>JSON</strong>.
          </li>
          <li>
            Enable three APIs in the same Cloud project:{" "}
            <a
              href="https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Analytics Admin
            </a>
            ,{" "}
            <a
              href="https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Analytics Data
            </a>
            ,{" "}
            <a
              href="https://console.cloud.google.com/apis/library/searchconsole.googleapis.com"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Search Console
            </a>
            .
          </li>
          <li>
            In Search Console (Settings → Users and permissions) add the
            service account email as a <strong>User</strong>.
          </li>
        </ol>
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          Search Console rejects brand-new service-account emails sometimes
          (&ldquo;Failed to add user: email not found&rdquo;). Wait an hour and
          retry. The DNS-TXT verification fallback is coming as a built-in flow.
        </p>
      </details>

      <GoogleSAForm brandSlug={brandSlug} />
    </section>
  );
}
