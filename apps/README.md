# Apps — service connectors

Each folder in `apps/` is a connector to one external service. The CMS, the CLI, and the skill runner all import from here.

## Contract

Every `apps/<service>/` folder ships:

- `README.md` — what the connector does, env vars it reads, links to upstream service docs.
- `client.ts` — the configured client. Other code imports from this file.
- `provision.ts` (optional) — CLI-callable setup logic. Used by `pectus connect <service>`.
- Domain-specific methods in their own files (e.g. `gsc.ts`, `ga4.ts`).

## v1 connectors

- `supabase/` — database, auth, storage. Provisioning + migrations live here.
- `google/` — Search Console + Analytics 4 via OAuth and service account.
- `anthropic/` — the Claude API wrapper used by skills and the dashboard.
- `vercel/` — optional, for deploying the hub-template.
- `github/` — optional, for fork sync helpers.

## Adding a new connector

Connectors are upstream code. Don't add them in your local fork — submit a PR to `github.com/pectusai/pectus`.

To add (e.g.) SerpAPI:

1. Create `apps/serpapi/` with the contract above.
2. Add a CLI subcommand in `cli/src/commands/connect.ts` so users can wire it up.
3. Document env vars in the root `.env.example`.
4. If the connector produces data skills should consume, write the data into `knowledge/` so `knowledge-digest` can fold it into `insights.md`.

See `docs/architecture.md` for how connectors fit into the wider system.
