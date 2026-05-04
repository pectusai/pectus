import { createServerClient } from "@pectus/supabase";
import { getProjectByCode } from "@/lib/project";
import { SubmitButton } from "@/app/components/SubmitButton";
import { addSeedKeyword, deleteSeedKeyword } from "./actions";

const MAX_SEED_KEYWORDS = 10;
const MIN_RECOMMENDED = 5;

type SeedKeywordRow = {
  id: string;
  keyword: string;
  created_at: string;
};

export default async function SeedKeywordsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const project = await getProjectByCode(code);
  const supabase = await createServerClient();

  const { data } = await supabase
    .from("seed_keywords")
    .select("id, keyword, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as SeedKeywordRow[];
  const atCap = rows.length >= MAX_SEED_KEYWORDS;
  const belowFloor = rows.length < MIN_RECOMMENDED;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Seed keywords</h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          The keywords this project plans content around when there&apos;s no
          GSC traffic data yet. Aim for {MIN_RECOMMENDED}–{MAX_SEED_KEYWORDS} —
          a tight, intentional list. Pectus interprets these into Insights
          that feed weekly-analysis and plan-sitemap.
        </p>
      </div>

      {belowFloor && (
        <p
          className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
          title="Fewer than 5 seed keywords gives the analysis too little to cluster on. Add a few more before running plan-sitemap."
        >
          You have {rows.length}. Add at least {MIN_RECOMMENDED - rows.length}{" "}
          more before running plan-sitemap.
        </p>
      )}

      <form
        action={addSeedKeyword}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-5"
      >
        <input type="hidden" name="code" value={code} />
        <label className="block text-sm">
          <span
            className="mb-1 block text-xs font-medium text-zinc-600"
            title="A search phrase your audience would type. Multi-word phrases are fine. Avoid duplicates and near-duplicates — keep it focused."
          >
            New keyword
          </span>
          <input
            name="keyword"
            placeholder="e.g. observability for python apis"
            required
            disabled={atCap}
            className="w-80 max-w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <SubmitButton
          pendingLabel="Adding…"
          disabled={atCap}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Add
        </SubmitButton>
        <span
          className="text-xs text-zinc-500"
          title="Cap is 10 to enforce focus. Smaller seed = better cluster quality from plan-sitemap."
        >
          {rows.length} / {MAX_SEED_KEYWORDS}
        </span>
      </form>

      <ul className="space-y-2">
        {rows.length === 0 && (
          <li className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            No seed keywords yet.
          </li>
        )}
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-4 py-2"
          >
            <span className="text-sm">{r.keyword}</span>
            <form action={deleteSeedKeyword}>
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="id" value={r.id} />
              <SubmitButton
                pendingLabel="…"
                className="text-xs text-red-600 hover:text-red-800"
              >
                Remove
              </SubmitButton>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
