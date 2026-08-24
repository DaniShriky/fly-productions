import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Competition } from "@/types/competition";
import styles from "./Gallery.module.css";

export default function Gallery({ competition }: { competition: Competition }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // naturalHeight/naturalWidth of the open image, used on mobile to size the
  // lightbox box to exactly match the rendered photo (see Gallery.module.css)
  // instead of a tall fixed box that left empty space above the arrows.
  const [imgAspect, setImgAspect] = useState<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const count = competition.gallery.length;

  const goPrev = () => setSelectedIndex((i) => (i === null ? null : (i - 1 + count) % count));
  const goNext = () => setSelectedIndex((i) => (i === null ? null : (i + 1) % count));

  useEffect(() => {
    setImgAspect(null);
  }, [selectedIndex]);

  // Arrow-key navigation while the lightbox is open.
  useEffect(() => {
    if (selectedIndex === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") setSelectedIndex(null);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [selectedIndex]);

  // Swipe navigation for touch devices. The page is RTL and the prev/next
  // buttons already sit right/left to match — a right-to-left swipe (finger
  // moving left, negative dx) reveals "next" the same way the left-hand
  // button does, and a left-to-right swipe reveals "prev".
  function handleTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    const SWIPE_THRESHOLD = 40;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx > 0) goPrev();
    else goNext();
  }

  if (count === 0) return null;

  return (
    <section>
      <div className={styles.head}>
        {/* <h2 className="en">GALLERY</h2> */}
      </div>
      <div className={styles.grid}>
        {competition.gallery.map((src, i) => (
          <div key={src} className={styles.item} onClick={() => setSelectedIndex(i)}>
            <Image
              src={src}
              alt={`${competition.name} ${i + 1}`}
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 700px) 50vw, 33vw"
            />
          </div>
        ))}
      </div>
      <div className={styles.credit}>צילום: Fly Productions</div>

      {selectedIndex !== null && (
        <div className={styles.overlay} onClick={() => setSelectedIndex(null)}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="התמונה הקודמת"
          >
            ‹
          </button>

          <div
            className={styles.expanded}
            style={imgAspect ? ({ "--img-aspect": imgAspect } as React.CSSProperties) : undefined}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setSelectedIndex(null)}
              aria-label="סגירה"
            >
              ✕
            </button>
            <Image
              key={competition.gallery[selectedIndex]}
              src={competition.gallery[selectedIndex]}
              alt={`${competition.name} ${selectedIndex + 1}`}
              fill
              style={{ objectFit: "contain" }}
              sizes="90vw"
              priority
              onLoad={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.naturalWidth && img.naturalHeight) {
                  setImgAspect(img.naturalHeight / img.naturalWidth);
                }
              }}
            />
          </div>

          <button
            type="button"
            className={styles.navBtn}
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="התמונה הבאה"
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}
