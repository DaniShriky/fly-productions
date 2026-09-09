import type { SupabaseClient } from "@supabase/supabase-js";
import { Competition } from "@/types/competition";
import { PriceTiers } from "@/types/priceTiers";
import { CompetitionRow, toCompetition } from "@/lib/queries/competitions";

export interface CompetitionWithPricing extends Competition {
  priceTiers?: PriceTiers;
}

type PriceTiersRow = {
  early_until: string;
  group_large: { early_price: number; regular_price: number };
  group_small: { early_price: number; regular_price: number };
  solo: { price: number };
  duet: { price: number };
  trio_quartet: { price: number };
};

type CompetitionRowWithPricing = CompetitionRow & {
  price_tiers: PriceTiersRow | null;
};

function toPriceTiers(row: PriceTiersRow): PriceTiers {
  return {
    earlyUntil: row.early_until,
    groupLarge: { earlyPrice: row.group_large.early_price, regularPrice: row.group_large.regular_price },
    groupSmall: { earlyPrice: row.group_small.early_price, regularPrice: row.group_small.regular_price },
    solo: { price: row.solo.price },
    duet: { price: row.duet.price },
    trioQuartet: { price: row.trio_quartet.price },
  };
}

// Calls the get_competitions_with_pricing() security-definer RPC (see
// supabase/schema.sql) instead of a plain select — that function returns
// rows at all only when the caller is an approved manager or admin, since
// RLS row policies can't vary a single column's visibility by caller.
export async function getCompetitionsWithPricing(client: SupabaseClient): Promise<CompetitionWithPricing[]> {
  const { data, error } = await client.rpc("get_competitions_with_pricing");

  if (error) throw error;

  // Order is already sort_order (see the RPC's own `order by` in
  // supabase/schema.sql) — the same display order as the public site.
  return (data as CompetitionRowWithPricing[]).map((row) => ({
    ...toCompetition(row),
    ...(row.price_tiers ? { priceTiers: toPriceTiers(row.price_tiers) } : {}),
  }));
}
