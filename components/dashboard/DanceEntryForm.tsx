import { FormEvent, useEffect, useRef, useState } from "react";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { DanceEntryInput, uploadDanceMusic } from "@/lib/queries/registrations";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { Registration } from "@/types/registration";
import { getCompetitionDayOptions } from "@/lib/getCompetitionDays";
import {
  DANCE_LEVELS,
  DANCE_STYLES,
  STEP_DIVISIONS,
  UiCategory,
  computePrice,
  computeRecordingFeeForType,
  computeSurcharge,
  computeTotalPrice,
  displayCategoryLabel,
  isEarlyPricing,
  resolveCategory,
  uiCategoryOf,
} from "@/lib/pricing";
import { MusicNoteIcon, PersonIcon, UploadIcon } from "./icons";
import styles from "./DanceEntryForm.module.css";

type Props = {
  studioManagerId: string;
  competition: CompetitionWithPricing;
  entries: Registration[];
  editingEntry: Registration | null;
  onSubmit: (entry: DanceEntryInput, existingId?: string) => Promise<void>;
  onClose: () => void;
};

const UI_CATEGORIES: { value: UiCategory; label: string }[] = [
  { value: "solo", label: "סולו" },
  { value: "duet", label: "דואט" },
  { value: "trio", label: "טריו" },
  { value: "quartet", label: "קוורטט" },
  { value: "group", label: "קבוצה" },
];

const OTHER_STYLE = "אחר";

// Only "group" needs a real headcount — the flyer's other categories are
// fixed by definition (per Dani: solo=1, duet=2, trio=3, quartet=4).
const FIXED_PARTICIPANT_COUNTS: Record<Exclude<UiCategory, "group">, number> = {
  solo: 1,
  duet: 2,
  trio: 3,
  quartet: 4,
};

export default function DanceEntryForm({
  studioManagerId,
  competition,
  entries,
  editingEntry,
  onSubmit,
  onClose,
}: Props) {
  const [danceName, setDanceName] = useState("");
  const [choreographerName, setChoreographerName] = useState("");
  const [danceLevel, setDanceLevel] = useState<"A" | "B" | "C">("A");
  const [uiCategory, setUiCategory] = useState<UiCategory>("group");
  const [participantCount, setParticipantCount] = useState("");
  const [stepDivision, setStepDivision] = useState(STEP_DIVISIONS[0]);
  const [danceStyle, setDanceStyle] = useState(DANCE_STYLES[0]);
  const [customDanceStyle, setCustomDanceStyle] = useState("");
  const [dancerName, setDancerName] = useState("");
  const [preferredDay, setPreferredDay] = useState("");
  const [wantsVideo, setWantsVideo] = useState(false);
  const [wantsStills, setWantsStills] = useState(false);
  const [songFile, setSongFile] = useState<File | null>(null);
  const [songDurationSeconds, setSongDurationSeconds] = useState<number | undefined>(undefined);
  const [existingSongFilePath, setExistingSongFilePath] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!editingEntry) return;
    setDanceName(editingEntry.danceName);
    setChoreographerName(editingEntry.choreographerName);
    setDanceLevel(editingEntry.danceLevel);
    setUiCategory(uiCategoryOf(editingEntry.category, editingEntry.participantCount));
    setParticipantCount(String(editingEntry.participantCount));
    setStepDivision(editingEntry.stepDivision);
    if (DANCE_STYLES.includes(editingEntry.danceStyle)) {
      setDanceStyle(editingEntry.danceStyle);
      setCustomDanceStyle("");
    } else {
      setDanceStyle(OTHER_STYLE);
      setCustomDanceStyle(editingEntry.danceStyle);
    }
    setDancerName(editingEntry.dancerName ?? "");
    setPreferredDay(editingEntry.preferredDay ?? "");
    setWantsVideo(editingEntry.wantsVideo);
    setWantsStills(editingEntry.wantsStills);
    setSongFile(null);
    setSongDurationSeconds(editingEntry.songDurationSeconds);
    setExistingSongFilePath(editingEntry.songFilePath);
  }, [editingEntry]);

  const count = Number(participantCount) || 0;
  const resolvedCategory = resolveCategory(uiCategory, count);
  const dayOptions = getCompetitionDayOptions(competition.date);
  const perParticipantPrice = computePrice(competition.priceTiers, resolvedCategory);
  const surcharge = computeSurcharge(resolvedCategory, songDurationSeconds, count);
  const resolvedDanceStyle = danceStyle === OTHER_STYLE ? customDanceStyle : danceStyle;
  const isSolo = uiCategory === "solo";
  const isGroup = uiCategory === "group";
  const baseSubtotal = perParticipantPrice != null ? perParticipantPrice * (isGroup ? count : 1) : null;
  const wantsRecording = wantsVideo || wantsStills;

  // Video and stills are two independent services, each 135₪ for a single
  // dance or 125₪ once 2+ of THAT SAME type are ordered — counted across the
  // manager's other existing dances plus this one, per type (see
  // project_pricing_and_rules and computeRecordingFee's own comment).
  const otherVideoOrders = entries.filter((e) => e.id !== editingEntry?.id && e.wantsVideo).length;
  const otherStillsOrders = entries.filter((e) => e.id !== editingEntry?.id && e.wantsStills).length;
  const videoFee = wantsVideo ? computeRecordingFeeForType(otherVideoOrders + 1) : 0;
  const stillsFee = wantsStills ? computeRecordingFeeForType(otherStillsOrders + 1) : 0;
  const recordingFee = videoFee + stillsFee;

  const totalPrice = computeTotalPrice(competition.priceTiers, resolvedCategory, count, songDurationSeconds, recordingFee);

  // Autocomplete suggestions drawn from this manager's OTHER dances (across
  // every competition, not just this one — the same choreographer usually
  // works across all of them) — with 15-20 dances being normal, re-typing
  // the same choreographer/dancer name that many times is real, avoidable
  // busywork. Dance name is deliberately excluded: it should always be
  // unique per dance, so suggesting a past one would actively mislead.
  const choreographerSuggestions = Array.from(new Set(entries.map((e) => e.choreographerName).filter(Boolean)));
  const dancerNameSuggestions = Array.from(new Set(entries.map((e) => e.dancerName).filter((n): n is string => !!n)));
  const customStyleSuggestions = Array.from(
    new Set(entries.map((e) => e.danceStyle).filter((style) => !DANCE_STYLES.includes(style)))
  );
  const participantCountSuggestions = Array.from(
    new Set(
      entries
        .filter((e) => e.category === "group_small" || e.category === "group_large")
        .map((e) => String(e.participantCount))
    )
  );

  function handleCategoryChange(next: UiCategory) {
    if (next !== "group") {
      setParticipantCount(String(FIXED_PARTICIPANT_COUNTS[next]));
    } else if (uiCategory !== "group") {
      setParticipantCount("");
    }
    setUiCategory(next);
  }

  // If what she typed under "אחר" turns out to exactly match a real style
  // that's already in the list, snap back to that real option instead of
  // saving a duplicate free-text copy of it — avoids the same style existing
  // as two different-looking values in the data (one picked, one typed).
  function handleCustomStyleChange(value: string) {
    const matched = DANCE_STYLES.find((style) => style === value.trim());
    if (matched) {
      setDanceStyle(matched);
      setCustomDanceStyle("");
    } else {
      setCustomDanceStyle(value);
    }
  }

  function handleSongFileChange(file: File | null) {
    setSongFile(file);
    setSongDurationSeconds(undefined);
    if (!file || !audioRef.current) return;
    const url = URL.createObjectURL(file);
    audioRef.current.src = url;
  }

  function resetForm() {
    setDanceName("");
    setChoreographerName("");
    setDanceLevel("A");
    setUiCategory("group");
    setParticipantCount("");
    setStepDivision(STEP_DIVISIONS[0]);
    setDanceStyle(DANCE_STYLES[0]);
    setCustomDanceStyle("");
    setDancerName("");
    setPreferredDay("");
    setWantsVideo(false);
    setWantsStills(false);
    setSongFile(null);
    setSongDurationSeconds(undefined);
    setExistingSongFilePath(undefined);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!danceName || !choreographerName || count < 1 || !resolvedDanceStyle) return;
    if (isSolo && !dancerName) return;
    if (dayOptions.length > 1 && !preferredDay) return;

    setSubmitting(true);
    try {
      const songFilePath = songFile
        ? await uploadDanceMusic(supabaseBrowserClient, studioManagerId, songFile)
        : existingSongFilePath;

      await onSubmit(
        {
          competitionId: competition.id,
          danceName,
          category: resolvedCategory,
          participantCount: count,
          stepDivision,
          danceStyle: resolvedDanceStyle,
          ...(isSolo ? { dancerName } : {}),
          choreographerName,
          danceLevel,
          ...(preferredDay ? { preferredDay } : {}),
          ...(songFilePath ? { songFilePath } : {}),
          ...(songDurationSeconds ? { songDurationSeconds: Math.round(songDurationSeconds) } : {}),
          wantsVideo,
          wantsStills,
        },
        editingEntry?.id
      );
      resetForm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formHeader}>
        <h3 className={styles.title}>
          {editingEntry ? "עריכת ריקוד" : "הוספת ריקוד"} — <span className="en" lang="en">{competition.name}</span>
        </h3>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="סגירה וחזרה לרשימה">
          חזרה לרשימה
        </button>
      </div>

      <p className={styles.groupTitle}>פרטי הריקוד</p>
      <div className={styles.grid}>
        {dayOptions.length > 1 && (
          <label className={styles.field}>
            <span>יום מועדף</span>
            <select required value={preferredDay} onChange={(e) => setPreferredDay(e.target.value)}>
              <option value="" disabled>
                בחרו יום
              </option>
              {dayOptions.map((day) => (
                <option key={day.date} value={day.date}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={styles.field}>
          <span>שם הריקוד</span>
          <div className={styles.fieldIconWrap}>
            <MusicNoteIcon size={15} />
            <input required value={danceName} onChange={(e) => setDanceName(e.target.value)} />
          </div>
        </label>

        <label className={styles.field}>
          <span>שם כוריאוגרף/ית</span>
          <div className={styles.fieldIconWrap}>
            <PersonIcon size={15} />
            <input
              required
              list="choreographer-suggestions"
              value={choreographerName}
              onChange={(e) => setChoreographerName(e.target.value)}
            />
          </div>
          <datalist id="choreographer-suggestions">
            {choreographerSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>

        <label className={styles.field}>
          <span>קטגוריה</span>
          <select value={uiCategory} onChange={(e) => handleCategoryChange(e.target.value as UiCategory)}>
            {UI_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        {isSolo && (
          <label className={styles.field}>
            <span>שם הרקדנית (שם מלא)</span>
            <div className={styles.fieldIconWrap}>
              <PersonIcon size={15} />
              <input
                required
                list="dancer-name-suggestions"
                value={dancerName}
                onChange={(e) => setDancerName(e.target.value)}
              />
            </div>
            <datalist id="dancer-name-suggestions">
              {dancerNameSuggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
        )}

        {isGroup && (
          <label className={styles.field}>
            <span>מספר משתתפים</span>
            <input
              type="number"
              min={5}
              required
              list="participant-count-suggestions"
              value={participantCount}
              onChange={(e) => setParticipantCount(e.target.value)}
            />
            <datalist id="participant-count-suggestions">
              {participantCountSuggestions.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </label>
        )}

        <label className={styles.field}>
          <span>רמת הרקדנים</span>
          <select value={danceLevel} onChange={(e) => setDanceLevel(e.target.value as "A" | "B" | "C")}>
            {DANCE_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>חלוקת גיל (STEP)</span>
          <select value={stepDivision} onChange={(e) => setStepDivision(e.target.value)}>
            {STEP_DIVISIONS.map((division) => (
              <option key={division} value={division}>
                {division}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>סגנון ריקוד</span>
          <select value={danceStyle} onChange={(e) => setDanceStyle(e.target.value)}>
            {DANCE_STYLES.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
            <option value={OTHER_STYLE}>{OTHER_STYLE}</option>
          </select>
        </label>

        {danceStyle === OTHER_STYLE && (
          <label className={styles.field}>
            <span>איזה סגנון?</span>
            <input
              required
              list="custom-style-suggestions"
              value={customDanceStyle}
              onChange={(e) => handleCustomStyleChange(e.target.value)}
            />
            <datalist id="custom-style-suggestions">
              {customStyleSuggestions.map((style) => (
                <option key={style} value={style} />
              ))}
            </datalist>
          </label>
        )}
      </div>

      <p className={styles.groupTitle}>מוזיקה והזמנות נלוות</p>
      <p className={styles.timeLimitHint}>
        אורך מקסימלי לשיר: <strong>{isGroup ? "3 דקות" : "2 דקות"}</strong> — חריגה גוררת תוספת תשלום (ראו פירוט למטה
        אם השיר שהועלה חורג), ואם לא שולמה מראש — הורדת ניקוד בתחרות במקום.
      </p>
      <div className={styles.mediaGrid}>
        <div className={styles.dropzoneField}>
          <span className={styles.fieldLabel}>קובץ שיר הריקוד *</span>
          <label className={styles.dropzone}>
            <input
              type="file"
              accept="audio/*"
              className={styles.dropzoneInput}
              onChange={(e) => handleSongFileChange(e.target.files?.[0] ?? null)}
            />
            <UploadIcon />
            <span className={styles.dropzoneText}>לחצו להעלאת קובץ מוזיקה</span>
            <span className={styles.dropzoneHint}>MP3/WAV עד 100MB</span>
          </label>
          {/* Hidden — used only to read the file's real duration via the browser, no server processing. */}
          <audio
            ref={audioRef}
            hidden
            onLoadedMetadata={(e) => setSongDurationSeconds(e.currentTarget.duration)}
          />
          {songFile && <span className={styles.durationHint}>{songFile.name}</span>}
          {songDurationSeconds != null && (
            <span className={styles.durationHint}>
              משך השיר: {Math.floor(songDurationSeconds / 60)}:{String(Math.round(songDurationSeconds % 60)).padStart(2, "0")}
            </span>
          )}
          {!songFile && existingSongFilePath && <span className={styles.durationHint}>קובץ קיים מועלה — ניתן להחליף</span>}
        </div>

        <div className={styles.checkboxField}>
          <label className={styles.checkboxCard}>
            <input type="checkbox" checked={wantsVideo} onChange={(e) => setWantsVideo(e.target.checked)} />
            <span>
              <span className={styles.checkboxTitle}>הזמנת צילום וידאו</span>
              <span className={styles.checkboxSubtitle}>הקלטת וידאו מקצועית של הריקוד</span>
            </span>
          </label>
          <label className={styles.checkboxCard}>
            <input type="checkbox" checked={wantsStills} onChange={(e) => setWantsStills(e.target.checked)} />
            <span>
              <span className={styles.checkboxTitle}>הזמנת צילום סטילס</span>
              <span className={styles.checkboxSubtitle}>תמונות סטילס מקצועיות מהריקוד</span>
            </span>
          </label>
          <p className={styles.durationHint}>
            כל שירות מתומחר בנפרד: <strong>135₪ לריקוד</strong> (או <strong>125₪</strong> לריקוד כשמזמינים אותו שירות
            ל-2 ריקודים או יותר) — אם מזמינים גם וידאו וגם סטילס לאותו ריקוד, זו עלות של כל אחד מהם בנפרד, לא מחיר
            אחד משותף.
            {wantsRecording && (
              <>
                {" "}
                <strong>
                  העלות עבור הריקוד הזה: {recordingFee}₪
                  {wantsVideo && wantsStills && ` (וידאו ${videoFee}₪ + סטילס ${stillsFee}₪)`}
                </strong>
              </>
            )}
          </p>
        </div>
      </div>

      {surcharge > 0 && (
        <p className={styles.surchargeNote}>
          שימו לב: משך השיר חורג ממגבלת הזמן ({isGroup ? "3" : "2"}{" "}
          דקות) — נוספה תוספת תשלום של <strong>{surcharge}₪</strong> בהתאם לתקנון (אחרת יש הורדת ניקוד במקום).
        </p>
      )}

      <div className={styles.footer}>
        <div className={styles.priceBreakdown}>
          <div className={styles.priceBreakdownRow}>
            <span>קטגוריה לתמחור</span>
            <span>{displayCategoryLabel(resolvedCategory, count)}</span>
          </div>
          {baseSubtotal != null && (
            <div className={styles.priceBreakdownRow}>
              <span>
                מחיר בסיס{isGroup ? ` (${perParticipantPrice}₪ × ${count} משתתפים)` : ""}
                {isGroup && competition.priceTiers && (
                  <span className={styles.priceExplain}>
                    {" "}
                    · {isEarlyPricing(competition.priceTiers) ? "מחיר מוקדם" : "מחיר רגיל"}
                  </span>
                )}
              </span>
              <span>{baseSubtotal}₪</span>
            </div>
          )}
          {surcharge > 0 && (
            <div className={styles.priceBreakdownRow}>
              <span>תוספת חריגת זמן בשיר</span>
              <span>{surcharge}₪</span>
            </div>
          )}
          {videoFee > 0 && (
            <div className={styles.priceBreakdownRow}>
              <span>צילום וידאו</span>
              <span>{videoFee}₪</span>
            </div>
          )}
          {stillsFee > 0 && (
            <div className={styles.priceBreakdownRow}>
              <span>צילום סטילס</span>
              <span>{stillsFee}₪</span>
            </div>
          )}
          {totalPrice != null && (
            <div className={`${styles.priceBreakdownRow} ${styles.priceBreakdownTotal}`}>
              <span>מחיר כולל</span>
              <span>{totalPrice}₪</span>
            </div>
          )}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            ביטול
          </button>
          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? "שולחת..." : editingEntry ? "שמירת שינויים" : "הוספה"}
          </button>
        </div>
      </div>
    </form>
  );
}
