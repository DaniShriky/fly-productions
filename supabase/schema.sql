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
