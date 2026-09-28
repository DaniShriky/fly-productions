import type { SupabaseClient } from "@supabase/supabase-js";
import { DanceLevel, PaymentStatus, Registration, RegistrationCategory } from "@/types/registration";

// Same shape as Registration (see lib/queries/registrations.ts), plus the
// studio/competition names an admin needs to make sense of a flat cross-
// manager list — a studio manager's own dashboard never needs these since
// she only ever sees her own dances for one competition at a time.
export interface AdminRegistration extends Registration {
  studioName: string;
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
  preferred_day: string | null;
  song_file_path: string | null;
  song_duration_seconds: number | null;
  wants_video: boolean;
  wants_stills: boolean;
  payment_status: PaymentStatus;
  payment_due_date: string | null;
  late_payment_exception: boolean;
  created_at: string;
  studio_managers: { studio_name: string; phone: string } | null;
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
    ...(row.preferred_day ? { preferredDay: row.preferred_day } : {}),
    ...(row.song_file_path ? { songFilePath: row.song_file_path } : {}),
    ...(row.song_duration_seconds != null ? { songDurationSeconds: row.song_duration_seconds } : {}),
    wantsVideo: row.wants_video,
    wantsStills: row.wants_stills,
    paymentStatus: row.payment_status,
    ...(row.payment_due_date ? { paymentDueDate: row.payment_due_date } : {}),
    latePaymentException: row.late_payment_exception,
    createdAt: row.created_at,
    studioName: row.studio_managers?.studio_name ?? "—",
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
    .select("*, studio_managers(studio_name, phone), competitions(name)")
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
