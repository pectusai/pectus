---
name: jobs-to-be-done
description: Map keywords to jobs your ICP is trying to do
version: 1.0.0
inputs:
  - workspace_id
outputs:
  - jtbd_per_persona
  - keyword_to_job_map
  - uncovered_jobs
schema: ./schema.ts
model: claude-opus-4-7
cache_inputs:
  - reference/jobs-to-be-done
  - icp_profile
---

# Jobs to be done

Reframe the keyword universe through the lens of what your audience is actually trying to *do*. Keywords are evidence; jobs are the underlying motivation.

## Inputs

1. ICP profile (personas + painpoints).
2. All keywords for the workspace.
3. The JTBD framework reference in `reference/jobs-to-be-done.md`.

## What to produce

- **jtbd_per_persona** — For each persona in the ICP: a list of jobs they're trying to get done, each with example keywords pulled from the input list.
- **keyword_to_job_map** — Every input keyword mapped to one or more jobs. Some keywords map to multiple jobs (different personas asking similar questions for different reasons).
- **uncovered_jobs** — Jobs your ICP has (per the painpoints) that no current keyword maps to. These are write-once content opportunities.

## What not to do

- Don't reuse generic JTBD templates. The framework in the reference file is a starting point — adapt the wording to the user's actual audience.
- Don't assign keywords to jobs without evidence in the keyword phrasing. "Best ATS" maps to a job; "ATS" alone is too ambiguous.
- Don't merge personas. If two personas share a job, list it under both — the framing matters.
