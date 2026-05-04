import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { FreshnessBadge } from "@/app/components/FreshnessBadge";
import type { Freshness, Project } from "@/lib/project";
import { getBrandBySlug } from "@/lib/active-brand";

export default async function BrandProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase } = await requireUser();
  const brand = await getBrandBySlug(slug);

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("brand_id", brand.id)
    .order("name");

  const projectIds = (projects ?? []).map((p) => p.id as string);
  let freshnessRows: Freshness[] = [];
  if (projectIds.length > 0) {
    const { data } = await supabase
      .from("project_data_freshness")
      .select("project_id, surface, last_updated_at")
      .in("project_id", projectIds);
    freshnessRows = (data ?? []) as Freshness[];
  }

  const freshnessByProject = new Map<string, Record<string, string>>();
  freshnessRows.forEach((row) => {
    const current = freshnessByProject.get(row.project_id) ?? {};
    current[row.surface] = row.last_updated_at;
    freshnessByProject.set(row.project_id, current);
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {brand.name ?? brand.slug}
        </h1>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <p className="text-sm text-zinc-700">
            Pectus is awake. Open your terminal and run{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
              pectus project create
            </code>{" "}
            from your install folder to add your first project. A project is
            one audience or market — most installs only ever have one.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(projects as Project[]).map((w) => {
            const freshness = freshnessByProject.get(w.id) ?? {};
            return (
              <li key={w.id}>
                <Link
                  href={`/brands/${slug}/projects/${w.code}`}
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
