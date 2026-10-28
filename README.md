# Padhaku Log

Chalo, baat karein. Anonymous video chat for verified IIT and IIM students.

## Stack

- Next.js on Cloudflare Workers (OpenNext)
- D1 database (Prisma), R2 for profile photos, a Durable Object for live updates
- Sign-in codes sent through the Gmail API

## Setup

Create your own D1 database (`npx wrangler d1 create padhakulog`) and put its id in `wrangler.jsonc` in place of `YOUR_D1_DATABASE_ID`.
Copy `.env.example` to `.dev.vars` and fill in your own values.

## Develop

```bash
npm install
npm run db:migrate:local
npm run dev
```

Secrets live in `.dev.vars` locally (never committed) and as Cloudflare Worker secrets in production.
Set `DISABLE_EMAIL="1"` in `.dev.vars` to see sign-in codes on the page instead of emailing them.

## Deploy

Every push to `main` is built and deployed by Cloudflare Workers Builds
(`npm run cf:build`, then `npm run cf:deploy`, which also applies new D1 migrations).

Brand assets and colours are in [`brand/`](brand/).
