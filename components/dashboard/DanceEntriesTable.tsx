import { CSSProperties, Fragment, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { hexToRgbParts } from "@/lib/hexToRgbParts";
import { errorDetail } from "@/lib/errorDetail";
import { Registration } from "@/types/registration";
import {
  computePrice,
  computeRecordingFee,
  computeRecordingFeeForType,
  computeSurcharge,
  computeTotalPrice,
  displayCategoryLabel,
  formatPrice,
} from "@/lib/pricing";
import { getDanceMusicUrl } from "@/lib/queries/registrations";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { EditIcon, DeleteIcon, CheckIcon, VideoCameraIcon, UploadIcon, CloseIcon } from "./icons";
import styles from "./DanceEntriesTable.module.css";

type Filter = "all" | "unpaid" | "paid";

type Props = {
  entries: Registration[];
  competitions: CompetitionWithPricing[];
  // Optional — only actually reachable when showSubmissionColumn is true,
  // since that column is what renders the edit/delete buttons. The
  // read-only היסטוריית הזמנות page (2026-10-07) passes neither.
  onEdit?: (entry: Registration) => void;
  onDelete?: (id: string) => Promise<void>;
  // Per Dani, 2026-10-06: music can still be added up to 10 days before the
  // event even once a dance is locked by submission — unlike onEdit/onDelete,
  // this works regardless of isEditable. Always required: both the
  // in-process view and היסטוריית הזמנות let you fill in a still-missing
  // song.
  onSongUpload: (id: string, file: File, durationSeconds: number) => Promise<void>;
  // Per Dani, 2026-10-07: the live registration flow's own summary table
  // (pages/dashboard/index.tsx step 2) only ever shows this round's
  // still-unsubmitted dances — "סטטוס הגשה" would be the same for every
  // row, so it's dropped there too; see showSubmissionColumn below instead.
  // Both default true (the existing single call site's behavior,
  // unchanged) — only the new history page passes false for the first one,
  // and only the in-process table passes false for the second.
  showSubmissionColumn?: boolean;
  showPaymentColumn?: boolean;
};

// Corrected 2026-10-06 (Dani): every non-solo category is priced per
// participant, not just the true "group" judging categories — a duet's
// 325₪/dancer is 650₪ total for the two of them, a trio/quartet's 275₪/
// dancer varies by headcount, same as groups already did. Solo is the only
// flat one (and its participantCount is always 1 anyway). See
// computeTotalPrice's comment in lib/pricing.ts for the actual calculation.
function isPricedPerParticipant(category: Registration["category"]): boolean {
  return category !== "solo";
}

// The table is tight on space, so the parenthetical detail (age range,
// participant-count range) is dropped here — it still shows in full in the
// form's own dropdowns.
function shortLabel(label: string): string {
  return label.split(" (")[0];
}

// Storage paths are "{studioManagerId}/{uuid}-{originalFileName}" (see
// uploadDanceMusic) — strips the folder and uuid prefix to recover the
// name the manager actually uploaded, shown per Dani, 2026-10-06, so it's
// obvious a song was in fact saved, not just that *a* file exists.
function songFileName(path: string): string {
  const afterSlash = path.split("/").pop() ?? path;
  return afterSlash.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
}

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

function mediaOrdersLabel(entry: Registration): string | null {
  const parts = [entry.wantsVideo && "וידאו", entry.wantsStills && "סטילס"].filter(Boolean);
  return parts.length > 0 ? parts.join(" + ") : null;
}

// Per Dani, 2026-10-06: every competition's group of rows gets its own
// accent color (same one used in RegistrationCutoffEditor/the dance-entry
// form's glow) so the groups are easy to tell apart at a glance, not just by
// reading the "תחרות" column. Same rgba-from-hex-parts technique throughout
// this codebase, since CSS color-mix() isn't supported everywhere.
function rowStyle(competition: CompetitionWithPricing | undefined): CSSProperties | undefined {
  const rgb = competition?.accentColor ? hexToRgbParts(competition.accentColor) : null;
  if (!rgb) return undefined;
  return {
    // Physical borderRight, not a logical borderInlineStart — this RTL
    // layout has a documented bug with logical inline properties
    // misbehaving (see CLAUDE.md).
    borderRight: `3px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`,
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`,
  };
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

export default function DanceEntriesTable({
  entries,
  competitions,
  onEdit,
  onDelete,
  onSongUpload,
  showSubmissionColumn = true,
  showPaymentColumn = true,
}: Props) {
  const columnCount = 6 + (showPaymentColumn ? 1 : 0) + (showSubmissionColumn ? 1 : 0);
  const [filter, setFilter] = useState<Filter>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  // Drives the custom seek bar below — per Dani, 2026-10-07: the native
  // <audio controls> widget used to replace the filename with its own
  // compact bar once playing. currentTime comes from the <audio>'s own
  // onTimeUpdate; fallbackDuration only matters for the rare case
  // entry.songDurationSeconds wasn't captured at upload time (duration
  // probe failed) — the real <audio> element's own metadata fills that in
  // once it loads.
  const [currentTime, setCurrentTime] = useState(0);
  const [fallbackDuration, setFallbackDuration] = useState<number | null>(null);
  const audioElRef = useRef<HTMLAudioElement>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [uploadingSongId, setUploadingSongId] = useState<string | null>(null);
  // Reads the picked file's duration via a hidden <audio> element before
  // uploading — same technique DanceEntryForm uses. One shared ref is
  // enough since only one song can realistically be uploaded at a time.
  const durationProbeRef = useRef<HTMLAudioElement>(null);
  // Both handlers below used to have try/finally with no catch — a failed
  // delete or a failed signed-URL fetch (network, RLS, a since-deleted file)
  // threw silently with nothing shown, the loading state just reverting to
  // normal as if nothing had happened. Same bug class as the profile-save
  // fix; see project_dance_form_silent_failures memory.
  const [actionError, setActionError] = useState<string | null>(null);

  // Per Dani, 2026-10-06: this used to sit inline at the top of the table,
  // easy to miss once there are enough rows to scroll past it — now a fixed
  // toast (same visual pattern as LiveNotifications' own toasts) that's
  // visible regardless of scroll position, with both a close button and an
  // auto-dismiss.
  useEffect(() => {
    if (!actionError) return;
    const timer = setTimeout(() => setActionError(null), 8000);
    return () => clearTimeout(timer);
  }, [actionError]);

  const filtered = entries.filter((e) => filter === "all" || e.paymentStatus === filter);

  async function handleDelete(id: string) {
    if (!onDelete) return;
    if (!confirm("למחוק את הריקוד הזה? הפעולה לא הפיכה.")) return;
    setDeletingId(id);
    setActionError(null);
    try {
      await onDelete(id);
    } catch (err) {
      console.error("Dance delete failed:", err);
      const detail = errorDetail(err);
      setActionError(`המחיקה נכשלה - נסו שוב, ואם זה ממשיך לקרות צרו איתנו קשר.${detail ? ` (${detail})` : ""}`);
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
    setCurrentTime(0);
    setFallbackDuration(null);
    try {
      const url = await getDanceMusicUrl(supabaseBrowserClient, entry.songFilePath);
      setAudioUrl(url);
      setPlayingId(entry.id);
    } catch (err) {
      console.error("Song playback failed:", err);
      const detail = errorDetail(err);
      setActionError(`לא הצלחנו לטעון את השיר - נסו שוב.${detail ? ` (${detail})` : ""}`);
    } finally {
      setLoadingAudioId(null);
    }
  }

  // Reads the file's real duration client-side (no server-side audio
  // processing — same technique as DanceEntryForm) before handing off to
  // onSongUpload, which does the actual storage upload + save. Previously
  // this silently did nothing if the duration probe wasn't ready yet, and
  // had no timeout — a file whose metadata never loaded (corrupt file,
  // unsupported codec) would hang forever with no error and no upload,
  // which is exactly what Dani reported, 2026-10-06. Now: the probe-missing
  // case shows an error instead of returning silently, and a 10s timeout
  // means an unreadable file still gets uploaded (just without a known
  // duration) rather than blocking indefinitely.
  async function handleSongFilePicked(entry: Registration, file: File) {
    const probe = durationProbeRef.current;
    if (!probe) {
      setActionError("העלאת השיר נכשלה - נסו שוב, ואם זה ממשיך לקרות רעננו את הדף.");
      return;
    }

    setUploadingSongId(entry.id);
    setActionError(null);
    try {
      const durationSeconds = await new Promise<number | undefined>((resolve) => {
        const timeout = setTimeout(() => resolve(undefined), 10000);
        const url = URL.createObjectURL(file);
        probe.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve(probe.duration);
        };
        probe.onerror = () => {
          clearTimeout(timeout);
          resolve(undefined);
        };
        probe.src = url;
      });
      await onSongUpload(entry.id, file, durationSeconds ?? 0);
    } catch (err) {
      console.error("Song upload failed:", err);
      const detail = errorDetail(err);
      setActionError(`העלאת השיר נכשלה - נסו שוב.${detail ? ` (${detail})` : ""}`);
    } finally {
      setUploadingSongId(null);
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
        {/* Hidden — used only to read a newly-picked song file's real
            duration via the browser, same technique as DanceEntryForm. */}
        <audio ref={durationProbeRef} hidden />

        <div className={styles.headerRow}>
          <h2 className={styles.panelTitle}>
            רשימת הריקודים <span className={styles.panelTitleCount}>({filtered.length})</span>
          </h2>

          {/* Filters by payment status — meaningless once that column
              itself is hidden (the in-process summary table only ever
              shows still-unpaid draft entries anyway, see
              showPaymentColumn), so hidden along with it rather than left
              showing a "שולם" tab that could never match anything. */}
          {showPaymentColumn && (
            <div className={styles.filters}>
              {(["all", "unpaid", "paid"] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`${styles.filterButton} ${filter === f ? styles.filterActive : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "הכל" : f === "unpaid" ? "טרם שולם" : "שולם"}
                </button>
              ))}
            </div>
          )}
        </div>

        <table className={styles.table}>
        <thead>
          <tr>
            <th>תחרות</th>
            <th>ריקוד</th>
            <th>קטגוריה</th>
            <th>קובץ מוזיקה</th>
            <th>הזמנות וידאו וסטילס</th>
            <th>מחיר</th>
            {showPaymentColumn && <th>סטטוס תשלום</th>}
            {showSubmissionColumn && <th>סטטוס הגשה</th>}
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
                <tr className={styles.groupHeaderRow} style={rowStyle(group.competition)}>
                  <td colSpan={columnCount} className={styles.groupHeader}>
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
                      <tr
                        className={index === 0 ? styles.groupStartRow : undefined}
                        style={rowStyle(group.competition)}
                      >
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
                        <td data-label="ריקוד" className={styles.stackedCell}>
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
                        <td data-label="קובץ מוזיקה">
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
                              <span className={styles.songFileInfo}>
                                {/* Per Dani, 2026-10-06: makes it obvious a
                                    song was actually saved, not just that
                                    *a* file exists. */}
                                <span className={styles.songFileName}>{songFileName(entry.songFilePath)}</span>
                                {playingId === entry.id ? (
                                  // Per Dani, 2026-10-07: a real seekable
                                  // scrubber instead of the native <audio
                                  // controls> widget (below), which used to
                                  // replace this whole area with its own
                                  // bar once playing.
                                  <span className={styles.seekRow}>
                                    <input
                                      type="range"
                                      className={styles.seekBar}
                                      min={0}
                                      max={entry.songDurationSeconds ?? fallbackDuration ?? 0}
                                      step={0.1}
                                      value={currentTime}
                                      onChange={(e) => {
                                        const value = Number(e.target.value);
                                        setCurrentTime(value);
                                        if (audioElRef.current) audioElRef.current.currentTime = value;
                                      }}
                                      aria-label="מיקום בשיר"
                                    />
                                    <span className={styles.seekTime}>
                                      {formatDuration(currentTime)} /{" "}
                                      {formatDuration(entry.songDurationSeconds ?? fallbackDuration ?? 0)}
                                    </span>
                                  </span>
                                ) : (
                                  entry.songDurationSeconds != null && (
                                    <span className={styles.priceLine}>{formatDuration(entry.songDurationSeconds)}</span>
                                  )
                                )}
                              </span>
                            </div>
                          ) : (
                            <div className={styles.missingSongCell}>
                              <div className={styles.missingBadge}>⚠ חסר קובץ</div>
                              {/* Works regardless of isEditable — per Dani,
                                  2026-10-06, music can still be added up to
                                  10 days before the event even once the
                                  dance itself is locked by submission. Only
                                  gated on payment, matching
                                  manager_upload_song's own RLS condition. */}
                              {entry.paymentStatus === "unpaid" && (
                                <label className={styles.uploadSongLabel}>
                                  {uploadingSongId === entry.id ? (
                                    "מעלה..."
                                  ) : (
                                    <>
                                      <UploadIcon size={13} /> הוספת שיר
                                    </>
                                  )}
                                  <input
                                    type="file"
                                    accept="audio/*"
                                    hidden
                                    disabled={uploadingSongId === entry.id}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      e.target.value = "";
                                      if (file) handleSongFilePicked(entry, file);
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          )}
                          {playingId === entry.id && audioUrl && (
                            // No `controls` — the seek bar above is the real
                            // UI; this just drives actual playback.
                            <audio
                              ref={audioElRef}
                              src={audioUrl}
                              autoPlay
                              hidden
                              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                              onLoadedMetadata={(e) => setFallbackDuration(e.currentTarget.duration)}
                              onEnded={() => {
                                setPlayingId(null);
                                setAudioUrl(null);
                              }}
                            />
                          )}
                        </td>
                        <td data-label="הזמנות וידאו וסטילס">
                          {mediaOrdersLabel(entry) ? (
                            <div className={styles.mediaOrderRow}>
                              <span className={styles.orderedBadge}>
                                <VideoCameraIcon size={13} />
                                הוזמן
                              </span>
                              <span className={styles.subLine}>{mediaOrdersLabel(entry)}</span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td data-label="מחיר" className={styles.stackedCell}>
                          {price == null ? (
                            "—"
                          ) : isPricedPerParticipant(entry.category) ? (
                            <>
                              <div className={styles.priceLine}>{formatPrice(perParticipantPrice!)}₪ / משתתפ/ת</div>
                              <div className={styles.priceTotalLine}>{formatPrice(price)}₪ סה"כ</div>
                            </>
                          ) : (
                            <div className={styles.priceLine}>{formatPrice(price)}₪</div>
                          )}
                          {/* The total above already includes the recording
                              fee (computeTotalPrice adds it in) — per Dani,
                              2026-10-06, this makes that visible instead of
                              leaving the jump from base×count to the total
                              unexplained. */}
                          {recordingFeeOf(entry) > 0 && (
                            <div className={styles.subLine}>
                              (כולל {formatPrice(recordingFeeOf(entry))}₪{" "}
                              {entry.wantsVideo && entry.wantsStills ? "וידאו + סטילס" : entry.wantsVideo ? "וידאו" : "סטילס"})
                            </div>
                          )}
                        </td>
                        {showPaymentColumn && (
                          <td data-label="סטטוס תשלום">
                            <span className={`${styles.statusBadge} ${isUnpaid ? styles.unpaid : styles.paid}`}>
                              {isUnpaid ? "טרם שולם" : "שולם"}
                            </span>
                          </td>
                        )}
                        {showSubmissionColumn && (
                        <td data-label="סטטוס הגשה" className={styles.actionsCell}>
                          <span className={styles.actions}>
                            {isEditable ? (
                              <>
                                <button
                                  type="button"
                                  className={styles.iconButton}
                                  title="עריכה"
                                  aria-label="עריכה"
                                  onClick={() => onEdit?.(entry)}
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
                              // A dance can be "not editable" either because it's
                              // locked by submission or because it's already paid
                              // — in this product paid always implies submitted
                              // first, so submittedAt covers both cases.
                              entry.submittedAt && (
                                <span className={styles.submittedBadge}>
                                  <CheckIcon size={11} />
                                  הוגש
                                </span>
                              )
                            )}
                          </span>
                        </td>
                        )}
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
            <td colSpan={columnCount} className={styles.breakdownFooterCell}>
              {incompleteUnpaid.length > 0 && (
                <div className={styles.missingWarning}>
                  <strong>
                    ⚠ {incompleteUnpaid.length} {incompleteUnpaid.length === 1 ? "ריקוד" : "ריקודים"} עדיין חסר
                    {incompleteUnpaid.length === 1 ? " לו" : " להם"} שיר
                  </strong>{" "}
                  — יש להשלים לפני התשלום: {incompleteUnpaid.map((e) => e.danceName).join(", ")}.
                </div>
              )}

              {/* The old itemized per-dance breakdown lived here — removed
                  per Dani, 2026-10-06, since the מחיר column itself already
                  shows each dance's per-participant price and total, making
                  this a duplicate. Keeping just the one combined total
                  line, since that's the one number genuinely not shown
                  anywhere else in the table. */}
              <div className={`${styles.breakdownRow} ${styles.breakdownTotal}`}>
                <span>סה&quot;כ ({filtered.length} ריקודים)</span>
                <span>{formatPrice(grandTotal)}₪</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
      </div>

      {actionError && (
        <div className={styles.errorToast} role="alert">
          <span className={styles.errorToastMessage}>{actionError}</span>
          <button
            type="button"
            className={styles.errorToastClose}
            onClick={() => setActionError(null)}
            aria-label="סגירה"
          >
            <CloseIcon size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
