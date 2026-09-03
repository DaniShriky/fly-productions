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
  heroImagePosition?: string; // desktop-only CSS object-position for the hero image (e.g. "center 12%") — biases object-fit: cover's crop away from its default center so raised limbs/heads at the top or bottom of the photo aren't cut off; tuned per photo
  logo?: string; // competition's own badge/logo graphic, shown on its hero — not every competition has one yet
  descriptionParagraphs: string[]; // each string can include <span class="hl">…</span> for highlighted brand terms
  gallery: string[]; // real photo paths under /images/gallery/{slug}/ — can be empty (e.g. no photos yet)
  videoUrl?: string;
}
