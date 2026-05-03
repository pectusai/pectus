# connectors/github

Drives the **publish pipeline**. Pectus's CMS commits page JSON, the site-plan tree, and the redirect map directly into the user's content-hub repo. Vercel auto-deploys on commit, so publish-to-live is a single round-trip.

Multi-file commits use the GitHub Git Database API (createBlob → createTree → createCommit → updateRef) so a publish lands as ONE atomic commit.

## Env vars

```
GITHUB_TOKEN
```

A personal access token with `repo` scope. Generate at https://github.com/settings/tokens. Required for any publish.

## Workspace fields used

Each workspace declares its target repo:

```
workspaces.content_hub_repo    -- "<owner>/<repo>", e.g. "jesperastrom/jesperastrom-content"
workspaces.content_hub_branch  -- defaults to "main"
```

The workspace can also have a different repo per workspace if a user has multiple sites.

## Public surface

```ts
import {
  getGitHub,
  getFile,
  checkRepo,
  commitChanges,
  commitPagePublish,
  commitPageUnpublish,
} from "@pectus/github";
```

- `getFile(target, path)` — read a file (or null if absent).
- `checkRepo(target)` — verify the repo + branch are reachable with the current token.
- `commitChanges(target, changes, message)` — atomic multi-file commit. Each change is `{ path, content }` for a write or `{ path, delete: true }` for a delete.
- `commitPagePublish` / `commitPageUnpublish` — convenience wrappers that bundle the page JSON + site-plan + redirects in one commit with a generated message.

## Future: fork sync

The original v0.1 stub here was for `pectus update` (sync upstream → fork). That feature isn't gone, but it's deferred until `make-it` apps start landing — at which point we'll add a `forkSync.ts` alongside `client.ts`.

Upstream service docs: https://docs.github.com
