"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { scrapeArticleContent } from "./actions";

export function FetchArticleButton({
  brandSlug,
  code,
  articleId,
}: {
  brandSlug: string;
  code: string;
  articleId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const r = await scrapeArticleContent(brandSlug, code, articleId);
      if (r.ok) {
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className="inline-flex items-center rounded-md bg-pink-700 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-pink-800 disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "Importing…" : "Import"}
      </button>
      {error ? (
        <span className="max-w-[20ch] text-right text-[10px] text-red-700">
          {error}
        </span>
      ) : null}
    </div>
  );
}
