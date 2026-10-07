import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { updateOwnAdmin } from "@/lib/queries/admins";
import { uploadProfilePhoto, getProfilePhotoUrl } from "@/lib/queries/studioManagers";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { Admin } from "@/types/admin";
import CameraCaptureModal from "@/components/shared/CameraCaptureModal";
import PhotoSourceSheet from "@/components/shared/PhotoSourceSheet";
import PhotoCropModal from "@/components/shared/PhotoCropModal";
import styles from "./AdminProfileForm.module.css";

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length ? words.slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "A";
}

// The admin-account counterpart to ProfileEditForm — deliberately minimal
// (per Dani, 2026-10-05): an admin has no studio/phone/city/competition-type
// to fill in, just a name and a profile photo, same upload mechanism
// (lib/queries/studioManagers.ts's uploadProfilePhoto/getProfilePhotoUrl are
// generic — storage RLS keys off the uploader's own auth.uid(), not which
// table they belong to, so reusing them here needs no changes).
export default function AdminProfileForm({ admin, onSaved }: { admin: Admin; onSaved: (admin: Admin) => void }) {
  const [name, setName] = useState(admin.name ?? "");
  const [profileImagePath, setProfileImagePath] = useState(admin.profileImagePath);
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
      const path = await uploadProfilePhoto(supabaseBrowserClient, admin.userId, file);
      const updated = await updateOwnAdmin(supabaseBrowserClient, admin.userId, { profileImagePath: path });
      setProfileImagePath(path);
      onSaved(updated);
    } catch (err) {
      console.error("Admin profile photo upload failed:", err);
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
      const updated = await updateOwnAdmin(supabaseBrowserClient, admin.userId, { name });
      onSaved(updated);
      setSaved(true);
    } catch (err) {
      console.error("Admin profile save failed:", err);
      setError("השמירה נכשלה - נסו שוב.");
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
            <span className={styles.avatarInitials}>{initialsOf(name || "Admin")}</span>
          )}
          <span className={styles.avatarEditBadge}>
            <CameraIcon />
          </span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} hidden />
        <p className={styles.avatarHint}>{uploadingPhoto ? "מעלה תמונה..." : "לחצו על התמונה כדי לשנות אותה"}</p>
        {photoError && <p className={styles.errorNote}>{photoError}</p>}
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

      <label className={styles.field}>
        <span>שם</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="השם שיוצג בחשבון" />
      </label>

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
