"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runRecommendOnly } from "@/lib/insights/actions";
import { RunAnalysisModal } from "./RunAnalysisModal";

const STAGES = [
  "Reading this week's interpretation",
  "Asking Opus 4.7 for five ranked post ideas",
  "Projecting traffic per idea",
  "Final pass",
];

export function RecommendButton({
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
      const res = await runRecommendOnly(projectId);
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
        {label ?? "→ Recommend posts"}
      </button>
      {error ? <p className="pectus-insights-run-error">{error}</p> : null}
      <RunAnalysisModal
        open={isBusy}
        title="Recommending posts from this analysis"
        stages={STAGES}
        approxSeconds={30}
      />
    </div>
  );
}
