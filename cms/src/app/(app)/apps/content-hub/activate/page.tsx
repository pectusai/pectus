import Link from "next/link";
import { createServerClient } from "@pectus/supabase";
import { ActivateForm } from "./ActivateForm";

export default async function ActivateContentHubPage() {
  const supabase = await createServerClient();
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, code, name, mount_slug, content_hub_repo")
    .order("created_at", { ascending: true });

  const list = workspaces ?? [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/apps"
        className="text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-900"
      >
        ← Apps
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Activate Content Hub
      </h1>
      <p className="mt-1 max-w-xl text-sm text-zinc-600">
        Content Hub renders your articles and pages into a static site you
        deploy. This wizard captures the site shape and GitHub repo for one
        workspace. Activating sets up the Pages and Articles tabs across the
        CMS.
      </p>

      <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6">
        {list.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-700">
              No workspaces yet. Create one first.
            </p>
            <p className="text-xs text-zinc-500">
              Workspaces are created from the CLI:
            </p>
            <pre className="overflow-x-auto rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
              cd &lt;install path&gt; && npx pectus workspace create
            </pre>
            <p className="text-xs text-zinc-500">
              Once a workspace exists, refresh this page.
            </p>
          </div>
        ) : (
          <ActivateForm workspaces={list} />
        )}
      </div>
    </div>
  );
}
