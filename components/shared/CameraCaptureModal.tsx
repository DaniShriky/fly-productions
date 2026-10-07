import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/dashboard/icons";
import styles from "./CameraCaptureModal.module.css";

type Props = {
  onCapture: (file: File) => void;
  onClose: () => void;
};

// Used by both ProfileEditForm (studio manager) and AdminProfileForm — per
// Dani, 2026-10-07: the existing avatar upload only let you pick an
// existing file, with no way to take a photo on the spot. Live getUserMedia
// preview (not just the file input's native `capture` attribute) so it
// works the same way on desktop and mobile, and so she can see/retake the
// shot before it's used.
export default function CameraCaptureModal({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const capturedBlobRef = useRef<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("הדפדפן הזה לא תומך בגישה למצלמה - אפשר לבחור תמונה קיימת במקום.");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "user" } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => {
        console.error("Camera access failed:", err);
        setError("לא הצלחנו לגשת למצלמה - ודאו שניתנה הרשאה, או בחרו תמונה קיימת במקום.");
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleShoot() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        capturedBlobRef.current = blob;
        setCapturedUrl(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.92
    );
  }

  function handleRetake() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    capturedBlobRef.current = null;
  }

  function handleConfirm() {
    if (!capturedBlobRef.current) return;
    onCapture(new File([capturedBlobRef.current], "profile-photo.jpg", { type: "image/jpeg" }));
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} role="dialog" aria-label="צילום תמונת פרופיל" onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="סגירה">
          <CloseIcon size={13} />
        </button>

        <h2>צילום תמונת פרופיל</h2>

        {error ? (
          <p className={styles.error}>{error}</p>
        ) : capturedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local blob preview of what the camera just captured, not a static asset
          <img src={capturedUrl} alt="" className={styles.preview} />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className={styles.preview} />
        )}

        {!error && (
          <div className={styles.actions}>
            {capturedUrl ? (
              <>
                <button type="button" className={styles.secondaryBtn} onClick={handleRetake}>
                  צילום מחדש
                </button>
                <button type="button" className={styles.primaryBtn} onClick={handleConfirm}>
                  שימוש בתמונה זו
                </button>
              </>
            ) : (
              <button type="button" className={styles.primaryBtn} onClick={handleShoot}>
                צילום
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
