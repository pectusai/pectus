import { createServerClient } from "@pectus/supabase";
import { getProjectByCode } from "@/lib/project";
import { isAppActiveForProject } from "@/lib/apps";
import { ActivateAppPointer } from "@/app/components/ActivateAppPointer";
import { SubmitButton } from "@/app/components/SubmitButton";
import { addRedirect, deleteRedirect } from "./actions";

type RedirectRecord = {
  id: string;
  from_path: string;
  to_path: string;
  status: number;
  source: string;
  created_at: string;
};

export default async function RedirectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  const sortKey = (sp.sort ?? "from_path") as keyof RedirectRecord;
  const project = await getProjectByCode(code);
  if (!(await isAppActiveForProject(project.id, "content-insights"))) {
    return <ActivateAppPointer appName="content-insights" surface="Redirects" />;
  }
  const supabase = await createServerClient();

  const { data } = await supabase
    .from("redirects")
    .select("id, from_path, to_path, status, source, created_at")
    .eq("project_id", project.id);
  const rows = ((data ?? []) as RedirectRecord[]).slice().sort((a, b) => {
    const av = String(a[sortKey] ?? "");
    const bv = String(b[sortKey] ?? "");
    return av.localeCompare(bv);
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Redirects</h2>
        <p className="mt-1 text-sm text-zinc-600">
          The full redirect map for this project. Mirrored to{" "}
          <code>content/redirects.json</code> on every publish. Slug renames,
          tree moves, and page deletes auto-populate this list; manual entries
          are kept too.
        </p>
      </div>

      <form
        action={addRedirect}
        className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-5 sm:grid-cols-[1fr_1fr_auto_auto]"
      >
        <input type="hidden" name="code" value={code} />
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-zinc-600">
            From path
          </span>
          <input
            name="from_path"
            placeholder="/old-path/"
            required
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-zinc-600">
            To path
          </span>
          <input
            name="to_path"
            placeholder="/new-path/"
            required
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono"
          />
        </label>
        <label className="block text-sm">
          <span
            className="mb-1 block text-xs font-medium text-zinc-600"
            title="301 = permanent (default for slug renames). 302 = temporary."
          >
            Status
          </span>
          <select
            name="status"
            defaultValue="301"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            <option value="301">301</option>
            <option value="302">302</option>
          </select>
        </label>
        <SubmitButton
          pendingLabel="Adding…"
          className="self-end rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Add redirect
        </SubmitButton>
      </form>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-left">
                <a
                  href={`/projects/${code}/apps/content-insights/settings/redirects?sort=from_path`}
                  className="hover:text-zinc-900"
                  title="Sort by source path."
                >
                  From
                </a>
              </th>
              <th className="px-4 py-2 text-left">
                <a
                  href={`/projects/${code}/apps/content-insights/settings/redirects?sort=to_path`}
                  className="hover:text-zinc-900"
                  title="Sort by destination path."
                >
                  To
                </a>
              </th>
              <th className="px-4 py-2 text-left">
                <a
                  href={`/projects/${code}/apps/content-insights/settings/redirects?sort=status`}
                  className="hover:text-zinc-900"
                  title="Sort by HTTP status."
                >
                  Status
                </a>
              </th>
              <th className="px-4 py-2 text-left">
                <a
                  href={`/projects/${code}/apps/content-insights/settings/redirects?sort=source`}
                  className="hover:text-zinc-900"
                  title="Sort by who created the redirect (slug-rename, tree-move, page-delete, manual)."
                >
                  Source
                </a>
              </th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-zinc-500"
                >
                  No redirects yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-zinc-100">
                <td className="px-4 py-2 font-mono">{r.from_path}</td>
                <td className="px-4 py-2 font-mono">{r.to_path}</td>
                <td className="px-4 py-2">{r.status}</td>
                <td
                  className="px-4 py-2 text-xs text-zinc-600"
                  title="slug-rename: a page slug or tree position changed. tree-move: a node was moved in the tree. page-delete: a page was unpublished. manual: added by hand here."
                >
                  {r.source}
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteRedirect}>
                    <input type="hidden" name="code" value={code} />
                    <input type="hidden" name="id" value={r.id} />
                    <SubmitButton
                      pendingLabel="…"
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Delete
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
