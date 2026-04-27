# Pectus FAQ

## Why "Pectus"?

The name comes from a project naming convention; placeholder for the founder's writeup at `pectus.ai`.

## Why is it self-hosted?

Three reasons:

1. **Your data stays yours.** Search Console data, GA4 data, your audience research — none of it lands on someone else's server.
2. **Your stack stays portable.** A Supabase project, a Vercel project, a GitHub fork. Nothing locks you in.
3. **Updates flow on your schedule.** When upstream ships a breaking change, you decide when to pull it.

## Why Claude-Code-driven install?

Account signups, OAuth client creation, API key minting — these are the slow parts of any install. A walking-it-through agent is more accommodating than a multi-page setup doc.

Also: setup steps fail. They fail in interesting ways. An agent that can read the error and propose a fix beats a manual readme that says "see the troubleshooting section."

## Can I use Pectus without Claude Code?

Yes. `pectus.md` is also a manual install guide if you read it as one — every step is an explicit command. But the experience is meant to be agent-driven.

## Can I run Pectus on my org's hosted Supabase / Vercel / etc?

Yes. The CLI's `connect` commands accept existing project credentials. If your org provides a hosted Supabase, paste its URL and key when prompted.

## Can I add my own skills?

Yes — but not in your fork. Author them upstream at `pectusai/pectus` and submit a PR. Community contributions land at `pectus.dev`.

The reason: skills in your local fork won't survive `pectus update`. Centralizing them upstream means every Pectus install gets every skill.

## Can I add my own connectors?

Same answer: upstream PR. `apps/<service>/` follows a stable shape — adding one is a small contribution.

## Why isn't generation included in v1?

v1 is the analytics half: figure out what to write, where the gaps are, what's working. Generation tools (writing the article, designing the ad) are a separate product surface and a separate set of choices. They'll come back in v2 once analytics is solid.

The generation prompts and templates from the original Teamtailor content-hub are preserved as reference material for that v2 work.

## How do I deploy the public hub?

In v1, you don't — it's localhost-only. In v2, `pectus connect vercel` will set up automated deploys.

For now, `cd hub-template && npx vercel --prod` works fine if you want to ship it yourself.

## How does the review queue work without generators?

Skills produce review-able artifacts: link recommendations, content briefs, weekly plans. Anything that's *acted on externally* (your team writes the article, your designer makes the ad) goes through the queue first if your `review_policy` requires it.

The queue is generic. Any object the CMS surfaces with a `review_state` column slots into it.

## How does Pectus handle multiple markets?

One workspace per market. Each workspace has its own ICP, keywords, articles, sources. The brand is shared across markets (one `brand_profile` row); voice and tonality live there.

If you have radically different brands per market, you'll want one Pectus install per brand, not one workspace per market. The `workspaces` model assumes shared brand.
