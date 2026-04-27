import { requireAdmin } from "@/lib/auth";

type Workspace = {
  id: string;
  name: string;
  code: string;
  locale: string;
  created_at: string;
};

export default async function AdminWorkspacesPage() {
  const { supabase } = await requireAdmin();
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: true });

  const list = (workspaces as Workspace[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Create new workspaces from the CLI:
        </p>
        <pre className="mt-2 inline-block rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
          npx pectus workspace create &lt;code&gt; "Display name"
        </pre>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">All workspaces ({list.length})</h2>
        {list.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Code</th>
                  <th className="px-4 py-2 text-left">Locale</th>
                  <th className="px-4 py-2 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {list.map((w) => (
                  <tr key={w.id}>
                    <td className="px-4 py-2 font-medium">{w.name}</td>
                    <td className="px-4 py-2">
                      <code>{w.code}</code>
                    </td>
                    <td className="px-4 py-2">{w.locale}</td>
                    <td className="px-4 py-2 text-zinc-500">
                      {new Date(w.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            No workspaces yet.
          </p>
        )}
      </section>
    </div>
  );
}
