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
  const draftHref = `${base}/apps/content-hub/articles/new?${params.toString()}`;

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
    <article className="relative rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-pink-600">
      {isNew ? (
        <span
          className="absolute top-3 right-4 rounded px-2 py-0.5 text-[10px] font-bold tracking-widest text-white"
          style={{ background: "linear-gradient(90deg, #db2777, #f97316)" }}
        >
          NEW
        </span>
      ) : null}

      <Link href={draftHref} className="block no-underline">
        <h3
          className="m-0 mb-1.5 text-[17px] font-bold leading-tight tracking-tight pr-16 hover:underline"
          style={{ color: "#db2777" }}
        >
          {idea.title}
        </h3>
      </Link>

      <p className="m-0 text-sm leading-snug text-zinc-700">{idea.angle}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
          {idea.primary_keyword}
        </span>
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-blue-800">
          {idea.content_type.replace(/_/g, " ")}
        </span>
      </div>

      <p className="mt-3 border-t border-zinc-100 pt-3 text-[13px] leading-snug text-zinc-600">
        {idea.rationale}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-zinc-500">
          For{" "}
          <strong className="font-semibold text-zinc-900">
            {idea.target_persona}
          </strong>{" "}
          · ~
          <strong className="font-semibold text-zinc-900">
            {idea.projected_monthly_traffic.toLocaleString("en-US")}/mo
          </strong>{" "}
          if it ranks top 5
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={draftHref}
            className="inline-flex items-center rounded-lg bg-zinc-900 px-3.5 py-1.5 text-[13px] font-semibold text-white no-underline hover:bg-black"
          >
            Draft →
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss this idea"
            title="Dismiss this idea"
            className="grid h-7 w-7 place-items-center rounded-full text-sm text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
          >
            ✕
          </button>
        </div>
      </div>
    </article>
  );
}
