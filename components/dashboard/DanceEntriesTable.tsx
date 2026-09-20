import { Fragment, useState } from "react";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { Registration } from "@/types/registration";
import { computePrice, computeRecordingFeePerDance, computeSurcharge, computeTotalPrice, displayCategoryLabel } from "@/lib/pricing";
import { PHONE, PHONE_TEL_URL, WHATSAPP_URL } from "@/lib/contact";
import styles from "./DanceEntriesTable.module.css";

type Filter = "all" | "unpaid" | "paid";

type Props = {
  entries: Registration[];
  competitions: CompetitionWithPricing[];
  onEdit: (entry: Registration) => void;
  onDelete: (id: string) => Promise<void>;
};

const COLUMN_COUNT = 7;

function isGroup(category: Registration["category"]): boolean {
  return category === "group_small" || category === "group_large";
}

// The table is tight on space, so the parenthetical detail (age range,
// participant-count range) is dropped here — it still shows in full in the
// form's own dropdowns.
function shortLabel(label: string): string {
  return label.split(" (")[0];
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function PayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 6v0M18 18v0" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export default function DanceEntriesTable({ entries, competitions, onEdit, onDelete }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [payPanelId, setPayPanelId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = entries.filter((e) => filter === "all" || e.paymentStatus === filter);

  async function handleDelete(id: string) {
    if (!confirm("למחוק את הריקוד הזה? הפעולה לא הפיכה.")) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  if (entries.length === 0) {
    return <p className={styles.empty}>עדיין לא נוספו ריקודים.</p>;
  }

  // The video/stills quantity discount (135₪ for one dance, 125₪ each for
  // 2+) is evaluated across ALL of the manager's dances that ordered it —
  // not affected by which payment-status filter is currently showing.
  const totalRecordingOrders = entries.filter((e) => e.wantsVideo || e.wantsStills).length;
  const recordingFeeOf = (entry: Registration) =>
    entry.wantsVideo || entry.wantsStills ? computeRecordingFeePerDance(totalRecordingOrders) : 0;

  const perParticipantPriceOf = (entry: Registration) => {
    const competition = competitions.find((c) => c.id === entry.competitionId);
    return competition ? computePrice(competition.priceTiers, entry.category) : null;
  };

  const priceOf = (entry: Registration) => {
    const competition = competitions.find((c) => c.id === entry.competitionId);
    return competition
      ? computeTotalPrice(
          competition.priceTiers,
          entry.category,
          entry.participantCount,
          entry.songDurationSeconds,
          recordingFeeOf(entry)
        )
      : null;
  };

  const grandTotal = filtered.reduce((sum, entry) => sum + (priceOf(entry) ?? 0), 0);

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

      <table className={styles.table}>
        <thead>
          <tr>
            <th>תחרות</th>
            <th>ריקוד</th>
            <th>קטגוריה</th>
            <th>חלוקת גיל</th>
            <th>מחיר</th>
            <th>סטטוס תשלום</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((entry) => {
            const competition = competitions.find((c) => c.id === entry.competitionId);
            const price = priceOf(entry);
            const perParticipantPrice = perParticipantPriceOf(entry);
            const surcharge = computeSurcharge(entry.category, entry.songDurationSeconds, entry.participantCount);
            const recordingFee = recordingFeeOf(entry);
            const baseSubtotal =
              perParticipantPrice != null ? perParticipantPrice * (isGroup(entry.category) ? entry.participantCount : 1) : null;
            const isUnpaid = entry.paymentStatus === "unpaid";
            return (
              <Fragment key={entry.id}>
                <tr>
                  <td data-label="תחרות">
                    <span className="en" lang="en">
                      {competition?.name ?? "—"}
                    </span>
                  </td>
                  <td data-label="ריקוד">{entry.danceName}</td>
                  <td data-label="קטגוריה">
                    {shortLabel(displayCategoryLabel(entry.category, entry.participantCount))} · {entry.participantCount}
                  </td>
                  <td data-label="חלוקת גיל">{shortLabel(entry.stepDivision)}</td>
                  <td data-label="מחיר">
                    {price == null ? (
                      "—"
                    ) : isGroup(entry.category) ? (
                      <>
                        <div className={styles.priceLine}>{perParticipantPrice}₪ / משתתפ/ת</div>
                        <div className={styles.priceTotalLine}>{price}₪ סה"כ</div>
                      </>
                    ) : (
                      <div className={styles.priceLine}>{price}₪</div>
                    )}
                  </td>
                  <td data-label="סטטוס תשלום">
                    <span className={isUnpaid ? styles.unpaid : styles.paid}>{isUnpaid ? "לא שולם" : "שולם"}</span>
                  </td>
                  <td className={styles.actions} data-label="פעולות">
                    {isUnpaid && (
                      <>
                        <button
                          type="button"
                          className={styles.iconButton}
                          title="עריכה"
                          aria-label="עריכה"
                          onClick={() => onEdit(entry)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconButton} ${styles.payIconButton}`}
                          title="לתשלום"
                          aria-label="לתשלום"
                          onClick={() => setPayPanelId(payPanelId === entry.id ? null : entry.id)}
                        >
                          <PayIcon />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconButton} ${styles.deleteIconButton}`}
                          title="מחיקה"
                          aria-label="מחיקה"
                          disabled={deletingId === entry.id}
                          onClick={() => handleDelete(entry.id)}
                        >
                          <DeleteIcon />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
                {payPanelId === entry.id && (
                  <tr className={styles.payPanelRow}>
                    <td colSpan={COLUMN_COUNT} className={styles.payPanel}>
                      <div className={styles.breakdown}>
                        <p className={styles.breakdownTitle}>
                          פירוט התשלום — {entry.danceName} ({displayCategoryLabel(entry.category, entry.participantCount)})
                        </p>
                        <div className={styles.breakdownRow}>
                          <span>
                            מחיר בסיס{isGroup(entry.category) ? ` (${perParticipantPrice}₪ × ${entry.participantCount} משתתפים)` : ""}
                          </span>
                          <span>{baseSubtotal != null ? `${baseSubtotal}₪` : "—"}</span>
                        </div>
                        {surcharge > 0 && (
                          <div className={styles.breakdownRow}>
                            <span>תוספת חריגת זמן בשיר</span>
                            <span>{surcharge}₪</span>
                          </div>
                        )}
                        {recordingFee > 0 && (
                          <div className={styles.breakdownRow}>
                            <span>צילום וידאו/סטילס</span>
                            <span>{recordingFee}₪</span>
                          </div>
                        )}
                        <div className={`${styles.breakdownRow} ${styles.breakdownTotal}`}>
                          <span>סה"כ לתשלום</span>
                          <span>{price}₪</span>
                        </div>
                      </div>
                      <p className={styles.payInstructions}>
                        התשלום עדיין מתבצע ידנית — העברה בנקאית, המחאה, או מזומן. לתיאום התשלום, צרו קשר עם המשרד:{" "}
                        <a href={PHONE_TEL_URL}>{PHONE}</a> או ב-
                        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                          WhatsApp
                        </a>
                        .
                      </p>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className={styles.grandTotalLabel}>
              סה"כ ({filtered.length} ריקודים)
            </td>
            <td className={styles.grandTotalValue}>{grandTotal}₪</td>
            <td colSpan={2}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
