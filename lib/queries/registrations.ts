import type { SupabaseClient } from "@supabase/supabase-js";
import { Registration, RegistrationCategory } from "@/types/registration";

type RegistrationRow = {
  id: string;
  studio_manager_id: string;
  competition_id: string;
  dance_name: string;
  category: RegistrationCategory;
  participant_count: number;
  step_division: string;
  dance_style: string | null;
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
    ...(row.dance_style ? { danceStyle: row.dance_style } : {}),
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
    dance_style: entry.danceStyle || null,
  };

  const query = existingId
    ? client.from("registrations").update(row).eq("id", existingId)
    : client.from("registrations").insert({ ...row, studio_manager_id: studioManagerId });

  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return toRegistration(data as RegistrationRow);
}
