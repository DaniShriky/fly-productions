import { PriceTiers } from "@/types/priceTiers";
import { RegistrationCategory } from "@/types/registration";

// What the form lets a manager pick — "group" gets resolved to
// group_small/group_large from the participant count before it's ever stored,
// since the DB category needs to match a price_tiers key directly.
export type UiCategory = "solo" | "duet" | "trio_quartet" | "group";

export const CATEGORY_LABELS: Record<RegistrationCategory, string> = {
  solo: "סולו",
  duet: "דואט",
  trio_quartet: "טריו/קוורטט",
  group_small: "קבוצה (5-10 משתתפים)",
  group_large: "קבוצה (11+ משתתפים)",
};

// Real divisions from the FLY Productions flyer (project_pricing_and_rules
// memory) — age-based STEP 1-5 / STAR 6-7, plus the mixed-age and adult tracks.
export const STEP_DIVISIONS = [
  "STEP 1 (גילאי 4-6)",
  "STEP 2 (גילאי 6-8)",
  "STEP 3 (גילאי 8-10)",
  "STEP 4 (גילאי 10-12)",
  "STEP 5 (גילאי 12-14)",
  "STAR 6 (גילאי 14-16)",
  "STAR 7 (גילאי 16-18+)",
  "STEP MIX 1 (גילאי 7-14)",
  "STEP MIX 2 (גילאי 13-18+)",
  "STEP STAR (גילאי 25+)",
];

// "group" resolves to group_small (5-10) / group_large (11+) from the actual
// participant count, matching the flyer's own split — everything else passes
// through unchanged.
export function resolveCategory(uiCategory: UiCategory, participantCount: number): RegistrationCategory {
  if (uiCategory !== "group") return uiCategory;
  return participantCount >= 11 ? "group_large" : "group_small";
}

export function uiCategoryOf(category: RegistrationCategory): UiCategory {
  return category === "group_small" || category === "group_large" ? "group" : category;
}

// Group categories are early/regular tiered by date; solo/duet/trio_quartet
// are flat — that's what the real flyer actually prints (no early price shown
// for those categories). Flag to Dani if that assumption turns out wrong.
export function computePrice(priceTiers: PriceTiers | undefined, category: RegistrationCategory): number | null {
  if (!priceTiers) return null;

  const isEarly = new Date() <= new Date(priceTiers.earlyUntil);

  switch (category) {
    case "group_large":
      return isEarly ? priceTiers.groupLarge.earlyPrice : priceTiers.groupLarge.regularPrice;
    case "group_small":
      return isEarly ? priceTiers.groupSmall.earlyPrice : priceTiers.groupSmall.regularPrice;
    case "solo":
      return priceTiers.solo.price;
    case "duet":
      return priceTiers.duet.price;
    case "trio_quartet":
      return priceTiers.trioQuartet.price;
  }
}
