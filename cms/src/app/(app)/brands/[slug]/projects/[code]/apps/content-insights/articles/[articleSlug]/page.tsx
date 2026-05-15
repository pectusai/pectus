import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/active-brand";
import { isAppActiveForProject } from "@/lib/apps";
import { ActivateAppPointer } from "@/app/components/ActivateAppPointer";
import { ArticleEditor } from "./ArticleEditor";
import { StatusBar } from "./StatusBar";
import { HistoryTimeline, type TransitionEntry } from "./HistoryTimeline";
import { isStatus, type ArticleStatus } from "@/lib/article-status";
import type { Camera, ExamplePhotoCategory } from "@/lib/brand-types";
import type { Block } from "./RichTextEditor";

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string; code: string; articleSlug: string }>;
}) {
  const { slug, code, articleSlug } = await params;
  const { supabase } = await requireUser();
  const brand = await getBrandBySlug(slug);
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("brand_id", brand.id)
    .eq("code", code)
    .maybeSingle();
  if (!project) notFound();
  if (!(await isAppActiveForProject(project.id, "content-insights"))) {
    return <ActivateAppPointer appName="content-insights" surface="Articles" />;
  }

  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("project_id", project.id)
    .eq("slug", articleSlug)
    .maybeSingle();
  if (!article) notFound();

  const { data: categoryRows } = await supabase
    .from("articles")
    .select("category")
    .eq("project_id", project.id)
    .not("category", "is", null);
  const knownCategories = Array.from(
    new Set(
      (categoryRows ?? [])
        .map((r) => (r.category as string | null)?.trim())
        .filter((s): s is string => !!s),
    ),
  ).sort();

  const cameras = (Array.isArray(brand.cameras) ? brand.cameras : []) as Camera[];
  const explicitCategories = (
    Array.isArray(brand.example_photo_categories)
      ? brand.example_photo_categories
      : []
  ) as ExamplePhotoCategory[];
  const referenceUrlList = (
    Array.isArray(brand.reference_image_urls)
      ? (brand.reference_image_urls as unknown[])
      : []
  ).filter((u): u is string => typeof u === "string");
  const referenceCategory: ExamplePhotoCategory[] =
    referenceUrlList.length > 0
      ? [
          {
            id: "_references",
            label: "Brand references",
            photos: referenceUrlList.map((url, i) => ({
              id: `ref-${i}`,
              url,
              description: "",
            })),
          },
        ]
      : [];
  const examplePhotoCategories: ExamplePhotoCategory[] = [
    ...explicitCategories,
    ...referenceCategory,
  ];
  const defaultImageModel = (brand.image_model as string) ?? "imagen-4";

  const rawBlocks = Array.isArray(article.blocks) ? article.blocks : [];
  type RawBlock = {
    type?: string;
    text?: string;
    src?: string;
    alt?: string;
    items?: string[];
    prompt?: string;
  };
  const blocks: Block[] = (rawBlocks as RawBlock[])
    .map((b): Block | null => {
      if (!b || typeof b.type !== "string") return null;
      if (
        ["h2", "h3", "h4", "p", "quote"].includes(b.type) &&
        typeof b.text === "string"
      ) {
        return { type: b.type as "h2" | "h3" | "h4" | "p" | "quote", text: b.text };
      }
      if (b.type === "ul" || b.type === "ol") {
        const items = Array.isArray(b.items)
          ? b.items.filter((it): it is string => typeof it === "string")
          : [];
        return { type: b.type, items };
      }
      if (b.type === "image" && typeof b.src === "string") {
        return {
          type: "image",
          src: b.src,
          alt: typeof b.alt === "string" ? b.alt : undefined,
          prompt: typeof b.prompt === "string" ? b.prompt : undefined,
        };
      }
      return null;
    })
    .filter((b): b is Block => b !== null);

  const rawStatus = (article.status as string | null) ?? "draft";
  const status: ArticleStatus = isStatus(rawStatus)
    ? (rawStatus as ArticleStatus)
    : "draft";

  const { data: transitionRows } = await supabase
    .from("article_transitions")
    .select("id, from_status, to_status, note, actor, created_at")
    .eq("article_id", article.id)
    .order("created_at", { ascending: false });

  const actorIds = Array.from(
    new Set(
      (transitionRows ?? [])
        .map((t) => t.actor as string | null)
        .filter((id): id is string => !!id),
    ),
  );
  const actorMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", actorIds);
    for (const p of profiles ?? []) {
      actorMap.set(
        p.id as string,
        ((p.full_name as string) || (p.email as string) || "Someone").trim(),
      );
    }
  }

  const historyEntries: TransitionEntry[] = (transitionRows ?? []).map(
    (t) => ({
      id: t.id as string,
      from_status: t.from_status as string | null,
      to_status: t.to_status as string,
      note: t.note as string | null,
      actor_label: t.actor ? actorMap.get(t.actor as string) ?? null : null,
      created_at: t.created_at as string,
    }),
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
      <Link
        href={`/brands/${slug}/projects/${code}/apps/content-insights/articles`}
        className="text-xs text-zinc-500 no-underline hover:text-zinc-900"
      >
        ← All articles
      </Link>
      <header>
        <h1 className="m-0 mb-2 text-3xl font-bold tracking-tight text-zinc-900">
          {article.title}
        </h1>
        <p className="m-0 text-[13px] text-zinc-500">
          {article.category ?? "Uncategorised"} ·{" "}
          {article.author ?? "No author"} ·{" "}
          {article.date_published
            ? new Date(article.date_published).toLocaleDateString()
            : "Not published"}{" "}
          · {article.word_count ?? 0} words
        </p>
      </header>

      <StatusBar
        brandSlug={slug}
        code={code}
        articleId={article.id as string}
        status={status}
      />

      <ArticleEditor
        brandSlug={slug}
        code={code}
        defaultImageModel={defaultImageModel}
        cameras={cameras}
        examplePhotoCategories={examplePhotoCategories}
        knownCategories={knownCategories}
        canEdit
        article={{
          id: article.id,
          title: article.title,
          description: article.description,
          category: article.category,
          tag: article.tag,
          hero_image: article.hero_image,
          author: article.author,
          author_image: article.author_image,
          status,
          blocks,
        }}
      />

      <section className="border-t border-zinc-200 pt-6">
        <h2 className="m-0 mb-3.5 text-xs font-bold uppercase tracking-widest text-zinc-500">
          History
        </h2>
        <HistoryTimeline entries={historyEntries} />
      </section>
    </div>
  );
}
