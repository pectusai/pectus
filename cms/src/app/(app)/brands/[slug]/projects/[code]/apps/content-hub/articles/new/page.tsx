import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/active-brand";
import { isAppActiveForProject } from "@/lib/apps";
import { ActivateAppPointer } from "@/app/components/ActivateAppPointer";
import { BlankArticleForm } from "./BlankArticleForm";
import { WriteArticleForm } from "./WriteArticleForm";
import { SuggestFromGapsForm } from "./SuggestFromGapsForm";
import { ModeTabs } from "./ModeTabs";

export const dynamic = "force-dynamic";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type Mode = "blank" | "ai" | "suggest";

function parseMode(raw: string | undefined): Mode {
  if (raw === "blank" || raw === "ai" || raw === "suggest") return raw;
  return "ai";
}

export default async function NewArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; code: string }>;
  searchParams: Promise<{
    mode?: string;
    keyword?: string;
    purpose?: string;
    brief?: string;
    persona?: string;
    type?: string;
  }>;
}) {
  const [{ slug, code }, search] = await Promise.all([
    params,
    searchParams,
  ]);
  const { supabase } = await requireUser();
  const brand = await getBrandBySlug(slug);
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("brand_id", brand.id)
    .eq("code", code)
    .maybeSingle();
  if (!project) notFound();
  if (!(await isAppActiveForProject(project.id, "content-hub"))) {
    return <ActivateAppPointer appName="content-hub" surface="Articles" />;
  }

  const mode = parseMode(search.mode);

  const [icpRow, brandRow] = await Promise.all([
    supabase
      .from("icp_profiles")
      .select("personas, painpoints, notes")
      .eq("project_id", project.id)
      .maybeSingle(),
    supabase
      .from("brands")
      .select("voice")
      .eq("id", brand.id)
      .single(),
  ]);
  const icpPersonas = (icpRow.data?.personas as Array<unknown> | undefined) ?? [];
  const icpPainpoints = (icpRow.data?.painpoints as Array<unknown> | undefined) ?? [];
  const icpEmpty = icpPersonas.length === 0 && icpPainpoints.length === 0;
  const voiceEmpty = !brandRow.data?.voice;

  let gaps: { keyword: string; search_volume: number | null; intent: string | null }[] = [];
  if (mode === "suggest") {
    const [keywords, articles] = await Promise.all([
      supabase
        .from("keywords")
        .select("keyword, search_volume, intent")
        .eq("project_id", project.id)
        .order("search_volume", { ascending: false, nullsFirst: false })
        .limit(2000),
      supabase
        .from("articles")
        .select("title, description")
        .eq("project_id", project.id),
    ]);
    const haystack = (articles.data ?? [])
      .map((a) => `${a.title ?? ""} ${a.description ?? ""}`)
      .map(normalize)
      .join(" || ");
    const seen = new Set<string>();
    for (const k of keywords.data ?? []) {
      if (gaps.length >= 30) break;
      const norm = normalize(k.keyword as string);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      if (haystack.includes(norm)) continue;
      gaps.push({
        keyword: k.keyword as string,
        search_volume: (k.search_volume as number | null) ?? null,
        intent: (k.intent as string | null) ?? null,
      });
    }
  }

  return (
    <div className="pectus-new-article">
      <Link
        href={`/brands/${slug}/projects/${code}/apps/content-hub/articles`}
        className="pectus-new-article-back"
      >
        ← All articles
      </Link>
      <h1 className="pectus-new-article-title">New article</h1>
      <p className="pectus-new-article-lede">
        Write a brief and let Sonnet draft the article, start blank and write
        it yourself, or pick from the keywords with no existing coverage.
      </p>

      <ModeTabs brandSlug={slug} code={code} active={mode} />

      {(icpEmpty || voiceEmpty) && mode === "ai" ? (
        <div className="pectus-new-article-warning">
          <strong>Heads up.</strong>{" "}
          {voiceEmpty ? (
            <>
              Brand voice is not set yet, so the AI will fall back to a generic
              direct, warm voice.{" "}
              <Link
                href={`/brands/${slug}/profile`}
                className="pectus-new-article-warning-link"
              >
                Set voice →
              </Link>{" "}
            </>
          ) : null}
          {icpEmpty ? (
            <>
              ICP is empty, so the AI won&apos;t personalise to a persona or
              painpoint.{" "}
              <Link
                href={`/brands/${slug}/projects/${code}/icp`}
                className="pectus-new-article-warning-link"
              >
                Add personas →
              </Link>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="pectus-new-article-card">
        {mode === "blank" ? (
          <BlankArticleForm brandSlug={slug} code={code} />
        ) : mode === "suggest" ? (
          <SuggestFromGapsForm brandSlug={slug} code={code} gaps={gaps} />
        ) : (
          <WriteArticleForm
            brandSlug={slug}
            code={code}
            initial={{
              keyword: search.keyword ?? "",
              purpose: search.purpose ?? "",
              brief: search.brief ?? "",
              persona: search.persona ?? "",
            }}
          />
        )}
      </div>
    </div>
  );
}
