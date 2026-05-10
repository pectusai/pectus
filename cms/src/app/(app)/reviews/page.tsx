import { createServerClient } from "@pectus/supabase";
import { requireUser } from "@/lib/auth";
import { SubmitButton } from "@/app/components/SubmitButton";
import { isAppActiveForAnyProject } from "@/lib/apps";
import { approveItem, rejectItem } from "./actions";

type Item = {
  id: string;
  project_id: string;
  subject: string | null;
  summary: string | null;
  state: string;
  required_roles: string[] | null;
  created_at: string;
  project?: { code: string; name: string; brand_id: string } | null;
};

export const dynamic = "force-dynamic";

export default async function ReviewsInboxPage() {
  const { user } = await requireUser();
  const supabase = await createServerClient();

  const contentHubInstalled = await isAppActiveForAnyProject("content-hub");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_admin, email, full_name")
    .eq("id", user.id)
    .single();

  const { data: items } = await supabase
    .from("review_queue_items")
    .select(
      "id, project_id, subject, summary, state, required_roles, created_at, project:projects(code, name, brand_id)",
    )
    .in("state", ["pending", "in_review"])
    .order("created_at", { ascending: true })
    .limit(200);

  const role: string | null = (profile?.role as string | null) ?? null;
  const isAdmin = Boolean(profile?.is_admin);

  const visible = ((items ?? []) as unknown as Item[]).filter((item) => {
    if (isAdmin) return true;
    if (!item.required_roles || item.required_roles.length === 0) return true;
    return role ? item.required_roles.includes(role) : false;
  });

  const brandSlugById = await brandSlugLookup(
    supabase,
    visible
      .map((v) => v.project?.brand_id)
      .filter((id): id is string => Boolean(id)),
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Items waiting on your sign-off across every project.
          </p>
        </div>
        <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
          {visible.length} waiting
        </span>
      </div>

      {!contentHubInstalled ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
          Reviews show up here once you activate Content Hub on at least one
          project. Each project under Content Hub feeds its drafts and pages
          into this inbox.
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
          Nothing waiting on you.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => {
            const brandSlug = item.project?.brand_id
              ? brandSlugById.get(item.project.brand_id)
              : null;
            const projectHref =
              brandSlug && item.project?.code
                ? `/brands/${brandSlug}/projects/${item.project.code}`
                : null;
            return (
              <li
                key={item.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="truncate font-medium">
                    {item.subject ?? "(no subject)"}
                  </p>
                  <span className="text-xs text-zinc-500">
                    {projectHref ? (
                      <a
                        href={projectHref}
                        className="hover:underline"
                        title={`Open ${item.project?.name ?? "project"}`}
                      >
                        {item.project?.name ?? "—"} ·{" "}
                        {item.project?.code ?? "—"}
                      </a>
                    ) : (
                      <>
                        {item.project?.name ?? "—"} ·{" "}
                        {item.project?.code ?? "—"}
                      </>
                    )}
                  </span>
                </div>
                {item.summary ? (
                  <p className="mt-1 line-clamp-3 text-sm text-zinc-600">
                    {item.summary}
                  </p>
                ) : null}
                <div className="mt-3 flex items-center gap-2">
                  <form action={approveItem}>
                    <input type="hidden" name="item_id" value={item.id} />
                    <SubmitButton
                      pendingLabel="Approving…"
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                    >
                      Approve
                    </SubmitButton>
                  </form>
                  <form action={rejectItem}>
                    <input type="hidden" name="item_id" value={item.id} />
                    <SubmitButton
                      pendingLabel="Rejecting…"
                      className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Reject
                    </SubmitButton>
                  </form>
                  <span className="ml-auto text-[11px] uppercase tracking-widest text-zinc-400">
                    {item.state}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

async function brandSlugLookup(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  brandIds: string[],
): Promise<Map<string, string>> {
  if (brandIds.length === 0) return new Map();
  const unique = Array.from(new Set(brandIds));
  const { data } = await supabase
    .from("brands")
    .select("id, slug")
    .in("id", unique);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.id && row.slug) map.set(row.id as string, row.slug as string);
  }
  return map;
}
