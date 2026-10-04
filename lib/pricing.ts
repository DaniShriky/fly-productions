import { PriceTiers } from "@/types/priceTiers";
import { RegistrationCategory } from "@/types/registration";

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

// Masculine plural throughout (per Dani, 2026-10-03: the site's address
// language is plural masculine, same convention as "כניסת מנהלים" in the
// nav) — not feminine plural, even though "רמת הרקדנים" itself already was.
export const DANCE_LEVELS: { value: "A" | "B" | "C"; label: string }[] = [
  { value: "A", label: "A - מתחילים (לומדים בסטודיו פעם-פעמיים בשבוע)" },
  { value: "B", label: "B - מתקדמים (לומדים בסטודיו 3 פעמים בשבוע ומעלה)" },
  { value: "C", label: "C - מקצועיים (לומדים בסטודיו 3 פעמים בשבוע ומעלה, מעל שנתיים)" },
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

// The category field was removed from the form (per Dani, 2026-10-03) — the
// participant count alone now determines it, instead of asking for both and
// risking them disagreeing. Thresholds straight from the flyer: 1=solo,
// 2=duet, 3-4=trio_quartet (priced identically either way), 5-10=group_small,
// 11+=group_large.
export function categoryFromParticipantCount(participantCount: number): RegistrationCategory {
  if (participantCount <= 1) return "solo";
  if (participantCount === 2) return "duet";
  if (participantCount <= 4) return "trio_quartet";
  return participantCount >= 11 ? "group_large" : "group_small";
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

// Every ₪ amount shown to a manager/admin should go through this (per Dani,
// 2026-10-05: thousands need a comma, e.g. 1,500 not 1500) instead of being
// interpolated directly — he-IL's grouping is the same comma style as en-US.
export function formatPrice(amount: number): string {
  return amount.toLocaleString("he-IL");
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
// separate charges). Flat 150₪ per type regardless of quantity — per Dani,
// 2026-10-03, replacing the previous 135₪/125₪ quantity-discount tiers
// entirely (not just at new numbers).
export function computeRecordingFeeForType(): number {
  return 150;
}

// Combined recording add-on fee for one dance entry — the sum of whichever
// of video/stills it ordered.
export function computeRecordingFee(wantsVideo: boolean, wantsStills: boolean): number {
  return (wantsVideo ? computeRecordingFeeForType() : 0) + (wantsStills ? computeRecordingFeeForType() : 0);
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
