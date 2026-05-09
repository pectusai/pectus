import { STATUS_LABELS, type ArticleStatus, isStatus } from "@/lib/article-status";

export type TransitionEntry = {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  actor_label: string | null;
  created_at: string;
};

function statusLabel(status: string | null): string {
  if (!status) return "—";
  if (isStatus(status)) return STATUS_LABELS[status as ArticleStatus];
  return status;
}

export function HistoryTimeline({
  entries,
}: {
  entries: TransitionEntry[];
}) {
  if (entries.length === 0) {
    return (
      <div className="text-sm italic text-zinc-500">
        No status changes yet. The first move from draft will land here.
      </div>
    );
  }

  return (
    <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
      {entries.map((e) => (
        <li
          key={e.id}
          className="relative border-l-2 border-zinc-200 py-1 pl-3.5"
        >
          <span
            className="absolute -left-[7px] top-3 h-2.5 w-2.5 rounded-full border-2 border-pink-700 bg-white"
            aria-hidden
          />
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-sm text-zinc-900">
              <span className="text-zinc-500">
                {statusLabel(e.from_status)}
              </span>
              <span className="text-zinc-400"> → </span>
              <span className="font-semibold">{statusLabel(e.to_status)}</span>
            </span>
            <span className="text-xs text-zinc-500">
              {new Date(e.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {e.actor_label ? ` · ${e.actor_label}` : ""}
            </span>
          </div>
          {e.note ? (
            <p className="m-0 mt-1 text-[13px] leading-relaxed text-zinc-600">
              {e.note}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
