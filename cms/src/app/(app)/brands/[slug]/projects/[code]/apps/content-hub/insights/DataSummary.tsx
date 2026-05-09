import type { AnalysisStage1 } from "@/lib/insights/schemas";

const INTENT_TONE: Record<string, string> = {
  informational: "bg-blue-100 text-blue-800",
  commercial: "bg-emerald-100 text-emerald-800",
  transactional: "bg-amber-100 text-amber-800",
  navigational: "bg-zinc-100 text-zinc-700",
};

export function DataSummary({
  interpretation,
  interpretedAt,
}: {
  interpretation: AnalysisStage1;
  interpretedAt: string;
}) {
  const interpretedLabel = new Date(interpretedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="mt-12 border-t border-zinc-200 pt-12">
      <header className="mb-3 flex flex-wrap items-baseline gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-pink-600">
          Data summary
        </span>
        <span className="text-xs text-zinc-500">
          Interpreted {interpretedLabel}
        </span>
      </header>
      <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
        What the data is saying.
      </h2>
      <div className="mt-4 max-w-3xl space-y-3 text-[15px] leading-relaxed text-zinc-700">
        {interpretation.summary
          .split(/\n\s*\n/)
          .map((para, i) => (
            <p key={i}>{para}</p>
          ))}
      </div>

      {interpretation.rising_keywords.length > 0 ? (
        <SubSection
          eyebrow="Rising"
          title="Keywords on the way up. Nobody's ranking for them yet."
          subtitle="Growing impressions, position outside the top ten or zero clicks. The sweet spot."
        >
          <Table
            head={
              <tr>
                <Th>Keyword</Th>
                <Th align="right">Impressions</Th>
                <Th align="right">Clicks</Th>
                <Th align="right">Position</Th>
                <Th>Why</Th>
              </tr>
            }
          >
            {interpretation.rising_keywords.map((k, i) => (
              <tr key={i} className="border-t border-zinc-100">
                <Td>
                  <KeywordPill label={k.keyword} />
                </Td>
                <Td align="right" tabular>
                  {k.impressions != null ? k.impressions.toLocaleString("en-US") : "—"}
                </Td>
                <Td align="right" tabular>
                  {k.clicks != null ? k.clicks.toLocaleString("en-US") : "—"}
                </Td>
                <Td align="right" tabular>
                  {k.position != null ? k.position.toFixed(1) : "—"}
                </Td>
                <Td className="text-zinc-600">{k.note}</Td>
              </tr>
            ))}
          </Table>
        </SubSection>
      ) : null}

      {interpretation.old_posts_rising.length > 0 ? (
        <SubSection
          eyebrow="Earning momentum"
          title="Old posts quietly gaining traffic."
          subtitle="Already-published articles with movement in the last thirty days. Refresh candidates."
        >
          <Table
            head={
              <tr>
                <Th>Post</Th>
                <Th>Traffic change</Th>
                <Th>What to do</Th>
              </tr>
            }
          >
            {interpretation.old_posts_rising.map((p, i) => (
              <tr key={i} className="border-t border-zinc-100">
                <Td className="font-medium text-zinc-900">{p.slug_or_title}</Td>
                <Td className="text-pink-700">{p.traffic_change}</Td>
                <Td className="text-zinc-600">{p.suggested_action}</Td>
              </tr>
            ))}
          </Table>
        </SubSection>
      ) : null}

      {interpretation.keyword_clusters.length > 0 ? (
        <SubSection
          eyebrow="Clusters"
          title="Topics that could become pillar pages."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {interpretation.keyword_clusters.map((c, i) => (
              <article
                key={i}
                className="rounded-xl border border-zinc-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[15px] font-bold tracking-tight text-zinc-900">
                    {c.cluster_name}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      INTENT_TONE[c.intent] ?? "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {c.intent}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.keywords.map((kw, j) => (
                    <KeywordPill key={j} label={kw} muted />
                  ))}
                </div>
                <p className="mt-4 text-[13px] leading-relaxed text-zinc-600">
                  <span className="font-semibold text-zinc-900">Pillar:</span>{" "}
                  {c.pillar_recommendation}
                </p>
              </article>
            ))}
          </div>
        </SubSection>
      ) : null}

      {interpretation.suggested_new_categories.length > 0 ? (
        <SubSection
          eyebrow="On the horizon"
          title="Categories you don't have a home for yet."
        >
          <div className="space-y-3">
            {interpretation.suggested_new_categories.map((c, i) => (
              <article
                key={i}
                className="rounded-xl border border-zinc-200 bg-white p-5"
              >
                <h3 className="text-[15px] font-bold tracking-tight text-zinc-900">
                  {c.name}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">
                  {c.why_now}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.example_keywords.map((kw, j) => (
                    <KeywordPill key={j} label={kw} muted />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </SubSection>
      ) : null}

      {interpretation.suggested_negatives.length > 0 ? (
        <SubSection
          eyebrow="Skip these"
          title="Keywords that look good but aren't worth the effort."
        >
          <Table
            head={
              <tr>
                <Th>Keyword</Th>
                <Th>Why skip</Th>
              </tr>
            }
          >
            {interpretation.suggested_negatives.map((n, i) => (
              <tr key={i} className="border-t border-zinc-100">
                <Td>
                  <KeywordPill label={n.keyword} />
                </Td>
                <Td className="text-zinc-600">{n.reason}</Td>
              </tr>
            ))}
          </Table>
        </SubSection>
      ) : null}
    </section>
  );
}

function SubSection({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <header className="mb-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-pink-600">
          {eyebrow}
        </span>
        <h3 className="mt-1.5 text-xl font-bold tracking-tight text-zinc-900">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">{subtitle}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function Table({
  head,
  children,
}: {
  head: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="w-full text-[13px]">
        <thead className="bg-zinc-50">{head}</thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`${
        align === "right" ? "text-right" : "text-left"
      } whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  tabular = false,
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  tabular?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`${
        align === "right" ? "text-right" : "text-left"
      } px-3 py-2.5 align-top ${tabular ? "tabular-nums" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

function KeywordPill({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${
        muted
          ? "bg-zinc-100 text-zinc-700"
          : "bg-pink-100 text-pink-800 font-semibold"
      }`}
    >
      {label}
    </span>
  );
}
