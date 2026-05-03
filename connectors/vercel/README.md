# connectors/vercel

Optional in v1. Used for deploying any publisher app that targets static hosting (the pre-installed `content-hub` app, or community-built static publishers) if the user wants their public site live.

## Env vars

```
VERCEL_TOKEN
```

Generate at https://vercel.com/account/tokens.

## What's in this folder

- `deploy.ts` — wraps `vercel link`, env push, and `vercel --prod`.

## CLI usage

```
npx pectus connect vercel       # link the local repo to a Vercel project, push env
```

Deploys aren't automated by Pectus. The user runs `cd apps/content-hub && npx vercel --prod` (or the equivalent for whichever publisher app they're deploying) when they're ready.

Upstream service docs: https://vercel.com/docs
