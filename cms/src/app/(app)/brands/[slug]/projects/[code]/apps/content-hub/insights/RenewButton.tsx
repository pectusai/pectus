"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renewIdeas } from "@/lib/insights/actions";
import { RunAnalysisModal } from "./RunAnalysisModal";

const STAGES = [
  "Reading this week's idea pool",
  "Asking Opus 4.7 for fresh angles",
  "Picking five new ones",
  "Ranking by traffic potential",
  "Final pass",
];

export function RenewButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await renewIdeas(projectId);
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

  return (
    <div className="pectus-insights-renew">
      <button
        type="button"
        onClick={onClick}
        disabled={isBusy}
        className="pectus-insights-button-secondary"
      >
        ↻ Renew · 5 fresh angles
      </button>
      {error ? (
        <span className="pectus-insights-run-error">{error}</span>
      ) : null}
      <RunAnalysisModal
        open={isBusy}
        title="Generating five fresh angles"
        stages={STAGES}
        approxSeconds={45}
      />
    </div>
  );
}
