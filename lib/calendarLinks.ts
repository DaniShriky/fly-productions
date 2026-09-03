import { Competition } from "@/types/competition";
import { getCompetitionDateRange } from "./getCompetitionDays";

function toIcsDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function escapeIcsText(text: string): string {
  return text.replace(/([,;])/g, "\\$1");
}

export function getGoogleCalendarUrl(competition: Competition): string | null {
  const range = getCompetitionDateRange(competition.date);
  if (!range) return null;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: competition.name,
    dates: `${toIcsDate(range.start)}/${toIcsDate(range.end)}`,
    location: competition.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// A data: URL rather than a Blob URL — Blob URLs need to be revoked and
// don't survive being opened in a new tab, which iOS Safari requires to
// hand a downloaded .ics off to the native Calendar app.
export function getIcsDataUrl(competition: Competition): string | null {
  const range = getCompetitionDateRange(competition.date);
  if (!range) return null;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FLY Productions//Competitions//HE",
    "BEGIN:VEVENT",
    `UID:${competition.slug}@flyproductions.co.il`,
    `DTSTAMP:${toIcsDate(new Date())}T000000Z`,
    `DTSTART;VALUE=DATE:${toIcsDate(range.start)}`,
    `DTEND;VALUE=DATE:${toIcsDate(range.end)}`,
    `SUMMARY:${escapeIcsText(competition.name)}`,
    `LOCATION:${escapeIcsText(competition.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
