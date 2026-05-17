"use client";

import { useState } from "react";

const COMMAND = "npx pectus update";

export function WelcomeBanner() {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <section className="rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 via-white to-orange-50 p-5">
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-bold tracking-tight text-zinc-900">
          Welcome back!
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-pink-700">
          Tip
        </span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-700">
        Open your terminal and run this to see if there are any new updates,
        apps, skills, or settings:
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-[13px] text-zinc-900">
          {COMMAND}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center rounded-md bg-zinc-900 px-3 py-2 text-[12px] font-semibold text-white hover:bg-black"
          aria-live="polite"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </section>
  );
}
