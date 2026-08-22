import { useEffect, useState } from "react";
import Image from "next/image";
import { Competition } from "@/types/competition";
import styles from "./Gallery.module.css";

export default function Gallery({ competition }: { competition: Competition }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const count = competition.gallery.length;

  const goPrev = () => setSelectedIndex((i) => (i === null ? null : (i - 1 + count) % count));
  const goNext = () => setSelectedIndex((i) => (i === null ? null : (i + 1) % count));

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

  if (count === 0) return null;

  return (
    <section>
      <div className={styles.head}>
        <h2 className="en">GALLERY</h2>
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

          <div className={styles.expanded} onClick={(e) => e.stopPropagation()}>
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
