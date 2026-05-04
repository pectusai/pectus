---
name: knowledge-digest
description: Read everything in knowledge/raw/ and produce a single insights.md other skills consume
version: 1.0.0
inputs:
  - project_id
outputs:
  - insights_md
schema: ./schema.ts
model: claude-opus-4-7
---

# Knowledge digest

The user drops their own data into `knowledge/raw/` — AnswerThePublic exports, BigQuery query results, screenshots, audience research PDFs, anything they think helps Pectus understand their world. Your job is to read all of it and produce a single `knowledge/insights.md` that other skills can ingest cheaply.

Other skills don't read the raw files. They read your output. So your output is the contract.

## Inputs

Everything in `knowledge/raw/{project_code}/` (or `knowledge/raw/` for global knowledge that applies to all projects).

File handling:

- **CSV/JSON/JSONL** — parse, summarize structure (columns, row count), extract notable values.
- **Markdown/text** — quote selectively. Don't dump the file verbatim.
- **Images** — describe via Claude's vision capability. Capture mood, content, audience cues.
- **PDFs** — extract text, summarize.
- **Spreadsheets (xlsx)** — convert to CSV view, then handle as CSV.

## Output: `knowledge/insights.md`

Structure the output as:

```markdown
# Knowledge insights — {project_code or "global"}

Generated {ISO date}.

## Audience signals
[1-3 paragraphs synthesizing what the data tells us about the audience: questions they ask, formats they prefer, pain points that show up across files]

## Topic clusters in the user's data
[bullet list of topics evident in the raw files, each with one-line context]

## Quotable moments
[3-5 verbatim quotes from the raw data that capture audience voice or pain]

## Source files
[bulleted list: filename, type, what it contributed to this digest]
```

## What not to do

- Don't summarize files the user clearly intended as test data (filenames like `test.csv`, `sample.json`).
- Don't fabricate insights when the data is thin. If three files all say the same thing, say so once.
- Don't include personally identifiable information from the raw files. Strip names, emails, etc.
- Don't write more than 1500 words total. Other skills have to read this — keep it digestible.
