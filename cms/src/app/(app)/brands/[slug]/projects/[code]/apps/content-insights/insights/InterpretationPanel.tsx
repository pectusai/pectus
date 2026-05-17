import type { AnalysisStage1 } from "@/lib/insights/schemas";

const INTENT_TONE: Record<string, string> = {
  informational: "bg-blue-100 text-blue-800",
  commercial: "bg-emerald-100 text-emerald-800",
  transactional: "bg-amber-100 text-amber-800",
  navigational: "bg-zinc-100 text-zinc-700",
};

export function InterpretationPanel({
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

  const movers = interpretation.weekly_query_movers ?? [];
  const risers = movers.filter((m) => m.direction === "up");
  const decliners = movers.filter((m) => m.direction === "down");
  const topPages = interpretation.top_performing_pages ?? [];
  const decliningPages = interpretation.declining_pages ?? [];

  return (
    <section className="mt-8 border-t border-zinc-200 pt-8">
      <header className="mb-3 flex flex-wrap items-baseline gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-pink-600">
          Analysis
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

      {interpretation.traffic_source_mix ? (
        <SubSection
          eyebrow="Traffic mix"
          title="Where the visitors actually come from."
        >
          <div className="max-w-3xl rounded-xl border border-zinc-200 bg-white p-5 text-[14px] leading-relaxed text-zinc-700">
            {interpretation.traffic_source_mix}
          </div>
        </SubSection>
      ) : null}

      {topPages.length > 0 ? (
        <SubSection
          eyebrow="Top performers"
          title="Pages already pulling traffic and converting."
          subtitle="From GA4 in the last 30 days. Defend and expand."
        >
          <Table
            head={
              <tr>
                <Th>Page</Th>
                <Th align="right">Sessions</Th>
                <Th align="right">Conversions</Th>
                <Th align="right">CR</Th>
                <Th>Why it works</Th>
              </tr>
            }
          >
            {topPages.map((p, i) => (
              <tr key={i} className="border-t border-zinc-100">
                <Td className="font-medium text-zinc-900">{p.page_path}</Td>
                <Td align="right" tabular>
                  {p.sessions != null ? p.sessions.toLocaleString("en-US") : "—"}
                </Td>
                <Td align="right" tabular>
                  {p.conversions != null
                    ? p.conversions.toLocaleString("en-US")
                    : "—"}
                </Td>
                <Td align="right" tabular>
                  {p.conversion_rate != null
                    ? `${(p.conversion_rate * 100).toFixed(2)}%`
                    : "—"}
                </Td>
                <Td className="text-zinc-600">{p.why_it_works}</Td>
              </tr>
            ))}
          </Table>
        </SubSection>
      ) : null}

      {decliningPages.length > 0 ? (
        <SubSection
          eyebrow="Slipping"
          title="Pages losing traffic. Refresh candidates."
        >
          <Table
            head={
              <tr>
                <Th>Page</Th>
                <Th>Why declining</Th>
                <Th>What to do</Th>
              </tr>
            }
          >
            {decliningPages.map((p, i) => (
              <tr key={i} className="border-t border-zinc-100">
                <Td className="font-medium text-zinc-900">{p.page_path}</Td>
                <Td className="text-zinc-600">{p.why_declining}</Td>
                <Td className="text-zinc-600">{p.suggested_action}</Td>
              </tr>
            ))}
          </Table>
        </SubSection>
      ) : null}

      {movers.length > 0 ? (
        <SubSection
          eyebrow="Movers"
          title="Queries that shifted this week vs last."
          subtitle="From Search Console daily data. Watch the risers and patch the decliners."
        >
          {risers.length > 0 ? (
            <MoversTable label="Rising" rows={risers} />
          ) : null}
          {decliners.length > 0 ? (
            <div className={risers.length > 0 ? "mt-4" : ""}>
              <MoversTable label="Declining" rows={decliners} />
            </div>
          ) : null}
        </SubSection>
      ) : null}

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
                  {k.impressions != null
                    ? k.impressions.toLocaleString("en-US")
                    : "—"}
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

function MoversTable({
  label,
  rows,
}: {
  label: string;
  rows: NonNullable<AnalysisStage1["weekly_query_movers"]>;
}) {
  return (
    <div>
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </h4>
      <Table
        head={
          <tr>
            <Th>Query</Th>
            <Th align="right">Δ impressions</Th>
            <Th align="right">Δ position</Th>
            <Th>What it means</Th>
          </tr>
        }
      >
        {rows.map((m, i) => (
          <tr key={i} className="border-t border-zinc-100">
            <Td>
              <KeywordPill label={m.query} />
            </Td>
            <Td
              align="right"
              tabular
              className={m.direction === "up" ? "text-emerald-700" : "text-rose-700"}
            >
              {m.impressions_delta > 0 ? "+" : ""}
              {m.impressions_delta.toLocaleString("en-US")}
            </Td>
            <Td align="right" tabular>
              {m.position_delta != null
                ? `${m.position_delta > 0 ? "+" : ""}${m.position_delta.toFixed(1)}`
                : "—"}
            </Td>
            <Td className="text-zinc-600">{m.interpretation}</Td>
          </tr>
        ))}
      </Table>
    </div>
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
