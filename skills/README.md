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
| `make-it/` | Scaffolds a new skill or app from a brief: manifest, Zod schema, provision skeleton, README. The ecosystem flywheel. | `ScaffoldSpec` consumed by the CLI |

## Authoring a new skill

Use `make-it`:

```
npx pectus make-it skill
```

The CLI prompts you for what the skill should do, what it consumes from the core, what it produces. Then it writes the scaffolded files. Open a PR to `github.com/pectusai/pectus` to land it as official, or publish your own GitHub repo for community distribution.

Skills are upstream code. Don't author them directly in your local fork — they won't survive `pectus update`. The `make-it` flow is designed for forking, scaffolding, then PRing back.

Full author guide: https://pectus.ai/docs/skills-spec.

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
