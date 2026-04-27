# Skills

Skills are the growth loops, SEO strategies, JTBD frameworks, link-sculpting heuristics — anything that turns the data in your Pectus install into something useful.

Each skill is a folder with a `SKILL.md` file at its root, in Anthropic's standard skill format. The skill runner (`cms/src/lib/skill-runner.ts`) loads the manifest, gathers inputs, runs Claude with the skill's prompt and reference files, and writes structured output to the dashboard or knowledge layer.

## v1 seed skills

| Skill | What it does | Output |
|---|---|---|
| `weekly-analysis/` | Looks at the last week of GSC data + your articles + ICP + brand context, produces 4 to 6 ranked post suggestions with traffic projections | Dashboard payload |
| `seo-strategy/` | Clusters your keywords by intent, diffs them against your sitemap, identifies gaps | Cluster map + gap report |
| `jobs-to-be-done/` | Maps your keywords to jobs your ICP is actually trying to do | Per-persona JTBD list with keyword coverage |
| `internal-linking/` | Crawls your site, recommends inter-page links | `linksculpting.md` written to the workspace |
| `knowledge-digest/` | Reads everything in `knowledge/raw/` (CSVs, BigQuery exports, images) and writes a single `knowledge/insights.md` other skills consume | `knowledge/insights.md` |

## Authoring a new skill

Skills are upstream code. Don't add them to your local fork — they won't survive `pectus update`. Submit a PR to `github.com/pectusai/pectus`, or contribute via the community at `https://pectus.dev`.

Full author guide: `docs/skills-spec.md`.

## SKILL.md format

```yaml
---
name: my-skill
description: One-line description shown in the dashboard skill picker
version: 1.0.0
inputs:
  - workspace_id
outputs:
  - some_named_output
schema: ./schema.ts
model: claude-opus-4-7
---

# My Skill

Body of the skill — the prompt Claude runs. Reference files in the same folder
can be loaded by the runner via {{ reference/file.md }} directives.
```

The runner hands the body to Claude as the system prompt, fills in any reference directives, gathers the named inputs from Supabase, and parses Claude's response against the Zod schema.
