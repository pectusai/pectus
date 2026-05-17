import { createServerClient } from "@pectus/supabase";
import { getProjectByCode } from "@/lib/project";
import { AtpImportForm } from "../AtpImportForm";

export default async function SeedKeywordsSettingsPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  const project = await getProjectByCode(code);

  const supabase = await createServerClient();
  const [{ count: seedCount }, { count: atpCount }, latest] = await Promise.all([
    supabase
      .from("seed_keywords")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("answer_public_entries")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("answer_public_entries")
      .select("seed_keyword, tab, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const latestRows = (latest.data ?? []) as Array<{
    seed_keyword: string;
    tab: string;
    created_at: string;
  }>;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-2 py-2">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Seed keywords
        </h1>
        <p className="mt-2 max-w-prose text-sm text-zinc-600">
          Inbound app. Bootstrap the analysis when live traffic is thin by
          handing Pectus the keywords you want it to focus on, plus
          AnswerThePublic-style question lists tied to each seed.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">Seed keywords</h2>
          <span className="text-xs text-zinc-500">
            {(seedCount ?? 0).toLocaleString()} in <code>seed_keywords</code>
          </span>
        </header>
        <p className="text-sm text-zinc-700">
          Type 5–10 keywords that describe what you want to be found for. Used
          as a starting signal when GA4 / GSC are quiet or new. Editing surface
          ships in a follow-up — for now, paste rows via the keywords page or
          the CLI.
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            AnswerThePublic entries
          </h2>
          <span className="text-xs text-zinc-500">
            {(atpCount ?? 0).toLocaleString()} in{" "}
            <code>answer_public_entries</code>
          </span>
        </header>
        <p className="text-sm text-zinc-700">
          Audience phrasing the analysis uses to write headlines and pick
          angles. Export a Queries / Questions list from{" "}
          <a
            href="https://answerthepublic.com"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            AnswerThePublic
          </a>{" "}
          (or any tool that lists question/preposition/comparison phrases per
          seed keyword) as CSV and upload below. Duplicates are skipped on
          re-import.
        </p>
        <AtpImportForm brandSlug={slug} projectCode={code} />

        {latestRows.length > 0 ? (
          <details className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs">
            <summary className="cursor-pointer font-semibold text-zinc-700">
              Last {latestRows.length} imports
            </summary>
            <ul className="mt-2 space-y-1 text-zinc-600">
              {latestRows.map((r, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <span className="font-mono">{r.seed_keyword}</span>
                  <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
                    {r.tab}
                  </span>
                  <span className="ml-auto text-zinc-400">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>
    </div>
  );
}
