# Skill specification

How to author a Pectus skill. This is the contract — the runner and the CMS depend on it.

## Folder layout

```
skills/<skill-name>/
├── SKILL.md          required — manifest + prompt
├── schema.ts         required — Zod schema for structured output
└── reference/        optional — knowledge files the skill loads
    ├── *.md
    └── *.json
```

The folder name is the skill name. Use kebab-case.

## SKILL.md frontmatter

```yaml
---
name: my-skill                      # required, must match folder name
description: One line shown in UI   # required
version: 1.0.0                      # required, semver
inputs:                             # required, named inputs gathered by the runner
  - workspace_id
  - some_other_input
outputs:                            # required, named outputs returned to the caller
  - some_named_output
schema: ./schema.ts                 # required, path to Zod schema
model: claude-opus-4-7              # optional, default claude-opus-4-7
cache_inputs:                       # optional, inputs to mark with cache_control
  - brand_profile
  - icp_profile
---
```

## Body

The body of `SKILL.md` is the system prompt Claude receives. Plain markdown. Reference files in the `reference/` subfolder are inlined by the runner when the body contains `{{ reference/<file> }}` directives.

Keep the body under 4000 tokens. Long reference material goes in `reference/` so prompt caching can absorb it.

## Inputs

Named inputs the runner knows how to gather:

| Input | Source |
|---|---|
| `workspace_id` | Always required. The workspace the skill runs against. |
| `week_start` | ISO date. Defaults to current week's Monday. |
| `top_keywords` | Top 200 keywords by search volume from `keywords` table for the workspace. |
| `recent_articles` | Last 500 articles from `articles` table for the workspace. |
| `icp_profile` | The `icp_profiles` row for the workspace. |
| `brand_profile` | The singleton `brand_profile` row. |
| `knowledge_insights` | Contents of `knowledge/insights.md`. |
| `answer_public_entries` | Up to 2000 rows from `answer_public_entries`. |
| `last_run` | Most recent `skill_runs` row for this skill + workspace. |
| `sitemap` | All `content_source_pages` rows for the workspace's primary content source. |
| `article_bodies` | Block content from articles. |

Skills declare which they need. The runner fetches only those.

## Outputs

The Zod schema in `schema.ts` defines exactly what the skill returns. Outputs land in:

- `skill_runs.output` (always — every run logs the full output here)
- Skill-specific destinations: `weekly_analyses` for `weekly-analysis`, file writes for `internal-linking` and `knowledge-digest`

Skills don't write to arbitrary tables. If a skill needs to land data somewhere structural, that's a CMS concern — the runner exposes hooks the CMS uses.

## Caching

Mark large, slow-changing inputs with `cache_inputs:` in frontmatter. The runner adds `cache_control: { type: "ephemeral" }` to those input blocks. Cache TTL is 5 minutes — back-to-back skill runs in a session reuse the cache.

Don't cache inputs that change every run (keywords, articles). The cache miss costs more than no cache at all in those cases.

## Versioning

Bump `version` in frontmatter when you change the schema or the prompt in a way that produces materially different output. The runner records the version on every `skill_runs` row so changes are auditable.

Breaking changes (schema field removed, semantics changed) require a major bump. Additions are minor. Prompt tweaks that don't change schema are patch.

## Authoring locally vs upstream

Skills live upstream. Don't add a skill to your fork's `skills/` folder — `pectus update` won't preserve it.

To author a new skill:

1. Fork `pectusai/pectus`.
2. Branch.
3. Add `skills/your-skill/`.
4. Test by `npm install` in your fork and running `npx pectus analyze --workspace <code> --skill your-skill` against your dev Supabase.
5. Open a PR.

Community contributions land at `pectus.dev`.
