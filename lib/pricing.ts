import { PriceTiers } from "@/types/priceTiers";
import { RegistrationCategory } from "@/types/registration";

// What the form lets a manager pick. "group" gets resolved to
// group_small/group_large from the participant count before it's ever stored,
// since the DB category needs to match a price_tiers key directly. "trio" and
// "quartet" are a UI-only split — the flyer prices them identically as one
// combined "trio_quartet" DB category/price tier, so they both resolve to
// that same stored category and differ only in their fixed participant count
// (3 vs 4, see FIXED_PARTICIPANT_COUNTS in DanceEntryForm).
export type UiCategory = "solo" | "duet" | "trio" | "quartet" | "group";

export const CATEGORY_LABELS: Record<RegistrationCategory, string> = {
  solo: "סולו",
  duet: "דואט",
  trio_quartet: "טריו/קוורטט",
  group_small: "קבוצה (5-10 משתתפים)",
  group_large: "קבוצה (11+ משתתפים)",
};

// Display label for a stored entry — same as CATEGORY_LABELS except it
// un-combines "trio_quartet" back into "טריו"/"קוורטט" using the entry's own
// participant count, since the DB doesn't store that distinction separately.
export function displayCategoryLabel(category: RegistrationCategory, participantCount: number): string {
  if (category === "trio_quartet") return participantCount === 4 ? "קוורטט" : "טריו";
  return CATEGORY_LABELS[category];
}

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

export const DANCE_LEVELS: { value: "A" | "B" | "C"; label: string }[] = [
  { value: "A", label: "A - מתחילות (פעם-פעמיים בשבוע)" },
  { value: "B", label: "B - מתקדמות (3 פעמים בשבוע ומעלה)" },
  { value: "C", label: "C - מקצועית (3 פעמים בשבוע ומעלה, מעל שנתיים)" },
];

// The real options from FLY's existing Google Form (screenshot, 2026-09-21) —
// not a placeholder list. "אחר" (other) is handled in the form as a free-text
// fallback, not stored literally — the form swaps it for whatever the manager
// types.
export const DANCE_STYLES = [
  "היפ הופ",
  "מודרני",
  "בלט",
  "אקרודאנס",
  "ג'אז",
  "פיוז'ן",
  "קומרשאל",
  "לירי",
  "שואו דאנס",
  "פולקלור",
  "סלוניים",
  "מיוזיקל",
  "חופשי",
  "קיי פופ",
  "נאו קלאסי",
  "רגאטון",
];

// "group" resolves to group_small (5-10) / group_large (11+) from the actual
// participant count, matching the flyer's own split; "trio" and "quartet"
// both resolve to the one combined DB category — everything else passes
// through unchanged.
export function resolveCategory(uiCategory: UiCategory, participantCount: number): RegistrationCategory {
  if (uiCategory === "group") return participantCount >= 11 ? "group_large" : "group_small";
  if (uiCategory === "trio" || uiCategory === "quartet") return "trio_quartet";
  return uiCategory;
}

// Reverses resolveCategory for editing an existing entry. "trio_quartet"
// can't tell trio from quartet on its own — the entry's own participant
// count is what disambiguates it.
export function uiCategoryOf(category: RegistrationCategory, participantCount: number): UiCategory {
  if (category === "group_small" || category === "group_large") return "group";
  if (category === "trio_quartet") return participantCount === 4 ? "quartet" : "trio";
  return category;
}

export function isEarlyPricing(priceTiers: PriceTiers | undefined): boolean {
  if (!priceTiers) return false;
  return new Date() <= new Date(priceTiers.earlyUntil);
}

// Whole days remaining until (midnight of) the given date, rounded up so
// "today" and "tomorrow" both read as at least 1 day rather than 0.
export function daysUntil(dateStr: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / msPerDay);
}

// `earlyUntil` is stored as ISO (YYYY-MM-DD) since that's what sorts/parses
// unambiguously, but reads "backwards" to an Israeli audience — this is
// display-only formatting into the day.month.year order used everywhere
// else on the site (e.g. getCompetitionDayOptions's labels).
export function formatDateHe(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}

// Group categories are early/regular tiered by date; solo/duet/trio_quartet
// are flat — that's what the real flyer actually prints (no early price shown
// for those categories). Flag to Dani if that assumption turns out wrong.
export function computePrice(priceTiers: PriceTiers | undefined, category: RegistrationCategory): number | null {
  if (!priceTiers) return null;

  const isEarly = isEarlyPricing(priceTiers);

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

function isGroupCategory(category: RegistrationCategory): boolean {
  return category === "group_small" || category === "group_large";
}

// Time limits and per-30-second-over surcharges from the real flyer (see
// project_pricing_and_rules): group dances up to 3 minutes, solo/duet/trio
// quartet up to 2 minutes. Group surcharges are per participant; solo/duet/
// trio_quartet's is a flat amount regardless of how many people are in it.
export function computeSurcharge(
  category: RegistrationCategory,
  durationSeconds: number | undefined,
  participantCount: number
): number {
  if (!durationSeconds) return 0;

  const limitSeconds = isGroupCategory(category) ? 180 : 120;
  if (durationSeconds <= limitSeconds) return 0;

  const increments = Math.ceil((durationSeconds - limitSeconds) / 30);
  const perIncrement = category === "group_large" ? 15 : category === "group_small" ? 25 : 75;

  return increments * perIncrement * (isGroupCategory(category) ? participantCount : 1);
}

// Video and stills are two independent add-on services, each priced 135₪ for
// a single order or 125₪ per order once 2+ of THAT SAME type are ordered —
// Dani corrected this 2026-09 (the flyer's "צילום וידאו ו/או סטילס" wording
// first read as one shared line item, but ordering both is really two
// separate charges). The two types' quantity discounts are independent of
// each other: e.g. 1 video order + 1 stills order are each still priced at
// the "single" 135₪ tier, not treated as "2 recording orders" together.
export function computeRecordingFeeForType(totalOrdersOfThisType: number): number {
  return totalOrdersOfThisType >= 2 ? 125 : 135;
}

// Combined recording add-on fee for one dance entry — the sum of whichever
// of video/stills it ordered, each priced against its own type's total order
// count (across all of a manager's dances, in this competition or overall —
// see project_pricing_and_rules). Callers must pass counts that include the
// entry being priced itself.
export function computeRecordingFee(
  wantsVideo: boolean,
  wantsStills: boolean,
  totalVideoOrders: number,
  totalStillsOrders: number
): number {
  return (
    (wantsVideo ? computeRecordingFeeForType(totalVideoOrders) : 0) +
    (wantsStills ? computeRecordingFeeForType(totalStillsOrders) : 0)
  );
}

// Total price for one dance entry: per-participant price × participant count
// for group categories (solo/duet/trio_quartet are already flat per-dance
// fees in the real pricing, not multiplied by a "quantity"), plus any
// over-time surcharge, plus the recording fee if this entry ordered video
// and/or stills (0 if not — caller resolves the actual fee via
// computeRecordingFee and passes it in, since it depends on sibling entries,
// not just this one).
export function computeTotalPrice(
  priceTiers: PriceTiers | undefined,
  category: RegistrationCategory,
  participantCount: number,
  durationSeconds?: number,
  recordingFee = 0
): number | null {
  const base = computePrice(priceTiers, category);
  if (base == null) return null;

  const surcharge = computeSurcharge(category, durationSeconds, participantCount);
  const danceFee = isGroupCategory(category) ? base * participantCount + surcharge : base + surcharge;
  return danceFee + recordingFee;
}
