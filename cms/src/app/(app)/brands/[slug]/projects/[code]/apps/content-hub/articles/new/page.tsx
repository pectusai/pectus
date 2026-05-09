import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/active-brand";
import { isAppActiveForProject } from "@/lib/apps";
import { ActivateAppPointer } from "@/app/components/ActivateAppPointer";
import { BlankArticleForm } from "./BlankArticleForm";

export default async function NewArticlePage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
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

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href={`/brands/${slug}/projects/${code}/apps/content-hub/articles`}
        className="text-xs text-zinc-500 hover:text-zinc-900"
      >
        ← All articles
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        New article
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Create a blank draft and write it in the editor.
      </p>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <BlankArticleForm brandSlug={slug} code={code} />
      </div>
    </div>
  );
}
