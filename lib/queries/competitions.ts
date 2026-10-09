import { supabase } from "@/lib/supabase";
import { Competition } from "@/types/competition";
import { CompetitionRow, toCompetition } from "@/lib/queries/competitionMapper";

// Re-exported for any existing importer that reaches for these through this
// file (see lib/queries/competitionMapper.ts for why the actual definitions
// moved there) — this file's own exports are otherwise unchanged.
export type { CompetitionRow };
export { toCompetition };

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
