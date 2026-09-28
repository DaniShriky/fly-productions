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
  pending_preferred_competition_type: string | null;
  additional_notes: string | null;
  wants_stage_services_info: boolean;
  profile_image_path: string | null;
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
    ...(row.pending_preferred_competition_type
      ? { pendingPreferredCompetitionType: row.pending_preferred_competition_type }
      : {}),
    ...(row.additional_notes ? { additionalNotes: row.additional_notes } : {}),
    wantsStageServicesInfo: row.wants_stage_services_info,
    ...(row.profile_image_path ? { profileImagePath: row.profile_image_path } : {}),
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

export type StudioManagerEditableFields = {
  studioName: string;
  managerName?: string;
  phone: string;
  city?: string;
  danceStyles?: string;
  // Not the live value — a request. `null` cancels any pending request
  // (used when the manager picks the same option that's already approved).
  // See resolve_preferred_competition_type_request in supabase/schema.sql:
  // the actual preferred_competition_type column is excluded from this
  // client's update grant, so writing it directly would be rejected by
  // Postgres, not just ignored by the UI.
  requestedCompetitionType: string | null;
  wantsStageServicesInfo: boolean;
};

// Everything a manager is allowed to change about her own profile from
// /profile — deliberately excludes `email`, which is tied to her Supabase
// Auth login identity and isn't safe to edit as a plain text field here
// without a re-verification flow (a bigger feature, not this one).
export async function updateOwnStudioManager(
  client: SupabaseClient,
  id: string,
  fields: StudioManagerEditableFields
): Promise<StudioManager> {
  const { data, error } = await client
    .from("studio_managers")
    .update({
      studio_name: fields.studioName,
      manager_name: fields.managerName || null,
      phone: fields.phone,
      city: fields.city || null,
      dance_styles: fields.danceStyles || null,
      pending_preferred_competition_type: fields.requestedCompetitionType,
      wants_stage_services_info: fields.wantsStageServicesInfo,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return toStudioManager(data as StudioManagerRow);
}

// Admin queue: managers with a competition-type change awaiting a decision.
export async function getPendingCompetitionTypeRequests(client: SupabaseClient): Promise<StudioManager[]> {
  const { data, error } = await client
    .from("studio_managers")
    .select("*")
    .not("pending_preferred_competition_type", "is", null)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as StudioManagerRow[]).map(toStudioManager);
}

// Runs as the resolve_preferred_competition_type_request SQL function
// (security definer) so it can write preferred_competition_type despite
// that column being excluded from this client's own update grant — see
// supabase/schema.sql. The function re-checks is_admin() itself too.
export async function resolveCompetitionTypeRequest(
  client: SupabaseClient,
  managerId: string,
  approve: boolean
): Promise<void> {
  const { error } = await client.rpc("resolve_preferred_competition_type_request", {
    target_id: managerId,
    do_approve: approve,
  });
  if (error) throw error;
}

// Uploads to the public "profile-photos" bucket under the manager's own
// folder (RLS on storage.objects requires this exact path shape — see
// supabase/schema.sql). Returns the new path; callers still need to save it
// onto the studio_managers row themselves via updateOwnProfilePhoto.
export async function uploadProfilePhoto(client: SupabaseClient, studioManagerId: string, file: File): Promise<string> {
  const path = `${studioManagerId}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await client.storage.from("profile-photos").upload(path, file);
  if (error) throw error;
  return path;
}

export async function updateOwnProfilePhoto(client: SupabaseClient, id: string, path: string): Promise<void> {
  const { error } = await client.from("studio_managers").update({ profile_image_path: path }).eq("id", id);
  if (error) throw error;
}

// The bucket is public, so this is just a predictable URL, not a network
// call — safe to call on every render.
export function getProfilePhotoUrl(client: SupabaseClient, path: string): string {
  return client.storage.from("profile-photos").getPublicUrl(path).data.publicUrl;
}
