-- Phase 2 schema: public marketing content only (competitions + testimonials).
-- Run once in the Supabase SQL Editor. Auth/registration/payment tables are
-- deliberately out of scope here — see docs/ARCHITECTURE.md phases 3-6.
--
-- "Automatically expose new tables" was turned off when the project was
-- created, so each table below needs an explicit grant in addition to its
-- RLS policy — this keeps future (more sensitive) tables private by default
-- unless someone deliberately opens them up the same way.

create extension if not exists pgcrypto;

create table competitions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  date text not null, -- free text, not a real date type — see lib/getCompetitionDays.ts
  location text not null,
  is_religious boolean not null default false,
  image text not null,
  hero_image_position text,
  logo text,
  video_file text,
  description_paragraphs text[] not null,
  gallery text[] not null default '{}',
  sort_order integer not null -- display order (carousel, Nav dropdown) — the
  -- old hardcoded array's order was the display order; a table has no
  -- inherent order, so this makes that order explicit instead of relying on
  -- insertion order or a column that doesn't reflect it (like id or date,
  -- which is free text and doesn't sort chronologically)
);

create table testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  studio_name text not null,
  city text not null,
  sort_order integer not null
);

alter table competitions enable row level security;
alter table testimonials enable row level security;

create policy "Public read access" on competitions
  for select using (true);

create policy "Public read access" on testimonials
  for select using (true);

grant select on competitions to anon, authenticated;
grant select on testimonials to anon, authenticated;

-- service_role bypasses RLS, but "Automatically expose new tables" was
-- turned off at project creation, so it also needs an explicit grant here
-- (used only by scripts/seed.ts, never by the deployed app).
grant insert, update, delete on competitions to service_role;
grant insert, update, delete on testimonials to service_role;
