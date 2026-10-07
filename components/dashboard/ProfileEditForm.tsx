import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
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
import CameraCaptureModal from "@/components/shared/CameraCaptureModal";
import PhotoSourceSheet from "@/components/shared/PhotoSourceSheet";
import PhotoCropModal from "@/components/shared/PhotoCropModal";
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
  // Empty, not ISRAELI_CITIES[0], when there's no real city on the profile
  // yet — same reasoning as RegistrationDetailsForm: an alphabetical default
  // silently submitted as "correct" is worse than forcing an explicit pick.
  const [city, setCity] = useState(manager.city && ISRAELI_CITIES.includes(manager.city) ? manager.city : "");
  const [customCity, setCustomCity] = useState(manager.city && !ISRAELI_CITIES.includes(manager.city) ? manager.city : "");
  const [isOtherCity, setIsOtherCity] = useState(!!manager.city && !ISRAELI_CITIES.includes(manager.city));
  const approvedCompetitionType = manager.preferredCompetitionType ?? "חילוני";
  const [selectedCompetitionType, setSelectedCompetitionType] = useState(
    manager.pendingPreferredCompetitionType ?? approvedCompetitionType
  );
  // useState's initial value is only read on mount — without this, a live
  // update to manager.pendingPreferredCompetitionType (LiveNotifications,
  // after an admin approves/rejects — see pages/profile/index.tsx) would
  // correctly clear the "יש בקשה ממתינה" note, but leave the radio itself
  // (and, specifically after a *rejection*, the "שינוי טעון אישור" note too)
  // stuck showing her old requested choice instead of resyncing to
  // whatever got decided. Re-syncing here on every change to the two
  // server-confirmed fields covers both her own save (onSaved already
  // passes a manager matching her own selection, so this is a no-op then)
  // and a live update from someone else's action.
  useEffect(() => {
    setSelectedCompetitionType(manager.pendingPreferredCompetitionType ?? manager.preferredCompetitionType ?? "חילוני");
  }, [manager.pendingPreferredCompetitionType, manager.preferredCompetitionType]);
  const [profileImagePath, setProfileImagePath] = useState(manager.profileImagePath);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  // A gallery pick or a camera capture both land here first — neither
  // uploads directly, so both get the same pan/zoom crop step before
  // anything is sent to Storage.
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const photoUrl = profileImagePath ? getProfilePhotoUrl(supabaseBrowserClient, profileImagePath) : null;

  // Shared by the plain file-picker input and CameraCaptureModal's capture
  // callback — both end up with a File, just from a different source.
  async function uploadPhoto(file: File) {
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const path = await uploadProfilePhoto(supabaseBrowserClient, manager.id, file);
      await updateOwnProfilePhoto(supabaseBrowserClient, manager.id, path);
      setProfileImagePath(path);
      emitProfileUpdated({ profileImageUrl: getProfilePhotoUrl(supabaseBrowserClient, path) });
    } catch (err) {
      // Same previously-silent gap as handleSubmit below had — an upload
      // failure (file too large, network, storage RLS) showed nothing at
      // all, the hint text just quietly reverting to normal.
      console.error("Profile photo upload failed:", err);
      setPhotoError("העלאת התמונה נכשלה - נסו שוב.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCropFile(file);
  }

  function handlePhotoCaptured(file: File) {
    setCameraOpen(false);
    setCropFile(file);
  }

  async function handleCropConfirm(file: File) {
    setCropFile(null);
    await uploadPhoto(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await updateOwnStudioManager(supabaseBrowserClient, manager.id, {
        studioName,
        managerName: managerName || undefined,
        phone,
        city: isOtherCity ? customCity : city,
        // Only actually a "request" if it differs from what's already
        // approved — picking the same value again just clears any pending
        // request instead of re-submitting a no-op one.
        requestedCompetitionType: selectedCompetitionType === approvedCompetitionType ? null : selectedCompetitionType,
      });
      onSaved(updated);
      emitProfileUpdated({ studioName: updated.studioName });
      setSaved(true);
    } catch (err) {
      // Previously unhandled — a failed save (RLS, validation, network) threw
      // silently here with no catch, so the manager saw no success message
      // and no error either, just nothing happening. Surfacing it now, even
      // generically, beats leaving her unsure whether anything was saved.
      // Logged (not shown to her) so the real cause is still diagnosable.
      console.error("Profile save failed:", err);
      setError("השמירה נכשלה - נסו שוב, ואם זה ממשיך לקרות צרו איתנו קשר.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.avatarWrap}
          onClick={() => setPhotoSheetOpen(true)}
          disabled={uploadingPhoto}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- manager-uploaded, arbitrary external-ish URL from Supabase Storage, not a static site asset
            <img src={photoUrl} alt="" className={styles.avatarPhoto} />
          ) : (
            <span className={styles.avatarInitials}>{initialsOf(studioName || manager.studioName)}</span>
          )}
          <span className={styles.avatarEditBadge}>
            <CameraIcon />
          </span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} hidden />
        <div>
          <p className={styles.avatarHint}>
            {uploadingPhoto ? "מעלה תמונה..." : "לחצו על התמונה כדי לשנות אותה"}
          </p>
          {photoError && <p className={styles.errorNote}>{photoError}</p>}
          <p className={styles.email} dir="ltr">
            {manager.email}
          </p>
        </div>
      </div>

      {photoSheetOpen && (
        <PhotoSourceSheet
          onChooseFile={() => fileInputRef.current?.click()}
          onTakePhoto={() => setCameraOpen(true)}
          onClose={() => setPhotoSheetOpen(false)}
        />
      )}
      {cameraOpen && <CameraCaptureModal onCapture={handlePhotoCaptured} onClose={() => setCameraOpen(false)} />}
      {cropFile && <PhotoCropModal file={cropFile} onConfirm={handleCropConfirm} onClose={() => setCropFile(null)} />}

      <div className={styles.grid}>
        <label className={styles.field}>
          <span>
            שם הסטודיו/הלהקה <span className={styles.required}>*</span>
          </span>
          <input required value={studioName} onChange={(e) => setStudioName(e.target.value)} />
        </label>

        <label className={styles.field}>
          <span>שם מנהל/ת הלהקה</span>
          <input value={managerName} onChange={(e) => setManagerName(e.target.value)} />
        </label>

        <label className={styles.field}>
          <span>
            טלפון נייד <span className={styles.required}>*</span>
          </span>
          <input type="tel" dir="ltr" className="en" required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>

        <label className={styles.field}>
          <span>
            יישוב <span className={styles.required}>*</span>
          </span>
          <select
            required
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
            <option value="" disabled>
              בחרו יישוב
            </option>
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
            <span>
              איזה יישוב? <span className={styles.required}>*</span>
            </span>
            <input required value={customCity} onChange={(e) => setCustomCity(e.target.value)} />
          </label>
        )}
      </div>

      <fieldset className={styles.radioGroup}>
        <legend>סוג התחרויות המועדף</legend>
        <label className={styles.radio}>
          <input
            type="radio"
            name="preferredCompetitionType"
            checked={selectedCompetitionType === "חילוני"}
            onChange={() => setSelectedCompetitionType("חילוני")}
          />
          חילוני
        </label>
        <label className={styles.radio}>
          <input
            type="radio"
            name="preferredCompetitionType"
            checked={selectedCompetitionType === "מגזר דתי"}
            onChange={() => setSelectedCompetitionType("מגזר דתי")}
          />
          מגזר דתי
        </label>
        <label className={styles.radio}>
          <input
            type="radio"
            name="preferredCompetitionType"
            checked={selectedCompetitionType === "שניהם"}
            onChange={() => setSelectedCompetitionType("שניהם")}
          />
          שניהם
        </label>
        {manager.pendingPreferredCompetitionType && (
          <p className={styles.approvalWarning}>
            יש בקשה ממתינה לאישור מנהל האתר לשינוי ל<strong>{manager.pendingPreferredCompetitionType}</strong>.
          </p>
        )}
        {!manager.pendingPreferredCompetitionType && selectedCompetitionType !== approvedCompetitionType && (
          <p className={styles.approvalWarning}>שינוי בסוג התחרויות טעון אישור מנהל האתר ולא יחול מיד.</p>
        )}
      </fieldset>

      <div className={styles.footer}>
        {saved && <span className={styles.savedNote}>הפרטים נשמרו</span>}
        {error && <span className={styles.errorNote}>{error}</span>}
        <button type="submit" className={styles.submit} disabled={saving}>
          {saving ? "שומרים..." : "שמירת שינויים"}
        </button>
      </div>
    </form>
  );
}
