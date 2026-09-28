import { REGISTRATION_URL } from "@/data/registration";
import StepHeader from "./StepHeader";
import styles from "./EarlyRegistrationStatus.module.css";

function RefreshIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function NoCardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M2 10h20" />
      <path d="M4 20L20 4" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16.5v.01" />
    </svg>
  );
}

// Points a manager to the site's real, existing general-registration form
// (the external Google Form linked from Nav's "שמירת מקום" CTA) — this
// component does NOT let her register here, only sends her to that external
// form. The form itself isn't scoped to one competition (it's a single form
// covering whichever competitions she's interested in), so this shows one
// prompt, not one per competition. Whether she's already filled it is
// tracked admin-side only (the form's Google Sheet gets imported into the
// admin dashboard, not surfaced back here — see components/admin) — she
// doesn't need her own status reflected in this component at all, so this
// stays a plain, permanent "fill it once if you haven't" prompt rather than
// hedging about detecting completion automatically.
export default function EarlyRegistrationStatus() {
  return (
    <section>
      <StepHeader
        kicker="שלב 1"
        title="שמירת מקום בתחרויות"
        hint="שמירת מקום היא הודעת עניין ראשונית, לא מחייבת וללא תשלום."
      />

      <div className={styles.card}>
        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>
              <RefreshIcon />
            </span>
            <span className={styles.featureLabel}>לא מחייבת</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>
              <CalendarIcon />
            </span>
            <span className={styles.featureLabel}>מכסה את כל התחרויות בטופס אחד</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>
              <NoCardIcon />
            </span>
            <span className={styles.featureLabel}>ללא תשלום בשלב זה</span>
          </div>
        </div>

        <p className={styles.status}>
          אם טרם שמרת מקום באף תחרות — יש למלא את טופס שמירת המקום פעם אחת (הוא כולל בחירה של כל התחרויות הרלוונטיות
          לך). אם כבר מילאת בעבר — אין צורך למלא שוב.
        </p>

        <div className={styles.ctaRow}>
          <a href={REGISTRATION_URL} target="_blank" rel="noopener noreferrer" className={styles.cta}>
            מעבר לטופס שמירת המקום
          </a>
        </div>

        <div className={styles.note}>
          <span className={styles.noteIcon}>
            <InfoIcon />
          </span>
          <span>
            לאחר שליחת הטופס תוכלי לחזור לכאן בכל עת, לעבור ל&quot;שלב 2&quot; ולהוסיף את כל הריקודים שלך לתחרויות —
            ההרשמה תיחשב סופית רק לאחר תשלום בפועל.
          </span>
        </div>
      </div>
    </section>
  );
}
