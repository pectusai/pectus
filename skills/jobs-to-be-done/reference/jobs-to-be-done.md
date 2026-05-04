# Jobs-to-be-done framework

The reference vocabulary the `jobs-to-be-done` skill uses. Generic framework first, then a worked example from a B2B SaaS audience (ATS / Teamtailor) to make the patterns concrete.

The skill should adapt the worked example's persona names and jobs to the user's actual ICP — keep the framework structure (When / I want to / so I can), replace the personas and jobs with what the user's data and ICP say.

---

## Framework

Each job follows the format:

> **When** [situation], **I want to** [motivation], **so I can** [expected outcome].

Jobs are grouped by the persona behind them. Personas come from the project's `icp_profiles` row.

For each job, capture:
- **Statement** — the When/want/so-can sentence
- **Underlying needs** — bulleted list of what's required to do this job
- **Mapped keywords** — keywords from the input list that signal this job

---

## Worked example: B2B SaaS audience (ATS buyer)

### Persona 1: The HR / TA Leader (Buyer)

The person responsible for selecting, justifying, and implementing recruitment technology.

#### Job 1.1 — Evaluate & Select the Right ATS
> **When** I'm responsible for choosing a recruitment platform, **I want to** compare available systems against my specific needs, **so I can** make a confident purchasing decision I won't regret.

**Underlying needs:**
- Understand what the product actually does vs what's currently in place
- See how options stack up on features, price, and reviews
- Filter by industry, company size, and geography
- Get validation from peers (reviews, case studies)

**Keywords that map here:** `best applicant tracking system`, `applicant tracking system comparison`, `applicant tracking system pricing`, `applicant tracking system reviews`, `how to choose an applicant tracking system`, `applicant tracking system uk`

#### Job 1.2 — Build a Business Case for Investment
> **When** I need budget approval, **I want to** articulate the ROI and business impact clearly, **so I can** get buy-in from leadership and finance.

**Underlying needs:**
- Quantify time saved and cost reduced
- Show compliance benefits
- Reference industry benchmarks and competitor adoption
- Demonstrate risk of *not* investing

**Keywords that map here:** `why use an applicant tracking system`, `applicant tracking system benefits`, `what is the typical ROI from investing in an ATS`, `applicant tracking system business case`

#### Job 1.3 — Implement & Migrate Successfully
> **When** we've selected a platform, **I want to** implement it without losing data or disrupting workflows, **so I can** get the team productive on the new system quickly.

#### Job 1.4 — Optimize & Get More Value
> **When** we already have a platform, **I want to** use it more effectively, **so I can** improve outcomes and justify the ongoing cost.

---

### Persona 2: The Daily User (Recruiter / Hiring Manager)

The person using the product day-to-day.

#### Job 2.1 — Find and Screen Candidates Faster
> **When** I have open roles to fill, **I want to** quickly identify the best candidates, **so I can** reduce time-to-hire and fill positions before losing top talent.

#### Job 2.2 — Deliver a Great Candidate Experience
> **When** candidates apply to our roles, **I want to** keep them informed and engaged throughout, **so I can** protect our employer brand.

#### Job 2.3 — Collaborate with Hiring Managers
> **When** I need input from hiring managers, **I want to** share candidate profiles within one system, **so I can** make aligned hiring decisions without chasing people on email.

---

### Persona 3: The End User (Job Seeker)

The person who encounters the product as a gatekeeper.

#### Job 3.1 — Get Past the System
> **When** I'm applying for a job, **I want to** format my CV/resume so the system can read it, **so I can** actually get seen by a human recruiter.

#### Job 3.2 — Check If My Materials Score Well
> **When** I've written my resume, **I want to** test it before submitting, **so I can** fix issues and increase my interview chances.

#### Job 3.3 — Understand the System That Judges Me
> **When** I keep getting rejected or ghosted, **I want to** understand how the system works behind the scenes, **so I can** stop feeling helpless and take informed action.

---

### Persona 4: The Technical Decision Maker / IT

The person evaluating from an infrastructure and integration perspective.

#### Job 4.1 — Ensure Technical Fit with Our Stack
#### Job 4.2 — Build or Customize an Alternative

---

## Priority matrix template

For each job, the skill should estimate three dimensions:

| Dimension | Values |
|---|---|
| **Search volume signal** | Very High / High / Medium / Low |
| **Commercial value** | Very High / High / Medium / Low (to the user's business — pipeline, retention, expansion) |
| **Content gap opportunity** | Very High / High / Medium / Low (vs sitemap diff) |

Jobs with `High commercial value × High gap opportunity` rank top of the recommended-content list, regardless of search volume.

---

## How to map keywords to jobs

A keyword maps to a job when its phrasing implies the situation or motivation:

- "best applicant tracking system" → situation = choosing → maps to Job 1.1.
- "how much does an ATS cost" → situation = building a case → maps to Job 1.2.
- "applicant tracking system migration" → situation = implementing → maps to Job 1.3.
- "applicant tracking system resume" → situation = applying as a candidate → maps to Job 3.1.

When a keyword is ambiguous (e.g. "applicant tracking system" alone), map it to the most likely job based on the project's primary ICP. Don't force every keyword to map — some are noise.

---

## What "uncovered jobs" means

A job is "uncovered" when:
- The ICP painpoints clearly imply the job exists for this audience.
- No keyword in the input list maps to it.

These are write-once content opportunities — your audience has the need but isn't searching for it yet (or isn't using language you'd recognize as the search query). Surface them so the user can decide whether to seed demand.
