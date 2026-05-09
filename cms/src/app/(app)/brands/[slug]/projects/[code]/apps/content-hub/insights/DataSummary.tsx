import type { AnalysisStage1 } from "@/lib/insights/schemas";

export function DataSummary({
  interpretation,
  interpretedAt,
}: {
  interpretation: AnalysisStage1;
  interpretedAt: string;
}) {
  return (
    <section className="pectus-insights-summary">
      <header className="pectus-insights-summary-head">
        <span className="pectus-insights-eyebrow">Data summary</span>
        <span className="pectus-insights-summary-meta">
          Interpreted{" "}
          {new Date(interpretedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </header>

      <h2 className="pectus-insights-section-title">
        What the data is saying.
      </h2>
      <div className="pectus-insights-summary-prose">
        {interpretation.summary
          .split(/\n\s*\n/)
          .map((para, i) => <p key={i}>{para}</p>)}
      </div>

      {interpretation.rising_keywords.length > 0 ? (
        <SubSection
          eyebrow="Rising"
          title="Keywords on the way up. Nobody's ranking for them yet."
          subtitle="Growing impressions, position outside the top ten or zero clicks. The sweet spot."
        >
          <table className="pectus-insights-table">
            <thead>
              <tr>
                <th>Keyword</th>
                <th className="num">Impressions</th>
                <th className="num">Clicks</th>
                <th className="num">Position</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {interpretation.rising_keywords.map((k, i) => (
                <tr key={i}>
                  <td>
                    <span className="pectus-idea-pill pectus-idea-pill-kw">
                      {k.keyword}
                    </span>
                  </td>
                  <td className="num">
                    {k.impressions != null
                      ? k.impressions.toLocaleString("en-US")
                      : "—"}
                  </td>
                  <td className="num">
                    {k.clicks != null
                      ? k.clicks.toLocaleString("en-US")
                      : "—"}
                  </td>
                  <td className="num">
                    {k.position != null ? k.position.toFixed(1) : "—"}
                  </td>
                  <td>{k.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SubSection>
      ) : null}

      {interpretation.old_posts_rising.length > 0 ? (
        <SubSection
          eyebrow="Earning momentum"
          title="Old posts quietly gaining traffic."
          subtitle="Already-published articles with movement in the last thirty days. Refresh candidates."
        >
          <table className="pectus-insights-table">
            <thead>
              <tr>
                <th>Post</th>
                <th>Traffic change</th>
                <th>What to do</th>
              </tr>
            </thead>
            <tbody>
              {interpretation.old_posts_rising.map((p, i) => (
                <tr key={i}>
                  <td>{p.slug_or_title}</td>
                  <td className="accent">{p.traffic_change}</td>
                  <td>{p.suggested_action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SubSection>
      ) : null}

      {interpretation.keyword_clusters.length > 0 ? (
        <SubSection
          eyebrow="Clusters"
          title="Topics that could become pillar pages."
        >
          <div className="pectus-insights-cluster-grid">
            {interpretation.keyword_clusters.map((c, i) => (
              <div key={i} className="pectus-insights-cluster">
                <div className="pectus-insights-cluster-head">
                  <h3>{c.cluster_name}</h3>
                  <span className="pectus-idea-pill">{c.intent}</span>
                </div>
                <div className="pectus-insights-cluster-pills">
                  {c.keywords.map((k, j) => (
                    <span
                      key={j}
                      className="pectus-idea-pill"
                    >
                      {k}
                    </span>
                  ))}
                </div>
                <p className="pectus-insights-cluster-rec">
                  <strong>Pillar:</strong> {c.pillar_recommendation}
                </p>
              </div>
            ))}
          </div>
        </SubSection>
      ) : null}

      {interpretation.suggested_new_categories.length > 0 ? (
        <SubSection
          eyebrow="On the horizon"
          title="Categories you don't have a home for yet."
        >
          <div className="pectus-insights-categories">
            {interpretation.suggested_new_categories.map((c, i) => (
              <div key={i} className="pectus-insights-category">
                <h3>{c.name}</h3>
                <p>{c.why_now}</p>
                <div className="pectus-insights-cluster-pills">
                  {c.example_keywords.map((k, j) => (
                    <span key={j} className="pectus-idea-pill">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SubSection>
      ) : null}

      {interpretation.suggested_negatives.length > 0 ? (
        <SubSection
          eyebrow="Skip these"
          title="Keywords that look good but aren't worth the effort."
        >
          <table className="pectus-insights-table">
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Why skip</th>
              </tr>
            </thead>
            <tbody>
              {interpretation.suggested_negatives.map((n, i) => (
                <tr key={i}>
                  <td>
                    <span className="pectus-idea-pill pectus-idea-pill-kw">
                      {n.keyword}
                    </span>
                  </td>
                  <td>{n.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
    <section className="pectus-insights-subsection">
      <header className="pectus-insights-subsection-head">
        <span className="pectus-insights-eyebrow">{eyebrow}</span>
        <h3 className="pectus-insights-section-title">{title}</h3>
        {subtitle ? (
          <p className="pectus-insights-subsection-subtitle">{subtitle}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
