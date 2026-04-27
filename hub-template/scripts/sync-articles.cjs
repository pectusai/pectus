#!/usr/bin/env node
/**
 * Pull articles from the user's Supabase `articles` table into
 * src/data/articles.json. Reads env from <repo-root>/.env.local.
 */
const fs = require("node:fs");
const path = require("node:path");

function findRepoRoot() {
  let dir = __dirname;
  for (let i = 0; i < 10; i += 1) {
    if (fs.existsSync(path.join(dir, "pectus.md"))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error("Could not find repo root.");
}

function loadEnv() {
  const root = findRepoRoot();
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(`No .env.local at ${envPath}. Run pectus connect supabase first.`);
  }
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    process.exit(1);
  }

  const res = await fetch(`${url}/rest/v1/articles?select=*&status=eq.published&order=date_published.desc`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!res.ok) {
    console.error(`Supabase fetch failed (${res.status}): ${await res.text()}`);
    process.exit(1);
  }
  const rows = await res.json();

  const articles = rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    description: r.description ?? "",
    heroImage: r.hero_image ?? "",
    category: r.category ?? "",
    author: r.author ?? "",
    authorImage: r.author_image ?? null,
    datePublished: r.date_published ?? new Date().toISOString(),
    dateModified: r.date_modified ?? r.date_published ?? new Date().toISOString(),
    readTime: r.read_time ?? "",
    wordCount: r.word_count ?? 0,
    blocks: r.blocks ?? [],
  }));

  const out = path.join(__dirname, "..", "src", "data", "articles.json");
  fs.writeFileSync(out, JSON.stringify(articles, null, 2));
  console.log(`Wrote ${articles.length} articles to ${out}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
