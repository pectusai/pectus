---
name: sources
description: Scrape data from web pages and sitemaps to enrich Pectus with first-party context.
type: inbound
version: 0.1.0
comingSoon: true
---

# Sources inbound app

Inbound app. Lets the user enter URLs (or point at a sitemap) and pulls the
underlying page content into Pectus as structured rows that consumer apps can
read alongside GA4 and Search Console signals.

The first consumer is Content Insights, which uses Sources to ground analysis
in the actual pages on the site (rather than reasoning purely from metric
deltas). Later consumers can read the same rows to do competitor scanning,
canonical-page lookup, or topical clustering.

## Status

Coming soon. The CMS surface is in place so you can see what's planned; the
fetch + extract pipeline lands in a follow-up version.

## What it will fetch

- Page URLs the user enters by hand.
- Full sitemaps the user points at (XML or sitemap-index).
- Per page: cleaned body text, headings, internal links, last-modified, and a
  light-weight HTML snapshot.

## How auth will work

No external auth. The scraper fetches pages as a normal HTTP client. Robots
rules are respected.

## Output tables

- `source_pages` — one row per scraped URL with cleaned text and metadata.
- `source_sitemaps` — registered sitemaps and their fetch state.

Both tables are project-scoped. Consumer apps read them via shared queries.
