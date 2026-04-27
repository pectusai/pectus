# apps/vercel

Optional in v1. Used for deploying the hub-template if the user wants their public site live.

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

Deploys aren't automated by Pectus — the user runs `cd hub-template && npx vercel --prod` when they're ready.

Upstream service docs: https://vercel.com/docs
