import { FormEvent, useState } from "react";
import { AdminRegistration, updateRegistrationDetailsAdmin } from "@/lib/queries/adminRegistrations";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { DANCE_LEVELS, DANCE_STYLES, STEP_DIVISIONS, categoryFromParticipantCount } from "@/lib/pricing";
import { CloseIcon, MinusIcon, PlusIcon } from "@/components/dashboard/icons";
import styles from "./AdminEditDanceModal.module.css";

const OTHER_STYLE = "אחר";

type Props = {
  entry: AdminRegistration;
  onClose: () => void;
  onSaved: (updated: AdminRegistration) => void;
};

// Per Dani, 2026-10-06: an admin had no way to fix a dance's own details at
// all before this — only payment status. Specifically needed for a dance
// that's already been submitted, since that's exactly when the studio
// manager herself can no longer edit it (see RegistrationsPaymentsTable's
// new "עריכה" button). A plain form, not DanceEntryForm's multi-step
// accordion — that component is built around a studio manager editing her
// own draft (competition picker, day picker, music upload, price display),
// most of which doesn't apply to an admin fixing an existing submitted row.
export default function AdminEditDanceModal({ entry, onClose, onSaved }: Props) {
  const [danceName, setDanceName] = useState(entry.danceName);
  const [participantCount, setParticipantCount] = useState(String(entry.participantCount));
  const [stepDivision, setStepDivision] = useState(entry.stepDivision);
  const isKnownStyle = DANCE_STYLES.includes(entry.danceStyle);
  const [danceStyle, setDanceStyle] = useState(isKnownStyle ? entry.danceStyle : OTHER_STYLE);
  const [customDanceStyle, setCustomDanceStyle] = useState(isKnownStyle ? "" : entry.danceStyle);
  const [dancerName, setDancerName] = useState(entry.dancerName ?? "");
  const [choreographerName, setChoreographerName] = useState(entry.choreographerName);
  const [danceLevel, setDanceLevel] = useState(entry.danceLevel);
  const [managerName, setManagerName] = useState(entry.managerName);
  const [studioName, setStudioName] = useState(entry.studioName);
  const [city, setCity] = useState(entry.city);
  const [wantsVideo, setWantsVideo] = useState(entry.wantsVideo);
  const [wantsStills, setWantsStills] = useState(entry.wantsStills);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = Number(participantCount) || 0;
  const resolvedCategory = categoryFromParticipantCount(count);
  const resolvedDanceStyle = danceStyle === OTHER_STYLE ? customDanceStyle : danceStyle;
  const isSolo = resolvedCategory === "solo";

  function adjustCount(delta: number) {
    setParticipantCount((prev) => String(Math.max(1, (Number(prev) || 0) + delta)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateRegistrationDetailsAdmin(supabaseBrowserClient, entry.id, {
        danceName,
        category: resolvedCategory,
        participantCount: count,
        stepDivision,
        danceStyle: resolvedDanceStyle,
        ...(isSolo ? { dancerName } : {}),
        choreographerName,
        danceLevel,
        managerName,
        studioName,
        city,
        wantsVideo,
        wantsStills,
      });
      onSaved({
        ...entry,
        danceName,
        category: resolvedCategory,
        participantCount: count,
        stepDivision,
        danceStyle: resolvedDanceStyle,
        ...(isSolo && dancerName ? { dancerName } : { dancerName: undefined }),
        choreographerName,
        danceLevel,
        managerName,
        studioName,
        city,
        wantsVideo,
        wantsStills,
      });
    } catch (err) {
      console.error("Admin dance edit failed:", err);
      setError("השמירה נכשלה - נסו שוב.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form
        className={styles.card}
        role="dialog"
        aria-label="עריכת ריקוד"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="סגירה">
          <CloseIcon size={13} />
        </button>

        <h2 className={styles.title}>עריכת ריקוד</h2>
        <p className={styles.subtitle}>
          <span className="en" lang="en">
            {entry.competitionName}
          </span>
        </p>

        <div className={styles.grid}>
          <label className={styles.field}>
            <span>שם הריקוד</span>
            <input required value={danceName} onChange={(e) => setDanceName(e.target.value)} />
          </label>

          <label className={styles.field}>
            <span>מספר משתתפים</span>
            <div className={styles.stepper}>
              <button type="button" className={styles.stepperButton} onClick={() => adjustCount(-1)} disabled={count <= 1}>
                <MinusIcon size={14} />
              </button>
              <input
                type="number"
                min={1}
                className={styles.stepperInput}
                value={participantCount}
                onChange={(e) => setParticipantCount(e.target.value)}
              />
              <button type="button" className={styles.stepperButton} onClick={() => adjustCount(1)}>
                <PlusIcon size={14} />
              </button>
            </div>
          </label>

          {isSolo && (
            <label className={styles.field}>
              <span>שם הרקדנית/ן</span>
              <input value={dancerName} onChange={(e) => setDancerName(e.target.value)} />
            </label>
          )}

          <label className={styles.field}>
            <span>כוריאוגרף/ית</span>
            <input required value={choreographerName} onChange={(e) => setChoreographerName(e.target.value)} />
          </label>

          <label className={styles.field}>
            <span>חטיבת גיל (STEP)</span>
            <select required value={stepDivision} onChange={(e) => setStepDivision(e.target.value)}>
              {STEP_DIVISIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>רמה</span>
            <select required value={danceLevel} onChange={(e) => setDanceLevel(e.target.value as typeof danceLevel)}>
              {DANCE_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>סגנון</span>
            <select required value={danceStyle} onChange={(e) => setDanceStyle(e.target.value)}>
              {DANCE_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
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

          <label className={styles.field}>
            <span>שם מנהלת הלהקה</span>
            <input required value={managerName} onChange={(e) => setManagerName(e.target.value)} />
          </label>

          <label className={styles.field}>
            <span>שם הסטודיו/הלהקה</span>
            <input required value={studioName} onChange={(e) => setStudioName(e.target.value)} />
          </label>

          <label className={styles.field}>
            <span>יישוב</span>
            <input required value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
        </div>

        <div className={styles.checkboxRow}>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={wantsVideo} onChange={(e) => setWantsVideo(e.target.checked)} />
            הזמנת צילום וידאו
          </label>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={wantsStills} onChange={(e) => setWantsStills(e.target.checked)} />
            הזמנת צילום סטילס
          </label>
        </div>

        <div className={styles.footer}>
          {error && <span className={styles.errorNote}>{error}</span>}
          <button type="submit" className={styles.submit} disabled={saving}>
            {saving ? "שומר..." : "שמירת שינויים"}
          </button>
        </div>
      </form>
    </div>
  );
}
