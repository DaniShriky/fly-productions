import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { Registration } from "@/types/registration";
import { computePrice, computeRecordingFee, computeTotalPrice, displayCategoryLabel } from "@/lib/pricing";
import { EditIcon, DeleteIcon, PlusIcon } from "./icons";
import styles from "./CompetitionDanceList.module.css";

function shortLabel(label: string): string {
  return label.split(" (")[0];
}

type Props = {
  competition: CompetitionWithPricing;
  allEntries: Registration[];
  onAdd: () => void;
  onEdit: (entry: Registration) => void;
  onDelete: (id: string) => Promise<void>;
};

// The dance list for whichever single competition is selected in
// CompetitionPicker above it — kept deliberately lighter than the full
// DanceEntriesTable (no payment-status filter, no per-dance pay panel, no
// song playback): those belong to step 3, once a manager is done adding
// dances and ready to review everything before paying. Here, with someone
// about to add 15-20 dances one at a time, the priority is a short scan of
// "what did I already add" and a single obvious way to add the next one.
export default function CompetitionDanceList({ competition, allEntries, onAdd, onEdit, onDelete }: Props) {
  const entries = allEntries.filter((e) => e.competitionId === competition.id);

  // Same cross-competition quantity discount as DanceEntriesTable — video and
  // stills are priced independently, 135₪ for a single dance ordering that
  // type, 125₪ each once 2+ dances (anywhere, not just this competition)
  // order that same type.
  const totalVideoOrders = allEntries.filter((e) => e.wantsVideo).length;
  const totalStillsOrders = allEntries.filter((e) => e.wantsStills).length;

  async function handleDelete(id: string) {
    if (!confirm("למחוק את הריקוד הזה? הפעולה לא הפיכה.")) return;
    await onDelete(id);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.headerRow}>
        <p className={styles.count}>
          ריקודים שנוספו לתחרות זו ({entries.length})
        </p>
      </div>

      {entries.length === 0 ? (
        <p className={styles.empty}>עדיין לא נוספו ריקודים לתחרות זו.</p>
      ) : (
        <div className={styles.list}>
          {entries.map((entry) => {
            const perParticipantPrice = computePrice(competition.priceTiers, entry.category);
            const recordingFee = computeRecordingFee(entry.wantsVideo, entry.wantsStills, totalVideoOrders, totalStillsOrders);
            const price = competition.priceTiers
              ? computeTotalPrice(competition.priceTiers, entry.category, entry.participantCount, entry.songDurationSeconds, recordingFee)
              : null;
            const isUnpaid = entry.paymentStatus === "unpaid";

            return (
              <div key={entry.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <div className={styles.danceName}>{entry.danceName}</div>
                  <div className={styles.subLine}>
                    {shortLabel(displayCategoryLabel(entry.category, entry.participantCount))} · {entry.participantCount} משתתפים ·
                    רמה {entry.danceLevel} · {shortLabel(entry.stepDivision)}
                  </div>
                </div>

                <span className={`${styles.badge} ${isUnpaid ? styles.badgeUnpaid : styles.badgePaid}`}>
                  {isUnpaid ? "לא שולם" : "שולם"}
                </span>

                <span className={styles.price}>
                  {price != null ? `${price}₪` : "—"}
                  {perParticipantPrice != null && entry.participantCount > 1 && (
                    <span className={styles.subLine}> ({perParticipantPrice}₪ / משתתף)</span>
                  )}
                </span>

                {isUnpaid && (
                  <div className={styles.actions}>
                    <button type="button" className={styles.iconButton} title="עריכה" aria-label="עריכה" onClick={() => onEdit(entry)}>
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.deleteIconButton}`}
                      title="מחיקה"
                      aria-label="מחיקה"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.addButtonRow}>
        <button type="button" className={styles.addButton} onClick={onAdd}>
          <PlusIcon size={18} />
          הוספת ריקוד חדש
        </button>
      </div>
    </div>
  );
}
