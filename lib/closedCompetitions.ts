// Temporary — per Dani, 2026-10-07: Eilat's two competitions aren't open
// for registration yet. To reopen one, just remove its slug here (or clear
// the whole list) — nothing else needs to change, CompetitionPicker reads
// this directly.
export const TEMPORARILY_CLOSED_COMPETITION_SLUGS = ["eilat-dance-international", "super-star-eilat"];

export function isRegistrationTemporarilyClosed(slug: string): boolean {
  return TEMPORARILY_CLOSED_COMPETITION_SLUGS.includes(slug);
}
