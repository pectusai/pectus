"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transitionArticleStatus } from "../actions";
import {
  ALLOWED_TRANSITIONS,
  STATUS_LABELS,
  STATUS_PILL_CLASS,
  type ArticleStatus,
} from "@/lib/article-status";

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
    <section className="pectus-status-bar">
      <div className="pectus-status-row">
        <span className={STATUS_PILL_CLASS[status]}>
          {STATUS_LABELS[status]}
        </span>
        {transitions.length === 0 ? (
          <span className="pectus-status-terminal">Terminal state.</span>
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
                  ? "pectus-status-button-primary"
                  : "pectus-status-button-secondary"
              }
            >
              {t.label}
            </button>
          ))
        )}
      </div>

      {confirming ? (
        <div className="pectus-status-confirm">
          <p>
            <strong>{confirming.label}</strong> — add an optional note for the
            history (what changed, who needs to know):
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="e.g. Voice check passed. Ready for market lead review."
            className="pectus-status-confirm-textarea"
          />
          <div className="pectus-status-confirm-actions">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isBusy}
              className="pectus-status-button-primary"
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
              className="pectus-status-button-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="pectus-status-error">{error}</p> : null}
    </section>
  );
}
