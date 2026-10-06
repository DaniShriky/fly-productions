import type { SupabaseClient } from "@supabase/supabase-js";
import { DanceLevel, PaymentStatus, Registration, RegistrationCategory } from "@/types/registration";

// Same shape as Registration (see lib/queries/registrations.ts — studioName
// there is this specific dance's own stored value, not necessarily the
// manager's current profile), plus the phone number and competition name an
// admin needs to make sense of a flat cross-manager list — a studio
// manager's own dashboard never needs these since she only ever sees her own
// dances for one competition at a time.
export interface AdminRegistration extends Registration {
  studioPhone: string;
  competitionName: string;
}

type AdminRegistrationRow = {
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
  payment_status: PaymentStatus;
  payment_due_date: string | null;
  late_payment_exception: boolean;
  created_at: string;
  studio_managers: { phone: string } | null;
  competitions: { name: string } | null;
};

function toAdminRegistration(row: AdminRegistrationRow): AdminRegistration {
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
    createdAt: row.created_at,
    studioPhone: row.studio_managers?.phone ?? "",
    competitionName: row.competitions?.name ?? "—",
  };
}

// Relies on the "Admin reads all registrations" RLS policy (see
// supabase/schema.sql) — a non-admin caller would just get an empty result,
// not an error, since RLS filters rows rather than rejecting the query.
export async function getAllRegistrationsForAdmin(client: SupabaseClient): Promise<AdminRegistration[]> {
  const { data, error } = await client
    .from("registrations")
    .select("*, studio_managers(phone), competitions(name)")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as unknown as AdminRegistrationRow[]).map(toAdminRegistration);
}

// Runs as the admin_update_registration_payment SQL function (security
// definer) so it can write payment_status/late_payment_exception despite
// those columns being excluded from the ordinary authenticated update grant
// — see supabase/schema.sql. The function re-checks is_admin() itself too.
export async function updateRegistrationPaymentAdmin(
  client: SupabaseClient,
  id: string,
  paymentStatus: PaymentStatus,
  latePaymentException: boolean
): Promise<void> {
  const { error } = await client.rpc("admin_update_registration_payment", {
    target_id: id,
    new_payment_status: paymentStatus,
    new_late_payment_exception: latePaymentException,
  });
  if (error) throw error;
}

export type AdminDanceDetailsInput = {
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
  wantsVideo: boolean;
  wantsStills: boolean;
};

// Runs as the admin_update_registration_details SQL function (security
// definer, admin-only) — per Dani, 2026-10-06: gives an admin a way to fix a
// dance's own details, specifically for an already-submitted dance that the
// studio manager herself can no longer edit. Deliberately doesn't touch
// competition_id (same restriction the manager's own upsertDanceEntry has)
// or any payment-related column (that's updateRegistrationPaymentAdmin's
// job) — see supabase/schema.sql.
export async function updateRegistrationDetailsAdmin(
  client: SupabaseClient,
  id: string,
  entry: AdminDanceDetailsInput
): Promise<void> {
  const { error } = await client.rpc("admin_update_registration_details", {
    p_id: id,
    p_dance_name: entry.danceName,
    p_category: entry.category,
    p_participant_count: entry.participantCount,
    p_step_division: entry.stepDivision,
    p_dance_style: entry.danceStyle,
    p_dancer_name: entry.category === "solo" ? entry.dancerName || null : null,
    p_choreographer_name: entry.choreographerName,
    p_dance_level: entry.danceLevel,
    p_manager_name: entry.managerName,
    p_studio_name: entry.studioName,
    p_city: entry.city,
    p_wants_video: entry.wantsVideo,
    p_wants_stills: entry.wantsStills,
  });
  if (error) throw error;
}
