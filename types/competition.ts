// This shape mirrors the `competitions` table in Supabase (see architecture doc).
// Right now the data comes from /data/competitions.ts (hardcoded).
// Later, pages/index.tsx and pages/competitions/[slug].tsx will fetch this
// shape from Supabase inside getStaticProps instead — nothing else changes.

export interface Competition {
  id: string;
  slug: string;
  name: string;
  date: string;
  location: string;
  isReligious: boolean;
  image: string; // used for both the homepage carousel thumbnail and this competition's own hero
  logo?: string; // competition's own badge/logo graphic, shown on its hero — not every competition has one yet
  descriptionParagraphs: string[]; // each string can include <span class="hl">…</span> for highlighted brand terms
  galleryGradients: string[]; // TODO: replace with real photo URLs
  videoUrl?: string;
}
