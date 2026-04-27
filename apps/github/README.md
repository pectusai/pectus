# apps/github

Optional in v1. Used for fork sync helpers — `pectus update` calls into here when the user has a GitHub fork.

## Env vars

```
GITHUB_TOKEN
```

A personal access token with `repo` scope. Generate at https://github.com/settings/tokens.

## What's in this folder

- `sync.ts` — fetch upstream, rebase or merge, surface conflicts. Wraps `git` commands; falls back to manual instructions if anything is ambiguous.

## CLI usage

```
npx pectus connect github       # set upstream + origin
```

After connecting, `pectus update` knows where to pull from.

Upstream service docs: https://docs.github.com
