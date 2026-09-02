import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Competition } from "@/types/competition";
import styles from "./Gallery.module.css";

const VISIBLE_COUNT = 4;
// An image counts as an "outlier" once its aspect ratio drifts this far
// from the gallery's common one — small JPEG-export rounding shouldn't
// trigger a crop, only a genuinely different shape.
const OUTLIER_TOLERANCE = 0.03;

export default function Gallery({ competition }: { competition: Competition }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // naturalHeight/naturalWidth of the open image, used on mobile to size the
  // lightbox box to exactly match the rendered photo (see Gallery.module.css)
  // instead of a tall fixed box that left empty space above the arrows.
  const [imgAspect, setImgAspect] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  // width/height ratio of each thumbnail, filled in as each one loads —
  // used to find the gallery's common aspect ratio so a lone odd-shaped
  // photo can be cropped to match instead of breaking the grid's rhythm.
  const [ratios, setRatios] = useState<(number | null)[]>(() =>
    competition.gallery.map(() => null)
  );
  const touchStartXRef = useRef<number | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const count = competition.gallery.length;

  const goPrev = () => setSelectedIndex((i) => (i === null ? null : (i - 1 + count) % count));
  const goNext = () => setSelectedIndex((i) => (i === null ? null : (i + 1) % count));

  // Reset per-competition state when navigating between competition pages —
  // Next.js reuses this component instance rather than remounting it.
  useEffect(() => {
    setRatios(competition.gallery.map(() => null));
    setExpanded(false);
  }, [competition.slug]);

  useEffect(() => {
    setImgAspect(null);
  }, [selectedIndex]);

  // Move focus into the lightbox when it opens, and back to whatever
  // triggered it when it closes — otherwise keyboard focus would silently
  // stay on (or vanish with) the thumbnail button behind the overlay.
  // Guarded by wasOpenRef so navigating between photos (selectedIndex
  // changing while already open) doesn't keep yanking focus back to the
  // close button.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    const isOpen = selectedIndex !== null;
    if (isOpen && !wasOpenRef.current) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      closeBtnRef.current?.focus();
    } else if (!isOpen && wasOpenRef.current) {
      previouslyFocusedRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [selectedIndex]);

  function handleThumbLoad(i: number, e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    if (!img.naturalWidth || !img.naturalHeight) return;
    const ratio = img.naturalWidth / img.naturalHeight;
    setRatios((prev) => {
      if (prev[i] === ratio) return prev;
      const next = [...prev];
      next[i] = ratio;
      return next;
    });
  }

  // The aspect ratio shared by the most thumbnails — null if every loaded
  // ratio is unique, in which case nothing gets singled out for cropping.
  const commonRatio = useMemo(() => {
    const counts = new Map<string, { ratio: number; count: number }>();
    for (const r of ratios) {
      if (r === null) continue;
      const key = r.toFixed(2);
      const entry = counts.get(key);
      if (entry) entry.count++;
      else counts.set(key, { ratio: r, count: 1 });
    }
    let best: { ratio: number; count: number } | null = null;
    for (const entry of counts.values()) {
      if (!best || entry.count > best.count) best = entry;
    }
    return best && best.count > 1 ? best.ratio : null;
  }, [ratios]);

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
        {/* No visible section title by design — kept for screen readers so
            heading-based navigation still has a landmark to land on. */}
        <h2 className="sr-only">גלריית תמונות</h2>
      </div>
      <div className={styles.grid}>
        {(expanded ? competition.gallery : competition.gallery.slice(0, VISIBLE_COUNT)).map(
          (src, i) => {
            const ratio = ratios[i];
            const isOutlier =
              commonRatio !== null &&
              ratio !== null &&
              Math.abs(ratio - commonRatio) > OUTLIER_TOLERANCE;
            return (
              <button
                key={src}
                type="button"
                className={styles.item}
                onClick={() => setSelectedIndex(i)}
                style={isOutlier ? { aspectRatio: commonRatio ?? undefined } : undefined}
                aria-label={`הגדלת תמונה ${i + 1} מתוך ${count}`}
              >
                {/* Plain <img>, not next/image's `fill` + cover — the grid
                    shows each photo at its own aspect ratio instead of
                    cropping it to a fixed box, unless it's the odd one out
                    (see isOutlier above), which gets cropped to match. */}
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className={isOutlier ? styles.itemImgCrop : undefined}
                  onLoad={(e) => handleThumbLoad(i, e)}
                />
              </button>
            );
          }
        )}
      </div>
      {count > VISIBLE_COUNT && (
        <div className={styles.moreWrap}>
          <button type="button" className={styles.seeAll} onClick={() => setExpanded((e) => !e)}>
            {expanded ? "הצגה מצומצמת" : `צפייה בכל התמונות`}
          </button>
        </div>
      )}
      <div className={styles.credit}>צילום: Fly Productions</div>

      {selectedIndex !== null && (
        <div
          className={styles.overlay}
          onClick={() => setSelectedIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`תמונה ${selectedIndex + 1} מתוך ${count}`}
        >
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
              ref={closeBtnRef}
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
