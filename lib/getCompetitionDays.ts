const HEBREW_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

// Parses the free-text `date` field (e.g. "8 / 1 / 27" or "7-10 / 2 / 27")
// and returns the Hebrew day-of-week name(s), e.g. "שישי" or "ראשון-רביעי".
// Falls back to "" if the date doesn't match the expected format.
export function getCompetitionDays(date: string): string {
  const match = date.match(/^(\d+)(?:-(\d+))?\s*\/\s*(\d+)\s*\/\s*(\d+)$/);
  if (!match) return "";

  const [, startDay, endDay, month, year] = match;
  const fullYear = 2000 + Number(year);

  const startName = HEBREW_DAYS[new Date(Date.UTC(fullYear, Number(month) - 1, Number(startDay))).getUTCDay()];
  if (!endDay) return startName;

  const endName = HEBREW_DAYS[new Date(Date.UTC(fullYear, Number(month) - 1, Number(endDay))).getUTCDay()];
  return startName === endName ? startName : `${startName}-${endName}`;
}
