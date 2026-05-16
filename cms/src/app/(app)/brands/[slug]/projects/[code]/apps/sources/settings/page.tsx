export default async function SourcesSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-2 py-2">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Sources</h1>
        <p className="mt-2 max-w-prose text-sm text-zinc-600">
          Inbound app. Will let you point Pectus at any URL or sitemap and
          scrape the underlying pages into a shared store other apps can read.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            What this will feed in Pectus
          </h2>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-amber-800">
            Coming soon
          </span>
        </div>
        <p className="text-sm leading-6 text-zinc-700">
          GA4 tells you what people did. Search Console tells you what they
          searched. Sources tells Pectus what the pages actually say. Content
          Insights uses that to ground its analysis in the real site instead of
          reasoning purely from metric deltas.
        </p>
        <p className="text-sm leading-6 text-zinc-700">
          The first version will accept either a list of URLs or a full sitemap,
          fetch each page, and store cleaned body text, headings, and internal
          links in a shared <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">source_pages</code>{" "}
          table. Future consumer apps can read the same rows for competitor
          scanning, topical clustering, or canonical-page lookup.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-dashed border-zinc-300 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Planned setup</h2>
        <ul className="space-y-2 text-sm text-zinc-700">
          <li>
            <strong>Sitemaps:</strong> paste a sitemap or sitemap-index URL.
            Pectus fetches it on a schedule and queues every page for scrape.
          </li>
          <li>
            <strong>Single URLs:</strong> add one-off pages (competitor articles,
            reference posts) that aren&apos;t in your own sitemap.
          </li>
          <li>
            <strong>Robots-respecting:</strong> the scraper honors{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">robots.txt</code>{" "}
            and supplies a Pectus user-agent so site owners can identify the
            traffic.
          </li>
        </ul>
      </section>
    </div>
  );
}
