import { describeAge } from "@/lib/workspace";

type Props = {
  lastUpdatedAt: string | null | undefined;
};

const STYLES = {
  fresh: "bg-emerald-50 text-emerald-700 border-emerald-200",
  aging: "bg-amber-50 text-amber-700 border-amber-200",
  stale: "bg-red-50 text-red-700 border-red-200",
  missing: "bg-zinc-100 text-zinc-600 border-zinc-200",
} as const;

const PREFIX = {
  fresh: "Fresh",
  aging: "Aging",
  stale: "Stale",
  missing: "Empty",
} as const;

export function FreshnessBadge({ lastUpdatedAt }: Props) {
  const { label, level } = describeAge(lastUpdatedAt);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${STYLES[level]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {PREFIX[level]}
      {level !== "missing" ? ` · ${label}` : ""}
    </span>
  );
}
