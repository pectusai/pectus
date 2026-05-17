export function SummaryBox({
  summary,
  interpretedAt,
}: {
  summary: string;
  interpretedAt: string;
}) {
  const paragraphs = summary.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const interpretedLabel = new Date(interpretedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <details
      open
      id="summary"
      className="group mt-4 scroll-mt-24 overflow-hidden rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 via-white to-orange-50 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 hover:bg-white/40">
        <div className="flex items-baseline gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-pink-700">
            What the data is saying
          </span>
          <span className="text-[11px] text-zinc-500">
            Interpreted {interpretedLabel}
          </span>
        </div>
        <span
          aria-hidden
          className="grid h-7 w-7 place-items-center rounded-full bg-white/80 text-sm text-zinc-600 transition group-open:rotate-180"
        >
          ⌄
        </span>
      </summary>

      <div className="border-t border-pink-100 bg-white/60 px-6 py-5">
        <div
          className="max-w-none gap-10 text-[14px] leading-[1.65] text-zinc-800"
          style={{ columnCount: 2, columnGap: "2.5rem" }}
        >
          {paragraphs.map((para, i) => (
            <p
              key={i}
              className="mb-3 break-inside-avoid first:mt-0 first:text-[14.5px] first:font-medium first:text-zinc-900"
            >
              {para}
            </p>
          ))}
        </div>
        <p className="mt-2 text-[11px] uppercase tracking-widest text-zinc-400">
          Use the section nav above to jump to ideas or drill into the analysis tables.
        </p>
      </div>
    </details>
  );
}
