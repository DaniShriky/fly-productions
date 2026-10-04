import type { SupabaseClient } from "@supabase/supabase-js";
import { Admin } from "@/types/admin";

type AdminRow = {
  user_id: string;
  name: string | null;
  profile_image_path: string | null;
};

function toAdmin(row: AdminRow): Admin {
  return {
    userId: row.user_id,
    ...(row.name ? { name: row.name } : {}),
    ...(row.profile_image_path ? { profileImagePath: row.profile_image_path } : {}),
  };
}

export async function getOwnAdmin(client: SupabaseClient, userId: string): Promise<Admin | null> {
  const { data, error } = await client.from("admins").select("*").eq("user_id", userId).maybeSingle();

  if (error) throw error;
  return data ? toAdmin(data as AdminRow) : null;
}

export async function updateOwnAdmin(
  client: SupabaseClient,
  userId: string,
  updates: { name?: string; profileImagePath?: string }
): Promise<Admin> {
  const { data, error } = await client
    .from("admins")
    .update({
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.profileImagePath !== undefined ? { profile_image_path: updates.profileImagePath } : {}),
    })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return toAdmin(data as AdminRow);
}
