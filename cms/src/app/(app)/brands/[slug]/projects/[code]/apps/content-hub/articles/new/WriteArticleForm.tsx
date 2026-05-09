"use client";

import { useActionState } from "react";
import { generateArticle, type GenerateResult } from "./actions";

const STAGES = [
  "Pulling in your brand voice and ICP",
  "Reading the brief",
  "Drafting four to six sections",
  "Tightening the lede",
  "Final pass",
];

export function WriteArticleForm({
  brandSlug,
  code,
  initial,
}: {
  brandSlug: string;
  code: string;
  initial: {
    keyword: string;
    purpose: string;
    brief: string;
    persona: string;
  };
}) {
  const [state, formAction, isPending] = useActionState<
    GenerateResult | null,
    FormData
  >(generateArticle, null);

  return (
    <form action={formAction} className="pectus-write-form">
      <input type="hidden" name="brand_slug" value={brandSlug} />
      <input type="hidden" name="code" value={code} />

      <label className="pectus-write-field">
        <span className="pectus-write-label">Brief</span>
        <textarea
          name="brief"
          rows={6}
          defaultValue={initial.brief}
          placeholder="What this article should say. The angle, the audience, why it matters now."
          className="pectus-write-textarea"
          required
        />
      </label>

      <div className="pectus-write-row">
        <label className="pectus-write-field">
          <span className="pectus-write-label">Target keyword</span>
          <input
            name="keyword"
            type="text"
            defaultValue={initial.keyword}
            placeholder="e.g. applicant tracking system"
            className="pectus-write-input"
          />
        </label>
        <label className="pectus-write-field">
          <span className="pectus-write-label">Persona</span>
          <input
            name="persona"
            type="text"
            defaultValue={initial.persona}
            placeholder="The ICP this writes to. Leave blank for all."
            className="pectus-write-input"
          />
        </label>
      </div>

      <label className="pectus-write-field">
        <span className="pectus-write-label">
          Purpose <span className="pectus-write-optional">(optional)</span>
        </span>
        <input
          name="purpose"
          type="text"
          defaultValue={initial.purpose}
          placeholder="A one-liner if you want to constrain the take."
          className="pectus-write-input"
        />
      </label>

      <label className="pectus-write-field">
        <span className="pectus-write-label">
          Reference URLs{" "}
          <span className="pectus-write-optional">
            (optional, one per line or comma-separated)
          </span>
        </span>
        <textarea
          name="references"
          rows={2}
          placeholder="https://example.com/article-to-match-tone"
          className="pectus-write-textarea"
        />
      </label>

      <div className="pectus-write-actions">
        <button
          type="submit"
          disabled={isPending}
          className="pectus-insights-button-primary"
        >
          {isPending ? (
            <>
              <span className="pectus-insights-spinner" aria-hidden />
              <span>Generating</span>
            </>
          ) : (
            <>Generate article</>
          )}
        </button>
        {state && !state.ok ? (
          <p className="pectus-insights-run-error">{state.error}</p>
        ) : null}
      </div>

      {isPending ? (
        <div className="pectus-write-pending">
          <p className="pectus-write-pending-meta">
            Sonnet 4.6 typically takes 8 to 20 seconds. Don&apos;t reload.
          </p>
          <ul className="pectus-write-pending-list">
            {STAGES.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
