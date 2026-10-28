# Padhaku Log

Read this first in every chat. Product overview, rules and file map for contributors.
Next.js notes for this repo: @AGENTS.md

## The product

Anonymous, Chatroulette-style video chat **only for verified IIT and IIM students**.

- Sign in with a campus email and a 6 digit code. No passwords, no real names.
- People see only: random handle (e.g. `ChaiOwl482`), a photo, a one line bio, campus type (IIT/IIM) and languages. The exact campus shows only after "Reveal Campus".
- Random 1:1 video call. Stay 30 seconds = you become friends ("dost"). Friends can chat and call each other, and up to 3 people can be in one call.
- Tone: friendly, funny Hinglish (with an English toggle). It is about making friends, not dating.

## Hard rules (never break these)

- **Secrets never go in files, commits or chat.** Locally they live in `.dev.vars` (git-ignored). In production they are Cloudflare Worker secrets, set by the owner with `npx wrangler secret put NAME`. Never `.env` files.
- **The owner stays anonymous.** Git commits use the repo-local identity `Padhaku Log <padhakulog.team@gmail.com>`. Never put the owner's personal name or personal email in code, commits, emails or public pages.
- **No college names on public pages** (landing, emails, posters). Say "IIT aur IIM" only.
- **Copy:** every user-facing string has Hinglish and English (`t({ hinglish, english })` from `src/lib/i18n.tsx`). No em dashes (—) in copy.
- **Privacy in calls:** with TURN keys set, calls are relay-only so nobody sees another user's IP. Don't weaken that.
- Ask the owner before anything outward-facing (sending email, publishing, changing Cloudflare/Google settings).

## Stack

- Next.js 16 (App Router) on **Cloudflare Workers** via `@opennextjs/cloudflare`. Custom worker entry: `cloudflare/worker.ts`.
- **D1** (SQLite) through Prisma 7 (`prisma/schema.prisma`, SQL migrations in `migrations/`).
- **R2** bucket `padhakulog-avatars` for profile photos.
- **Durable Object** `Hub` (`cloudflare/hub.ts`): one WebSocket per user for instant updates and WebRTC signaling. Polling is the fallback.
- **WebRTC** video, mesh of up to 3 (`src/components/roulette/useCall.ts`). ICE servers from `/api/ice`: Cloudflare TURN when keys are set.
- **Email:** sign-in codes through the Gmail API from `padhakulog.team@gmail.com` (`src/lib/mailer.ts`). Logo is an inline CID image (`src/lib/email-logo.ts`).
- Secrets read with `env('NAME')` (`src/lib/env.ts`). Names: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER`, `OTP_PEPPER`, `SESSION_SECRET`, `TESTER_EMAILS`, `CLOUDFLARE_TURN_KEY_ID`, `CLOUDFLARE_TURN_API_TOKEN`, `ADMIN_PASSWORD`; local only: `DISABLE_EMAIL`.

## Where things are

| Area | Files |
|---|---|
| Landing page | `src/components/landing/Landing.tsx`, `SignInCard.tsx` (email box + typewriter campus names), `HowSteps.tsx` (guy, heart, girl drawing) |
| Call page | `src/components/roulette/RouletteClient.tsx`, `useCall.ts`, `useLive.ts`, `FriendsPanel.tsx`; phone layout CSS in `src/app/globals.css` (`rl-*` classes) |
| Matching rules | `src/lib/match.ts` (queue, filters, same-campus rule, rematch cooldown, friend calls, invites) |
| Sign-in | `src/app/api/auth/*`, `src/lib/otp.ts`, `src/lib/registry.ts` (allowed campus domains + tester emails), `src/lib/domain.ts` |
| Campus list | `migrations/0002_seed_institutions.sql` (IITs and IIMs with email domains) |
| Admin | `src/app/admin`, `src/app/api/admin/*` (needs `ADMIN_PASSWORD`) |
| Brand | `brand/` (logos, icon, colours, Canva steps in `brand/README.md`), `public/logo*.png`, favicons in `public/` |
| Gmail token helper | `scripts/gmail-token.mjs` |

## Brand

Colours: Ink `#17181C`, Highlighter `#FCE07A`, Paper `#FBFAF6`, Night `#0F1013`, Pencil `#4A4C52`, Line `#E6E3DA`, Blush pink `#F9B8CF` (heart only).
Fonts: Bricolage Grotesque (headings), DM Sans (body), Kalam (handwritten notes). Look: thick ink outlines, yellow highlighter swipe, solid offset shadows, doodles.

## Develop and test

```bash
npm install
npm run db:migrate:local
npx next dev            # http://localhost:3000
```

- `.dev.vars` has `DISABLE_EMAIL="1"`: codes are shown on the page instead of being emailed. Keep it that way so tests never mail real inboxes.
- Two test users at once: open one at `http://localhost:3000` and one at `http://b.localhost:3000` (separate cookies). Sign in with any address on a seeded campus domain; the code comes back in the API response (`devCode`).
- Local D1: `npx wrangler d1 execute padhakulog --local --command "..."` (e.g. set `onboarded=1` for test users).
- Type check: `npx tsc --noEmit -p .`

## Deploy

Every push to `main` on GitHub (`padhakulog/padhakulog`, private) is built and deployed by Cloudflare Workers Builds: `npm run cf:build`, then `npm run cf:deploy`, which also applies new D1 migrations. No manual deploy needed. Logs and versions: Cloudflare dashboard → Workers → `padhakulog`.

## Keeping context alive across chats

Each chat starts fresh and only knows what is in these files. At the end of a piece of work, keep notes current. Update this file only when something lasting changes (stack, rules, file layout).
