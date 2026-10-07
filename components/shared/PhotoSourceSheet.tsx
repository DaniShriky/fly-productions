import { useEffect } from "react";
import { GalleryIcon, CameraIcon } from "@/components/dashboard/icons";
import styles from "./PhotoSourceSheet.module.css";

type Props = {
  onChooseFile: () => void;
  onTakePhoto: () => void;
  onClose: () => void;
};

// Instagram-style bottom sheet for picking a profile-photo source — per
// Dani, 2026-10-07 (screenshot reference), replacing the previous
// always-visible "or take a new photo" text link with the same
// tap-avatar-to-open-a-sheet pattern Instagram uses. The reference
// screenshot's "Import from WhatsApp/Facebook" rows aren't relevant here —
// there's nothing to import from — so this only has the two sources we
// actually support.
export default function PhotoSourceSheet({ onChooseFile, onTakePhoto, onClose }: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleChooseFile() {
    onChooseFile();
    onClose();
  }

  function handleTakePhoto() {
    onTakePhoto();
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} role="dialog" aria-label="בחירת תמונת פרופיל" onClick={(e) => e.stopPropagation()}>
        <div className={styles.handle} />
        <button type="button" className={styles.row} onClick={handleChooseFile}>
          <span className={styles.rowIcon}>
            <GalleryIcon size={20} />
          </span>
          בחירה מהגלריה
        </button>
        <div className={styles.divider} />
        <button type="button" className={styles.row} onClick={handleTakePhoto}>
          <span className={styles.rowIcon}>
            <CameraIcon size={20} />
          </span>
          צילום תמונה
        </button>
      </div>
    </div>
  );
}
