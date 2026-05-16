import Link from "next/link";
import { createServerClient } from "@pectus/supabase";
import { getBrandBySlug } from "@/lib/active-brand";
import { getProjectByCode } from "@/lib/project";

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

  const googleHref = `/brands/${slug}/settings/integrations/google`;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-2 py-2">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Search Console</h1>
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
          Search Console is a data source, not a dashboard. The reports themselves
          live in Search Console. The interpretation lives inside whichever
          consumer app is reading them, today that&apos;s Content Insights.
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">Connection</h2>
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
        </header>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-widest text-zinc-500">
              Service account
            </dt>
            <dd className="mt-1 text-zinc-800">
              {connected ? (
                <span className="break-all font-mono text-xs">
                  {integration?.account_email ?? "(connected)"}
                </span>
              ) : (
                <span className="text-zinc-500">Not connected</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-zinc-500">
              Search Console site
            </dt>
            <dd className="mt-1 text-zinc-800">
              {siteSet ? (
                <span className="break-all font-mono text-xs">
                  {integration?.gsc_site_url}
                </span>
              ) : (
                <span className="text-zinc-500">Not set</span>
              )}
            </dd>
          </div>
        </dl>

        {integration?.last_verified_at ? (
          <p className="text-xs text-zinc-500">
            Last verified{" "}
            {new Date(integration.last_verified_at).toLocaleString()}
            {integration.last_verify_note
              ? ` — ${integration.last_verify_note}`
              : ""}
          </p>
        ) : null}

        <div>
          <Link
            href={googleHref}
            className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
          >
            {ready ? "Manage Google integration" : "Set up Google integration"}
            <span aria-hidden>→</span>
          </Link>
          <p className="mt-2 text-xs text-zinc-500">
            One Google service account credentials this brand&apos;s GA4 and
            Search Console apps. Set it up once per brand.
          </p>
        </div>
      </section>
    </div>
  );
}
