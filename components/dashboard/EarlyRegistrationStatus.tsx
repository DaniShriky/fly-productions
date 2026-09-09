import { Competition } from "@/types/competition";
import { REGISTRATION_URL } from "@/data/registration";
import { getCompetitionDateLabel } from "@/lib/getCompetitionDays";
import styles from "./EarlyRegistrationStatus.module.css";

// Shows whether a manager has already filled the site's real, existing
// general-registration form (the external Google Form linked from Nav's
// "הרשמה לתחרויות" CTA) — this component does NOT let her register here, it
// only reflects what she already did there. Right now there's no way yet to
// know that (Phase 4b's legacy-Sheet import + phone-matching isn't built),
// so every competition shows the "not yet registered" CTA; once 4b lands,
// this same component swaps in her real matched data instead.
export default function EarlyRegistrationStatus({ competitions }: { competitions: Competition[] }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>הרשמה מוקדמת</h2>
      <p className={styles.hint}>הרשמה מוקדמת היא הודעת עניין ראשונית ולא מחייבת — לשמירת מקום בלבד, ללא תשלום.</p>

      <div className={styles.list}>
        {competitions.map((competition) => (
          <div key={competition.id} className={styles.row}>
            <div className={styles.info}>
              <span className="en" lang="en">
                {competition.name}
              </span>
              <span className={styles.sub}>
                <span dir="ltr" lang="en">
                  {getCompetitionDateLabel(competition.date)}
                </span>{" "}
                · {competition.location}
              </span>
            </div>
            <a href={REGISTRATION_URL} target="_blank" rel="noopener noreferrer" className={styles.cta}>
              טרם נרשמת · מעבר לטופס ההרשמה המוקדמת
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
