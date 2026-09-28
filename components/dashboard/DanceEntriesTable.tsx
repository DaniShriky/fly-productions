import { Fragment, useState } from "react";
import Image from "next/image";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { Registration } from "@/types/registration";
import { computePrice, computeRecordingFee, computeTotalPrice, displayCategoryLabel } from "@/lib/pricing";
import { getDanceMusicUrl } from "@/lib/queries/registrations";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { PHONE, PHONE_TEL_URL, WHATSAPP_URL } from "@/lib/contact";
import { EditIcon, DeleteIcon, PayIcon } from "./icons";
import styles from "./DanceEntriesTable.module.css";

type Filter = "all" | "unpaid" | "paid";

type Props = {
  entries: Registration[];
  competitions: CompetitionWithPricing[];
  onEdit: (entry: Registration) => void;
  onDelete: (id: string) => Promise<void>;
};

const COLUMN_COUNT = 10;

function isGroup(category: Registration["category"]): boolean {
  return category === "group_small" || category === "group_large";
}

// The table is tight on space, so the parenthetical detail (age range,
// participant-count range) is dropped here — it still shows in full in the
// form's own dropdowns.
function shortLabel(label: string): string {
  return label.split(" (")[0];
}

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

function mediaOrdersLabel(entry: Registration): string | null {
  const parts = [entry.wantsVideo && "וידאו", entry.wantsStills && "סטילס"].filter(Boolean);
  return parts.length > 0 ? parts.join(" + ") : null;
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  );
}

export default function DanceEntriesTable({ entries, competitions, onEdit, onDelete }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [showGlobalPay, setShowGlobalPay] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);

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

  // Fetches a fresh signed URL each time playback starts rather than caching
  // one per entry — the bucket is private, so this only works for the
  // manager's own files (RLS), and a short-lived signed URL is simplest to
  // reason about than tracking when a cached one might expire mid-session.
  async function handleTogglePlay(entry: Registration) {
    if (playingId === entry.id) {
      setPlayingId(null);
      setAudioUrl(null);
      return;
    }
    if (!entry.songFilePath) return;

    setLoadingAudioId(entry.id);
    try {
      const url = await getDanceMusicUrl(supabaseBrowserClient, entry.songFilePath);
      setAudioUrl(url);
      setPlayingId(entry.id);
    } finally {
      setLoadingAudioId(null);
    }
  }

  if (entries.length === 0) {
    return <p className={styles.empty}>עדיין לא נוספו ריקודים.</p>;
  }

  // Video and stills are priced independently (135₪ for one dance ordering
  // that type, 125₪ each for 2+) — each quantity discount is evaluated
  // across ALL of the manager's dances that ordered THAT type, not affected
  // by which payment-status filter is currently showing.
  const totalVideoOrders = entries.filter((e) => e.wantsVideo).length;
  const totalStillsOrders = entries.filter((e) => e.wantsStills).length;
  const recordingFeeOf = (entry: Registration) =>
    computeRecordingFee(entry.wantsVideo, entry.wantsStills, totalVideoOrders, totalStillsOrders);

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

  // Independent of the all/unpaid/paid tab above — this is "what's actually
  // left to pay right now" regardless of which tab happens to be open, so the
  // bottom bar doesn't change meaning or disappear when a manager switches
  // tabs to double check something already paid.
  const unpaidEntries = entries.filter((e) => e.paymentStatus === "unpaid");
  const unpaidTotal = unpaidEntries.reduce((sum, entry) => sum + (priceOf(entry) ?? 0), 0);

  // Groups consecutive-by-first-appearance entries under their competition,
  // so a manager who registered dances for several competitions sees each
  // competition's dances clustered together with its name shown once,
  // instead of repeated on every row.
  const groups: { competition: CompetitionWithPricing | undefined; entries: Registration[] }[] = [];
  for (const entry of filtered) {
    const competition = competitions.find((c) => c.id === entry.competitionId);
    let group = groups.find((g) => g.competition?.id === entry.competitionId);
    if (!group) {
      group = { competition, entries: [] };
      groups.push(group);
    }
    group.entries.push(entry);
  }

  return (
    <div>
      <div className={styles.panel}>
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
            <th>סגנון</th>
            <th>קטגוריה</th>
            <th>חלוקת גיל</th>
            <th>מדיה</th>
            <th>הזמנת צילום</th>
            <th>מחיר</th>
            <th>סטטוס תשלום</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            return (
              <Fragment key={group.competition?.id ?? "unknown"}>
                {/* Mobile-only grouping label — the rowSpan merge below only
                    reads as "one column, shown once" in an actual table
                    layout, which the responsive card view (display:block)
                    doesn't have, so mobile gets this explicit header instead. */}
                <tr className={styles.groupHeaderRow}>
                  <td colSpan={COLUMN_COUNT} className={styles.groupHeader}>
                    <span className={styles.groupHeaderName}>
                      {group.competition?.logo && (
                        <Image
                          src={group.competition.logo}
                          alt=""
                          width={28}
                          height={24}
                          className={styles.groupHeaderLogo}
                        />
                      )}
                      <span className="en" lang="en">
                        {group.competition?.name ?? "—"}
                      </span>
                    </span>
                    <span className={styles.groupHeaderMeta}>{group.entries.length} ריקודים</span>
                  </td>
                </tr>

                {group.entries.map((entry, index) => {
                  const price = priceOf(entry);
                  const perParticipantPrice = perParticipantPriceOf(entry);
                  const isUnpaid = entry.paymentStatus === "unpaid";

                  return (
                    <Fragment key={entry.id}>
                      <tr className={index === 0 ? styles.groupStartRow : undefined}>
                        {index === 0 && (
                          <td rowSpan={group.entries.length} className={styles.competitionCell} data-label="תחרות">
                            <div className={styles.competitionCellCard}>
                              {group.competition?.logo && (
                                <Image
                                  src={group.competition.logo}
                                  alt=""
                                  width={40}
                                  height={34}
                                  className={styles.competitionCellLogo}
                                />
                              )}
                              <span className={`${styles.competitionCellName} en`} lang="en">
                                {group.competition?.name ?? "—"}
                              </span>
                            </div>
                          </td>
                        )}
                        <td data-label="ריקוד">
                          <div>{entry.danceName}</div>
                          <div className={styles.subLine}>כוריאוגרף/ית: {entry.choreographerName}</div>
                          {entry.dancerName && <div className={styles.subLine}>רקדנית: {entry.dancerName}</div>}
                          {entry.preferredDay && (
                            <div className={styles.subLine}>
                              יום:{" "}
                              {new Date(entry.preferredDay).toLocaleDateString("he-IL", {
                                weekday: "short",
                                day: "numeric",
                                month: "numeric",
                              })}
                            </div>
                          )}
                        </td>
                        <td data-label="סגנון">{entry.danceStyle}</td>
                        <td data-label="קטגוריה">
                          {shortLabel(displayCategoryLabel(entry.category, entry.participantCount))} · {entry.participantCount} ·{" "}
                          רמה {entry.danceLevel}
                        </td>
                        <td data-label="חלוקת גיל">{shortLabel(entry.stepDivision)}</td>
                        <td data-label="מדיה">
                          {entry.songFilePath ? (
                            <div className={styles.audioRow}>
                              <button
                                type="button"
                                className={styles.playButton}
                                title={playingId === entry.id ? "עצירה" : "השמעת השיר"}
                                aria-label={playingId === entry.id ? "עצירה" : "השמעת השיר"}
                                disabled={loadingAudioId === entry.id}
                                onClick={() => handleTogglePlay(entry)}
                              >
                                {playingId === entry.id ? <StopIcon /> : <PlayIcon />}
                              </button>
                              {entry.songDurationSeconds != null && (
                                <span className={styles.priceLine}>{formatDuration(entry.songDurationSeconds)}</span>
                              )}
                            </div>
                          ) : (
                            <div className={styles.noSong}>לא הועלה שיר</div>
                          )}
                          {playingId === entry.id && audioUrl && (
                            <audio
                              className={styles.audioPlayer}
                              src={audioUrl}
                              controls
                              autoPlay
                              onEnded={() => {
                                setPlayingId(null);
                                setAudioUrl(null);
                              }}
                            />
                          )}
                        </td>
                        <td data-label="הזמנת צילום">
                          {mediaOrdersLabel(entry) ? (
                            <>
                              <span className={styles.orderedBadge}>הוזמן</span>
                              <div className={styles.subLine}>{mediaOrdersLabel(entry)}</div>
                            </>
                          ) : (
                            <div className={styles.noSong}>לא הוזמן</div>
                          )}
                        </td>
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
                          <span className={`${styles.statusBadge} ${isUnpaid ? styles.unpaid : styles.paid}`}>
                            {isUnpaid ? "לא שולם" : "שולם"}
                          </span>
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
                    </Fragment>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={7} className={styles.grandTotalLabel}>
              סה"כ ({filtered.length} ריקודים)
            </td>
            <td className={styles.grandTotalValue}>{grandTotal}₪</td>
            <td colSpan={2}></td>
          </tr>
        </tfoot>
      </table>
      </div>

      {unpaidEntries.length > 0 && (
        <div className={styles.stickyBar}>
          <div className={styles.stickyBarBar}>
            <p className={styles.stickyBarInfo}>
              סה&quot;כ לתשלום: <span className={styles.grandTotalValue}>{unpaidTotal}₪</span> ({unpaidEntries.length} ריקודים לא
              משולמים)
            </p>
            <button type="button" className={styles.stickyBarButton} onClick={() => setShowGlobalPay((v) => !v)}>
              <PayIcon size={15} />
              {showGlobalPay ? "סגירת פרטי תשלום" : "פרטי תשלום ליצירת קשר"}
            </button>
          </div>

          {showGlobalPay && (
            <div className={styles.globalPayPanel}>
              <p className={styles.breakdownTitle}>כל הריקודים הלא משולמים</p>
              <div className={styles.globalBreakdown}>
                {unpaidEntries.map((entry) => {
                  const competition = competitions.find((c) => c.id === entry.competitionId);
                  return (
                    <div key={entry.id} className={styles.breakdownRow}>
                      <span>
                        {entry.danceName}{" "}
                        <span className={styles.subLine}>
                          (<span className="en" lang="en">{competition?.name ?? "—"}</span>)
                        </span>
                      </span>
                      <span>{priceOf(entry)}₪</span>
                    </div>
                  );
                })}
                <div className={`${styles.breakdownRow} ${styles.breakdownTotal}`}>
                  <span>סה&quot;כ לתשלום</span>
                  <span>{unpaidTotal}₪</span>
                </div>
              </div>
              <p className={styles.payInstructions}>
                התשלום עדיין מתבצע ידנית — העברה בנקאית, המחאה, או מזומן. לתיאום תשלום עבור כל הריקודים יחד, צרו קשר עם
                המשרד: <a href={PHONE_TEL_URL}>{PHONE}</a> או ב-
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
                .
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
