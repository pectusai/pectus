"use client";

import { useState } from "react";
import Link from "next/link";
import { BlankArticleForm } from "./BlankArticleForm";
import { WriteArticleForm } from "./WriteArticleForm";
import { SuggestFromGapsForm } from "./SuggestFromGapsForm";

type Gap = {
  keyword: string;
  search_volume: number | null;
  intent: string | null;
};

type Mode = "blank" | "ai" | "suggest";

const TABS: Array<{ key: Mode; label: string }> = [
  { key: "ai", label: "AI Write" },
  { key: "blank", label: "Blank" },
  { key: "suggest", label: "Suggest from gaps" },
];

export function NewArticleSurface({
  brandSlug,
  code,
  initialMode,
  initialAi,
  gaps,
  warnings,
}: {
  brandSlug: string;
  code: string;
  initialMode: Mode;
  initialAi: {
    keyword: string;
    purpose: string;
    brief: string;
    persona: string;
  };
  gaps: Gap[];
  warnings: { icpEmpty: boolean; voiceEmpty: boolean };
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [ai, setAi] = useState(initialAi);

  const showWarning =
    mode === "ai" && (warnings.icpEmpty || warnings.voiceEmpty);

  return (
    <div>
      <nav
        className="mt-5 flex items-center gap-1 border-b border-zinc-200"
        aria-label="New article mode"
      >
        {TABS.map((t) => {
          const isActive = t.key === mode;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setMode(t.key)}
              className={`-mb-px cursor-pointer rounded-t-md border-b-2 bg-transparent px-3.5 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-pink-700 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {showWarning ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          <strong className="font-semibold">Heads up.</strong>{" "}
          {warnings.voiceEmpty ? (
            <>
              Brand voice is not set yet, so the AI will fall back to a generic
              direct, warm voice.{" "}
              <Link
                href={`/brands/${brandSlug}/profile`}
                className="font-medium text-pink-700 no-underline hover:underline"
              >
                Set voice →
              </Link>{" "}
            </>
          ) : null}
          {warnings.icpEmpty ? (
            <>
              ICP is empty, so the AI won&apos;t personalise to a persona or
              painpoint.{" "}
              <Link
                href={`/brands/${brandSlug}/projects/${code}/icp`}
                className="font-medium text-pink-700 no-underline hover:underline"
              >
                Add personas →
              </Link>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-6">
        {mode === "blank" ? (
          <BlankArticleForm brandSlug={brandSlug} code={code} />
        ) : mode === "suggest" ? (
          <SuggestFromGapsForm
            brandSlug={brandSlug}
            code={code}
            gaps={gaps}
          />
        ) : (
          <WriteArticleForm
            brandSlug={brandSlug}
            code={code}
            value={ai}
            onChange={setAi}
          />
        )}
      </div>
    </div>
  );
}
