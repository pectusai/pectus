"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { fetchSitemapUrls, parseArticle } from "@/lib/article-importer";
import { touchFreshness } from "@/lib/workspace";

export type ImportResult =
  | {
      ok: true;
      imported: number;
      skipped: number;
      errors: Array<{ url: string; message: string }>;
      total_urls: number;
    }
  | { ok: false; error: string };

const MAX_URLS = 200;

export async function importArticlesFromSitemap(
  workspaceCode: string,
  sitemapUrl: string,
  pathFilter: string,
): Promise<ImportResult> {
  const { supabase } = await requireUser();

  const { data: ws, error: wsErr } = await supabase
    .from("workspaces")
    .select("id")
    .eq("code", workspaceCode)
    .single();
  if (wsErr || !ws) {
    return { ok: false, error: `Workspace lookup failed: ${wsErr?.message ?? "not found"}` };
  }

  let urls: string[];
  try {
    urls = await fetchSitemapUrls(sitemapUrl);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const filter = pathFilter.trim();
  const filtered = filter ? urls.filter((u) => u.includes(filter)) : urls;
  const targets = filtered.slice(0, MAX_URLS);

  let imported = 0;
  let skipped = 0;
  const errors: Array<{ url: string; message: string }> = [];

  for (const url of targets) {
    try {
      const article = await parseArticle(url);
      if (!article) {
        skipped += 1;
        continue;
      }
      const { error } = await supabase.from("articles").upsert(
        {
          workspace_id: ws.id,
          slug: article.slug,
          title: article.title,
          description: article.description,
          hero_image: article.hero_image,
          category: article.category,
          author: article.author,
          date_published: article.date_published,
          date_modified: article.date_modified,
          word_count: article.word_count,
          read_time: article.read_time,
          blocks: article.blocks,
          source: url,
          status: "imported",
        },
        { onConflict: "workspace_id,slug" },
      );
      if (error) {
        errors.push({ url, message: error.message });
        continue;
      }
      imported += 1;
    } catch (err) {
      errors.push({
        url,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await touchFreshness(ws.id, "articles", `sitemap: ${sitemapUrl}`);
  revalidatePath(`/workspaces/${workspaceCode}/articles`);

  return {
    ok: true,
    imported,
    skipped,
    errors,
    total_urls: filtered.length,
  };
}
