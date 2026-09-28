import { ChangeEvent, FormEvent, useState } from "react";
import { ISRAELI_CITIES } from "@/lib/cities";
import {
  getProfilePhotoUrl,
  updateOwnProfilePhoto,
  updateOwnStudioManager,
  uploadProfilePhoto,
} from "@/lib/queries/studioManagers";
import { emitProfileUpdated } from "@/lib/profileUpdateEvent";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { StudioManager } from "@/types/studioManager";
import styles from "./ProfileEditForm.module.css";

const OTHER_CITY = "אחר";

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

// One letter from each of the first two words in the studio name — same
// convention as Nav's avatar badge, so a manager without a photo still sees
// a consistent identity mark in both places.
function initialsOf(studioName: string): string {
  const words = studioName.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function ProfileEditForm({
  manager,
  onSaved,
}: {
  manager: StudioManager;
  onSaved: (manager: StudioManager) => void;
}) {
  const [studioName, setStudioName] = useState(manager.studioName);
  const [managerName, setManagerName] = useState(manager.managerName ?? "");
  const [phone, setPhone] = useState(manager.phone);
  const [city, setCity] = useState(manager.city && ISRAELI_CITIES.includes(manager.city) ? manager.city : ISRAELI_CITIES[0]);
  const [customCity, setCustomCity] = useState(manager.city && !ISRAELI_CITIES.includes(manager.city) ? manager.city : "");
  const [isOtherCity, setIsOtherCity] = useState(!!manager.city && !ISRAELI_CITIES.includes(manager.city));
  const [danceStyles, setDanceStyles] = useState(manager.danceStyles ?? "");
  const approvedCompetitionType = manager.preferredCompetitionType ?? "רגיל";
  const [selectedCompetitionType, setSelectedCompetitionType] = useState(
    manager.pendingPreferredCompetitionType ?? approvedCompetitionType
  );
  const [wantsStageServicesInfo, setWantsStageServicesInfo] = useState(manager.wantsStageServicesInfo);
  const [profileImagePath, setProfileImagePath] = useState(manager.profileImagePath);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const photoUrl = profileImagePath ? getProfilePhotoUrl(supabaseBrowserClient, profileImagePath) : null;

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const path = await uploadProfilePhoto(supabaseBrowserClient, manager.id, file);
      await updateOwnProfilePhoto(supabaseBrowserClient, manager.id, path);
      setProfileImagePath(path);
      emitProfileUpdated({ profileImageUrl: getProfilePhotoUrl(supabaseBrowserClient, path) });
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateOwnStudioManager(supabaseBrowserClient, manager.id, {
        studioName,
        managerName: managerName || undefined,
        phone,
        city: isOtherCity ? customCity : city,
        danceStyles: danceStyles || undefined,
        // Only actually a "request" if it differs from what's already
        // approved — picking the same value again just clears any pending
        // request instead of re-submitting a no-op one.
        requestedCompetitionType: selectedCompetitionType === approvedCompetitionType ? null : selectedCompetitionType,
        wantsStageServicesInfo,
      });
      onSaved(updated);
      emitProfileUpdated({ studioName: updated.studioName });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <label className={styles.avatarWrap}>
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- manager-uploaded, arbitrary external-ish URL from Supabase Storage, not a static site asset
            <img src={photoUrl} alt="" className={styles.avatarPhoto} />
          ) : (
            <span className={styles.avatarInitials}>{initialsOf(studioName || manager.studioName)}</span>
          )}
          <span className={styles.avatarEditBadge}>
            <CameraIcon />
          </span>
          <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} hidden />
        </label>
        <div>
          <p className={styles.avatarHint}>
            {uploadingPhoto ? "מעלה תמונה..." : "לחצו על התמונה כדי להחליף אותה"}
          </p>
          <p className={styles.email} dir="ltr">
            {manager.email}
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span>שם הסטודיו/הלהקה</span>
          <input required value={studioName} onChange={(e) => setStudioName(e.target.value)} />
        </label>

        <label className={styles.field}>
          <span>שם מנהל/ת הלהקה</span>
          <input value={managerName} onChange={(e) => setManagerName(e.target.value)} />
        </label>

        <label className={styles.field}>
          <span>טלפון נייד</span>
          <input type="tel" dir="ltr" className="en" required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>

        <label className={styles.field}>
          <span>יישוב</span>
          <select
            value={isOtherCity ? OTHER_CITY : city}
            onChange={(e) => {
              if (e.target.value === OTHER_CITY) {
                setIsOtherCity(true);
              } else {
                setIsOtherCity(false);
                setCity(e.target.value);
              }
            }}
          >
            {ISRAELI_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={OTHER_CITY}>{OTHER_CITY}</option>
          </select>
        </label>

        {isOtherCity && (
          <label className={styles.field}>
            <span>איזה יישוב?</span>
            <input required value={customCity} onChange={(e) => setCustomCity(e.target.value)} />
          </label>
        )}

        <label className={styles.field}>
          <span>סגנונות ריקוד</span>
          <input value={danceStyles} onChange={(e) => setDanceStyles(e.target.value)} />
        </label>
      </div>

      <fieldset className={styles.radioGroup}>
        <legend>סוג התחרויות המועדף</legend>
        <label className={styles.radio}>
          <input
            type="radio"
            name="preferredCompetitionType"
            checked={selectedCompetitionType === "רגיל"}
            onChange={() => setSelectedCompetitionType("רגיל")}
          />
          רגיל
        </label>
        <label className={styles.radio}>
          <input
            type="radio"
            name="preferredCompetitionType"
            checked={selectedCompetitionType === "דתי"}
            onChange={() => setSelectedCompetitionType("דתי")}
          />
          דתי
        </label>
        <p className={styles.approvalNote}>הבחירה המאושרת כרגע: {approvedCompetitionType}.</p>
        {manager.pendingPreferredCompetitionType && (
          <p className={styles.approvalNote}>
            יש בקשה ממתינה לאישור מנהל האתר לשינוי ל<strong>{manager.pendingPreferredCompetitionType}</strong>.
          </p>
        )}
        {!manager.pendingPreferredCompetitionType && selectedCompetitionType !== approvedCompetitionType && (
          <p className={styles.approvalNote}>שינוי בסוג התחרויות טעון אישור מנהל האתר ולא יחול מיד.</p>
        )}
      </fieldset>

      <label className={styles.radio}>
        <input
          type="checkbox"
          checked={wantsStageServicesInfo}
          onChange={(e) => setWantsStageServicesInfo(e.target.checked)}
        />
        מעוניינת לקבל מידע על שירותי במה מקצועיים
      </label>

      <div className={styles.footer}>
        {saved && <span className={styles.savedNote}>הפרטים נשמרו</span>}
        <button type="submit" className={styles.submit} disabled={saving}>
          {saving ? "שומרת..." : "שמירת שינויים"}
        </button>
      </div>
    </form>
  );
}
