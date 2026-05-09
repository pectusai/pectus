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
    <article className="pectus-idea">
      {isNew ? <span className="pectus-idea-new">NEW</span> : null}
      <Link href={draftHref} className="pectus-idea-title-link">
        <h3 className="pectus-idea-title">{idea.title}</h3>
      </Link>
      <p className="pectus-idea-angle">{idea.angle}</p>
      <div className="pectus-idea-pills">
        <span className="pectus-idea-pill pectus-idea-pill-kw">
          {idea.primary_keyword}
        </span>
        <span className="pectus-idea-pill pectus-idea-pill-type">
          {idea.content_type.replace(/_/g, " ")}
        </span>
      </div>
      <p className="pectus-idea-rationale">{idea.rationale}</p>
      <div className="pectus-idea-foot">
        <span className="pectus-idea-foot-meta">
          For <strong>{idea.target_persona}</strong> · ~
          <strong>
            {idea.projected_monthly_traffic.toLocaleString("en-US")}/mo
          </strong>{" "}
          if it ranks top 5
        </span>
        <div className="pectus-idea-foot-actions">
          <Link href={draftHref} className="pectus-idea-draft-button">
            Draft →
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="pectus-idea-dismiss"
            aria-label="Dismiss this idea"
            title="Dismiss this idea"
          >
            ✕
          </button>
        </div>
      </div>
    </article>
  );
}
