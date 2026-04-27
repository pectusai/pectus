# apps/anthropic

The Claude API client used by the skill runner and the dashboard. All Claude calls go through this module so usage logging is centralized.

## Env vars

```
ANTHROPIC_API_KEY
```

## What's in this folder

- `client.ts` — configured Anthropic SDK client + helpers for prompt caching, structured output via Zod, and usage logging to the `skill_runs` table.

## Default model

`claude-opus-4-7` for analysis-shaped work (weekly analysis, content gap analysis, JTBD mapping).

Skills can override the model in their `SKILL.md` frontmatter when they want something faster (e.g. `claude-haiku-4-5-20251001` for high-volume classification).

## Prompt caching

All skill runs that exceed 1024 input tokens use prompt caching with `cache_control: { type: "ephemeral" }` on the system prompt and on any large reference blocks (knowledge artifacts, ICP, brand guidelines). The cache TTL is 5 minutes — sequential skill runs within a session reuse the cache.

Upstream service docs: https://docs.anthropic.com
