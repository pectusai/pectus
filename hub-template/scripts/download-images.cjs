#!/usr/bin/env node
/**
 * Cache remote article images locally so the static build doesn't depend on
 * external CDNs. Idempotent — skips files already on disk.
 *
 * v1: minimal version. Reads src/data/articles.json, downloads any heroImage
 * with an http(s) URL into public/article-images/, rewrites the URL in articles.json.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ARTICLES = path.join(__dirname, "..", "src", "data", "articles.json");
const DEST = path.join(__dirname, "..", "public", "article-images");

function hashName(url) {
  const md5 = crypto.createHash("md5").update(url).digest("hex").slice(0, 8);
  const ext = path.extname(new URL(url).pathname) || ".jpg";
  const base = path
    .basename(new URL(url).pathname, ext)
    .replace(/[^a-z0-9-]/gi, "-")
    .toLowerCase()
    .slice(0, 40) || "image";
  return `${md5}-${base}${ext}`;
}

async function downloadOne(url) {
  if (!url || !/^https?:\/\//.test(url)) return url;
  fs.mkdirSync(DEST, { recursive: true });
  const filename = hashName(url);
  const dest = path.join(DEST, filename);
  if (!fs.existsSync(dest)) {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[skip] ${url} (${res.status})`);
      return url;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    console.log(`[fetched] ${filename}`);
  }
  return `/article-images/${filename}`;
}

async function main() {
  if (!fs.existsSync(ARTICLES)) {
    console.error("No articles.json. Run sync-articles first.");
    process.exit(1);
  }
  const articles = JSON.parse(fs.readFileSync(ARTICLES, "utf8"));
  for (const a of articles) {
    a.heroImage = await downloadOne(a.heroImage);
    if (Array.isArray(a.blocks)) {
      for (const b of a.blocks) {
        if (b.type === "image" && b.src) b.src = await downloadOne(b.src);
      }
    }
  }
  fs.writeFileSync(ARTICLES, JSON.stringify(articles, null, 2));
  console.log(`Done. ${articles.length} articles processed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
