"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runFullAnalysis } from "@/lib/insights/actions";

const STAGES = [
  "Counting your keywords, articles, and audience questions",
  "Asking Opus 4.7 to read this week's data",
  "Looking for clusters, rising keywords, and content gaps",
  "Picking what to write next",
  "Ranking by traffic potential",
  "Final pass",
];

export function RunAnalysisButton({
  projectId,
  variant = "primary",
  label,
}: {
  projectId: string;
  variant?: "primary" | "secondary";
  label?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setRunning(true);
    setError(null);
    setStageIndex(0);
    const interval = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));
    }, 7500);
    try {
      const res = await runFullAnalysis(projectId);
      clearInterval(interval);
      if (!res.ok) {
        setError(res.error);
        setRunning(false);
        return;
      }
      startTransition(() => router.refresh());
      setRunning(false);
    } catch (e) {
      clearInterval(interval);
      setError(e instanceof Error ? e.message : "Unknown error");
      setRunning(false);
    }
  };

  const isBusy = running || isPending;
  const className =
    variant === "primary"
      ? "pectus-insights-button-primary"
      : "pectus-insights-button-secondary";

  return (
    <div className="pectus-insights-run">
      <button
        type="button"
        onClick={onClick}
        disabled={isBusy}
        className={className}
      >
        {isBusy ? (
          <>
            <span className="pectus-insights-spinner" aria-hidden />
            <span>{STAGES[stageIndex]}…</span>
          </>
        ) : (
          <>{label ?? "↻ Run analysis"}</>
        )}
      </button>
      {error ? (
        <p className="pectus-insights-run-error">{error}</p>
      ) : null}
      {isBusy ? (
        <p className="pectus-insights-run-meta">
          One run usually takes 30 to 60 seconds. Don&apos;t reload the page.
        </p>
      ) : null}
    </div>
  );
}
