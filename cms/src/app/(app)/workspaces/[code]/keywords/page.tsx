import { createServerClient } from "@pectus/supabase";
import { getWorkspaceByCode } from "@/lib/workspace";
import { SubmitButton } from "@/app/components/SubmitButton";
import { KeywordImportForm } from "./KeywordImportForm";
import { GscSyncButton } from "./GscSyncButton";
import { clearKeywords } from "./actions";

const PAGE_SIZE = 50;

export default async function KeywordsPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { code } = await params;
  const { q } = await searchParams;
  const workspace = await getWorkspaceByCode(code);
  const supabase = await createServerClient();

  const { data: freshness } = await supabase
    .from("workspace_data_freshness")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("surface", "keywords")
    .maybeSingle();

  let query = supabase
    .from("keywords")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspace.id)
    .order("search_volume", { ascending: false, nullsFirst: false })
    .limit(PAGE_SIZE);

  if (q && q.trim()) query = query.ilike("keyword", `%${q.trim()}%`);

  const { data: keywords, count } = await query;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2">
        <KeywordImportForm code={code} />
        <GscSyncButton code={code} />
      </div>

      {freshness?.source ? (
        <p className="text-xs text-zinc-500">
          Last imported from <code>{freshness.source}</code>.
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">
            Keywords ({count ?? 0})
            {q ? (
              <span className="ml-1 text-zinc-500">· filtered by “{q}”</span>
            ) : null}
          </h2>
          <form className="flex items-center gap-2">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Filter keyword…"
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
            />
          </form>
        </div>

        {keywords && keywords.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-4 py-2 text-left">Keyword</th>
                  <th className="px-4 py-2 text-right">Volume</th>
                  <th className="px-4 py-2 text-right">Difficulty</th>
                  <th className="px-4 py-2 text-left">Intent</th>
                  <th className="px-4 py-2 text-right">Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {keywords.map((k) => (
                  <tr key={k.id}>
                    <td className="px-4 py-2 font-medium">{k.keyword}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {k.search_volume ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {k.difficulty ?? "—"}
                    </td>
                    <td className="px-4 py-2">{k.intent ?? "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {k.current_rank ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {count && count > PAGE_SIZE ? (
              <p className="border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-500">
                Showing first {PAGE_SIZE} of {count}.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            No keywords yet. Upload a CSV or sync from GSC.
          </p>
        )}

        {keywords && keywords.length > 0 && !q ? (
          <form action={clearKeywords}>
            <input type="hidden" name="code" value={code} />
            <SubmitButton
              pendingLabel="Clearing…"
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Clear all keywords for this workspace
            </SubmitButton>
          </form>
        ) : null}
      </section>
    </div>
  );
}
