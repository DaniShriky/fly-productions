# FLY Productions — project context

FLY Productions is a dance-competition production company. This is their
production website. Read `docs/ARCHITECTURE.md` for the full technical plan
before starting backend work.

## Who's building this

Dani — knows React, HTML, CSS, JS, JSON. Does NOT know TypeScript or backend
development well, and relies on Claude's help for both. Prefers direct,
critical feedback over agreement — point out problems, don't just validate
choices. Wants to be able to maintain this codebase with Claude's ongoing
help, not necessarily understand every backend concept independently.

## Stack (decided, see docs/ARCHITECTURE.md for the full reasoning)

- Next.js, Pages Router (NOT App Router — chosen specifically because it's
  closer to plain React and avoids server/client component complexity)
- TypeScript
- Vercel for hosting (chosen over Cloudflare Workers/OpenNext specifically
  for maintainability, since Dani needs ongoing help with backend code)
- Supabase Pro for database, auth (OTP, not password-based), Row Level
  Security, and storage
- Grow or PayPlus for payment processing (hosted checkout, no card details
  touch our servers)
- Resend for email
- Vercel Cron for payment reminders

## Current state

Frontend only (Phase 1 of the 6-phase build order in docs/ARCHITECTURE.md).
No backend, no Supabase connection, no auth, no payments yet. All content in
`data/competitions.ts` and `data/testimonials.ts` is hardcoded — this gets
replaced by Supabase queries inside `getStaticProps`, per the TODO comments
throughout the codebase.

## Conventions already established

- Hubot Sans for English text, Assistant for Hebrew text (see styles/globals.css)
- RTL is the default page direction. Carousels (CompetitionCarousel,
  Testimonials) deliberately force `direction: ltr` on their scroll
  container only, then `direction: rtl` back on each card — this was a
  real bug fix (see lib/useAutoScroll.ts comment), don't "simplify" it away.
- `margin-inline-start: auto` misbehaves in this RTL layout (pushes
  elements the wrong way) — avoid it; use plain flex alignment instead.
- Nav login button says "התחברות" with a small user icon (changed 2026-09-21
  from "כניסת מנהלים" — the earlier reasoning was to speak to studio
  managers specifically rather than generic login language, but Dani
  explicitly asked to switch it back per a design reference). Nav's CTA pill
  says "שמירת מקום" (also changed 2026-09-21, from "הרשמה לתחרויות") — same
  phrase already used in the dashboard's early-registration explanation.
- Every competition page shares one structure (CompetitionHero,
  CompetitionDetail, Gallery, MoreCompetitions) driven entirely by one
  Competition object — never fork this into per-competition custom layouts.

## What NOT to do without asking

- Don't switch Pages Router → App Router.
- Don't switch Vercel → another host.
- Don't add pricing/registration/payment UI yet — that's Phase 3+.
