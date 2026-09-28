import type { SupabaseClient } from "@supabase/supabase-js";
import { DanceLevel, Registration, RegistrationCategory } from "@/types/registration";

type RegistrationRow = {
  id: string;
  studio_manager_id: string;
  competition_id: string;
  dance_name: string;
  category: RegistrationCategory;
  participant_count: number;
  step_division: string;
  dance_style: string;
  dancer_name: string | null;
  choreographer_name: string;
  dance_level: DanceLevel;
  preferred_day: string | null;
  song_file_path: string | null;
  song_duration_seconds: number | null;
  wants_video: boolean;
  wants_stills: boolean;
  payment_status: Registration["paymentStatus"];
  payment_due_date: string | null;
  late_payment_exception: boolean;
  created_at: string;
};

function toRegistration(row: RegistrationRow): Registration {
  return {
    id: row.id,
    studioManagerId: row.studio_manager_id,
    competitionId: row.competition_id,
    danceName: row.dance_name,
    category: row.category,
    participantCount: row.participant_count,
    stepDivision: row.step_division,
    danceStyle: row.dance_style,
    ...(row.dancer_name ? { dancerName: row.dancer_name } : {}),
    choreographerName: row.choreographer_name,
    danceLevel: row.dance_level,
    ...(row.preferred_day ? { preferredDay: row.preferred_day } : {}),
    ...(row.song_file_path ? { songFilePath: row.song_file_path } : {}),
    ...(row.song_duration_seconds != null ? { songDurationSeconds: row.song_duration_seconds } : {}),
    wantsVideo: row.wants_video,
    wantsStills: row.wants_stills,
    paymentStatus: row.payment_status,
    ...(row.payment_due_date ? { paymentDueDate: row.payment_due_date } : {}),
    latePaymentException: row.late_payment_exception,
    createdAt: row.created_at,
  };
}

export async function getOwnRegistrations(client: SupabaseClient, studioManagerId: string): Promise<Registration[]> {
  const { data, error } = await client
    .from("registrations")
    .select("*")
    .eq("studio_manager_id", studioManagerId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as RegistrationRow[]).map(toRegistration);
}

export type DanceEntryInput = {
  competitionId: string;
  danceName: string;
  category: RegistrationCategory;
  participantCount: number;
  stepDivision: string;
  danceStyle: string;
  dancerName?: string;
  choreographerName: string;
  danceLevel: DanceLevel;
  preferredDay?: string;
  songFilePath?: string;
  songDurationSeconds?: number;
  wantsVideo: boolean;
  wantsStills: boolean;
};

// Insert if `existingId` is omitted, otherwise update — only reachable while
// the row is still unpaid, enforced by RLS regardless of what's sent here.
// Returns the resulting row so the caller can update local state directly,
// instead of re-querying for "whatever was just created."
export async function upsertDanceEntry(
  client: SupabaseClient,
  studioManagerId: string,
  entry: DanceEntryInput,
  existingId?: string
): Promise<Registration> {
  const row = {
    competition_id: entry.competitionId,
    dance_name: entry.danceName,
    category: entry.category,
    participant_count: entry.participantCount,
    step_division: entry.stepDivision,
    dance_style: entry.danceStyle,
    dancer_name: entry.category === "solo" ? entry.dancerName || null : null,
    choreographer_name: entry.choreographerName,
    dance_level: entry.danceLevel,
    preferred_day: entry.preferredDay || null,
    song_file_path: entry.songFilePath || null,
    song_duration_seconds: entry.songDurationSeconds ?? null,
    wants_video: entry.wantsVideo,
    wants_stills: entry.wantsStills,
  };

  const query = existingId
    ? client.from("registrations").update(row).eq("id", existingId)
    : client.from("registrations").insert({ ...row, studio_manager_id: studioManagerId });

  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return toRegistration(data as RegistrationRow);
}

export async function deleteDanceEntry(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("registrations").delete().eq("id", id);
  if (error) throw error;
}

// Uploads to the private "dance-music" bucket under the manager's own folder
// (RLS on storage.objects requires this exact path shape — see
// supabase/schema.sql). Called on form submit, not on file selection, so
// changing your mind before submitting doesn't leave orphaned uploads.
export async function uploadDanceMusic(client: SupabaseClient, studioManagerId: string, file: File): Promise<string> {
  const path = `${studioManagerId}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await client.storage.from("dance-music").upload(path, file);
  if (error) throw error;
  return path;
}

// The bucket is private, so playback needs a signed URL rather than a public
// one — RLS on storage.objects ("Manager reads own music") only allows this
// for the manager's own path. One hour is plenty for a single listening
// session in the dashboard; it's fetched fresh each time playback starts
// rather than stored, so it never needs refreshing mid-use.
export async function getDanceMusicUrl(client: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await client.storage.from("dance-music").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
