const HEBREW_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export const DATE_PATTERN = /^(\d+)(?:-(\d+))?\s*\/\s*(\d+)\s*\/\s*(\d+)$/;

// Parses the free-text `date` field (e.g. "8 / 1 / 27" or "7-10 / 2 / 27")
// and returns every Hebrew day-of-week name the range spans, e.g. "שישי" or
// "רביעי - חמישי - שישי". Falls back to "" if the date doesn't match the
// expected format.
export function getCompetitionDays(date: string): string {
  const match = date.match(DATE_PATTERN);
  if (!match) return "";

  const [, startDay, endDay, month, year] = match;
  const fullYear = 2000 + Number(year);
  const dayOfWeek = (day: number) => HEBREW_DAYS[new Date(Date.UTC(fullYear, Number(month) - 1, day)).getUTCDay()];

  if (!endDay) return dayOfWeek(Number(startDay));

  const names: string[] = [];
  for (let day = Number(startDay); day <= Number(endDay); day++) {
    names.push(dayOfWeek(day));
  }
  return names.join(" - ");
}

// Expands a numeric day range in the `date` field so every day in it is
// listed, e.g. "6-8 / 12 / 27" -> "6-7-8 / 12 / 27". Single-day dates are
// returned unchanged. Falls back to the original string if it doesn't match
// the expected format.
export function getCompetitionDateLabel(date: string): string {
  const match = date.match(DATE_PATTERN);
  if (!match) return date;

  const [, startDay, endDay, month, year] = match;
  if (!endDay) return date;

  const days: number[] = [];
  for (let day = Number(startDay); day <= Number(endDay); day++) {
    days.push(day);
  }
  return `${days.join("-")} / ${month} / ${year}`;
}

// One option per calendar day in the competition's range, with a real ISO
// date (for storing a manager's preferred day) and a Hebrew label like
// "שישי 12.6". Real FLY registration is split per specific day within a
// multi-day competition (see project_pricing_and_rules memory) — callers
// should only show a day picker when this returns more than one option.
export function getCompetitionDayOptions(date: string): { date: string; label: string }[] {
  const match = date.match(DATE_PATTERN);
  if (!match) return [];

  const [, startDay, endDay, month, year] = match;
  const fullYear = 2000 + Number(year);
  const monthIndex = Number(month) - 1;
  const last = Number(endDay ?? startDay);

  const options: { date: string; label: string }[] = [];
  for (let day = Number(startDay); day <= last; day++) {
    const dayOfWeek = HEBREW_DAYS[new Date(Date.UTC(fullYear, monthIndex, day)).getUTCDay()];
    const iso = `${fullYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    options.push({ date: iso, label: `${dayOfWeek} ${day}.${Number(month)}` });
  }
  return options;
}

// Parses the `date` field into actual Date objects for calendar integrations
// (Google Calendar / .ics). `end` is the day *after* the last competition
// day, matching the exclusive end-date convention both use for all-day
// events. Falls back to null if the date doesn't match the expected format.
export function getCompetitionDateRange(date: string): { start: Date; end: Date } | null {
  const match = date.match(DATE_PATTERN);
  if (!match) return null;

  const [, startDay, endDay, month, year] = match;
  const fullYear = 2000 + Number(year);
  const monthIndex = Number(month) - 1;
  const start = new Date(Date.UTC(fullYear, monthIndex, Number(startDay)));
  const end = new Date(Date.UTC(fullYear, monthIndex, Number(endDay ?? startDay) + 1));
  return { start, end };
}

// The video/stills order-and-payment cutoff is 10 days before the
// competition's FIRST day (see project_pricing_and_rules memory's general
// date rule) — returned as an ISO date so callers can feed it straight into
// lib/pricing.ts's daysUntil()/formatDateHe(). Falls back to null if the
// `date` field doesn't match the expected format.
export function getVideoOrderCutoffIso(date: string): string | null {
  const range = getCompetitionDateRange(date);
  if (!range) return null;

  const cutoff = new Date(range.start);
  cutoff.setUTCDate(cutoff.getUTCDate() - 10);
  return cutoff.toISOString().slice(0, 10);
}

// Final music file submission closes the same 10 days before the
// competition's first day as the video/stills order cutoff (per Dani,
// 2026-10-04) — kept as its own named export so it reads correctly at each
// call site, even though the computation is identical to the one above.
export const getMusicSubmissionCutoffIso = getVideoOrderCutoffIso;

// General registration (not just early pricing) closes a month and a half
// before the competition's FIRST day, at full price — per Dani (2026-10-02),
// distinct from `priceTiers.earlyUntil` (which only ends the early-price
// window, not registration itself). Approximated as a flat 45-day offset,
// same flat-day-count approach as getVideoOrderCutoffIso above, rather than
// calendar-aware month subtraction — consistent with how these cutoffs are
// treated elsewhere as rules of thumb (see project_pricing_and_rules).
//
// `override` is `competitions.registration_cutoff_override` (per Dani,
// 2026-10-05: admin needs to nudge this per-competition, see
// admin_update_registration_cutoff in supabase/schema.sql) — when an admin
// has set one, it replaces the 45-day computation entirely rather than
// shifting it, so callers don't need to know which case they're in.
export function getGeneralRegistrationCutoffIso(date: string, override?: string | null): string | null {
  if (override) return override;

  const range = getCompetitionDateRange(date);
  if (!range) return null;

  const cutoff = new Date(range.start);
  cutoff.setUTCDate(cutoff.getUTCDate() - 45);
  return cutoff.toISOString().slice(0, 10);
}

// Hebrew weekday name for a plain ISO (YYYY-MM-DD) date — for admin-facing
// cutoff dates (see RegistrationCutoffEditor) where knowing "that's a
// Friday" matters when nudging a date, unlike the free-text `date` field
// the other helpers in this file parse.
export function getHebrewDayOfWeek(iso: string): string {
  return HEBREW_DAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];
}
