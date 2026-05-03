import Link from "next/link";
import { getWorkspaceByCode } from "@/lib/workspace";
import { SubmitButton } from "@/app/components/SubmitButton";
import { saveSiteUrl } from "./actions";

export default async function SiteUrlSettingsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const workspace = await getWorkspaceByCode(code);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Site URL</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Where Pectus pages live on your domain, which locales are enabled,
          and which GitHub repo Publish writes to.
        </p>
      </div>

      <form
        action={saveSiteUrl}
        className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5"
      >
        <input type="hidden" name="code" value={code} />

        <label className="block text-sm">
          <span
            className="mb-1 block text-xs font-medium text-zinc-600"
            title="The URL path Pectus pages live under. Use '/' if Pectus runs the whole site (brand new site). Use '/insights/' or similar if Pectus only adds a section to an existing site. Trailing slash required."
          >
            Mount slug
          </span>
          <input
            name="mount_slug"
            defaultValue={workspace.mount_slug ?? "/"}
            placeholder="/"
            className="w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono"
          />
          <span className="mt-1 block text-[11px] text-zinc-500">
            Greenfield uses <code>/</code>. Coexist defaults to{" "}
            <code>/insights/</code>. Changing this proposes redirects below.
          </span>
        </label>

        <label className="block text-sm">
          <span
            className="mb-1 block text-xs font-medium text-zinc-600"
            title="The locale Pectus assumes when none is given. Used to skip the locale prefix in URLs when 'Skip prefix on default locale' is on."
          >
            Default locale
          </span>
          <input
            name="default_locale"
            defaultValue={workspace.default_locale ?? "en"}
            placeholder="en"
            className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono"
          />
        </label>

        <label className="block text-sm">
          <span
            className="mb-1 block text-xs font-medium text-zinc-600"
            title="Comma-separated locales the workspace publishes in. Each enabled locale gets its own page tree variants and its own site-plan-<locale>.json file."
          >
            Enabled locales (comma-separated)
          </span>
          <input
            name="enabled_locales"
            defaultValue={(workspace.enabled_locales ?? ["en"]).join(", ")}
            placeholder="en, sv"
            className="w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="default_locale_skips_prefix"
            defaultChecked={workspace.default_locale_skips_prefix ?? true}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span
            title="If checked, default-locale URLs omit the locale segment. e.g. with default_locale='en' and skip on, /about/ instead of /en/about/. Recommended for monolingual sites."
          >
            Skip prefix on default locale
          </span>
        </label>

        <div className="border-t border-zinc-100 pt-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Publish target
          </p>
          <label className="block text-sm">
            <span
              className="mb-1 block text-xs font-medium text-zinc-600"
              title="The GitHub repo Pectus commits page JSON, site-plan, and redirects to. Format: owner/name. Set GITHUB_TOKEN in .env.local with a personal access token (repo scope) to authorize commits."
            >
              Content-hub repo (owner/name)
            </span>
            <input
              name="content_hub_repo"
              defaultValue={workspace.content_hub_repo ?? ""}
              placeholder="your-org/site"
              className="w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono"
            />
          </label>

          <label className="mt-3 block text-sm">
            <span
              className="mb-1 block text-xs font-medium text-zinc-600"
              title="Branch the publish flow commits to. Defaults to 'main'."
            >
              Branch
            </span>
            <input
              name="content_hub_branch"
              defaultValue={workspace.content_hub_branch ?? "main"}
              placeholder="main"
              className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-5">
          <SubmitButton
            pendingLabel="Saving…"
            name="intent"
            value="save"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Save
          </SubmitButton>
          <SubmitButton
            pendingLabel="Republishing…"
            name="intent"
            value="republish"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Save & republish all pages
          </SubmitButton>
          <span
            className="text-xs text-zinc-500"
            title="Save & republish: applies the new config, recomputes URLs for every published page, generates 301 redirects for anything that moved, and ships a single GitHub commit. Use after changing the mount slug or locale config."
          >
            Use republish after mount slug or locale changes.
          </span>
        </div>
      </form>

      <p className="text-sm text-zinc-600">
        See current redirects on the{" "}
        <Link
          href={`/workspaces/${code}/settings/redirects`}
          className="underline"
        >
          Redirects
        </Link>{" "}
        page.
      </p>
    </div>
  );
}
