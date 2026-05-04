import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { FreshnessBadge } from "@/app/components/FreshnessBadge";
import type { Freshness, Workspace } from "@/lib/workspace";
import { getBrandBySlug } from "@/lib/active-brand";

export default async function BrandWorkspacesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase } = await requireUser();
  const brand = await getBrandBySlug(slug);

  const [{ data: workspaces }, { data: freshnessRows }] = await Promise.all([
    supabase
      .from("workspaces")
      .select("*")
      .eq("brand_id", brand.id)
      .order("name"),
    supabase
      .from("workspace_data_freshness")
      .select("*")
      .eq("brand_id", brand.id),
  ]);

  const freshnessByWorkspace = new Map<string, Record<string, string>>();
  ((freshnessRows ?? []) as Freshness[]).forEach((row) => {
    const current = freshnessByWorkspace.get(row.workspace_id) ?? {};
    current[row.surface] = row.last_updated_at;
    freshnessByWorkspace.set(row.workspace_id, current);
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {brand.name ?? brand.slug}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          One workspace per market or property. Pick one to manage its ICP,
          keywords, and content.
        </p>
      </div>

      {!workspaces || workspaces.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500">
          <p>No workspaces yet. Create your first from the terminal:</p>
          <pre className="mt-3 inline-block rounded bg-zinc-100 px-3 py-2 text-left text-xs text-zinc-700">
            npx pectus workspace create
          </pre>
          <p className="mt-3 text-xs text-zinc-500">
            The command is interactive. It will ask you for the market name, a
            short code (like <code className="rounded bg-zinc-100 px-1">uk</code>{" "}
            or <code className="rounded bg-zinc-100 px-1">dtc-us</code>), the
            locale, site shape, content-hub repo, and seed keywords. Run it from
            the install root.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(workspaces as Workspace[]).map((w) => {
            const freshness = freshnessByWorkspace.get(w.id) ?? {};
            return (
              <li key={w.id}>
                <Link
                  href={`/brands/${slug}/workspaces/${w.code}`}
                  className="block rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{w.name}</p>
                      <p className="text-xs uppercase tracking-widest text-zinc-500">
                        {w.code} · {w.locale}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-zinc-500">ICP:</span>
                    <FreshnessBadge lastUpdatedAt={freshness.icp} />
                    <span className="ml-2 text-zinc-500">Keywords:</span>
                    <FreshnessBadge lastUpdatedAt={freshness.keywords} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
