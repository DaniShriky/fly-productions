import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { daysUntil, formatDateHe, isEarlyPricing } from "@/lib/pricing";
import { getVideoOrderCutoffIso } from "@/lib/getCompetitionDays";
import { CalendarIcon } from "./icons";
import styles from "./RegistrationNotice.module.css";

// Dani specifically wants this hard to miss — early-registration discounts
// and the video/stills order cutoff are easy for a studio manager to lose
// track of (see project_pricing_and_rules: dates get updated ad hoc even via
// WhatsApp broadcasts, so surfacing this prominently in the UI matters).
export default function RegistrationNotice({ competition }: { competition?: CompetitionWithPricing }) {
  if (!competition?.priceTiers) return null;

  const early = isEarlyPricing(competition.priceTiers);
  const daysLeft = daysUntil(competition.priceTiers.earlyUntil);

  // 10 days before the competition's first day (project_pricing_and_rules'
  // general date rule) — computed from the competition's own date instead of
  // shown as generic "10 days before" text, so a manager filling this in
  // after the cutoff already passed sees that clearly instead of a reminder
  // that's no longer actionable.
  const videoCutoffIso = getVideoOrderCutoffIso(competition.date);
  const videoCutoffDaysLeft = videoCutoffIso ? daysUntil(videoCutoffIso) : null;
  const videoCutoffPassed = videoCutoffDaysLeft != null && videoCutoffDaysLeft <= 0;

  return (
    <div className={styles.notice}>
      <span className={styles.icon}>
        <CalendarIcon size={18} />
      </span>
      <div>
        {early ? (
          <p>
            מחיר מוקדם ל<span className="en" lang="en">{competition.name}</span> בתוקף עד{" "}
            <strong dir="ltr">{formatDateHe(competition.priceTiers.earlyUntil)}</strong>{" "}
            <strong>(עוד {daysLeft} {daysLeft === 1 ? "יום" : "ימים"})</strong> — אחר כך המחיר עולה לתעריף הרגיל.
          </p>
        ) : (
          <p>
            המחיר המוקדם ל<span className="en" lang="en">{competition.name}</span> הסתיים — התעריף הנוכחי הוא המחיר
            הרגיל.
          </p>
        )}

        {videoCutoffIso == null ? (
          <p>הזמנת צילום וידאו/סטילס צריכה להתבצע ולהיות משולמת עד 10 ימים לפני התחרות.</p>
        ) : videoCutoffPassed ? (
          <p className={styles.warning}>
            המועד להזמנת ותשלום עבור צילום וידאו/סטילס עבר (היה עד{" "}
            <strong dir="ltr">{formatDateHe(videoCutoffIso)}</strong>) — לבדיקה אם עדיין ניתן להזמין יש ליצור קשר עם
            המשרד.
          </p>
        ) : (
          <p>
            הזמנת צילום וידאו/סטילס צריכה להתבצע ולהיות משולמת עד{" "}
            <strong dir="ltr">{formatDateHe(videoCutoffIso)}</strong>{" "}
            <strong>
              (עוד {videoCutoffDaysLeft} {videoCutoffDaysLeft === 1 ? "יום" : "ימים"})
            </strong>
            .
          </p>
        )}
      </div>
    </div>
  );
}
