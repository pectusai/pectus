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
      <div className="pectus-history-empty">
        No status changes yet. The first move from draft will land here.
      </div>
    );
  }

  return (
    <ol className="pectus-history">
      {entries.map((e) => (
        <li key={e.id} className="pectus-history-row">
          <div className="pectus-history-line">
            <span className="pectus-history-dot" aria-hidden />
            <span className="pectus-history-line-text">
              <span className="pectus-history-from">
                {statusLabel(e.from_status)}
              </span>
              <span className="pectus-history-arrow"> → </span>
              <span className="pectus-history-to">
                {statusLabel(e.to_status)}
              </span>
            </span>
            <span className="pectus-history-meta">
              {new Date(e.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {e.actor_label ? ` · ${e.actor_label}` : ""}
            </span>
          </div>
          {e.note ? <p className="pectus-history-note">{e.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
