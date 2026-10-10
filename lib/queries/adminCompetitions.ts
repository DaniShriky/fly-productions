import type { SupabaseClient } from "@supabase/supabase-js";

// Runs as the admin_update_registration_cutoff SQL function (security
// definer) so it can write registration_cutoff_override despite that column
// being excluded from any ordinary authenticated update grant — see
// supabase/schema.sql. The function re-checks is_admin() itself too.
// Pass null to clear the override and fall back to the default 45-day
// computation (see getGeneralRegistrationCutoffIso).
export async function updateRegistrationCutoffAdmin(
  client: SupabaseClient,
  competitionId: string,
  overrideDate: string | null
): Promise<void> {
  const { error } = await client.rpc("admin_update_registration_cutoff", {
    p_competition_id: competitionId,
    p_override_date: overrideDate,
  });
  if (error) throw error;
}

// Runs as the admin_update_early_registration_cutoff SQL function (security
// definer) — unlike the general cutoff above, this always overwrites
// competitions.price_tiers.early_until directly (no null/"reset to
// default" option, since that field has no default computation to fall
// back to).
export async function updateEarlyRegistrationCutoffAdmin(
  client: SupabaseClient,
  competitionId: string,
  earlyUntilDate: string
): Promise<void> {
  const { error } = await client.rpc("admin_update_early_registration_cutoff", {
    p_competition_id: competitionId,
    p_early_until: earlyUntilDate,
  });
  if (error) throw error;
}
