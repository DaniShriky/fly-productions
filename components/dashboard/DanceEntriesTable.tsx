import { useState } from "react";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { Registration } from "@/types/registration";
import { CATEGORY_LABELS, computePrice } from "@/lib/pricing";
import styles from "./DanceEntriesTable.module.css";

type Filter = "all" | "unpaid" | "paid";

type Props = {
  entries: Registration[];
  competitions: CompetitionWithPricing[];
  onEdit: (entry: Registration) => void;
};

export default function DanceEntriesTable({ entries, competitions, onEdit }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = entries.filter((e) => filter === "all" || e.paymentStatus === filter);

  if (entries.length === 0) {
    return <p className={styles.empty}>עדיין לא נוספו ריקודים.</p>;
  }

  return (
    <div>
      <div className={styles.filters}>
        {(["all", "unpaid", "paid"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`${styles.filterButton} ${filter === f ? styles.filterActive : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "הכל" : f === "unpaid" ? "לא שולם" : "שולם"}
          </button>
        ))}
      </div>

      <div className={styles.wrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>תחרות</th>
              <th>ריקוד</th>
              <th>קטגוריה</th>
              <th>משתתפים</th>
              <th>חלוקת גיל</th>
              <th>מחיר</th>
              <th>סטטוס תשלום</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const competition = competitions.find((c) => c.id === entry.competitionId);
              const price = competition ? computePrice(competition.priceTiers, entry.category) : null;
              return (
                <tr key={entry.id}>
                  <td>
                    <span className="en" lang="en">
                      {competition?.name ?? "—"}
                    </span>
                  </td>
                  <td>{entry.danceName}</td>
                  <td>{CATEGORY_LABELS[entry.category]}</td>
                  <td>{entry.participantCount}</td>
                  <td>{entry.stepDivision}</td>
                  <td>{price != null ? `${price}₪` : "—"}</td>
                  <td>
                    <span className={entry.paymentStatus === "paid" ? styles.paid : styles.unpaid}>
                      {entry.paymentStatus === "paid" ? "שולם" : "לא שולם"}
                    </span>
                  </td>
                  <td>
                    {entry.paymentStatus === "unpaid" && (
                      <button type="button" className={styles.editButton} onClick={() => onEdit(entry)}>
                        עריכה
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
