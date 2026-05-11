import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { createServiceClient } from "@pectus/supabase";
import type { PageBlock } from "@pectus/content-hub/blocks";
import { BlockRenderer } from "./blocks";

/* In-CMS preview iframe. Renders a page variant's blocks using simple
 * React components. Production publishing still happens through the
 * Astro app — this exists so the builder iframe has something to show
 * without a second dev server.
 *
 * Public route on purpose (lives outside (app)/) so the iframe inside
 * the builder doesn't bounce through auth. Uses the service client to
 * read draft content without needing a session. */

export const dynamic = "force-dynamic";

type BrandFontSizes = {
  h1?: string;
  h2?: string;
  h3?: string;
  body?: string;
};

async function loadBrandFontSizes(
  supabase: ReturnType<typeof createServiceClient>,
  pageId: string,
): Promise<BrandFontSizes> {
  const { data: page } = await supabase
    .from("pages")
    .select("project:projects!inner(brand:brands!inner(font_sizes))")
    .eq("id", pageId)
    .maybeSingle();
  const project = page?.project as
    | { brand?: { font_sizes?: BrandFontSizes } | { font_sizes?: BrandFontSizes }[] }
    | { brand?: { font_sizes?: BrandFontSizes } | { font_sizes?: BrandFontSizes }[] }[]
    | undefined;
  const proj = Array.isArray(project) ? project[0] : project;
  const brand = Array.isArray(proj?.brand) ? proj?.brand[0] : proj?.brand;
  return brand?.font_sizes ?? {};
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ variantId: string }>;
}) {
  const { variantId } = await params;
  const supabase = createServiceClient();

  const { data: variant } = await supabase
    .from("page_variants")
    .select("title, blocks, page_id")
    .eq("id", variantId)
    .single();
  if (!variant) notFound();

  const fontSizes = await loadBrandFontSizes(supabase, variant.page_id);

  const blocks = Array.isArray(variant.blocks)
    ? (variant.blocks as PageBlock[])
    : [];

  /* CSS variables consumed by BlockRenderer's headings and body text.
   * Always set defaults — brand overrides win when present. */
  const brandVars = {
    "--brand-h1-size": fontSizes.h1 ?? "2.25rem",
    "--brand-h2-size": fontSizes.h2 ?? "1.875rem",
    "--brand-h3-size": fontSizes.h3 ?? "1.5rem",
    "--brand-body-size": fontSizes.body ?? "1rem",
    fontSize: "var(--brand-body-size)",
  } as CSSProperties;

  return (
    <main style={brandVars}>
      {blocks.length === 0 ? (
        <div className="flex min-h-screen items-center justify-center px-6">
          <p className="max-w-md text-center text-sm text-zinc-500">
            This page has no blocks yet. Ask the chat on the left to add
            something — for example, &ldquo;add a hero with a headline and
            short subhead&rdquo;.
          </p>
        </div>
      ) : (
        blocks.map((block, i) => <BlockRenderer key={i} block={block} />)
      )}
    </main>
  );
}
