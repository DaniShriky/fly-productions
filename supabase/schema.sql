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

-- Phase 3 schema: studio-manager registration + email-OTP login + admin
-- approval. Nothing here is granted to `anon` — unlike the public tables
-- above, none of this is readable before a user is signed in.

create table admins (
  user_id uuid primary key references auth.users(id)
);

alter table admins enable row level security;

-- A signed-in user may check only whether *they themselves* are an admin —
-- used by the client-side "am I admin" check on /login. This deliberately
-- does not expose the rest of the admin list to anyone.
create policy "Self admin check" on admins
  for select using (user_id = auth.uid());

grant select on admins to authenticated;

-- security definer so this can be called from other tables' RLS policies,
-- which run as the calling (non-admin) user and have no grant on `admins`
-- themselves.
create function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

grant execute on function is_admin() to authenticated;

create table studio_managers (
  id uuid primary key references auth.users(id),
  studio_name text not null,
  phone text not null,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  referral_source text,
  preferred_competition_type text,
  created_at timestamptz not null default now()
);

alter table studio_managers enable row level security;

create policy "Manager reads own row" on studio_managers
  for select using (id = auth.uid());

create policy "Admin reads all rows" on studio_managers
  for select using (is_admin());

-- A manager may only ever insert her own row, and only as 'pending' — she
-- cannot self-approve at creation time either.
create policy "Manager inserts own pending row" on studio_managers
  for insert with check (id = auth.uid() and status = 'pending');

create policy "Manager updates own row" on studio_managers
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "Admin updates any row" on studio_managers
  for update using (is_admin()) with check (is_admin());

grant select, insert, update on studio_managers to authenticated;

-- Enforcement that status may only change via an admin: a WITH CHECK clause
-- can only see the *new* row, not compare it to the *old* one, so it can't
-- express "block this update only when status is changing." A trigger can.
create function prevent_self_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and not is_admin() then
    raise exception 'Only an admin can change status';
  end if;
  return new;
end;
$$;

create trigger studio_managers_status_guard
  before update on studio_managers
  for each row execute function prevent_self_status_change();

-- Phase 4 schema: gated pricing + soft ("interest") registration per
-- competition. See docs/ARCHITECTURE.md phase 4 and the memory note
-- project_pricing_and_rules for the real-world fee structure this is a
-- simplified version of (per-category solo/duet/group pricing is Phase 5
-- territory, once real per-dance registration/payment exists).

-- These four columns come from the site's real, already-live Google Form
-- (fetched directly from the form itself) — studio_managers collected only
-- studio_name/phone/email/referral_source/preferred_competition_type before,
-- but the real registration flow also asks the manager's own name, her city,
-- dance styles, freeform notes, and interest in stage services.
alter table studio_managers add column manager_name text;
alter table studio_managers add column city text;
alter table studio_managers add column dance_styles text;
alter table studio_managers add column additional_notes text;
alter table studio_managers add column wants_stage_services_info boolean not null default false;

-- Pricing varies by category (group 11+, group 5-10, solo, duet, trio/quartet
-- — see project_pricing_and_rules memory, drawn from a real flyer), with one
-- shared early-price cutoff date per competition. Shape:
-- {"early_until": "YYYY-MM-DD",
--  "group_large": {"early_price": n, "regular_price": n},
--  "group_small": {"early_price": n, "regular_price": n},
--  "solo": {"price": n}, "duet": {"price": n}, "trio_quartet": {"price": n}}
-- Placeholder numbers — Dani needs to correct these with real current-year
-- figures (religious competitions price a bit differently too).
alter table competitions add column price_tiers jsonb;

-- Final/advanced registration, submitted per dance (matching how the real
-- manual process already works — every dance re-enters the registration
-- link). Not the general/"soft" registration — that's the existing external
-- Google Form (data/registration.ts); this table is genuinely new.
create table registrations (
  id uuid primary key default gen_random_uuid(),
  studio_manager_id uuid not null references studio_managers(id),
  competition_id uuid not null references competitions(id),
  dance_name text not null,
  category text not null check (category in ('solo', 'duet', 'trio_quartet', 'group_small', 'group_large')),
  participant_count integer not null check (participant_count > 0),
  step_division text not null, -- e.g. "STEP 3", "STAR 6", "STEP MIX 1" — see project_pricing_and_rules
  dance_style text,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  payment_due_date date,
  late_payment_exception boolean not null default false, -- admin override: let
  -- this dance in despite paying after the deadline (Dani's stated real rule)
  created_at timestamptz not null default now()
);

alter table registrations enable row level security;

create policy "Manager reads own registrations" on registrations
  for select using (studio_manager_id = auth.uid());

create policy "Admin reads all registrations" on registrations
  for select using (is_admin());

-- with check forces payment_status to its safe default at insert time too —
-- otherwise a client could INSERT a row with payment_status='paid' directly,
-- bypassing the point of gating that column out of the update grant below.
create policy "Manager inserts own unpaid registration" on registrations
  for insert with check (studio_manager_id = auth.uid() and payment_status = 'unpaid');

-- Editable only while unpaid — once paid, it's admin/Phase-5-webhook territory.
create policy "Manager updates own unpaid registration" on registrations
  for update
  using (studio_manager_id = auth.uid() and payment_status = 'unpaid')
  with check (studio_manager_id = auth.uid());

grant select, insert on registrations to authenticated;
-- Column-level grant: authenticated may only ever change the descriptive
-- fields, never payment_status/payment_due_date/late_payment_exception
-- (admin- and Phase-5-webhook-only, via service_role).
grant update (dance_name, category, participant_count, step_division, dance_style) on registrations to authenticated;

-- Hides price_tiers from anyone who isn't an approved manager or admin,
-- since RLS row policies can't vary visibility of a single column by caller
-- — the public competitions RLS policy ("Public read access", using(true))
-- stays untouched and still never exposes price_tiers because the app's
-- public queries (lib/queries/competitions.ts) simply never select it; this
-- function is the actual enforcement for anyone querying more directly.
create function get_competitions_with_pricing()
returns setof competitions
language sql
security definer
set search_path = public
stable
as $$
  select c.* from competitions c
  where is_admin() or exists (
    select 1 from studio_managers sm
    where sm.id = auth.uid() and sm.status = 'approved'
  )
  order by c.sort_order;
$$;

grant execute on function get_competitions_with_pricing() to authenticated;
