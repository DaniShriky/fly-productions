// Mirrors `competitions.price_tiers` (jsonb) — see supabase/schema.sql and the
// project_pricing_and_rules memory (drawn from a real registration flyer).
// One shared early-price cutoff date per competition; prices vary by category
// — group categories are early/regular tiered, solo/duet/trio_quartet are flat
// (that's what the real flyer actually shows; flag if that assumption is wrong).

export interface PriceTiers {
  earlyUntil: string; // ISO date
  groupLarge: { earlyPrice: number; regularPrice: number }; // 11+ participants
  groupSmall: { earlyPrice: number; regularPrice: number }; // 5-10 participants
  solo: { price: number };
  duet: { price: number };
  trioQuartet: { price: number };
}
