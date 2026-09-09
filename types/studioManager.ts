// Mirrors the `studio_managers` table in Supabase (see supabase/schema.sql).
// lib/queries/studioManagers.ts maps DB rows into this shape.

export type StudioManagerStatus = "pending" | "approved" | "rejected";

export interface StudioManager {
  id: string;
  studioName: string;
  phone: string;
  email: string;
  status: StudioManagerStatus;
  referralSource?: string;
  preferredCompetitionType?: string;
  createdAt: string;
}
