import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@pectus/supabase";
import { listApps } from "@/lib/apps";
import { SubmitButton } from "@/app/components/SubmitButton";
import { ContentHubDetail } from "./ContentHubDetail";
import { Ga4Detail } from "./Ga4Detail";
import { GscDetail } from "./GscDetail";
import { SeedKeywordsDetail } from "./SeedKeywordsDetail";
import { StubDetail } from "./StubDetail";
import { deactivateAppAction } from "./actions";
import type { GoogleIntegration } from "./GoogleConnectionPanel";

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const { apps } = await listApps();
  const app = apps.find((a) => a.name === name);
  if (!app) notFound();

  const supabase = await createServerClient();

  const needsWorkspaces =
    name === "content-hub" || name === "seed-keywords";
  const needsGoogle =
    name === "ga4" || name === "gsc" || name === "google-ads";

  const [{ data: workspaces }, integrationData] = await Promise.all([
    needsWorkspaces
      ? supabase
          .from("workspaces")
          .select("id, code, name, mount_slug, content_hub_repo")
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
    needsGoogle
      ? supabase
          .from("integrations")
          .select(
            "service_account_json, ga4_property_id, gsc_site_url, account_email, last_verified_at, last_verify_note",
          )
          .eq("provider", "google")
          .maybeSingle()
      : Promise.resolve({ data: null as unknown }),
  ]);

  const integration = (integrationData.data ?? null) as GoogleIntegration;
  const wsList = (workspaces ?? []) as Array<{
    id: string;
    code: string;
    name: string;
    mount_slug: string | null;
    content_hub_repo: string | null;
  }>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/apps"
        className="text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-900"
      >
        ← Apps
      </Link>

      <header className="mt-2 flex flex-wrap items-baseline justify-between gap-3 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="font-mono text-2xl font-semibold text-zinc-900">
            {app.name}
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-widest text-zinc-500">
            {app.type} · v{app.version}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={
              "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest " +
              (app.activated
                ? "bg-emerald-50 text-emerald-700"
                : "bg-zinc-100 text-zinc-600")
            }
          >
            {app.activated ? "Activated" : "Available"}
          </span>
          {app.activated ? (
            <form action={deactivateAppAction}>
              <input type="hidden" name="app_name" value={app.name} />
              <SubmitButton
                pendingLabel="Pausing…"
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Pause app
              </SubmitButton>
            </form>
          ) : null}
        </div>
      </header>

      <p className="mt-5 max-w-prose text-sm text-zinc-600">
        {app.description || "No description in APP.md frontmatter."}
      </p>

      <div className="mt-6 space-y-6">
        {renderDetail(name, { workspaces: wsList, integration })}
      </div>
    </div>
  );
}

function renderDetail(
  name: string,
  ctx: {
    workspaces: Array<{
      id: string;
      code: string;
      name: string;
      mount_slug: string | null;
      content_hub_repo: string | null;
    }>;
    integration: GoogleIntegration;
  },
) {
  switch (name) {
    case "content-hub":
      return <ContentHubDetail workspaces={ctx.workspaces} />;
    case "ga4":
      return <Ga4Detail integration={ctx.integration} />;
    case "gsc":
      return <GscDetail integration={ctx.integration} />;
    case "google-ads":
      return (
        <StubDetail
          appName="google-ads"
          message="Google Ads needs a Google Ads developer token plus the same Google service account used by GA4 and Search Console. The settings UI for it ships in v0.4 alongside the first ad-spend skill that consumes its data. The schema (token, customer ID per workspace) is sketched in apps/google-ads/APP.md."
        />
      );
    case "meta":
      return (
        <StubDetail
          appName="meta"
          message="Meta (Facebook + Instagram) needs a long-lived access token plus per-account ad account IDs. The settings UI ships in v0.4 alongside the cross-channel ad-spend skill. Until then, no fetch runs and the app does not contribute to analyses."
        />
      );
    case "linkedin":
      return (
        <StubDetail
          appName="linkedin"
          message="LinkedIn Ads needs an OAuth-based access token plus per-account organization IDs. The settings UI ships in v0.4 alongside the cross-channel ad-spend skill. Until then, no fetch runs and the app does not contribute to analyses."
        />
      );
    case "seed-keywords":
      return <SeedKeywordsDetail workspaces={ctx.workspaces} />;
    default:
      return (
        <StubDetail
          appName={name}
          message={`No settings UI is registered for ${name} yet. Add one under cms/src/app/(app)/apps/[name]/ and dispatch it from page.tsx.`}
        />
      );
  }
}
