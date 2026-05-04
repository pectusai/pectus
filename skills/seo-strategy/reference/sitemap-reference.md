# Sitemap diff methodology

How the `seo-strategy` skill compares a project's keyword universe against the user's existing site to identify content gaps.

## Source of the sitemap

The skill expects a populated `content_sources` row of type `own` with `sitemap_url` set, and `content_source_pages` populated with discovered URLs.

If the sitemap hasn't been crawled, the skill should note "no sitemap data" and skip the diff.

## Match rules

For each keyword (or cluster), determine coverage by checking:

1. **Direct match** — the keyword (or a meaningful substring) appears in a URL slug or in the page title from `articles` table.
2. **Indirect match** — a URL ranks for the keyword in GSC (top 50 position, any impressions in the last 28 days). Pull from `keywords.metadata.gsc_impressions` joined to article URLs.
3. **Body match** — the article body addresses the keyword's underlying question. Judged by Claude during the run, given access to article block content.

## Coverage thresholds

For a keyword cluster:

- `covered` — at least one direct match plus at least one indirect match across the cluster.
- `partial` — at least one indirect match, no direct match. Or only one weak direct match.
- `missing` — no matches at all.

## Gap ranking

Gaps are ranked by `aggregate_volume × inverse_coverage_score`, where:

- `aggregate_volume` = sum of search volumes (or GSC impressions when volume is unknown) across all keywords in the cluster.
- `inverse_coverage_score`: `missing` = 1.0, `partial` = 0.5, `covered` = 0.

Top 20 gaps get returned. Below that, the long tail isn't actionable in a content plan.

## Edge cases

- **Synonym keywords**: if two keywords are clearly synonymous (e.g. "ATS" and "applicant tracking system"), de-dup before clustering. Synonyms are flagged but not multiplied.
- **Branded keywords**: navigational queries for the user's own brand should not appear as gaps — they're already covered by definition.
- **Job-seeker / end-user keywords** (intent type 1.5): score low priority for B2B SaaS audiences. High volume but indirect commercial value. The skill should still surface them but in a separate section.

## Worked example pattern (from Teamtailor's site)

The Teamtailor site has ~110 articles in /content-hub/, ~200 product news posts, ~98 integration partner pages, ~80 event pages. Keyword research surfaced demand for content that didn't exist:

1. **No dedicated buyer's guide / comparison content** — keywords like "best ATS for small business" had no matching page.
2. **No pricing/cost education content** — "how much does an ATS cost" had no blog-level answer.
3. **No implementation/migration content** — despite high search intent.
4. **No candidate-facing content** — high search volume for "ATS resume" topics, zero content addressing job seekers.
5. **No ROI/business case content** — no calculator, no benchmark data page.
6. **Limited industry-specific content** — only restaurants and schools had dedicated resource pages.
7. **No technical integration guides** — API docs absent from public content.

These map to the gap shapes the skill should look for in any user's site:
- Comparison gaps
- Pricing/cost gaps
- Implementation/migration gaps
- End-user audience gaps
- ROI/business case gaps
- Vertical/industry gaps
- Technical/integration gaps

## How to fetch + parse a sitemap (CLI helper)

```
curl -s {SITEMAP_URL} > /tmp/sitemap.xml
grep -o 'https://{DOMAIN}/[^<]*' /tmp/sitemap.xml | sort -u
```

The CMS already does this when the user adds a content_source — URLs land in `content_source_pages`. The skill just reads from there.

## Multi-locale handling

If the sitemap contains locale variants (e.g. `/en/`, `/de/`, `/fr/`), the skill should:
1. Identify the project's locale (`projects.locale`).
2. Filter `content_source_pages` to URLs matching the project locale.
3. Treat other locales as out of scope for the diff — they have their own projects.
