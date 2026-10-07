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
  dance_style text not null,
  dancer_name text, -- only filled/required in the UI when category = 'solo'
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
grant update (dance_name, category, participant_count, step_division, dance_style, dancer_name) on registrations to authenticated;

-- Round 3 additions: choreographer/level/day/music-upload/video-stills fields
-- (see project_pricing_and_rules memory) + delete, which registrations didn't
-- have before (a manager can now remove an unpaid dance entry outright).
alter table registrations add column choreographer_name text not null default '';
alter table registrations add column dance_level text not null default 'A' check (dance_level in ('A', 'B', 'C'));
alter table registrations add column preferred_day date;
alter table registrations add column song_file_path text;
alter table registrations add column song_duration_seconds integer;
alter table registrations add column wants_video boolean not null default false;
alter table registrations add column wants_stills boolean not null default false;

grant update (choreographer_name, dance_level, preferred_day, song_file_path, song_duration_seconds, wants_video, wants_stills) on registrations to authenticated;

create policy "Manager deletes own unpaid registration" on registrations
  for delete using (studio_manager_id = auth.uid() and payment_status = 'unpaid');

grant delete on registrations to authenticated;

-- Storage bucket for uploaded dance music files. Private (not public) — only
-- ever fetched through an authenticated Supabase client, same gating pattern
-- as everything else here. Path convention:
-- dance-music/{studio_manager_id}/{uuid-or-registration-id}-{original filename}
insert into storage.buckets (id, name, public) values ('dance-music', 'dance-music', false);

create policy "Manager uploads own music" on storage.objects
  for insert with check (bucket_id = 'dance-music' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Manager reads own music" on storage.objects
  for select using (bucket_id = 'dance-music' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Admin reads all music" on storage.objects
  for select using (bucket_id = 'dance-music' and is_admin());

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

-- Manager-uploaded profile photo, shown on /profile and in Nav's account
-- dropdown. At the time this was added there was still a blanket
-- `grant update on studio_managers to authenticated`, so no extra grant was
-- needed here — that blanket grant is narrowed to an explicit column list
-- further below (see the preferred_competition_type approval flow), which
-- does include this column.
alter table studio_managers add column profile_image_path text;

-- Public bucket (unlike dance-music) — profile photos aren't sensitive, and
-- Nav needs to show one on every page load without an extra signed-URL
-- round trip, so a plain public URL is simplest. Path convention:
-- profile-photos/{studio_manager_id}/{uuid}-{original filename}
insert into storage.buckets (id, name, public) values ('profile-photos', 'profile-photos', true);

create policy "Manager uploads own profile photo" on storage.objects
  for insert with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Manager replaces own profile photo" on storage.objects
  for update using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Manager deletes own profile photo" on storage.objects
  for delete using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

grant execute on function get_competitions_with_pricing() to authenticated;

-- Changing "preferred_competition_type" (רגיל/דתי) now needs an admin's
-- approval rather than applying instantly — Dani specifically asked for
-- this, since religious competitions have different pricing/rules
-- (project_pricing_and_rules memory) and this switch shouldn't be silently
-- self-served. A manager's request lands in this staging column instead of
-- the real one.
alter table studio_managers add column pending_preferred_competition_type text;

-- The blanket update grant from Phase 4 round 1 predates this rule and
-- would let a manager write preferred_competition_type directly — a
-- UI-only restriction wouldn't actually stop a direct API call, so this
-- replaces it with an explicit column allow-list (same style already used
-- for registrations' grants below), which is what actually enforces it.
revoke update on studio_managers from authenticated;
grant update (
  studio_name, manager_name, phone, city, dance_styles,
  wants_stage_services_info, profile_image_path,
  pending_preferred_competition_type
) on studio_managers to authenticated;

-- SECURITY DEFINER so it can still write preferred_competition_type despite
-- that column being excluded from the grant above — same technique as
-- get_competitions_with_pricing(). Re-checks is_admin() itself rather than
-- relying only on the admin UI never calling it with do_approve for someone
-- else's request.
create function resolve_preferred_competition_type_request(target_id uuid, do_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only an admin can approve this change';
  end if;

  update studio_managers
  set
    preferred_competition_type = case
      when do_approve then pending_preferred_competition_type
      else preferred_competition_type
    end,
    pending_preferred_competition_type = null
  where id = target_id;
end;
$$;

grant execute on function resolve_preferred_competition_type_request(uuid, boolean) to authenticated;

-- Phase 4c: admin reviews every studio's registrations and marks them
-- paid/unpaid (with an optional late-payment exception) from /admin. Same
-- SECURITY DEFINER pattern as resolve_preferred_competition_type_request
-- above — the existing column grant on registrations deliberately excludes
-- payment_status/late_payment_exception from ordinary (manager) writes, so
-- this is the only way to change them until Phase 5's payment webhook exists.
create function admin_update_registration_payment(
  target_id uuid,
  new_payment_status text,
  new_late_payment_exception boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only an admin can update payment status';
  end if;

  if new_payment_status not in ('unpaid', 'paid') then
    raise exception 'Invalid payment status';
  end if;

  update registrations
  set
    payment_status = new_payment_status,
    late_payment_exception = new_late_payment_exception
  where id = target_id;
end;
$$;

grant execute on function admin_update_registration_payment(uuid, text, boolean) to authenticated;

-- Round 4 additions (2026-10-02, Dani): manager name/studio name/city are now
-- captured PER DANCE ENTRY, not just inherited live from studio_managers —
-- the UI pre-fills them from the manager's own profile but lets her override
-- per dance (e.g. a guest choreographer entering under a different studio
-- name). Backfilled from each manager's current profile so existing rows
-- aren't left blank. Also converts preferred_day (a single date) into
-- preferred_days (an array) — a dance can now be marked available on more
-- than one day of a multi-day competition, not just one.
alter table registrations add column manager_name text not null default '';
alter table registrations add column studio_name text not null default '';
alter table registrations add column city text not null default '';

update registrations r
set manager_name = coalesce(sm.manager_name, ''),
    studio_name = sm.studio_name,
    city = coalesce(sm.city, '')
from studio_managers sm
where sm.id = r.studio_manager_id;

alter table registrations rename column preferred_day to preferred_days;
alter table registrations alter column preferred_days type date[]
  using case when preferred_days is null then null else array[preferred_days] end;

-- preferred_days keeps whatever grant preferred_day already had (column
-- privileges follow a rename) — only the three new columns need one here.

-- Round 5 additions (2026-10-02, Dani): UX-review fixes.

-- 1. Lets /register check for an already-registered email BEFORE sending an
-- OTP code and walking the manager through the whole details+verification
-- flow — the only check before this ran at insert time, at the very end
-- (register.tsx's 23505 handling, kept as a fallback for the rare race of
-- two tabs registering the same email at once). SECURITY DEFINER + returns
-- only a boolean (never manager data), so it's safe to expose to anon — this
-- runs before the manager has a session at all. Case-insensitive (lower()
-- both sides) — Supabase Auth itself normalizes emails to lowercase, but
-- studio_managers.email is plain text with no such guarantee, so comparing
-- as typed could miss a real match over a casing difference alone.
create function email_is_registered(check_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from studio_managers where lower(email) = lower(check_email));
$$;

grant execute on function email_is_registered(text) to anon, authenticated;

create index if not exists studio_managers_email_idx on studio_managers (lower(email));

-- 2. ReservationNotice (the "שמירת מקום" popup) used to reappear on every
-- single login with no way to turn it off. This persists "already filled
-- the external form" per account — not just per browser/device the way the
-- sessionStorage "just logged in" flag it's paired with does.
alter table studio_managers add column reservation_notice_dismissed boolean not null default false;
grant update (reservation_notice_dismissed) on studio_managers to authenticated;
grant update (manager_name, studio_name, city) on registrations to authenticated;

-- Round 6 additions (2026-10-03, Dani): a real final-submission step. Dances
-- were editable indefinitely and visible to the admin dashboard the moment
-- they were created, even mid-draft — now a dance stays invisible to admin
-- (and editable by its manager) until she explicitly submits it via the new
-- submit_registrations() RPC, same as payment_status already gates editing.
-- A manager can keep adding dances after submitting; those start as drafts
-- again and need their own later submission.
alter table registrations add column submitted_at timestamptz;

alter policy "Manager updates own unpaid registration" on registrations
  using (studio_manager_id = auth.uid() and payment_status = 'unpaid' and submitted_at is null)
  with check (studio_manager_id = auth.uid());

alter policy "Manager deletes own unpaid registration" on registrations
  using (studio_manager_id = auth.uid() and payment_status = 'unpaid' and submitted_at is null);

alter policy "Admin reads all registrations" on registrations
  using (is_admin() and submitted_at is not null);

-- The durable consent record — one row per "הגשה" click (not per dance),
-- since the two consent questions are asked once per submission, covering
-- whichever dances are currently draft at that moment.
create table registration_submissions (
  id uuid primary key default gen_random_uuid(),
  studio_manager_id uuid not null references studio_managers(id),
  accepted_terms boolean not null,
  media_consent text not null check (media_consent in ('consented', 'declined')),
  created_at timestamptz not null default now()
);

alter table registration_submissions enable row level security;

create policy "Manager inserts own submission" on registration_submissions
  for insert with check (studio_manager_id = auth.uid());

create policy "Manager reads own submissions" on registration_submissions
  for select using (studio_manager_id = auth.uid());

create policy "Admin reads all submissions" on registration_submissions
  for select using (is_admin());

grant select, insert on registration_submissions to authenticated;

-- security definer — `submitted_at` deliberately has no column-level UPDATE
-- grant to `authenticated` (unlike dance_name/category/etc above), so it can
-- only ever be set through this controlled function, never by a raw client
-- update call that skips the terms check and the consent record. Since RLS
-- and column grants are bypassed for the function's owner, every statement
-- inside is manually scoped to auth.uid() instead (same reasoning as
-- resolve_preferred_competition_type_request above). Submits every one of
-- her currently-draft dances in one shot, matching the "one global הגשה"
-- decision rather than a per-competition submission.
create function submit_registrations(p_accepted_terms boolean, p_media_consent text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not p_accepted_terms then
    raise exception 'Terms must be accepted to submit';
  end if;

  insert into registration_submissions (studio_manager_id, accepted_terms, media_consent)
  values (auth.uid(), p_accepted_terms, p_media_consent);

  update registrations
  set submitted_at = now()
  where studio_manager_id = auth.uid()
    and submitted_at is null
    and payment_status = 'unpaid';
end;
$$;

grant execute on function submit_registrations(boolean, text) to authenticated;

-- Round 7 (2026-10-03, Dani): renamed the two preferred_competition_type
-- values for clarity — "רגיל" -> "חילוני" ("secular", clearer contrast with
-- "religious" than "regular" was) and "דתי" -> "מגזר דתי" ("religious
-- sector"), matching the term already used elsewhere for this (see
-- lib/splitReligiousSuffix.ts's "MEGA STAR (מגזר דתי)" example). The column
-- stores the Hebrew label itself as the value (no separate code/label split
-- for this field), so existing rows need updating too, not just the app code.
update studio_managers set preferred_competition_type = 'חילוני' where preferred_competition_type = 'רגיל';
update studio_managers set preferred_competition_type = 'מגזר דתי' where preferred_competition_type = 'דתי';
update studio_managers set pending_preferred_competition_type = 'חילוני' where pending_preferred_competition_type = 'רגיל';
update studio_managers set pending_preferred_competition_type = 'מגזר דתי' where pending_preferred_competition_type = 'דתי';

-- Round 8 (2026-10-03, Dani): live-updating admin dashboard — /admin's three
-- tables (pending approvals, competition-type requests, registrations
-- payments) used to only ever reflect whatever was loaded on that page
-- load. Adding these two tables to Supabase's built-in `supabase_realtime`
-- publication lets the client subscribe to postgres_changes on them (see
-- the admin components' own useEffect subscriptions) — Realtime applies the
-- same RLS policies as any other read, so this doesn't expose anything an
-- admin couldn't already query directly.
alter publication supabase_realtime add table registrations;
alter publication supabase_realtime add table studio_managers;

-- Round 9 (2026-10-03, Dani): popup notifications to a studio manager when
-- an admin action affects her directly (payment approved, competition-type
-- request approved/rejected) — see LiveNotifications.tsx. Telling "her
-- payment just got approved" apart from "an unrelated field on an
-- already-paid dance changed" (and likewise for an unrelated profile edit
-- vs. an actual competition-type decision) needs the *previous* row values
-- to compare against, not just the new ones. Postgres's default replica
-- identity only includes primary-key columns in a realtime UPDATE's `old`
-- payload — FULL includes every column, which is what that comparison needs.
alter table registrations replica identity full;
alter table studio_managers replica identity full;

-- Round 10 (2026-10-05, Dani): step 3 also asks for the studio's total
-- headcount — a single self-reported number covering everyone coming with
-- the studio, not derived from summing each dance's participant_count
-- (a dancer performing in multiple numbers would get double-counted that
-- way). Stored on registration_submissions since it's a once-per-הגשה
-- answer, same as the two consent questions, not a per-dance field.
alter table registration_submissions add column total_participant_count integer not null default 0;
alter table registration_submissions alter column total_participant_count drop default;

-- submit_registrations()'s signature is changing (new 3rd param), so the old
-- 2-param version needs dropping first — create or replace alone would just
-- add an overload alongside it instead of replacing it.
drop function if exists submit_registrations(boolean, text);

create function submit_registrations(
  p_accepted_terms boolean,
  p_media_consent text,
  p_total_participant_count integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not p_accepted_terms then
    raise exception 'Terms must be accepted to submit';
  end if;

  if p_total_participant_count is null or p_total_participant_count < 1 then
    raise exception 'total_participant_count must be a positive number';
  end if;

  insert into registration_submissions (studio_manager_id, accepted_terms, media_consent, total_participant_count)
  values (auth.uid(), p_accepted_terms, p_media_consent, p_total_participant_count);

  update registrations
  set submitted_at = now()
  where studio_manager_id = auth.uid()
    and submitted_at is null
    and payment_status = 'unpaid';
end;
$$;

grant execute on function submit_registrations(boolean, text, integer) to authenticated;

-- Round 11 (2026-10-05, Dani): lets an admin nudge a specific competition's
-- general registration cutoff forward/back by some number of days, instead
-- of it always being a fixed 45-days-before-the-event computation (see
-- getGeneralRegistrationCutoffIso in lib/getCompetitionDays.ts). Null means
-- "use the default 45-day computation" — the override only kicks in once an
-- admin actually sets one. No column-level grant to authenticated (same
-- reasoning as submitted_at above): this is admin-only, enforced entirely
-- through the RPC below, not a raw client update.
alter table competitions add column registration_cutoff_override date;

-- get_competitions_with_pricing() already does `select c.*`, so this new
-- column flows through to every approved-manager/admin caller automatically
-- — no changes needed there.
create function admin_update_registration_cutoff(p_competition_id uuid, p_override_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only an admin can update a competition''s registration cutoff';
  end if;

  update competitions
  set registration_cutoff_override = p_override_date
  where id = p_competition_id;
end;
$$;

grant execute on function admin_update_registration_cutoff(uuid, date) to authenticated;

-- Round 12 (2026-10-05, Dani): /profile ("הפרטים שלי") was built only for
-- studio managers — an admin visiting it got wrongly redirected to
-- /pending-approval, since requireApprovedManager only ever checks
-- studio_managers and an admin account has no row there at all. Giving
-- admins a real (minimal — name + photo only, per Dani) profile of their
-- own means the `admins` table needs somewhere to put that data.
alter table admins add column name text;
alter table admins add column profile_image_path text;

create policy "Admin updates own row" on admins
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Narrow column grant (not a blanket `grant update on admins`) even though
-- nothing here is as sensitive as e.g. submitted_at — matching this
-- schema's established habit of only ever granting exactly the columns a
-- normal client write is supposed to touch.
grant update (name, profile_image_path) on admins to authenticated;

-- Round 13 (2026-10-06, Dani): two related gaps in the submission lock.
--
-- 1) Music can genuinely still be uploaded up to 10 days before the event
--    (see getMusicSubmissionCutoffIso) — but "Manager updates own unpaid
--    registration" requires submitted_at is null, so a manager had no way
--    to add a song to an already-submitted dance at all. This narrow RPC
--    is the one exception: it touches only song_file_path/
--    song_duration_seconds, still requires payment_status = 'unpaid', but
--    doesn't care whether submitted_at is set.
create function manager_upload_song(
  p_registration_id uuid,
  p_song_file_path text,
  p_song_duration_seconds numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update registrations
  set song_file_path = p_song_file_path,
      song_duration_seconds = p_song_duration_seconds
  where id = p_registration_id
    and studio_manager_id = auth.uid()
    and payment_status = 'unpaid';

  if not found then
    raise exception 'Registration not found, not yours, or already paid';
  end if;
end;
$$;

grant execute on function manager_upload_song(uuid, text, numeric) to authenticated;

-- Round 16 (2026-10-07, Dani): managers needed a way to remove a dance's
-- uploaded song too, not just add/replace one — same gap as
-- manager_upload_song above (a direct client .update() can't touch
-- song_file_path once submitted_at is set, since "Manager updates own
-- unpaid registration" requires submitted_at is null), so this is the same
-- narrow security-definer exception, just clearing the two columns instead
-- of setting them. Doesn't delete the underlying object from the
-- "dance-music" storage bucket — an orphaned file there is harmless, and
-- the client would need the old path before this clears it to do that
-- cleanup itself if it's ever worth adding.
create function manager_remove_song(p_registration_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update registrations
  set song_file_path = null,
      song_duration_seconds = null
  where id = p_registration_id
    and studio_manager_id = auth.uid()
    and payment_status = 'unpaid';

  if not found then
    raise exception 'Registration not found, not yours, or already paid';
  end if;
end;
$$;

grant execute on function manager_remove_song(uuid) to authenticated;

-- 2) An admin had no way to fix a dance's own details at all (only payment
--    status/late-payment exception, via admin_update_registration_payment)
--    — specifically needed for an already-submitted dance, since that's
--    exactly when a studio manager can no longer fix it herself. Mirrors
--    the manager's own upsertDanceEntry field set minus competition_id
--    (reassigning a dance to a different competition is out of scope here,
--    same restriction the manager herself has) and the payment-related
--    columns (those stay admin_update_registration_payment's job).
create function admin_update_registration_details(
  p_id uuid,
  p_dance_name text,
  p_category text,
  p_participant_count integer,
  p_step_division text,
  p_dance_style text,
  p_dancer_name text,
  p_choreographer_name text,
  p_dance_level text,
  p_manager_name text,
  p_studio_name text,
  p_city text,
  p_wants_video boolean,
  p_wants_stills boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only an admin can edit a dance''s details';
  end if;

  update registrations
  set
    dance_name = p_dance_name,
    category = p_category,
    participant_count = p_participant_count,
    step_division = p_step_division,
    dance_style = p_dance_style,
    dancer_name = p_dancer_name,
    choreographer_name = p_choreographer_name,
    dance_level = p_dance_level,
    manager_name = p_manager_name,
    studio_name = p_studio_name,
    city = p_city,
    wants_video = p_wants_video,
    wants_stills = p_wants_stills
  where id = p_id;
end;
$$;

grant execute on function admin_update_registration_details(
  uuid, text, text, integer, text, text, text, text, text, text, text, text, boolean, boolean
) to authenticated;

-- Round 14 (2026-10-06, Dani): approving/rejecting a pending studio manager
-- was broken — "permission denied for table studio_managers". Root cause:
-- updateStudioManagerStatus() does a direct client .update({ status }), but
-- the blanket `grant update on studio_managers to authenticated` was
-- revoked and replaced with an explicit column list (see the "Round" above
-- adding pending_preferred_competition_type) that never included `status`
-- in the first place — same bug class as project_dance_edit_save_failure's
-- competition_id issue, just never caught until this flow was actually
-- exercised live. Fixed with a security-definer RPC rather than simply
-- adding `status` to that column grant: "Manager updates own row" has no
-- restriction on which columns/values beyond id = auth.uid(), so a bare
-- grant would let a manager set her own status straight to 'approved',
-- defeating the "she cannot self-approve" rule "Manager inserts own
-- pending row" already enforces at creation time.
create function admin_update_studio_manager_status(target_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only an admin can approve or reject a studio manager';
  end if;

  if new_status not in ('pending', 'approved', 'rejected') then
    raise exception 'Invalid status';
  end if;

  update studio_managers
  set status = new_status
  where id = target_id;
end;
$$;

grant execute on function admin_update_studio_manager_status(uuid, text) to authenticated;

-- Round 15 (2026-10-07, Dani): admin dashboard needs a way to see every
-- already-approved studio manager and remove one if needed (duplicate or
-- mistaken signup, etc.). There was no DELETE policy at all on
-- studio_managers before this (not even for admins), so a direct client
-- .delete() would silently match zero rows under RLS. A plain RLS policy +
-- table grant is enough here, unlike Round 14's status-column fix — there's
-- no "Manager deletes own row" policy to collide with, so this admin-only
-- policy can't be (ab)used by a manager to delete herself.
--
-- Deleting a manager who still has registrations/dances (or a past
-- registration_submissions row) fails with a foreign-key violation — both
-- tables reference studio_managers(id) with the default RESTRICT behavior
-- rather than cascading, so her dance history can't be silently wiped out
-- by this. The admin UI (ApprovedManagersTable) surfaces that as a clear
-- "can't delete, still has registrations" message instead of a raw
-- Postgres error.
create policy "Admin deletes any row" on studio_managers
  for delete using (is_admin());

grant delete on studio_managers to authenticated;
