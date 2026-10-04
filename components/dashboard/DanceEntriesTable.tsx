import { Fragment, useState } from "react";
import Image from "next/image";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { Registration } from "@/types/registration";
import {
  computePrice,
  computeRecordingFee,
  computeRecordingFeeForType,
  computeSurcharge,
  computeTotalPrice,
  displayCategoryLabel,
} from "@/lib/pricing";
import { getDanceMusicUrl } from "@/lib/queries/registrations";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { PHONE, PHONE_TEL_URL, WHATSAPP_URL } from "@/lib/contact";
import { EditIcon, DeleteIcon } from "./icons";
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  // Both handlers below used to have try/finally with no catch — a failed
  // delete or a failed signed-URL fetch (network, RLS, a since-deleted file)
  // threw silently with nothing shown, the loading state just reverting to
  // normal as if nothing had happened. Same bug class as the profile-save
  // fix; see project_dance_form_silent_failures memory.
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = entries.filter((e) => filter === "all" || e.paymentStatus === filter);

  async function handleDelete(id: string) {
    if (!confirm("למחוק את הריקוד הזה? הפעולה לא הפיכה.")) return;
    setDeletingId(id);
    setActionError(null);
    try {
      await onDelete(id);
    } catch (err) {
      console.error("Dance delete failed:", err);
      setActionError("המחיקה נכשלה - נסו שוב, ואם זה ממשיך לקרות צרו איתנו קשר.");
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
    setActionError(null);
    try {
      const url = await getDanceMusicUrl(supabaseBrowserClient, entry.songFilePath);
      setAudioUrl(url);
      setPlayingId(entry.id);
    } catch (err) {
      console.error("Song playback failed:", err);
      setActionError("לא הצלחנו לטעון את השיר - נסו שוב.");
    } finally {
      setLoadingAudioId(null);
    }
  }

  if (entries.length === 0) {
    return <p className={styles.empty}>עדיין לא נוספו ריקודים.</p>;
  }

  const recordingFeeOf = (entry: Registration) => computeRecordingFee(entry.wantsVideo, entry.wantsStills);

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

  // Independent of the all/unpaid/paid tab above — the missing-song warning
  // below is always about what's actually left to pay, regardless of which
  // tab happens to be open.
  const unpaidEntries = entries.filter((e) => e.paymentStatus === "unpaid");

  // Every other field is required at submission time (see DanceEntryForm) —
  // the song file is the one thing a manager can genuinely leave for later,
  // so it's the one thing worth flagging as "still missing" here.
  const incompleteUnpaid = unpaidEntries.filter((e) => !e.songFilePath);

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
        {actionError && <div className={styles.missingWarning}>{actionError}</div>}

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
            <th>מוזיקה והזמנות</th>
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
                  // A submitted dance is locked the same way a paid one
                  // already is — see supabase/schema.sql's updated RLS
                  // (submitted_at is null required to update/delete).
                  const isEditable = isUnpaid && !entry.submittedAt;

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
                          <div className={styles.danceName}>{entry.danceName}</div>
                          <div className={styles.subLine}>כוריאוגרף/ית: {entry.choreographerName}</div>
                          {entry.dancerName && <div className={styles.subLine}>רקדנית: {entry.dancerName}</div>}
                          {entry.preferredDays && entry.preferredDays.length > 0 && (
                            <div className={styles.subLine}>
                              {/* First entry = preferred day, second (if any) = the backup day picked
                                  in case the preferred one is full — distinct meanings, so labeled
                                  separately rather than listed as an undifferentiated set. */}
                              יום מועדף:{" "}
                              {new Date(entry.preferredDays[0]).toLocaleDateString("he-IL", {
                                weekday: "short",
                                day: "numeric",
                                month: "numeric",
                              })}
                              {entry.preferredDays[1] && (
                                <>
                                  {" "}
                                  · יום חלופי:{" "}
                                  {new Date(entry.preferredDays[1]).toLocaleDateString("he-IL", {
                                    weekday: "short",
                                    day: "numeric",
                                    month: "numeric",
                                  })}
                                </>
                              )}
                            </div>
                          )}
                          <div className={styles.tagRow}>
                            <span className={styles.tag}>{entry.danceStyle}</span>
                            <span className={styles.tag}>{shortLabel(entry.stepDivision)}</span>
                          </div>
                        </td>
                        <td data-label="קטגוריה">
                          {shortLabel(displayCategoryLabel(entry.category, entry.participantCount))} · {entry.participantCount} ·{" "}
                          רמה {entry.danceLevel}
                        </td>
                        <td data-label="מוזיקה והזמנות">
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
                            <div className={styles.missingBadge}>⚠ חסר שיר</div>
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
                          {mediaOrdersLabel(entry) && (
                            <div className={styles.mediaOrderRow}>
                              <span className={styles.orderedBadge}>הוזמן</span>
                              <span className={styles.subLine}>{mediaOrdersLabel(entry)}</span>
                            </div>
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
                          {isEditable ? (
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
                          ) : (
                            // Explains the missing buttons specifically for the new
                            // locked-by-submission case — the existing paid-and-locked
                            // case already reads clearly enough from the "שולם" badge
                            // alone, so this only shows when submission is the reason.
                            entry.submittedAt && <span className={styles.tag}>הוגש</span>
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
            {/* Replaces the old one-line "סה"כ" total — per Dani, 2026-10-03,
                the itemized breakdown (previously only visible behind the
                now-removed "פרטי תשלום ליצירת קשר" button/bottom banner)
                lives directly in the table's own footer now, always
                visible, for whichever entries the current filter tab shows. */}
            <td colSpan={COLUMN_COUNT} className={styles.breakdownFooterCell}>
              {incompleteUnpaid.length > 0 && (
                <div className={styles.missingWarning}>
                  <strong>
                    ⚠ {incompleteUnpaid.length} {incompleteUnpaid.length === 1 ? "ריקוד" : "ריקודים"} עדיין חסר
                    {incompleteUnpaid.length === 1 ? " לו" : " להם"} שיר
                  </strong>{" "}
                  — יש להשלים לפני התשלום: {incompleteUnpaid.map((e) => e.danceName).join(", ")}.
                </div>
              )}

              <p className={styles.breakdownTitle}>פירוט התשלום</p>
              {/* A full itemized breakdown per dance — not just one total —
                  so it reads like a real receipt: what each charge actually
                  is, not just the final number. */}
              <div className={styles.globalBreakdown}>
                {filtered.map((entry) => {
                  const competition = competitions.find((c) => c.id === entry.competitionId);
                  const perParticipantPrice = perParticipantPriceOf(entry);
                  const groupDance = isGroup(entry.category);
                  const base = perParticipantPrice != null ? perParticipantPrice * (groupDance ? entry.participantCount : 1) : null;
                  const surcharge = computeSurcharge(entry.category, entry.songDurationSeconds, entry.participantCount);
                  const videoFee = entry.wantsVideo ? computeRecordingFeeForType() : 0;
                  const stillsFee = entry.wantsStills ? computeRecordingFeeForType() : 0;
                  const total = priceOf(entry);

                  return (
                    <div key={entry.id} className={styles.breakdownGroup}>
                      <div className={styles.breakdownDanceHeader}>
                        <span>{entry.danceName}</span>
                        <span className={styles.subLine}>
                          (<span className="en" lang="en">{competition?.name ?? "—"}</span>)
                        </span>
                      </div>

                      {base != null && (
                        <div className={styles.breakdownLineRow}>
                          <span>
                            {displayCategoryLabel(entry.category, entry.participantCount)}
                            {groupDance && ` · ${perParticipantPrice}₪ × ${entry.participantCount}`}
                          </span>
                          <span>{base}₪</span>
                        </div>
                      )}
                      {surcharge > 0 && (
                        <div className={styles.breakdownLineRow}>
                          <span>תוספת חריגת זמן בשיר</span>
                          <span>{surcharge}₪</span>
                        </div>
                      )}
                      {videoFee > 0 && (
                        <div className={styles.breakdownLineRow}>
                          <span>צילום וידאו</span>
                          <span>{videoFee}₪</span>
                        </div>
                      )}
                      {stillsFee > 0 && (
                        <div className={styles.breakdownLineRow}>
                          <span>צילום סטילס</span>
                          <span>{stillsFee}₪</span>
                        </div>
                      )}

                      <div className={styles.breakdownSubtotal}>
                        <span>סה&quot;כ לריקוד</span>
                        <span>{total}₪</span>
                      </div>
                    </div>
                  );
                })}
                <div className={`${styles.breakdownRow} ${styles.breakdownTotal}`}>
                  <span>סה&quot;כ ({filtered.length} ריקודים)</span>
                  <span>{grandTotal}₪</span>
                </div>
              </div>
              <p className={styles.payInstructions}>
                התשלום מתבצע ידנית - העברה בנקאית, המחאה, או מזומן. לתיאום תשלום עבור כל הריקודים יחד, צרו קשר עם
                המשרד: <a href={PHONE_TEL_URL}>{PHONE}</a> או ב-
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
                .
              </p>
            </td>
          </tr>
        </tfoot>
      </table>
      </div>
    </div>
  );
}
