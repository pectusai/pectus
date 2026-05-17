"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { dismissIdea } from "@/lib/insights/actions";
import type { PostSuggestion } from "@/lib/insights/schemas";

export function IdeaCard({
  idea,
  generationId,
  postIndex,
  isNew,
  base,
  projectId,
}: {
  idea: PostSuggestion;
  generationId: string;
  postIndex: number;
  isNew: boolean;
  base: string;
  projectId: string;
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  const params = new URLSearchParams({
    mode: "ai",
    keyword: idea.primary_keyword,
    purpose: idea.angle,
    brief: `WORKING TITLE: ${idea.title}\nANGLE: ${idea.angle}\nRATIONALE: ${idea.rationale}\nPRIMARY KEYWORD: ${idea.primary_keyword}\nSUPPORTING KEYWORDS: ${idea.supporting_keywords.join(", ")}\nTARGET PERSONA: ${idea.target_persona}\nCONTENT TYPE: ${idea.content_type}\nPROJECTED MONTHLY TRAFFIC (top-5 rank): ${idea.projected_monthly_traffic}`,
    persona: idea.target_persona,
    type: idea.content_type,
  });
  const draftHref = `${base}/apps/content-insights/articles/new?${params.toString()}`;

  const onDismiss = async () => {
    setHidden(true);
    try {
      await dismissIdea(projectId, generationId, postIndex);
      router.refresh();
    } catch {
      setHidden(false);
    }
  };

  return (
    <article className="group relative rounded-lg border border-zinc-200 bg-white p-3.5 transition hover:border-pink-600">
      {isNew ? (
        <span
          className="absolute top-2.5 right-3 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-white"
          style={{ background: "linear-gradient(90deg, #db2777, #f97316)" }}
        >
          NEW
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-3 pr-12">
        <Link href={draftHref} className="block min-w-0 flex-1 no-underline">
          <h3
            className="m-0 truncate text-[14.5px] font-bold leading-tight tracking-tight hover:underline"
            style={{ color: "#db2777" }}
            title={idea.title}
          >
            {idea.title}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-[12.5px] leading-snug text-zinc-700">
            {idea.angle}
          </p>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href={draftHref}
            className="inline-flex items-center rounded-md bg-zinc-900 px-2.5 py-1 text-[12px] font-semibold text-white no-underline hover:bg-black"
          >
            Draft →
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss this idea"
            title="Dismiss this idea"
            className="grid h-6 w-6 place-items-center rounded-full text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
          {idea.primary_keyword}
        </span>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold capitalize text-blue-800">
          {idea.content_type.replace(/_/g, " ")}
        </span>
        <span className="text-zinc-500">
          For{" "}
          <strong className="font-semibold text-zinc-900">
            {idea.target_persona}
          </strong>{" "}
          · ~
          <strong className="font-semibold text-zinc-900">
            {idea.projected_monthly_traffic.toLocaleString("en-US")}/mo
          </strong>
        </span>
        <details className="ml-auto">
          <summary className="cursor-pointer text-zinc-500 hover:text-zinc-900">
            Why
          </summary>
          <p className="mt-2 max-w-full text-[12px] leading-snug text-zinc-600">
            {idea.rationale}
          </p>
        </details>
      </div>
    </article>
  );
}
