"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  STATUS_LABELS,
  isStatus,
  type ArticleStatus,
} from "@/lib/article-status";
import {
  bulkDeleteArticles,
  transitionArticleStatus,
  scrapeArticleContent,
} from "./actions";
import { FetchArticleButton } from "./FetchArticleButton";
import { RemoveArticleButton } from "./RemoveArticleButton";

const STATUS_PILL: Record<ArticleStatus, string> = {
  imported: "bg-pink-100 text-pink-800",
  draft: "bg-zinc-100 text-zinc-700",
  brand_review: "bg-amber-100 text-amber-800",
  market_lead_review: "bg-blue-100 text-blue-800",
  published: "bg-emerald-100 text-emerald-800",
  archived: "bg-zinc-100 text-zinc-500",
};

export type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  author: string | null;
  date_published: string | null;
  word_count: number | null;
  status: string | null;
};

type BulkAction =
  | "archive"
  | "set_draft"
  | "set_brand_review"
  | "set_market_lead_review"
  | "publish"
  | "delete"
  | "import";

const BULK_ACTIONS: Array<{ value: BulkAction; label: string }> = [
  { value: "archive", label: "Archive selected" },
  { value: "set_draft", label: "Move to Draft" },
  { value: "set_brand_review", label: "Send to Brand review" },
  { value: "set_market_lead_review", label: "Send to Market lead review" },
  { value: "publish", label: "Publish" },
  { value: "import", label: "Import (fetch full article)" },
  { value: "delete", label: "Delete selected (hard)" },
];

export function ArticlesBulkBar({
  brandSlug,
  code,
  articleBase,
  rows,
}: {
  brandSlug: string;
  code: string;
  articleBase: string;
  rows: ArticleRow[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<BulkAction>("archive");
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && selected.size < rows.length;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectShells = () => {
    setSelected(
      new Set(
        rows
          .filter(
            (r) => r.status === "imported" && (r.word_count ?? 0) === 0,
          )
          .map((r) => r.id),
      ),
    );
  };

  const ids = useMemo(() => Array.from(selected), [selected]);

  const labelFor = (act: BulkAction): string =>
    BULK_ACTIONS.find((a) => a.value === act)?.label ?? act;

  const summaryTitles = (): string => {
    const titles = rows
      .filter((r) => selected.has(r.id))
      .slice(0, 3)
      .map((r) => `"${r.title}"`);
    if (selected.size > 3) titles.push(`and ${selected.size - 3} more`);
    return titles.join(", ");
  };

  const runBulk = async () => {
    if (ids.length === 0) return;
    setError(null);

    const confirmMsg =
      action === "delete"
        ? `Permanently delete ${ids.length} article${ids.length === 1 ? "" : "s"}? This can't be undone.\n\n${summaryTitles()}`
        : `${labelFor(action)} on ${ids.length} article${ids.length === 1 ? "" : "s"}?\n\n${summaryTitles()}`;
    if (!window.confirm(confirmMsg)) return;

    setBusy(action);

    if (action === "delete") {
      const res = await bulkDeleteArticles(brandSlug, code, ids);
      setBusy(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSelected(new Set());
      startTransition(() => router.refresh());
      return;
    }

    if (action === "import") {
      let done = 0;
      let failed = 0;
      for (const id of ids) {
        setProgress(`Importing ${++done} of ${ids.length}…`);
        const r = await scrapeArticleContent(brandSlug, code, id);
        if (!r.ok) failed++;
      }
      setProgress(null);
      setBusy(null);
      if (failed > 0)
        setError(
          `${failed} of ${ids.length} imports failed. Check those rows for the source URL.`,
        );
      setSelected(new Set());
      startTransition(() => router.refresh());
      return;
    }

    // status transitions
    const target: ArticleStatus =
      action === "archive"
        ? "archived"
        : action === "set_draft"
          ? "draft"
          : action === "set_brand_review"
            ? "brand_review"
            : action === "set_market_lead_review"
              ? "market_lead_review"
              : "published";

    let done = 0;
    let failed = 0;
    for (const id of ids) {
      setProgress(`${labelFor(action)} ${++done} of ${ids.length}…`);
      const r = await transitionArticleStatus(brandSlug, code, id, target, "");
      if (!r.ok) failed++;
    }
    setProgress(null);
    setBusy(null);
    if (failed > 0)
      setError(
        `${failed} of ${ids.length} could not transition. The status workflow may not allow that move from their current state.`,
      );
    setSelected(new Set());
    startTransition(() => router.refresh());
  };

  const yearNow = new Date().getFullYear();

  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-3 py-2">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-xs text-zinc-500">
            {selected.size} of {rows.length} selected
          </span>
          {selected.size === 0 ? (
            <button
              type="button"
              onClick={selectShells}
              className="text-xs text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
            >
              Select imported shells
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as BulkAction)}
            disabled={busy !== null || selected.size === 0}
            className="h-[28px] rounded-md border border-zinc-300 bg-white px-2 text-xs font-medium disabled:opacity-50"
          >
            {BULK_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={runBulk}
            disabled={busy !== null || selected.size === 0}
            className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"
          >
            {busy ? "Running…" : "Apply"}
          </button>
        </div>
      </div>

      {progress ? (
        <p className="border-b border-zinc-100 bg-white px-3 py-1.5 text-xs text-zinc-600">
          {progress}
        </p>
      ) : null}
      {error ? (
        <p className="border-b border-red-100 bg-red-50 px-3 py-1.5 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-zinc-50">
            <tr>
              <Th width="2rem" align="left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all rows"
                  className="cursor-pointer accent-pink-700"
                />
              </Th>
              <Th>Title</Th>
              <Th>Category</Th>
              <Th>Author</Th>
              <Th align="right">Published</Th>
              <Th align="right">Words</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const rawStatus = a.status ?? "draft";
              const status: ArticleStatus = isStatus(rawStatus)
                ? (rawStatus as ArticleStatus)
                : "draft";
              const wordCount = a.word_count ?? 0;
              const showFetch = status === "imported" && wordCount === 0;
              const isChecked = selected.has(a.id);
              const publishedDate = a.date_published
                ? new Date(a.date_published)
                : null;
              const publishedLabel = publishedDate
                ? publishedDate.getFullYear() === yearNow
                  ? publishedDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : publishedDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "2-digit",
                    })
                : null;
              return (
                <tr
                  key={a.id}
                  className={`border-t border-zinc-100 ${isChecked ? "bg-pink-50/40" : ""}`}
                >
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOne(a.id)}
                      aria-label={`Select ${a.title}`}
                      className="cursor-pointer accent-pink-700"
                    />
                  </td>
                  <td
                    className="px-3 py-2 align-top"
                    style={{ maxWidth: "22rem" }}
                  >
                    <Link
                      href={`${articleBase}/${a.slug}`}
                      title={a.title}
                      className="block truncate font-medium text-zinc-900 hover:underline"
                    >
                      {a.title}
                    </Link>
                    <span
                      className="mt-0.5 block truncate text-[11px] text-zinc-500"
                      title={a.slug}
                    >
                      {a.slug}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    {a.category ? (
                      <span className="inline-flex max-w-[10rem] items-center truncate rounded bg-pink-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-800">
                        {a.category}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td
                    className="max-w-[8rem] truncate px-3 py-2 align-top text-zinc-700"
                    title={a.author ?? ""}
                  >
                    {a.author ?? <span className="text-zinc-400">—</span>}
                  </td>
                  <td
                    className="whitespace-nowrap px-3 py-2 text-right align-top text-zinc-700 tabular-nums"
                    title={
                      publishedDate
                        ? publishedDate.toLocaleDateString()
                        : ""
                    }
                  >
                    {publishedLabel ?? <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right align-top text-zinc-900 tabular-nums">
                    {wordCount > 0 ? (
                      wordCount.toLocaleString("en-US")
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {showFetch ? (
                      <FetchArticleButton
                        brandSlug={brandSlug}
                        code={code}
                        articleId={a.id}
                      />
                    ) : (
                      <span
                        className={`inline-flex whitespace-nowrap items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_PILL[status]}`}
                      >
                        {STATUS_LABELS[status]}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    {status === "archived" ? (
                      <span className="text-[11px] text-zinc-400">—</span>
                    ) : (
                      <RemoveArticleButton
                        brandSlug={brandSlug}
                        code={code}
                        articleId={a.id}
                        title={a.title}
                        isShell={showFetch}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
  width,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  width?: string;
}) {
  return (
    <th
      style={width ? { width } : undefined}
      className={`${align === "right" ? "text-right" : "text-left"} px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500`}
    >
      {children}
    </th>
  );
}
