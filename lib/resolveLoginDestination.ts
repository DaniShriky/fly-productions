import type { SupabaseClient } from "@supabase/supabase-js";
import { getOwnStudioManager } from "@/lib/queries/studioManagers";

export type LoginDestination =
  | { kind: "admin" }
  | { kind: "approved" }
  | { kind: "pending" }
  | { kind: "rejected" }
  | { kind: "not_found" };

// Shared by both login paths (/login's OTP form and /auth/callback's Google
// OAuth redirect) so "what happens once we know who you are" — admin vs.
// approved/pending/rejected manager vs. no account at all — is decided in
// exactly one place, not duplicated and left to drift between them.
export async function resolveLoginDestination(client: SupabaseClient, userId: string): Promise<LoginDestination> {
  const { data: adminRow } = await client.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (adminRow) return { kind: "admin" };

  const manager = await getOwnStudioManager(client, userId);
  if (!manager) return { kind: "not_found" };
  if (manager.status === "approved") return { kind: "approved" };
  if (manager.status === "pending") return { kind: "pending" };
  return { kind: "rejected" };
}
