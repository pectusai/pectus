# Connectors — infrastructure

Each folder in `connectors/` wires Pectus to one piece of infrastructure: database, LLM provider, deployment platform, source control, OAuth. The CMS, the CLI, and the skill runner import from here.

Connectors are not apps. Apps are user-facing surfaces (data sources like GA4, publishers like WordPress). Connectors sit underneath, providing the plumbing apps and skills need.

## Contract

Every `connectors/<service>/` folder ships:

- `README.md` — what the connector does, env vars it reads, links to upstream service docs.
- `client.ts` — the configured client. Other code imports from this file via `@pectus/<service>` aliases set in `cms/tsconfig.json`.
- `provision.ts` (optional) — CLI-callable setup logic. Used by `pectus connect <service>`.
- Domain-specific helpers in their own files (e.g. `oauth.ts`, `service-account.ts`).

## v1 connectors

- `supabase/` — database, auth, storage. Provisioning and migrations live here.
- `google/` — shared OAuth and service-account auth used by the GSC, GA4, and Google Ads apps.
- `anthropic/` — the Claude API wrapper used by skills and the dashboard.
- `vercel/` — optional, for deploying the `content-insights` app or any other publisher app that targets static hosting.
- `github/` — optional, for fork sync helpers.

## Adding a new connector

Connectors are upstream code. Don't add them in your local fork — submit a PR to `github.com/pectusai/pectus`.

To add (e.g.) a new auth provider:

1. Create `connectors/<name>/` with the contract above.
2. Add a CLI subcommand in `cli/src/commands/connect.ts` so users can wire it up.
3. Document env vars in the root `.env.example`.
4. Add a path alias to `cms/tsconfig.json` if the CMS needs to import from it.

See https://pectus.ai/docs/architecture for how connectors fit into the wider system.
