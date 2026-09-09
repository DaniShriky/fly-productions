import { StudioManager } from "@/types/studioManager";
import styles from "./ProfileCard.module.css";

export default function ProfileCard({ manager }: { manager: StudioManager }) {
  return (
    <div className={styles.card}>
      <h2 className={styles.title}>{manager.studioName}</h2>
      <dl className={styles.grid}>
        {manager.managerName && (
          <div className={styles.field}>
            <dt>שם מנהל/ת הלהקה</dt>
            <dd>{manager.managerName}</dd>
          </div>
        )}
        <div className={styles.field}>
          <dt>טלפון</dt>
          <dd dir="ltr">{manager.phone}</dd>
        </div>
        <div className={styles.field}>
          <dt>אימייל</dt>
          <dd dir="ltr">{manager.email}</dd>
        </div>
        {manager.city && (
          <div className={styles.field}>
            <dt>יישוב</dt>
            <dd>{manager.city}</dd>
          </div>
        )}
        {manager.danceStyles && (
          <div className={styles.field}>
            <dt>סגנונות ריקוד</dt>
            <dd>{manager.danceStyles}</dd>
          </div>
        )}
        {manager.preferredCompetitionType && (
          <div className={styles.field}>
            <dt>סוג תחרויות מועדף</dt>
            <dd>{manager.preferredCompetitionType}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
