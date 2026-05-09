"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transitionArticleStatus } from "../actions";
import {
  ALLOWED_TRANSITIONS,
  STATUS_LABELS,
  type ArticleStatus,
} from "@/lib/article-status";

const PILL_CLASSES: Record<ArticleStatus, string> = {
  imported: "bg-zinc-100 text-zinc-600",
  draft: "bg-zinc-100 text-zinc-600",
  brand_review: "bg-amber-100 text-amber-800",
  market_lead_review: "bg-blue-100 text-blue-800",
  published: "bg-emerald-100 text-emerald-800",
  archived: "bg-zinc-100 text-zinc-500",
};

export function StatusBar({
  brandSlug,
  code,
  articleId,
  status,
}: {
  brandSlug: string;
  code: string;
  articleId: string;
  status: ArticleStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{
    to: ArticleStatus;
    label: string;
  } | null>(null);
  const [note, setNote] = useState("");

  const transitions = ALLOWED_TRANSITIONS[status];

  const onConfirm = async () => {
    if (!confirming) return;
    setBusy(confirming.to);
    setError(null);
    try {
      const res = await transitionArticleStatus(
        brandSlug,
        code,
        articleId,
        confirming.to,
        note.trim(),
      );
      if (!res.ok) {
        setError(res.error);
        setBusy(null);
        return;
      }
      setNote("");
      setConfirming(null);
      startTransition(() => router.refresh());
      setBusy(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setBusy(null);
    }
  };

  const isBusy = busy !== null || isPending;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${PILL_CLASSES[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
        {transitions.length === 0 ? (
          <span className="text-[13px] italic text-zinc-500">
            Terminal state.
          </span>
        ) : (
          transitions.map((t) => (
            <button
              key={t.to}
              type="button"
              disabled={isBusy}
              onClick={() => {
                setConfirming({ to: t.to, label: t.label });
                setError(null);
              }}
              className={
                t.variant === "primary"
                  ? "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-zinc-900 px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-55"
                  : "inline-flex cursor-pointer items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px] font-medium text-zinc-900 hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-55"
              }
            >
              {t.label}
            </button>
          ))
        )}
      </div>

      {confirming ? (
        <div className="mt-3.5 border-t border-zinc-100 pt-3.5">
          <p className="m-0 mb-2 text-sm leading-relaxed text-zinc-700">
            <strong className="font-semibold">{confirming.label}</strong> — add
            an optional note for the history (what changed, who needs to know):
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="e.g. Voice check passed. Ready for market lead review."
            className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed focus:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isBusy}
              className="inline-flex cursor-pointer items-center rounded-lg bg-zinc-900 px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isBusy ? "Saving…" : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(null);
                setNote("");
              }}
              disabled={isBusy}
              className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px] font-medium text-zinc-900 hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="m-0 mt-2 text-[13px] text-red-700">{error}</p>
      ) : null}
    </section>
  );
}
