"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runAnalyzeOnly } from "@/lib/insights/actions";
import { RunAnalysisModal } from "./RunAnalysisModal";

const STAGES = [
  "Refreshing GA4 and Search Console if stale",
  "Counting keywords, articles, and audience questions",
  "Asking Opus 4.7 to read this week's data",
  "Looking for clusters, query movers, top pages, and gaps",
  "Final pass",
];

export function AnalyzeButton({
  projectId,
  label,
  variant = "primary",
}: {
  projectId: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await runAnalyzeOnly(projectId);
      if (!res.ok) {
        setError(res.error);
        setRunning(false);
        return;
      }
      startTransition(() => router.refresh());
      setRunning(false);
    } catch (e) {
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
        {label ?? "↻ Analyze now"}
      </button>
      {error ? <p className="pectus-insights-run-error">{error}</p> : null}
      <RunAnalysisModal
        open={isBusy}
        title="Reading this week's data"
        stages={STAGES}
        approxSeconds={45}
      />
    </div>
  );
}
