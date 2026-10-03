import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { daysUntil, formatDateHe, isEarlyPricing } from "@/lib/pricing";
import { getGeneralRegistrationCutoffIso, getVideoOrderCutoffIso } from "@/lib/getCompetitionDays";
import { CalendarIcon, ClockIcon } from "./icons";
import CountdownTimer from "./CountdownTimer";
import styles from "./RegistrationNotice.module.css";

// Dani specifically wants this hard to miss — early-registration discounts
// and the video/stills order cutoff are easy for a studio manager to lose
// track of (see project_pricing_and_rules: dates get updated ad hoc even via
// WhatsApp broadcasts, so surfacing this prominently in the UI matters).
//
// Two visually separate sections (divided by .divider): early-pricing status
// with its countdown, then video/stills order status — they're different
// topics with different cutoffs, so they read as two things, not one blob.
export default function RegistrationNotice({ competition }: { competition?: CompetitionWithPricing }) {
  if (!competition?.priceTiers) return null;

  const early = isEarlyPricing(competition.priceTiers);

  // The countdown is to general registration closing (a month and a half
  // before the event, at full price — Dani, 2026-10-02), NOT to the
  // early-price window ending — those are two different deadlines.
  // CountdownTimer itself renders nothing once this date has passed, so no
  // extra "has registration closed" check is needed here.
  const generalCutoffIso = getGeneralRegistrationCutoffIso(competition.date);

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
      <div className={styles.row}>
        <div className={styles.titleLine}>
          <span className={styles.icon}>
            <CalendarIcon size={18} />
          </span>
          {early ? (
            <p>
              מחיר הרשמה מוקדמת ל<span className="en" lang="en">{competition.name}</span> בתוקף עד{" "}
              <strong dir="ltr">{formatDateHe(competition.priceTiers.earlyUntil)}</strong> - אחר כך המחיר עולה
              לתעריף הרגיל.
            </p>
          ) : (
            <p>
              המחיר המוקדם ל<span className="en" lang="en">{competition.name}</span> הסתיים - התעריף הנוכחי הוא
              המחיר הרגיל.
            </p>
          )}
        </div>

        {/* On the trailing (left, in this RTL layout) side of the row — the
            countdown is meant to catch the eye first, so it sits apart from
            the explanatory sentence rather than inline with it. Shown
            regardless of `early` — this counts down general registration
            closing, not the early-price window specifically, so it's still
            relevant even once early pricing has ended. */}
        {generalCutoffIso && (
          <div className={styles.timerBlock}>
            <span className={styles.timerLabel}>
              <ClockIcon size={11} />
              זמן שנותר להרשמה לתחרות
            </span>
            <CountdownTimer target={generalCutoffIso} />
          </div>
        )}
      </div>

      <div className={styles.divider} />

      {videoCutoffIso == null ? (
        <p className={styles.secondary}>הזמנת צילום וידאו/סטילס צריכה להתבצע ולהיות משולמת עד 10 ימים לפני התחרות.</p>
      ) : videoCutoffPassed ? (
        <p className={`${styles.secondary} ${styles.warning}`}>
          המועד להזמנת ותשלום עבור צילום וידאו/סטילס עבר (היה עד{" "}
          <strong dir="ltr">{formatDateHe(videoCutoffIso)}</strong>) - לבדיקה אם עדיין ניתן להזמין יש ליצור קשר עם
          המשרד.
        </p>
      ) : (
        <p className={styles.secondary}>
          הזמנת צילום וידאו/סטילס צריכה להתבצע ולהיות משולמת עד{" "}
          <strong dir="ltr">{formatDateHe(videoCutoffIso)}</strong>
          {/* Only surfaced once it's actually close/urgent (a week or less
              left) — otherwise a "206 days left" count isn't useful
              information, just noise next to the date. Red specifically so
              it reads as a "pay attention now" cue once it does show up. */}
          {videoCutoffDaysLeft != null && videoCutoffDaysLeft <= 7 && (
            <>
              {" "}
              <strong className={styles.urgentDays}>
                (עוד {videoCutoffDaysLeft} {videoCutoffDaysLeft === 1 ? "יום" : "ימים"})
              </strong>
            </>
          )}
          .
        </p>
      )}
    </div>
  );
}
