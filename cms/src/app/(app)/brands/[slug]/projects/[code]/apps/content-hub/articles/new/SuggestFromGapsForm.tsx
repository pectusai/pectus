"use client";

import Link from "next/link";

type Gap = {
  keyword: string;
  search_volume: number | null;
  intent: string | null;
};

export function SuggestFromGapsForm({
  brandSlug,
  code,
  gaps,
}: {
  brandSlug: string;
  code: string;
  gaps: Gap[];
}) {
  if (gaps.length === 0) {
    return (
      <div className="pectus-write-empty">
        <p>
          Every keyword you have seems to be covered by an existing article (by
          title or description match), or you don&apos;t have any keywords yet.
          Add keywords under Project settings → Keywords to see gap suggestions.
        </p>
      </div>
    );
  }

  return (
    <div className="pectus-gaps">
      <p className="pectus-gaps-lede">
        Up to thirty keywords with no obvious match in your existing articles,
        sorted by search volume. Click one to drop it into the AI Write form
        and generate.
      </p>
      <ul className="pectus-gaps-list">
        {gaps.map((g) => {
          const params = new URLSearchParams({
            mode: "ai",
            keyword: g.keyword,
            brief: `Write an article that targets the keyword "${g.keyword}". Cover what it is, who needs it, why it matters, and how to get it right. Aim at someone evaluating or learning about this topic for the first time.`,
          });
          const href = `/brands/${brandSlug}/projects/${code}/apps/content-hub/articles/new?${params.toString()}`;
          return (
            <li key={g.keyword}>
              <Link href={href} className="pectus-gap-row">
                <span className="pectus-gap-keyword">{g.keyword}</span>
                <span className="pectus-gap-meta">
                  {g.search_volume != null
                    ? `${g.search_volume.toLocaleString("en-US")}/mo`
                    : "no volume"}
                  {g.intent ? ` · ${g.intent}` : ""}
                </span>
                <span className="pectus-gap-arrow" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
