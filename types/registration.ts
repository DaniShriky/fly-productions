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
  // Pre-filled from the studio manager's own profile in the UI, but stored
  // per dance entry since she can override it there (e.g. a guest
  // choreographer entering under a different studio name) — not just a
  // live mirror of studio_managers.
  managerName: string;
  studioName: string;
  city: string;
  preferredDays?: string[]; // ISO dates — only relevant for multi-day competitions; a dance can be available on more than one
  songFilePath?: string; // path in the "dance-music" Supabase Storage bucket
  songDurationSeconds?: number;
  wantsVideo: boolean;
  wantsStills: boolean;
  paymentStatus: PaymentStatus;
  paymentDueDate?: string;
  latePaymentException: boolean;
  // Unset = still a draft: editable by the manager, invisible to admin.
  // Set once via the final "הגשה" step (see submitRegistrations in
  // lib/queries/registrations.ts) — locks the dance from further edits and
  // is what makes it visible to the admin dashboard at all.
  submittedAt?: string;
  createdAt: string;
}
