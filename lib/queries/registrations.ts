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
  manager_name: string;
  studio_name: string;
  city: string;
  preferred_days: string[] | null;
  song_file_path: string | null;
  song_duration_seconds: number | null;
  wants_video: boolean;
  wants_stills: boolean;
  payment_status: Registration["paymentStatus"];
  payment_due_date: string | null;
  late_payment_exception: boolean;
  submitted_at: string | null;
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
    managerName: row.manager_name,
    studioName: row.studio_name,
    city: row.city,
    ...(row.preferred_days?.length ? { preferredDays: row.preferred_days } : {}),
    ...(row.song_file_path ? { songFilePath: row.song_file_path } : {}),
    ...(row.song_duration_seconds != null ? { songDurationSeconds: row.song_duration_seconds } : {}),
    wantsVideo: row.wants_video,
    wantsStills: row.wants_stills,
    paymentStatus: row.payment_status,
    ...(row.payment_due_date ? { paymentDueDate: row.payment_due_date } : {}),
    latePaymentException: row.late_payment_exception,
    ...(row.submitted_at ? { submittedAt: row.submitted_at } : {}),
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
  managerName: string;
  studioName: string;
  city: string;
  preferredDays?: string[];
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
    dance_name: entry.danceName,
    category: entry.category,
    participant_count: entry.participantCount,
    step_division: entry.stepDivision,
    dance_style: entry.danceStyle,
    dancer_name: entry.category === "solo" ? entry.dancerName || null : null,
    choreographer_name: entry.choreographerName,
    dance_level: entry.danceLevel,
    manager_name: entry.managerName,
    studio_name: entry.studioName,
    city: entry.city,
    preferred_days: entry.preferredDays?.length ? entry.preferredDays : null,
    song_file_path: entry.songFilePath || null,
    song_duration_seconds: entry.songDurationSeconds ?? null,
    wants_video: entry.wantsVideo,
    wants_stills: entry.wantsStills,
  };

  // `competition_id` is deliberately excluded from `row` above and only ever
  // set on insert — the schema's column-level UPDATE grant (schema.sql) never
  // includes it (a manager can't move an existing dance to a different
  // competition), so sending it on an update's SET list at all makes Postgres
  // reject the whole statement with "permission denied for column
  // competition_id", regardless of whether the value actually changed. That
  // was the real cause behind "editing a dance" failing with the generic
  // save-error toast (found 2026-10-03).
  const query = existingId
    ? client.from("registrations").update(row).eq("id", existingId)
    : client.from("registrations").insert({ ...row, competition_id: entry.competitionId, studio_manager_id: studioManagerId });

  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return toRegistration(data as RegistrationRow);
}

export async function deleteDanceEntry(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("registrations").delete().eq("id", id);
  if (error) throw error;
}

// Calls the submit_registrations() RPC (see supabase/schema.sql) — submits
// every one of the manager's currently-draft (submitted_at is null) dances
// in one shot, and records this exact consent as its own row in
// registration_submissions. The RPC itself rejects acceptedTerms=false, so
// callers should already be blocking that in the UI rather than relying on
// this to surface it after the fact.
export async function submitRegistrations(
  client: SupabaseClient,
  acceptedTerms: boolean,
  mediaConsent: "consented" | "declined"
): Promise<void> {
  const { error } = await client.rpc("submit_registrations", {
    p_accepted_terms: acceptedTerms,
    p_media_consent: mediaConsent,
  });
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
