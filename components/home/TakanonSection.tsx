import { FaScroll } from "react-icons/fa";
import styles from "./TakanonSection.module.css";

// Always visible on the homepage regardless of login state — per Dani,
// 2026-10-09: a studio should be able to review the festival's official
// terms before ever registering, not just encounter them at step 3 of the
// dashboard registration flow (SubmissionStep.tsx links to the same
// /documents/takanon.pdf — one real file, two entry points to it).
export default function TakanonSection() {
  return (
    <section className={styles.section}>
      <div className={styles.card}>
        <span className={styles.iconBadge} aria-hidden="true">
          <FaScroll size={26} />
        </span>
        <div className={styles.text}>
          <h2>תקנון התחרות</h2>
          <p>כל הכללים וההנחיות הרשמיות של הפסטיבל - מומלץ להתעדכן בהם לפני ההרשמה.</p>
        </div>
        <a href="/documents/takanon.pdf" target="_blank" rel="noopener noreferrer" className={styles.cta}>
          לצפייה בתקנון
        </a>
      </div>
    </section>
  );
}
