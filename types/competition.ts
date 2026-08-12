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
  heroGradient: string; // TODO: replace with a real photo URL once available
  thumbnailGradient: string; // TODO: replace with a real photo URL once available
  descriptionParagraphs: string[]; // each string can include <span class="hl">…</span> for highlighted brand terms
  galleryGradients: string[]; // TODO: replace with real photo URLs
  videoUrl?: string;
}
