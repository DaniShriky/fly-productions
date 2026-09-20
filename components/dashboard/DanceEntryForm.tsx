import Image from "next/image";
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
  computeRecordingFeePerDance,
  computeSurcharge,
  computeTotalPrice,
  displayCategoryLabel,
  isEarlyPricing,
  resolveCategory,
  uiCategoryOf,
} from "@/lib/pricing";
import RegistrationNotice from "./RegistrationNotice";
import styles from "./DanceEntryForm.module.css";

type Props = {
  studioManagerId: string;
  competitions: CompetitionWithPricing[];
  entries: Registration[];
  editingEntry: Registration | null;
  onSubmit: (entry: DanceEntryInput, existingId?: string) => Promise<void>;
  onCancelEdit: () => void;
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
  competitions,
  entries,
  editingEntry,
  onSubmit,
  onCancelEdit,
}: Props) {
  const [competitionId, setCompetitionId] = useState(competitions[0]?.id ?? "");
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
    setCompetitionId(editingEntry.competitionId);
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
  const competition = competitions.find((c) => c.id === competitionId);
  const dayOptions = competition ? getCompetitionDayOptions(competition.date) : [];
  const perParticipantPrice = competition ? computePrice(competition.priceTiers, resolvedCategory) : null;
  const surcharge = computeSurcharge(resolvedCategory, songDurationSeconds, count);
  const resolvedDanceStyle = danceStyle === OTHER_STYLE ? customDanceStyle : danceStyle;
  const isSolo = uiCategory === "solo";
  const isGroup = uiCategory === "group";
  const wantsRecording = wantsVideo || wantsStills;

  // 135₪ for a single dance ordering video/stills, 125₪ each once 2+ dances
  // order it — counted across the manager's other existing dances plus this
  // one, if it currently wants recording (see project_pricing_and_rules).
  const otherRecordingOrders = entries.filter(
    (e) => e.id !== editingEntry?.id && (e.wantsVideo || e.wantsStills)
  ).length;
  const recordingFee = wantsRecording ? computeRecordingFeePerDance(otherRecordingOrders + 1) : 0;

  const totalPrice = competition
    ? computeTotalPrice(competition.priceTiers, resolvedCategory, count, songDurationSeconds, recordingFee)
    : null;

  function handleCategoryChange(next: UiCategory) {
    if (next !== "group") {
      setParticipantCount(String(FIXED_PARTICIPANT_COUNTS[next]));
    } else if (uiCategory !== "group") {
      setParticipantCount("");
    }
    setUiCategory(next);
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
          competitionId,
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
      onCancelEdit();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3 className={styles.title}>{editingEntry ? "עריכת ריקוד" : "הוספת ריקוד"}</h3>

      <RegistrationNotice competition={competition} />

      <p className={styles.groupTitle}>פרטי הריקוד</p>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span>תחרות</span>
          <div className={styles.competitionRow}>
            {competition?.logo && (
              <Image src={competition.logo} alt="" width={32} height={28} className={styles.competitionLogo} />
            )}
            <select value={competitionId} onChange={(e) => setCompetitionId(e.target.value)}>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </label>

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
          <input required value={danceName} onChange={(e) => setDanceName(e.target.value)} />
        </label>

        <label className={styles.field}>
          <span>שם כוריאוגרף/ית</span>
          <input required value={choreographerName} onChange={(e) => setChoreographerName(e.target.value)} />
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
            <input required value={dancerName} onChange={(e) => setDancerName(e.target.value)} />
          </label>
        )}

        {isGroup && (
          <label className={styles.field}>
            <span>מספר משתתפים</span>
            <input
              type="number"
              min={5}
              required
              value={participantCount}
              onChange={(e) => setParticipantCount(e.target.value)}
            />
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
            <input required value={customDanceStyle} onChange={(e) => setCustomDanceStyle(e.target.value)} />
          </label>
        )}
      </div>

      <p className={styles.groupTitle}>מוזיקה והזמנות נלוות</p>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span>קובץ שיר הריקוד</span>
          <input type="file" accept="audio/*" onChange={(e) => handleSongFileChange(e.target.files?.[0] ?? null)} />
          {/* Hidden — used only to read the file's real duration via the browser, no server processing. */}
          <audio
            ref={audioRef}
            hidden
            onLoadedMetadata={(e) => setSongDurationSeconds(e.currentTarget.duration)}
          />
          {songDurationSeconds != null && (
            <span className={styles.durationHint}>
              משך השיר: {Math.floor(songDurationSeconds / 60)}:{String(Math.round(songDurationSeconds % 60)).padStart(2, "0")}
            </span>
          )}
          {!songFile && existingSongFilePath && <span className={styles.durationHint}>קובץ קיים מועלה — ניתן להחליף</span>}
        </label>

        <div className={styles.checkboxField}>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={wantsVideo} onChange={(e) => setWantsVideo(e.target.checked)} />
            הזמנת צילום וידאו
          </label>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={wantsStills} onChange={(e) => setWantsStills(e.target.checked)} />
            הזמנת צילום סטילס
          </label>
          <p className={styles.durationHint}>
            135₪ לריקוד, או 125₪ לריקוד כשמזמינים 2 ריקודים או יותר (וידאו ו/או סטילס יחד, לא כל אחד בנפרד)
            {wantsRecording && (
              <>
                {" "}
                — <strong>העלות עבור הריקוד הזה: {recordingFee}₪</strong>
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
        <p className={styles.priceLine}>
          קטגוריה לתמחור: {displayCategoryLabel(resolvedCategory, count)}
          {perParticipantPrice != null && (
            <>
              {" "}
              · מחיר למשתתף/ת: <span className={styles.price}>{perParticipantPrice}₪</span>
              {isGroup && competition?.priceTiers && (
                <span className={styles.priceExplain}>
                  {" "}
                  ({isEarlyPricing(competition.priceTiers) ? "מחיר מוקדם" : "מחיר רגיל"}, ההרשמה המוקדמת{" "}
                  {isEarlyPricing(competition.priceTiers) ? "בתוקף עד" : "הסתיימה ב"}{" "}
                  <span dir="ltr">{competition.priceTiers.earlyUntil}</span>)
                </span>
              )}
            </>
          )}
          {recordingFee > 0 && (
            <>
              {" "}
              · צילום: <span className={styles.price}>{recordingFee}₪</span>
            </>
          )}
          {totalPrice != null && (
            <>
              {" "}
              · מחיר כולל: <span className={styles.price}>{totalPrice}₪</span>
            </>
          )}
        </p>
        <div className={styles.actions}>
          {editingEntry && (
            <button type="button" className={styles.cancelButton} onClick={onCancelEdit}>
              ביטול עריכה
            </button>
          )}
          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? "שולחת..." : editingEntry ? "שמירת שינויים" : "הוספה"}
          </button>
        </div>
      </div>
    </form>
  );
}
