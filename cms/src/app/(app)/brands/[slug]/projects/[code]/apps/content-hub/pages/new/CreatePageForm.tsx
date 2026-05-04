"use client";

import { useState, useTransition } from "react";
import { createPage } from "./actions";

type TemplateOption = {
  id: string;
  name: string;
  purpose: string;
  description: string;
  thumbnail: string;
};

const PURPOSES = [
  {
    id: "home",
    label: "Home page",
    tooltip: "The front door of your site. There should usually only be one.",
  },
  {
    id: "content",
    label: "Content / pillar",
    tooltip:
      "Long-form articles or pillar pages that anchor a topic and link out to sub-pages. Most of your site is probably this.",
  },
  {
    id: "landing",
    label: "Landing",
    tooltip:
      "Conversion-focused page for a campaign, product launch, or paid traffic. Hero + features + testimonial + CTA.",
  },
  {
    id: "listing",
    label: "Listing",
    tooltip:
      "Index page that lists child pages or articles. Resource hubs, category pages, archives.",
  },
  {
    id: "contact",
    label: "Contact",
    tooltip:
      "Contact details and how to reach the team. Replace the default with a real form post-launch.",
  },
  {
    id: "about",
    label: "About",
    tooltip: "Story, team, mission. The page that builds trust.",
  },
] as const;

export function CreatePageForm({
  projectCode,
  nodeId,
  suggestedPurpose,
  suggestedTemplate,
  templates,
}: {
  projectCode: string;
  nodeId: string;
  suggestedPurpose: string;
  suggestedTemplate: string;
  templates: TemplateOption[];
}) {
  const [purpose, setPurpose] = useState(suggestedPurpose);
  const [templateId, setTemplateId] = useState(suggestedTemplate);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const candidateTemplates = templates.filter(
    (t) => t.purpose === purpose,
  );
  /* Pillar shows under content purpose alongside content. */
  const visibleTemplates =
    purpose === "content"
      ? templates.filter((t) => t.purpose === "content")
      : candidateTemplates;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createPage({
        projectCode,
        nodeId,
        purpose,
        templateId,
      });
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section>
        <h2 className="text-base font-semibold">1. Purpose</h2>
        <p className="text-sm text-gray-500 mt-1">
          What is this page for? Pre-filled from the plan suggestion.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PURPOSES.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.tooltip}
              onClick={() => {
                setPurpose(p.id);
                /* Reset template if current pick doesn't fit new purpose. */
                const fits = templates.find(
                  (t) => t.id === templateId && t.purpose === p.id,
                );
                if (!fits) {
                  const first = templates.find((t) => t.purpose === p.id);
                  if (first) setTemplateId(first.id);
                }
              }}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                purpose === p.id
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold">2. Template</h2>
        <p className="text-sm text-gray-500 mt-1">
          Pick a starting layout. Brand styling applies automatically.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTemplates.length === 0 && (
            <p className="text-sm text-gray-500 col-span-full">
              No templates for this purpose yet.
            </p>
          )}
          {visibleTemplates.map((t) => {
            const selected = templateId === t.id;
            const suggested = suggestedTemplate === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                title={`${t.name}. ${t.description}`}
                className={`relative flex flex-col rounded-lg border-2 p-4 text-left ${
                  selected
                    ? "border-zinc-900"
                    : "border-zinc-200 hover:border-zinc-400"
                }`}
              >
                {suggested && (
                  <span
                    className="absolute right-2 top-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-800"
                    title="The plan-sitemap skill picked this template as the best fit for this node. You can override."
                  >
                    Suggested
                  </span>
                )}
                <span className="text-sm font-semibold">{t.name}</span>
                <span className="text-xs text-gray-500 mt-1 leading-snug">
                  {t.description}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create draft and open builder"}
        </button>
        <a
          href={`/projects/${projectCode}/apps/content-hub/pages`}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
