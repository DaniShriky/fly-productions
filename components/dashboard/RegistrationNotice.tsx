import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import styles from "./RegistrationNotice.module.css";

// Dani specifically wants this hard to miss — early-registration discounts
// and the video/stills order cutoff are easy for a studio manager to lose
// track of (see project_pricing_and_rules: dates get updated ad hoc even via
// WhatsApp broadcasts, so surfacing this prominently in the UI matters).
export default function RegistrationNotice({ competition }: { competition?: CompetitionWithPricing }) {
  if (!competition?.priceTiers) return null;

  return (
    <div className={styles.notice}>
      <svg
        className={styles.icon}
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" />
        <path d="M12 16.5v.01" />
      </svg>
      <div>
        <p>
          מחיר מוקדם ל<span className="en" lang="en">{competition.name}</span> בתוקף עד{" "}
          <strong dir="ltr">{competition.priceTiers.earlyUntil}</strong> — אחר כך המחיר עולה לתעריף הרגיל.
        </p>
        <p>הזמנת צילום וידאו/סטילס צריכה להתבצע ולהיות משולמת עד 10 ימים לפני התחרות.</p>
      </div>
    </div>
  );
}
