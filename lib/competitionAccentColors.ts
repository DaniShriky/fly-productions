// Manually chosen per Dani (2026-10-02) — logo-based auto-extraction
// (previously lib/getLogoAccentColor.ts) picked colors that didn't match her
// intent: it grabbed a near-black background pixel for both Mega Star logos
// instead of their gold foreground, and a dark, muted shade for several
// others instead of the "light" tone she actually wanted. These are
// deliberate, hand-picked colors instead — keyed by competition slug.
export const COMPETITION_ACCENT_COLORS: Record<string, string> = {
  "dance-star-international": "#b98cf5", // light purple
  "eilat-dance-international": "#f5a35c", // light orange
  // Blue, not the original red — per Dani, 2026-10-06, changed site-wide
  // (studio manager's registration flow: DanceEntryForm's glow,
  // DanceEntriesTable, CompetitionDanceList, RegistrationNotice). A
  // different shade than art-fantasy's own blue (#3fbce9) below. The admin's
  // RegistrationCutoffEditor keeps the original red specifically — see its
  // own ADMIN_ROW_COLOR_OVERRIDES.
  "star-of-the-dance": "#4f8fc7",
  "mega-star": "#f5c542", // gold
  "mega-star-religious": "#f5c542", // gold
  "super-star-eilat": "#f5c542", // gold
  "art-fantasy": "#3fbce9", // same light blue already in use — left unchanged
};
