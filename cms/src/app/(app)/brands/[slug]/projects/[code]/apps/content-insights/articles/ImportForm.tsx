"use client";

import { useState } from "react";
import { importArticlesFromSitemap, type ImportResult } from "./import-actions";

export function ImportForm({
  projectCode,
  defaultSitemap,
}: {
  projectCode: string;
  defaultSitemap: string;
}) {
  const [sitemapUrl, setSitemapUrl] = useState(defaultSitemap);
  const [pathFilter, setPathFilter] = useState("/blog/");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function run() {
    if (!sitemapUrl.trim()) return;
    setRunning(true);
    setResult(null);
    const r = await importArticlesFromSitemap(projectCode, sitemapUrl.trim(), pathFilter);
    setRunning(false);
    setResult(r);
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="sitemap-url" className="block text-sm font-medium">
          Sitemap URL
        </label>
        <input
          id="sitemap-url"
          type="url"
          value={sitemapUrl}
          onChange={(e) => setSitemapUrl(e.target.value)}
          placeholder="https://yoursite.com/sitemap.xml"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          Sitemap index files (with child sitemaps) are also supported.
        </p>
      </div>
      <div>
        <label htmlFor="path-filter" className="block text-sm font-medium">
          URL filter (optional)
        </label>
        <input
          id="path-filter"
          type="text"
          value={pathFilter}
          onChange={(e) => setPathFilter(e.target.value)}
          placeholder="/blog/"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          Only URLs containing this string get imported. Leave empty to import everything (capped at 200 URLs).
        </p>
      </div>
      <button
        type="button"
        onClick={run}
        disabled={running || !sitemapUrl.trim()}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {running ? "Importing..." : "Import"}
      </button>
      {result?.ok && (
        <div className="text-sm">
          <p>
            Imported <strong>{result.imported}</strong> · skipped {result.skipped} of {result.total_urls} URLs.
          </p>
          {result.errors.length > 0 && (
            <details className="mt-2 text-xs text-gray-600">
              <summary>{result.errors.length} errors</summary>
              <ul className="mt-1 list-disc pl-5">
                {result.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>
                    {e.url} — {e.message}
                  </li>
                ))}
                {result.errors.length > 10 && <li>...and {result.errors.length - 10} more.</li>}
              </ul>
            </details>
          )}
        </div>
      )}
      {result && !result.ok && (
        <p className="text-sm text-red-600">{result.error}</p>
      )}
    </div>
  );
}
