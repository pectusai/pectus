# Keyword intent taxonomy

The controlled vocabulary the `seo-strategy` skill uses to classify keywords. The framework is generic; the worked example below uses an ATS (applicant tracking system) audience to make the patterns concrete.

The skill should adapt the example sub-categories to the user's actual domain — keep the intent buckets, replace the ATS examples with patterns from the workspace's own keyword list.

---

## 1. Search Intent Types

### 1.1 Informational — "What is it?"

Searchers learning a concept. Early in their journey, need educational content.

**Signals**: "what is", "meaning", "definition", "explained", "how does it work", "wiki", "overview"

| Sub-category | Worked example (ATS audience) |
|---|---|
| Core definitions | `applicant tracking system meaning`, `what is applicant tracking system`, `applicant tracking system definition` |
| How it works | `how applicant tracking system works`, `applicant tracking system process flow` |
| History & context | `applicant tracking system history`, `who created applicant tracking system` |
| Comparison vs adjacent concepts | `applicant tracking system vs crm`, `is an ats the same as a crm` |
| Industry statistics | `applicant tracking system market size`, `applicant tracking system statistics` |
| Benefits & value | `why use an applicant tracking system`, `applicant tracking system benefits` |
| Types & taxonomy | `applicant tracking system types`, `kinds of applicant tracking system` |

---

### 1.2 Commercial Investigation — "Which one should I pick?"

Searchers comparing options and evaluating providers. Have intent to buy but haven't decided.

**Signals**: "best", "top", "compare", "vs", "review", "pricing", "features", "pros and cons"

| Sub-category | Worked example |
|---|---|
| Best-of lists | `best applicant tracking system`, `top 5 applicant tracking systems` |
| Pricing & cost | `applicant tracking system cost`, `how much does an applicant tracking system cost` |
| Feature evaluation | `applicant tracking system features`, `applicant tracking system with ai` |
| Reviews & ratings | `applicant tracking system reviews`, `applicant tracking system g2` |
| Comparisons | `applicant tracking system pros and cons` |
| By company size | `applicant tracking system small business`, `enterprise applicant tracking system` |
| By industry | `applicant tracking system healthcare`, `applicant tracking system for restaurants` |
| By geography | `applicant tracking system uk`, `applicant tracking system australia` |

---

### 1.3 Transactional — "I'm ready to act"

Searchers ready to demo, trial, buy, or download.

**Signals**: "demo", "free trial", "download", "pricing", "buy", "get a quote", "sign up"

| Sub-category | Worked example |
|---|---|
| Demo requests | `applicant tracking system demo`, `online applicant tracking system demo` |
| Free trials | `applicant tracking system free trial`, `applicant tracking system trial` |
| Free options | `free applicant tracking system`, `best free applicant tracking system` |
| Open source | `applicant tracking system open source`, `open source applicant tracking system github` |

---

### 1.4 Navigational — "Take me to a specific brand"

Searchers looking for a specific product or vendor page.

**Signals**: brand names, product names, "login"

| Sub-category | Worked example |
|---|---|
| Branded | `applicant tracking system teamtailor`, `applicant tracking system greenhouse` |
| Login / access | `applicant tracking system login`, `greenhouse applicant tracking system login` |

---

### 1.5 End-User Intent — "How do I work with the thing?"

A distinct segment: people who *encounter* the product as a gatekeeper or daily tool, not the buyers. For ATS, that's job-seekers; for accounting software, it's bookkeepers; for CRMs, it's individual reps. Often massive search volume but indirect commercial value (brand awareness, top-of-funnel).

**Signals**: depends on domain. For ATS: "resume", "cv", "pass", "beat", "score", "checker", "friendly", "template", "optimize"

| Sub-category (ATS example) | Worked example |
|---|---|
| Optimization | `applicant tracking system resume`, `optimize resume for applicant tracking system` |
| Formatting | `applicant tracking system cv template`, `best font for applicant tracking system` |
| Workarounds | `how to pass applicant tracking system`, `beat the applicant tracking system` |
| Diagnostic tools | `applicant tracking system checker`, `applicant tracking system score` |

---

### 1.6 Technical / Builder Intent — "How do I build or integrate one?"

Developers and architects evaluating from a technical lens, or building custom alternatives.

**Signals**: "build", "api", "integration", "github", "python", "source code", "open source", "wordpress"

| Sub-category | Worked example |
|---|---|
| Build from scratch | `how to build an applicant tracking system`, `applicant tracking system python` |
| Integration | `applicant tracking system api`, `applicant tracking system linkedin integration` |
| Platform-specific | `applicant tracking system wordpress`, `applicant tracking system google sheets` |
| Migration | `applicant tracking system migration` |

---

## 2. LLM Search Queries

How people phrase questions to AI assistants. Longer, conversational, often combine multiple intents.

### Patterns common across LLM queries
| Intent | Worked example |
|---|---|
| Evaluation | "Compare top-rated HR recruitment systems for enterprises" |
| Budget-conscious | "Best ATS for UK SMEs with budget constraints" |
| Feature-specific | "Applicant tracking systems with robust analytics and reporting" |
| ROI justification | "What is the typical ROI from investing in an ATS?" |
| Implementation | "What are the main challenges of implementing new recruitment software?" |
| Compliance | "GDPR compliance features in hiring technology" |

LLM queries are higher-trust touchpoints — write content that AI assistants want to cite. That means: clear definitions, dated facts, structured Q&A blocks, schema.org markup.

---

## 3. People Also Ask

High-value FAQ-style questions directly from search results. The skill should pull these from `answer_public_entries` if available and bucket them per intent type above.

---

## 4. Topic clusters for content strategy

Each cluster should be tied to one or more intent types. Generic cluster shapes:

| Cluster shape | Primary intent | Content types |
|---|---|---|
| **101 / Pillar** | Informational | Long-form guide, glossary, beginner's guide |
| **Buyer's Guide** | Commercial Investigation | Comparison posts, feature breakdowns, pricing guides |
| **By [Industry]** | Commercial Investigation | Vertical-specific posts |
| **By [Company Size]** | Commercial Investigation | SMB, mid-market, enterprise variants |
| **By [Region]** | Commercial Investigation | Geo-specific posts |
| **End-User Help** | End-user | Templates, checkers, tips |
| **Implementation** | Technical | Migration guides, integration how-tos |
| **Emerging Topic** | Informational/Commercial | New domain trends |
| **Compliance / Risk** | Informational/Commercial | Privacy, regulation, legal |
| **ROI & Business Case** | Commercial Investigation | Cost analysis, ROI calculators, benefits content |
