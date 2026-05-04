"use client";

import { useState, useTransition } from "react";
import { planPillar, planFullSite } from "./actions";

type TopicSummary = {
  id: string;
  name: string;
  intent: string | null;
};

export function PlanActions({
  workspaceCode,
  unfulfilledTopics,
}: {
  workspaceCode: string;
  unfulfilledTopics: TopicSummary[];
}) {
  const [pending, startTransition] = useTransition();
  const [pillarOpen, setPillarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const runPillar = (topicId: string) => {
    setError(null);
    setInfo(null);
    setPillarOpen(false);
    startTransition(async () => {
      const result = await planPillar(workspaceCode, topicId);
      if (!result.ok) {
        setError(result.error);
      } else {
        setInfo(`Suggested ${result.nodesWritten} nodes. Adopt or dismiss each below.`);
      }
    });
  };

  const runFull = () => {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await planFullSite(workspaceCode);
      if (!result.ok) {
        setError(result.error);
      } else {
        setInfo(`Suggested ${result.nodesWritten} nodes across the site.`);
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setPillarOpen((v) => !v)}
            disabled={pending || unfulfilledTopics.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            title={
              unfulfilledTopics.length === 0
                ? "No unfulfilled topics. Run the weekly analysis first."
                : "Plan a pillar from one of your unfulfilled topics."
            }
          >
            Plan a pillar
            <span aria-hidden>▾</span>
          </button>
          {pillarOpen && unfulfilledTopics.length > 0 && (
            <div className="absolute right-0 z-10 mt-1 w-72 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
              <ul className="max-h-72 divide-y divide-zinc-100 overflow-y-auto">
                {unfulfilledTopics.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => runPillar(t.id)}
                      title={`Generate a pillar subtree for "${t.name}". Creates a root pillar + 3-7 child pages + grandchildren as suggested rows you can review.`}
                      className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left hover:bg-zinc-50"
                    >
                      <span className="text-sm text-zinc-900">{t.name}</span>
                      {t.intent && (
                        <span
                          className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600"
                          title={`Search intent: ${t.intent}.`}
                        >
                          {t.intent}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={runFull}
          disabled={pending}
          title="Generate suggested pillars + child pages for ALL unfulfilled topics in this workspace at once. Each suggestion lands as a dimmed row you can adopt or dismiss."
          className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Planning…" : "Plan full site"}
        </button>
      </div>

      {error && (
        <p className="max-w-md text-right text-xs text-red-600">{error}</p>
      )}
      {info && !error && (
        <p className="max-w-md text-right text-xs text-zinc-600">{info}</p>
      )}
    </div>
  );
}
