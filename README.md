# FLY Productions — frontend

Next.js (Pages Router) + TypeScript. This is the code version of the two
HTML prototypes (homepage + competition page) — same design, same behavior,
now as real components you can keep building on in VS Code / Claude Code.

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Where things are

```
/pages
  index.tsx                    → homepage
  competitions/[slug].tsx      → competition page (one per competition, auto-generated)
  _app.tsx                     → loads global styles

/components
  home/                        → Hero, CompetitionCarousel, VideoSection, Testimonials, PromoBanner
  competition/                 → CompetitionHero, CompetitionDetail, Gallery, MoreCompetitions
  shared/                      → Nav, Footer

/data
  competitions.ts              → all competition content (TODO: replace with Supabase later)
  testimonials.ts

/types
  competition.ts, testimonial.ts → the shape of the data above

/lib
  useAutoScroll.ts              → the auto-scrolling carousel logic (shared by both carousels)

/public/images
  fly-logo.png                  → your real logo, already wired in
  README.md                     → how to swap gradient placeholders for real photos
```

## Adding your own competitions

Everything on a competition page comes from one object in
`data/competitions.ts`. To add a new competition, copy one of the existing
entries in the array and change the fields — no other file needs to
change. The page is generated automatically from the `slug` field.

## Adding real photos

See `/public/images/README.md` — every gradient placeholder has a
`// TODO: replace with real photo` comment right above it showing exactly
what to swap it for.

## What's still using placeholder/mock data

- All competition photos, the hero background, and gallery images are
  CSS gradients, not real photos yet.
- Social media icons in the footer are plain letters/glyphs, not real
  brand icons (install `react-icons` when ready).
- `competitions.ts` and `testimonials.ts` are hardcoded arrays. Once
  Supabase is connected, `getStaticProps` in `pages/index.tsx` and
  `pages/competitions/[slug].tsx` should fetch this same shape from the
  database instead — no component needs to change.
- There's no backend yet (auth, pricing, registration, payments) — this
  is purely the public-facing frontend, matching where we are in the
  build plan from the architecture doc (Phase 1).
