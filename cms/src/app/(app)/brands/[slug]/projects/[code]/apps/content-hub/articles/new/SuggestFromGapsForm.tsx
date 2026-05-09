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
      <div className="text-sm leading-relaxed text-zinc-600">
        Every keyword you have seems to be covered by an existing article (by
        title or description match), or you don&apos;t have any keywords yet.
        Add keywords under Project settings → Keywords to see gap suggestions.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm leading-relaxed text-zinc-600">
        Up to thirty keywords with no obvious match in your existing articles,
        sorted by search volume. Click one to drop it into the AI Write form
        and generate.
      </p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {gaps.map((g) => {
          const params = new URLSearchParams({
            mode: "ai",
            keyword: g.keyword,
            brief: `Write an article that targets the keyword "${g.keyword}". Cover what it is, who needs it, why it matters, and how to get it right. Aim at someone evaluating or learning about this topic for the first time.`,
          });
          const href = `/brands/${brandSlug}/projects/${code}/apps/content-hub/articles/new?${params.toString()}`;
          return (
            <li key={g.keyword}>
              <Link
                href={href}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3.5 rounded-lg border border-transparent px-3.5 py-2.5 text-zinc-900 no-underline transition hover:border-zinc-200 hover:bg-zinc-50"
              >
                <span className="font-medium text-zinc-900">{g.keyword}</span>
                <span className="text-[13px] tabular-nums text-zinc-500">
                  {g.search_volume != null
                    ? `${g.search_volume.toLocaleString("en-US")}/mo`
                    : "no volume"}
                  {g.intent ? ` · ${g.intent}` : ""}
                </span>
                <span aria-hidden className="font-medium text-pink-700">
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
