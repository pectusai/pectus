import { createServerClient } from "@pectus/supabase";
import { getBrandBySlug } from "@/lib/active-brand";
import { getProjectByCode } from "@/lib/project";
import {
  GoogleSAForm,
  Ga4PropertyForm,
} from "@/app/(app)/brands/[slug]/settings/integrations/google/Forms";
import { clearGoogleServiceAccount } from "@/app/(app)/brands/[slug]/settings/integrations/google/actions";
import { SubmitButton } from "@/app/components/SubmitButton";
import { Ga4RefreshForm } from "../RefreshForm";

type GoogleIntegration = {
  service_account_json: { client_email?: string } | null;
  account_email: string | null;
  ga4_property_id: string | null;
  last_verified_at: string | null;
  last_verify_note: string | null;
} | null;

export default async function Ga4SettingsPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  const brand = await getBrandBySlug(slug);
  const project = await getProjectByCode(code);

  const supabase = await createServerClient();
  const { data } = await supabase
    .from("integrations")
    .select(
      "service_account_json, account_email, ga4_property_id, last_verified_at, last_verify_note",
    )
    .eq("brand_id", brand.id)
    .eq("provider", "google")
    .maybeSingle();
  const integration = data as GoogleIntegration;
  const connected = Boolean(integration?.service_account_json);
  const propertySet = Boolean(integration?.ga4_property_id);
  const ready = connected && propertySet;

  const { data: freshness } = await supabase
    .from("project_data_freshness")
    .select("last_updated_at")
    .eq("project_id", project.id)
    .eq("surface", "ga4")
    .maybeSingle();
  const { count: metricCount } = await supabase
    .from("analytics_metrics")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id)
    .eq("source", "ga4");

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-2 py-2">
      <header>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">GA4</h1>
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
          Inbound app. Pulls sessions, conversions, and traffic-source signals
          from Google Analytics 4 so other apps can read them.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">
          What this feeds in Pectus
        </h2>
        <p className="text-sm leading-6 text-zinc-700">
          Content Insights reads your GA4 numbers to decide what to write next.
          Pages that already pull traffic become candidates for refresh; pages
          that convert tell the ranker which topics deserve more coverage; the
          quiet pages surface as gaps to investigate.
        </p>
        <p className="text-sm leading-6 text-zinc-700">
          GA4 is a data source, not a dashboard. The numbers themselves live in
          GA4. The interpretation lives inside whichever consumer app is
          reading them, today that&apos;s Content Insights.
        </p>
      </section>

      <ServiceAccountPanel
        integration={integration}
        connected={connected}
        brandSlug={slug}
      />

      <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">GA4 property</h2>
          {propertySet ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-emerald-700">
              Saved
            </span>
          ) : null}
        </header>
        <p className="text-sm text-zinc-700">
          The numeric Property ID Pectus reads from. Find it in GA4 → Admin →
          Property settings (not the Measurement ID that starts with G-).
        </p>
        {!connected ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Connect a Google service account above first. Then come back and
            paste the property ID.
          </div>
        ) : (
          <Ga4PropertyForm
            brandSlug={slug}
            defaultPropertyId={integration?.ga4_property_id ?? ""}
          />
        )}
        {integration?.last_verified_at && propertySet ? (
          <p className="text-xs text-zinc-500">
            Last verified{" "}
            {new Date(integration.last_verified_at).toLocaleString()}
            {integration?.last_verify_note
              ? ` — ${integration.last_verify_note}`
              : ""}
          </p>
        ) : null}
      </section>

      {ready ? (
        <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5">
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-900">Data</h2>
            <span className="text-xs text-zinc-500">
              {(metricCount ?? 0).toLocaleString()} rows in{" "}
              <code>analytics_metrics</code>
            </span>
          </header>
          <p className="text-sm text-zinc-700">
            Pectus fetches sessions, users, pageviews, engagement time, and
            conversions from your GA4 property and writes them as cross-source
            rows that any skill can read. Default lookback is 30 days.
          </p>
          {freshness?.last_updated_at ? (
            <p className="text-xs text-zinc-500">
              Last fetched{" "}
              {new Date(freshness.last_updated_at).toLocaleString()}.
            </p>
          ) : (
            <p className="text-xs text-zinc-500">
              No data fetched yet for this project.
            </p>
          )}
          <Ga4RefreshForm brandSlug={slug} projectCode={code} />
        </section>
      ) : null}
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
      <details className="group rounded-md border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm">
        <summary className="flex cursor-pointer items-center gap-2 text-zinc-700">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="font-medium">Google service account connected</span>
          {integration?.account_email ? (
            <span className="truncate font-mono text-xs text-zinc-500">
              · {integration.account_email}
            </span>
          ) : null}
          <span className="ml-auto text-xs text-zinc-400 group-open:hidden">
            Manage
          </span>
        </summary>
        <div className="mt-3 space-y-3 text-xs text-zinc-600">
          {integration?.last_verified_at ? (
            <p>
              Last verified{" "}
              {new Date(integration.last_verified_at).toLocaleString()}.
            </p>
          ) : null}
          <p>
            The same credential powers Search Console. Disconnecting clears it
            for both apps.
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
        </div>
      </details>
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
        Pectus reads GA4 through a Google service account. One JSON key powers
        GA4 and Search Console for this brand. Upload it here or paste the
        contents.
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
            In GA4 (Admin → Property access) add the service account email as a{" "}
            <strong>Viewer</strong>.
          </li>
        </ol>
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          Google sometimes rejects a brand-new service-account email for 30 to
          60 minutes after creation. If you see &ldquo;email not found,&rdquo;
          wait an hour and retry.
        </p>
      </details>

      <GoogleSAForm brandSlug={brandSlug} />
    </section>
  );
}
