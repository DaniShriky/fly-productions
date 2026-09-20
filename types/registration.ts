// Mirrors the `registrations` table in Supabase (see supabase/schema.sql) —
// final/advanced registration, one row per dance (not the general/"soft"
// registration, which is the existing external Google Form).

export type RegistrationCategory = "solo" | "duet" | "trio_quartet" | "group_small" | "group_large";
export type PaymentStatus = "unpaid" | "paid";
export type DanceLevel = "A" | "B" | "C";

export interface Registration {
  id: string;
  studioManagerId: string;
  competitionId: string;
  danceName: string;
  category: RegistrationCategory;
  participantCount: number;
  stepDivision: string;
  danceStyle: string;
  dancerName?: string; // only set when category is 'solo'
  choreographerName: string;
  danceLevel: DanceLevel;
  preferredDay?: string; // ISO date — only relevant for multi-day competitions
  songFilePath?: string; // path in the "dance-music" Supabase Storage bucket
  songDurationSeconds?: number;
  wantsVideo: boolean;
  wantsStills: boolean;
  paymentStatus: PaymentStatus;
  paymentDueDate?: string;
  latePaymentException: boolean;
  createdAt: string;
}
