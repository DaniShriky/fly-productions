import { CSSProperties } from "react";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { daysUntil, formatDateHe, isEarlyPricing } from "@/lib/pricing";
import { getGeneralRegistrationCutoffIso, getVideoOrderCutoffIso } from "@/lib/getCompetitionDays";
import { hexToRgbParts } from "@/lib/hexToRgbParts";
import { CalendarIcon, ClockIcon } from "./icons";
import CountdownTimer from "./CountdownTimer";
import styles from "./RegistrationNotice.module.css";

// Dani specifically wants this hard to miss — early-registration discounts
// and the video/stills + music cutoff are easy for a studio manager to lose
// track of (see project_pricing_and_rules: dates get updated ad hoc even via
// WhatsApp broadcasts, so surfacing this prominently in the UI matters).
//
// Two visually separate sections (divided by .divider): early-pricing status
// with its countdown, then the video/stills-order-and-music-submission
// status — they're different topics with different cutoffs, so they read as
// two things, not one blob. Video/stills and music share the literal same
// 10-days-before cutoff (per Dani, 2026-10-04), so they're one combined line
// rather than two near-identical blocks.
export default function RegistrationNotice({ competition }: { competition?: CompetitionWithPricing }) {
  if (!competition?.priceTiers) return null;

  const early = isEarlyPricing(competition.priceTiers);

  // The countdown is to general registration closing (a month and a half
  // before the event, at full price — Dani, 2026-10-02), NOT to the
  // early-price window ending — those are two different deadlines.
  // CountdownTimer itself renders nothing once this date has passed, so no
  // extra "has registration closed" check is needed here.
  const generalCutoffIso = getGeneralRegistrationCutoffIso(competition.date, competition.registrationCutoffOverride);

  // 10 days before the competition's first day (project_pricing_and_rules'
  // general date rule) — shared by both video/stills ordering and final
  // music submission (per Dani, 2026-10-04), computed from the competition's
  // own date instead of shown as generic "10 days before" text, so a manager
  // filling this in after the cutoff already passed sees that clearly
  // instead of a reminder that's no longer actionable.
  const tenDayCutoffIso = getVideoOrderCutoffIso(competition.date);
  const tenDayCutoffDaysLeft = tenDayCutoffIso ? daysUntil(tenDayCutoffIso) : null;
  const tenDayCutoffPassed = tenDayCutoffDaysLeft != null && tenDayCutoffDaysLeft <= 0;

  // Per Dani, 2026-10-06: this notice should read as "belonging to" whichever
  // competition is selected, same accent color as DanceEntryForm's glow and
  // CompetitionDanceList — rather than every competition sharing the one
  // fixed blue it used before. Falls back to that original blue (the CSS's
  // own default) when a competition has no accentColor yet.
  const rgb = competition.accentColor ? hexToRgbParts(competition.accentColor) : null;
  const noticeStyle: CSSProperties | undefined = rgb
    ? ({
        "--notice-accent": competition.accentColor,
        "--notice-rgb": `${rgb.r}, ${rgb.g}, ${rgb.b}`,
      } as CSSProperties)
    : undefined;

  return (
    <div className={styles.notice} style={noticeStyle}>
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

      {tenDayCutoffIso == null ? (
        <p className={styles.secondary}>
          הזמנת צילום וידאו/סטילס צריכה להתבצע ולהיות משולמת, והעלאת קובץ המוזיקה הסופי צריכה להתבצע, עד 10 ימים
          לפני התחרות.
        </p>
      ) : tenDayCutoffPassed ? (
        <p className={`${styles.secondary} ${styles.warning}`}>
          המועד להזמנת ותשלום עבור צילום וידאו/סטילס ולהעלאת קובץ המוזיקה הסופי עבר (היה עד{" "}
          <strong dir="ltr">{formatDateHe(tenDayCutoffIso)}</strong>) - לבדיקה אם עדיין ניתן לעדכן יש ליצור קשר עם
          המשרד.
        </p>
      ) : (
        <p className={styles.secondary}>
          הזמנת צילום וידאו/סטילס צריכה להתבצע ולהיות משולמת, והעלאת קובץ המוזיקה הסופי צריכה להתבצע, עד{" "}
          <strong dir="ltr">{formatDateHe(tenDayCutoffIso)}</strong>
          {/* Only surfaced once it's actually close/urgent (a week or less
              left) — otherwise a "206 days left" count isn't useful
              information, just noise next to the date. Red specifically so
              it reads as a "pay attention now" cue once it does show up. */}
          {tenDayCutoffDaysLeft != null && tenDayCutoffDaysLeft <= 7 && (
            <>
              {" "}
              <strong className={styles.urgentDays}>
                (עוד {tenDayCutoffDaysLeft} {tenDayCutoffDaysLeft === 1 ? "יום" : "ימים"})
              </strong>
            </>
          )}
          .
        </p>
      )}
    </div>
  );
}
