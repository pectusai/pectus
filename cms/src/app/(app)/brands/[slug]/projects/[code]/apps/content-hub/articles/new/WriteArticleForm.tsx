"use client";

import { useState, useActionState } from "react";
import { generateArticle, type GenerateResult } from "./actions";

const STAGES = [
  "Pulling in your brand voice and ICP",
  "Reading the brief",
  "Drafting four to six sections",
  "Tightening the lede",
  "Final pass",
];

export type AiFormValues = {
  keyword: string;
  purpose: string;
  brief: string;
  persona: string;
};

export function WriteArticleForm({
  brandSlug,
  code,
  value,
  onChange,
}: {
  brandSlug: string;
  code: string;
  value: AiFormValues;
  onChange: (next: AiFormValues) => void;
}) {
  const [state, formAction, isPending] = useActionState<
    GenerateResult | null,
    FormData
  >(generateArticle, null);
  const [references, setReferences] = useState("");

  const set = <K extends keyof AiFormValues>(key: K, v: AiFormValues[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="brand_slug" value={brandSlug} />
      <input type="hidden" name="code" value={code} />

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-zinc-900">Brief</span>
        <textarea
          name="brief"
          rows={6}
          value={value.brief}
          onChange={(e) => set("brief", e.target.value)}
          placeholder="What this article should say. The angle, the audience, why it matters now."
          className="min-h-20 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 leading-relaxed focus:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
          required
        />
      </label>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-zinc-900">
            Target keyword
          </span>
          <input
            name="keyword"
            type="text"
            value={value.keyword}
            onChange={(e) => set("keyword", e.target.value)}
            placeholder="e.g. applicant tracking system"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-zinc-900">
            Persona
          </span>
          <input
            name="persona"
            type="text"
            value={value.persona}
            onChange={(e) => set("persona", e.target.value)}
            placeholder="The ICP this writes to. Leave blank for all."
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-zinc-900">
          Purpose{" "}
          <span className="font-normal text-zinc-500">(optional)</span>
        </span>
        <input
          name="purpose"
          type="text"
          value={value.purpose}
          onChange={(e) => set("purpose", e.target.value)}
          placeholder="A one-liner if you want to constrain the take."
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-zinc-900">
          Reference URLs{" "}
          <span className="font-normal text-zinc-500">
            (optional, one per line or comma-separated)
          </span>
        </span>
        <textarea
          name="references"
          rows={2}
          value={references}
          onChange={(e) => setReferences(e.target.value)}
          placeholder="https://example.com/article-to-match-tone"
          className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 leading-relaxed focus:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
        />
      </label>

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "linear-gradient(90deg, #db2777, #f97316)" }}
        >
          {isPending ? (
            <>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30"
                style={{ borderTopColor: "white", borderRightColor: "white" }}
                aria-hidden
              />
              <span>Generating</span>
            </>
          ) : (
            <>Generate article</>
          )}
        </button>
        {state && !state.ok ? (
          <p className="m-0 max-w-[48ch] text-[13px] text-red-700">
            {state.error}
          </p>
        ) : null}
      </div>

      {isPending ? (
        <div className="mt-2 border-t border-zinc-200 pt-3">
          <p className="m-0 mb-2 text-[13px] text-zinc-500">
            Sonnet 4.6 typically takes 8 to 20 seconds. Don&apos;t reload.
          </p>
          <ul className="m-0 list-none p-0 text-[13px] text-zinc-500 space-y-1">
            {STAGES.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
