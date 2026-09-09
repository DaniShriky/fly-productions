import type { SupabaseClient } from "@supabase/supabase-js";
import { StudioManager, StudioManagerStatus } from "@/types/studioManager";

type StudioManagerRow = {
  id: string;
  studio_name: string;
  manager_name: string | null;
  phone: string;
  email: string;
  city: string | null;
  dance_styles: string | null;
  status: StudioManagerStatus;
  referral_source: string | null;
  preferred_competition_type: string | null;
  additional_notes: string | null;
  wants_stage_services_info: boolean;
  created_at: string;
};

function toStudioManager(row: StudioManagerRow): StudioManager {
  return {
    id: row.id,
    studioName: row.studio_name,
    ...(row.manager_name ? { managerName: row.manager_name } : {}),
    phone: row.phone,
    email: row.email,
    ...(row.city ? { city: row.city } : {}),
    ...(row.dance_styles ? { danceStyles: row.dance_styles } : {}),
    status: row.status,
    ...(row.referral_source ? { referralSource: row.referral_source } : {}),
    ...(row.preferred_competition_type ? { preferredCompetitionType: row.preferred_competition_type } : {}),
    ...(row.additional_notes ? { additionalNotes: row.additional_notes } : {}),
    wantsStageServicesInfo: row.wants_stage_services_info,
    createdAt: row.created_at,
  };
}

// Takes the caller's own Supabase client (server client in getServerSideProps,
// browser client from a page/component) rather than importing a fixed one —
// unlike lib/queries/competitions.ts, this data is RLS-gated per request/user,
// not a single anon build-time read.
export async function getPendingStudioManagers(client: SupabaseClient): Promise<StudioManager[]> {
  const { data, error } = await client
    .from("studio_managers")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as StudioManagerRow[]).map(toStudioManager);
}

export async function getOwnStudioManager(client: SupabaseClient, userId: string): Promise<StudioManager | null> {
  const { data, error } = await client.from("studio_managers").select("*").eq("id", userId).maybeSingle();

  if (error) throw error;
  return data ? toStudioManager(data as StudioManagerRow) : null;
}

export async function updateStudioManagerStatus(
  client: SupabaseClient,
  id: string,
  status: StudioManagerStatus
): Promise<void> {
  const { error } = await client.from("studio_managers").update({ status }).eq("id", id);
  if (error) throw error;
}
