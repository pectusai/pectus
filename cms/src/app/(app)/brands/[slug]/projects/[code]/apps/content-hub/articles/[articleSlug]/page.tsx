import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/active-brand";
import { isAppActiveForProject } from "@/lib/apps";
import { ActivateAppPointer } from "@/app/components/ActivateAppPointer";
import { ArticleEditor } from "./ArticleEditor";
import type { Camera, ExamplePhotoCategory } from "@/lib/brand-types";
import type { Block } from "./RichTextEditor";

const STATUS_LABELS: Record<string, string> = {
  imported: "Imported",
  draft: "Draft",
  review: "In review",
  published: "Published",
  archived: "Archived",
};

const STATUS_STYLES: Record<string, string> = {
  imported: "bg-zinc-100 text-zinc-700 border-zinc-200",
  draft: "bg-amber-50 text-amber-800 border-amber-200",
  review: "bg-blue-50 text-blue-800 border-blue-200",
  published: "bg-emerald-50 text-emerald-800 border-emerald-200",
  archived: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

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
  if (!(await isAppActiveForProject(project.id, "content-hub"))) {
    return <ActivateAppPointer appName="content-hub" surface="Articles" />;
  }

  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("project_id", project.id)
    .eq("slug", articleSlug)
    .maybeSingle();
  if (!article) notFound();

  const cameras = (Array.isArray(brand.cameras) ? brand.cameras : []) as Camera[];
  const examplePhotoCategories = (
    Array.isArray(brand.example_photo_categories)
      ? brand.example_photo_categories
      : []
  ) as ExamplePhotoCategory[];
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

  const status = (article.status as string | null) ?? "draft";

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      <div>
        <Link
          href={`/brands/${slug}/projects/${code}/apps/content-hub/articles`}
          className="text-xs text-zinc-500 hover:text-zinc-900"
        >
          ← All articles
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {article.title}
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              {article.category ?? "Uncategorised"} ·{" "}
              {article.author ?? "No author"} ·{" "}
              {article.date_published
                ? new Date(article.date_published).toLocaleDateString()
                : "Not published"}{" "}
              · {article.word_count ?? 0} words
            </p>
          </div>
          <span
            className={`rounded-md border px-2 py-1 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
          >
            {STATUS_LABELS[status] ?? status}
          </span>
        </div>
      </div>

      <ArticleEditor
        brandSlug={slug}
        code={code}
        defaultImageModel={defaultImageModel}
        cameras={cameras}
        examplePhotoCategories={examplePhotoCategories}
        canEdit
        article={{
          id: article.id,
          title: article.title,
          description: article.description,
          category: article.category,
          hero_image: article.hero_image,
          author: article.author,
          author_image: article.author_image,
          status,
          blocks,
        }}
      />
    </div>
  );
}
