import { FilterXSS } from "xss";
import { supabase } from "@/lib/supabase";
import { Competition } from "@/types/competition";
import { COMPETITION_ACCENT_COLORS } from "@/lib/competitionAccentColors";

export type CompetitionRow = {
  id: string;
  slug: string;
  name: string;
  date: string;
  location: string;
  is_religious: boolean;
  image: string;
  hero_image_position: string | null;
  logo: string | null;
  video_file: string | null;
  description_paragraphs: string[];
  gallery: string[];
};

// Only what description_paragraphs actually uses (<span class="hl">…</span>,
// plus basic inline emphasis) is allowlisted — everything else is stripped.
// Went through two sanitizers before this one: isomorphic-dompurify pulls in
// jsdom, and sanitize-html pulls in htmlparser2@12 — both ESM-only
// transitive dependencies that crash with ERR_REQUIRE_ESM once bundled into
// a Vercel serverless function (broke every page whose getServerSideProps
// touched this file: /dashboard, /profile, /admin — getStaticProps pages
// looked fine since those only run this code at build time). xss has no
// parser dependency at all, just plain regex-based tag scanning, so there's
// nothing in its tree that can hit this class of bug.
const sanitizer = new FilterXSS({
  whiteList: { span: ["class"], strong: [], b: [], em: [], i: [], br: [] },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style"],
});

// descriptionParagraphs can contain HTML (e.g. <span class="hl">…</span>) and
// is rendered via dangerouslySetInnerHTML in CompetitionDetail — sanitizing
// here, once, covers every render site instead of each one remembering to.
export function toCompetition(row: CompetitionRow): Competition {
  const accentColor = COMPETITION_ACCENT_COLORS[row.slug];

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    date: row.date,
    location: row.location,
    isReligious: row.is_religious,
    image: row.image,
    // Omit these keys entirely rather than set them to `undefined` — Next.js's
    // getStaticProps rejects `undefined` values when serializing props, and
    // an omitted optional key behaves the same as the old hardcoded entries
    // that simply didn't have the key at all.
    ...(row.hero_image_position ? { heroImagePosition: row.hero_image_position } : {}),
    ...(row.logo ? { logo: row.logo } : {}),
    ...(row.video_file ? { videoFile: row.video_file } : {}),
    ...(accentColor ? { accentColor } : {}),
    descriptionParagraphs: row.description_paragraphs.map((p) => sanitizer.process(p)),
    gallery: row.gallery,
  };
}

export async function getAllCompetitions(): Promise<Competition[]> {
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data as CompetitionRow[]).map(toCompetition);
}

export async function getAllCompetitionSlugs(): Promise<string[]> {
  const { data, error } = await supabase.from("competitions").select("slug");

  if (error) throw error;
  return (data as Pick<CompetitionRow, "slug">[]).map((row) => row.slug);
}

export async function getCompetitionBySlug(slug: string): Promise<Competition | undefined> {
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data ? toCompetition(data as CompetitionRow) : undefined;
}
