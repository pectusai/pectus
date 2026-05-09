"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transitionArticleStatus, bulkDeleteArticles } from "./actions";

export function RemoveArticleButton({
  brandSlug,
  code,
  articleId,
  title,
  isShell,
}: {
  brandSlug: string;
  code: string;
  articleId: string;
  title: string;
  isShell: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    const verb = isShell ? "Delete" : "Archive";
    const detail = isShell
      ? "This permanently deletes the row. The shell has no content to lose, but the action can't be undone."
      : "This moves the article to Archived. It stays in the database with all its blocks and history; you can find it again by filtering by Archived.";
    const ok = window.confirm(
      `${verb} "${title}"?\n\n${detail}`,
    );
    if (!ok) return;

    startTransition(async () => {
      const res = isShell
        ? await bulkDeleteArticles(brandSlug, code, [articleId])
        : await transitionArticleStatus(
            brandSlug,
            code,
            articleId,
            "archived",
            "",
          );
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        title={isShell ? "Delete this imported shell" : "Archive this article"}
        className="inline-flex items-center rounded-md border border-transparent px-2 py-1 text-[11px] font-medium text-zinc-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-wait disabled:opacity-60"
      >
        {isPending
          ? isShell
            ? "Deleting…"
            : "Archiving…"
          : isShell
            ? "Delete"
            : "Archive"}
      </button>
      {error ? (
        <span className="max-w-[16ch] text-right text-[10px] text-red-700">
          {error}
        </span>
      ) : null}
    </div>
  );
}
