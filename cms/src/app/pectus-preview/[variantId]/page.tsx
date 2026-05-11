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

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ variantId: string }>;
}) {
  const { variantId } = await params;
  const supabase = createServiceClient();

  const { data: variant } = await supabase
    .from("page_variants")
    .select("title, blocks")
    .eq("id", variantId)
    .single();
  if (!variant) notFound();

  const blocks = Array.isArray(variant.blocks)
    ? (variant.blocks as PageBlock[])
    : [];

  return (
    <main>
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
