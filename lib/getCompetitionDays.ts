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
