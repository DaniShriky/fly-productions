import { useEffect, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { cropImageToFile } from "@/lib/cropImage";
import styles from "./PhotoCropModal.module.css";

type Props = {
  file: File;
  onConfirm: (file: File) => void;
  onClose: () => void;
};

// Lets you pan/zoom a picked (or just-captured) photo inside the round
// profile-photo frame before it's uploaded — per Dani, 2026-10-07
// (screenshot reference: iOS's own photo-picker crop step). Sits between
// PhotoSourceSheet's two sources and the actual upload, so both a gallery
// pick and a camera capture go through the same confirm step.
export default function PhotoCropModal({ file, onConfirm, onClose }: Props) {
  const [imageUrl] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setWorking(true);
    setError(null);
    try {
      const cropped = await cropImageToFile(imageUrl, croppedAreaPixels);
      onConfirm(cropped);
    } catch (err) {
      console.error("Photo crop failed:", err);
      setError("משהו השתבש בעיבוד התמונה - נסו שוב.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} role="dialog" aria-label="מיקום תמונת הפרופיל" onClick={(e) => e.stopPropagation()}>
        <h2>מיקום התמונה</h2>

        <div className={styles.cropArea}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
          />
        </div>

        <div className={styles.zoomRow}>
          <span>הקטנה/הגדלה</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className={styles.zoomSlider}
            aria-label="הגדלת תמונה"
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={working}>
            ביטול
          </button>
          <button type="button" className={styles.primaryBtn} onClick={handleConfirm} disabled={working}>
            {working ? "מעבד..." : "שימוש בתמונה זו"}
          </button>
        </div>
      </div>
    </div>
  );
}
