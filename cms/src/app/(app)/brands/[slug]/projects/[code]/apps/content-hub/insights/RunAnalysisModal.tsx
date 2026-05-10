"use client";

import { useEffect, useState } from "react";

const ROTATE_MS = 4500;

export function RunAnalysisModal({
  open,
  title,
  stages,
  approxSeconds = 60,
}: {
  open: boolean;
  title: string;
  stages: string[];
  approxSeconds?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setIndex(0);
      return;
    }
    const t = setInterval(() => {
      setIndex((i) => (i < stages.length - 1 ? i + 1 : i));
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [open, stages.length]);

  if (!open) return null;

  const current = stages[Math.min(index, stages.length - 1)];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-analysis-title"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm"
    >
      <div className="w-[min(28rem,calc(100%-2rem))] rounded-2xl bg-white p-8 shadow-[0_25px_60px_rgba(0,0,0,0.35)]">
        <div
          className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-[3px] border-zinc-100"
          style={{ borderTopColor: "#db2777", borderRightColor: "#f97316" }}
          aria-hidden
        />

        <h2
          id="run-analysis-title"
          className="mb-1.5 text-center text-base font-bold text-zinc-900"
        >
          {title}
        </h2>

        <p
          aria-live="polite"
          className="mb-4 min-h-[1.5rem] text-center text-sm text-zinc-700"
        >
          {current}…
        </p>

        <p className="text-center text-xs text-zinc-500">
          Usually around {approxSeconds} seconds. Don&apos;t reload this tab.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
          {stages.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition ${
                i <= index ? "bg-pink-600" : "bg-zinc-200"
              }`}
              aria-hidden
            />
          ))}
        </div>
      </div>
    </div>
  );
}
