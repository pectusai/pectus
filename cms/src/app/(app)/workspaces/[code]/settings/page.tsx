import Link from "next/link";
import { isAppActive } from "@/lib/apps";

export default async function WorkspaceSettings({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const contentHubActive = await isAppActive("content-hub");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Workspace settings</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Per-workspace configuration. Brand voice and global config live on{" "}
          <Link href="/brand" className="underline">
            /brand
          </Link>
          .
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {contentHubActive ? (
          <>
            <li>
              <Link
                href={`/workspaces/${code}/settings/site-url`}
                className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-300"
              >
                <p className="text-sm font-semibold">Site URL</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Mount slug, locale config, and the GitHub repo Publish writes
                  to. Slug or locale changes propose redirects automatically.
                </p>
              </Link>
            </li>
            <li>
              <Link
                href={`/workspaces/${code}/settings/redirects`}
                className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-300"
              >
                <p className="text-sm font-semibold">Redirects</p>
                <p className="mt-1 text-xs text-zinc-600">
                  The full redirect table. Mirrored to{" "}
                  <code>content/redirects.json</code> on every publish. Slug
                  renames auto-populate; manual entries kept.
                </p>
              </Link>
            </li>
          </>
        ) : null}
        <li>
          <Link
            href={`/workspaces/${code}/settings/seed-keywords`}
            className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-300"
          >
            <p className="text-sm font-semibold">Seed keywords</p>
            <p className="mt-1 text-xs text-zinc-600">
              5–10 keywords this workspace plans content around when GSC
              traffic data isn&apos;t available yet.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href={`/workspaces/${code}/settings/review-policy`}
            className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-300"
          >
            <p className="text-sm font-semibold">Review policy</p>
            <p className="mt-1 text-xs text-zinc-600">
              Roles required to approve content, threshold counts, escalation
              SLAs.
            </p>
          </Link>
        </li>
      </ul>

      {!contentHubActive ? (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-xs text-zinc-600">
          Site URL and Redirects are part of the{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">content-hub</code>{" "}
          app. Activate it from the{" "}
          <Link href="/apps" className="underline">
            Apps page
          </Link>{" "}
          to publish a public site for this workspace.
        </p>
      ) : null}
    </div>
  );
}
