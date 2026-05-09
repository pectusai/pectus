"use client";

import { useEffect, useState } from "react";

const STAGES = [
  "Reading your brief",
  "Pulling in your brand voice and ICP",
  "Picking the persona to write to",
  "Sketching four to six sections",
  "Drafting the opener",
  "Filling in the body",
  "Tightening the lede",
  "Final pass",
];

const ROTATE_MS = 2200;

export function GeneratingModal({ open }: { open: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setIndex(0);
      return;
    }
    const t = setInterval(() => {
      setIndex((i) => (i < STAGES.length - 1 ? i + 1 : i));
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [open]);

  if (!open) return null;

  const current = STAGES[index];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="generating-title"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm"
    >
      <div className="w-[min(28rem,calc(100%-2rem))] rounded-2xl bg-white p-8 shadow-[0_25px_60px_rgba(0,0,0,0.35)]">
        <div
          className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-[3px] border-zinc-100"
          style={{ borderTopColor: "#db2777", borderRightColor: "#f97316" }}
          aria-hidden
        />

        <h2
          id="generating-title"
          className="mb-1.5 text-center text-base font-bold text-zinc-900"
        >
          Sonnet 4.6 is drafting your article
        </h2>

        <p
          aria-live="polite"
          className="mb-4 min-h-[1.5rem] text-center text-sm text-zinc-700"
        >
          {current}…
        </p>

        <p className="text-center text-xs text-zinc-500">
          Usually 8 to 20 seconds. Don&apos;t reload this tab.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
          {STAGES.map((_, i) => (
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
