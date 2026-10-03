import { Registration } from "@/types/registration";
import { DancerIcon } from "./icons";
import styles from "./PaymentStatusCard.module.css";

// A quick-glance overview, pulled out of DanceEntriesTable so it can sit
// next to StepHeader in the same row on desktop (see pages/dashboard/index.tsx)
// instead of always stacking above the table. Always reflects ALL entries,
// independent of DanceEntriesTable's own all/unpaid/paid filter tabs. Hero
// is the total dance count, not the ₪ total — that number already has its
// own clear home in DanceEntriesTable's sticky pay bar, and showing it in
// both places was exactly what Dani flagged; this leads with "how many
// dances exist" instead.
export default function PaymentStatusCard({ entries }: { entries: Registration[] }) {
  const unpaidCount = entries.filter((e) => e.paymentStatus === "unpaid").length;
  const paidCount = entries.length - unpaidCount;

  return (
    <div className={styles.statusCard}>
      <span className={styles.statusHeroIcon}>
        <DancerIcon size={16} />
      </span>
      <div className={styles.statusHeroText}>
        <span className={styles.statusHeroValue}>{entries.length}</span>
        <span className={styles.statusHeroLabel}>ריקודים</span>
      </div>

      <span className={styles.statusDivider} />

      <span className={`${styles.statusPill} ${styles.pillUnpaid}`}>
        <span className={styles.legendDot} /> {unpaidCount} לא שולם
      </span>
      <span className={`${styles.statusPill} ${styles.pillPaid}`}>
        <span className={styles.legendDot} /> {paidCount} שולם
      </span>
    </div>
  );
}
