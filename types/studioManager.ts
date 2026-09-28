// Mirrors the `studio_managers` table in Supabase (see supabase/schema.sql).
// lib/queries/studioManagers.ts maps DB rows into this shape.

export type StudioManagerStatus = "pending" | "approved" | "rejected";

export interface StudioManager {
  id: string;
  studioName: string;
  managerName?: string;
  phone: string;
  email: string;
  city?: string;
  danceStyles?: string;
  profileImagePath?: string;
  status: StudioManagerStatus;
  referralSource?: string;
  preferredCompetitionType?: string;
  // Set only while a request to change preferredCompetitionType is awaiting
  // admin approval — see resolve_preferred_competition_type_request in
  // supabase/schema.sql. Cleared once an admin approves or rejects it.
  pendingPreferredCompetitionType?: string;
  additionalNotes?: string;
  wantsStageServicesInfo: boolean;
  createdAt: string;
}
